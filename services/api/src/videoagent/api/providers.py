import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import (
    get_current_user,
    get_kling_oauth_gateway,
    get_session,
    get_settings,
)
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import OAuthFlow, ProviderConnection, User, utcnow
from videoagent.providers.oauth import KlingOAuthGateway, pkce_challenge
from videoagent.security import decrypt_secret, encrypt_secret, hash_session_token

router = APIRouter(prefix="/providers", tags=["providers"])
PROVIDER_NAME = "kling"


def _error_redirect(settings: Settings, code: str) -> RedirectResponse:
    return RedirectResponse(
        f"{settings.frontend_base_url}/en/projects?kling={code}",
        status_code=status.HTTP_302_FOUND,
    )


@router.post("/kling/connect")
async def connect_kling(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    gateway: Annotated[KlingOAuthGateway, Depends(get_kling_oauth_gateway)],
) -> dict[str, str]:
    client_id = settings.kling_oauth_client_id or await gateway.register_client(
        redirect_uri=settings.kling_oauth_redirect_uri,
        scopes=settings.kling_scopes,
    )
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(64)
    flow = OAuthFlow(
        state_hash=hash_session_token(state),
        user_id=user.id,
        provider=PROVIDER_NAME,
        client_id=client_id,
        redirect_uri=settings.kling_oauth_redirect_uri,
        code_verifier_encrypted=encrypt_secret(
            verifier,
            settings.token_encryption_key,
        ),
        scopes=settings.kling_scopes,
        expires_at=datetime.now(UTC) + timedelta(minutes=10),
    )
    session.add(flow)
    await session.commit()
    return {
        "authorization_url": gateway.authorization_url(
            client_id=client_id,
            redirect_uri=settings.kling_oauth_redirect_uri,
            state=state,
            code_challenge=pkce_challenge(verifier),
            scopes=settings.kling_scopes,
            resource=settings.kling_mcp_url,
        )
    }


@router.get("/kling/callback")
async def kling_callback(
    response: Response,
    settings: Annotated[Settings, Depends(get_settings)],
    session: Annotated[AsyncSession, Depends(get_session)],
    gateway: Annotated[KlingOAuthGateway, Depends(get_kling_oauth_gateway)],
    state: str | None = Query(default=None),
    code: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    del response
    if state is None:
        return _error_redirect(settings, "invalid_state")

    result = await session.execute(
        select(OAuthFlow).where(
            OAuthFlow.state_hash == hash_session_token(state),
            OAuthFlow.provider == PROVIDER_NAME,
            OAuthFlow.used_at.is_(None),
            OAuthFlow.expires_at > datetime.now(UTC),
        )
    )
    flow = result.scalar_one_or_none()
    if flow is None:
        return _error_redirect(settings, "invalid_state")
    if error:
        flow.used_at = utcnow()
        await session.commit()
        return _error_redirect(settings, "denied")
    if code is None:
        return _error_redirect(settings, "missing_code")

    try:
        tokens = await gateway.exchange_code(
            code=code,
            client_id=flow.client_id,
            redirect_uri=flow.redirect_uri,
            code_verifier=decrypt_secret(
                flow.code_verifier_encrypted,
                settings.token_encryption_key,
            ),
            resource=settings.kling_mcp_url,
        )
    except Exception:
        flow.used_at = utcnow()
        await session.commit()
        return _error_redirect(settings, "exchange_failed")

    existing_result = await session.execute(
        select(ProviderConnection).where(
            ProviderConnection.user_id == flow.user_id,
            ProviderConnection.provider == PROVIDER_NAME,
        )
    )
    connection = existing_result.scalar_one_or_none()
    encrypted_access = encrypt_secret(tokens.access_token, settings.token_encryption_key)
    encrypted_refresh = (
        encrypt_secret(tokens.refresh_token, settings.token_encryption_key)
        if tokens.refresh_token
        else None
    )
    expires_at = (
        datetime.now(UTC) + timedelta(seconds=tokens.expires_in) if tokens.expires_in else None
    )
    if connection is None:
        connection = ProviderConnection(
            user_id=flow.user_id,
            provider=PROVIDER_NAME,
            access_token_encrypted=encrypted_access,
            refresh_token_encrypted=encrypted_refresh,
            expires_at=expires_at,
            connection_metadata={"client_id": flow.client_id},
        )
        session.add(connection)
    else:
        connection.access_token_encrypted = encrypted_access
        if encrypted_refresh is not None:
            connection.refresh_token_encrypted = encrypted_refresh
        connection.expires_at = expires_at
        connection.connection_metadata = {"client_id": flow.client_id}
    flow.used_at = utcnow()

    user = await session.get(User, flow.user_id)
    locale = user.locale if user is not None else "en"
    await session.commit()
    return RedirectResponse(
        f"{settings.frontend_base_url}/{locale}/projects?kling=connected",
        status_code=status.HTTP_302_FOUND,
    )


@router.get("/kling")
async def kling_status(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, object]:
    result = await session.execute(
        select(ProviderConnection).where(
            ProviderConnection.user_id == user.id,
            ProviderConnection.provider == PROVIDER_NAME,
        )
    )
    connection = result.scalar_one_or_none()
    return {
        "provider": PROVIDER_NAME,
        "connected": connection is not None,
        "expires_at": connection.expires_at.isoformat()
        if connection is not None and connection.expires_at is not None
        else None,
    }


@router.delete("/kling", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_kling(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    if user.id is None:
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Authentication is required.",
        )
    await session.execute(
        delete(ProviderConnection).where(
            ProviderConnection.user_id == user.id,
            ProviderConnection.provider == PROVIDER_NAME,
        )
    )
    await session.commit()

from datetime import UTC, datetime, timedelta
from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import (
    get_current_user,
    get_kling_gateway,
    get_session,
    get_settings,
    get_video_provider,
)
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import OAuthFlow, ProviderConnection, User
from videoagent.providers.base import VideoProvider
from videoagent.providers.oauth import KlingOAuthGateway, OAuthTokens, pkce_challenge
from videoagent.providers.pippit import (
    PippitCLIError,
    PippitCLIUnavailable,
    PippitNotAuthenticated,
    PippitVideoProvider,
)
from videoagent.security import (
    decrypt_secret,
    encrypt_secret,
    hash_session_token,
    new_session_token,
)
from videoagent.services.model_catalog import model_catalog

router = APIRouter(prefix="/providers", tags=["providers"])


def _pippit_provider(provider: VideoProvider) -> PippitVideoProvider:
    if not isinstance(provider, PippitVideoProvider):
        raise AppError(
            status_code=409,
            code="PIPPIT_NOT_CONFIGURED",
            message="The Pippit video provider is not active.",
        )
    return provider


@router.get("/pippit")
async def pippit_status(
    user: Annotated[User, Depends(get_current_user)],
    provider: Annotated[VideoProvider, Depends(get_video_provider)],
) -> dict[str, object]:
    del user
    try:
        status = await _pippit_provider(provider).account_status()
    except PippitCLIUnavailable as exc:
        raise AppError(
            status_code=503,
            code="PIPPIT_CLI_UNAVAILABLE",
            message="Pippit CLI is not available on the server.",
        ) from exc
    except PippitCLIError as exc:
        raise AppError(
            status_code=502,
            code="PIPPIT_STATUS_UNAVAILABLE",
            message="The Pippit account status is temporarily unavailable.",
        ) from exc
    return {
        "provider": "pippit",
        "connected": status.get("logged_in") is True,
        "scope": "server",
    }


@router.get("/pippit/credits")
async def pippit_credits(
    user: Annotated[User, Depends(get_current_user)],
    provider: Annotated[VideoProvider, Depends(get_video_provider)],
) -> dict[str, object]:
    del user
    pippit = _pippit_provider(provider)
    try:
        credits = await pippit.get_credit_balance()
    except PippitNotAuthenticated:
        return {
            "provider": "pippit",
            "connected": False,
            "credits": None,
        }
    except PippitCLIUnavailable as exc:
        raise AppError(
            status_code=503,
            code="PIPPIT_CLI_UNAVAILABLE",
            message="Pippit CLI is not available on the server.",
        ) from exc
    except PippitCLIError as exc:
        raise AppError(
            status_code=502,
            code="PIPPIT_CREDITS_UNAVAILABLE",
            message="The Pippit credit balance is temporarily unavailable.",
        ) from exc
    return {
        "provider": "pippit",
        "connected": True,
        "credits": credits,
    }


@router.get("/models")
async def list_models(
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    """Public catalogue so the UI can render model choices without hardcoding."""
    return {"items": [option.as_dict() for option in model_catalog(settings)]}


KLING_OAUTH_TTL = timedelta(minutes=10)


@router.get("/kling")
async def kling_status(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> dict[str, object]:
    connection = await session.scalar(
        select(ProviderConnection).where(
            ProviderConnection.user_id == user.id,
            ProviderConnection.provider == "kling",
        )
    )
    return {
        "provider": "kling",
        "connected": connection is not None,
        "scope": "user",
    }


@router.get("/kling/connect")
async def kling_connect(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    gateway: Annotated[KlingOAuthGateway, Depends(get_kling_gateway)],
) -> dict[str, str]:
    redirect_uri = settings.kling_oauth_redirect_uri
    client_id = settings.kling_oauth_client_id
    if not client_id:
        client_id = await gateway.register_client(
            redirect_uri=redirect_uri,
            scopes=settings.kling_scopes,
        )
    state = new_session_token()
    verifier = new_session_token()
    session.add(
        OAuthFlow(
            state_hash=hash_session_token(state),
            user_id=user.id,
            provider="kling",
            client_id=client_id,
            redirect_uri=redirect_uri,
            code_verifier_encrypted=encrypt_secret(
                verifier,
                settings.token_encryption_key,
            ),
            scopes=list(settings.kling_scopes),
            expires_at=datetime.now(UTC) + KLING_OAUTH_TTL,
        )
    )
    await session.commit()
    url = gateway.authorization_url(
        client_id=client_id,
        redirect_uri=redirect_uri,
        state=state,
        code_challenge=pkce_challenge(verifier),
        scopes=settings.kling_scopes,
        resource=settings.kling_mcp_url,
    )
    return {"authorization_url": url}


@router.get("/kling/callback")
async def kling_callback(
    code: str,
    state: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    gateway: Annotated[KlingOAuthGateway, Depends(get_kling_gateway)],
) -> RedirectResponse:
    flow = await session.scalar(
        select(OAuthFlow).where(
            OAuthFlow.state_hash == hash_session_token(state),
            OAuthFlow.provider == "kling",
            OAuthFlow.used_at.is_(None),
        )
    )
    now = datetime.now(UTC)
    if flow is None or flow.expires_at.replace(tzinfo=UTC) <= now:
        raise AppError(
            status_code=400,
            code="KLING_OAUTH_STATE_INVALID",
            message="The Kling authorization request expired. Start again.",
        )
    verifier = decrypt_secret(
        flow.code_verifier_encrypted,
        settings.token_encryption_key,
    )
    tokens: OAuthTokens = await gateway.exchange_code(
        code=code,
        client_id=flow.client_id,
        redirect_uri=flow.redirect_uri,
        code_verifier=verifier,
        resource=settings.kling_mcp_url,
    )
    flow.used_at = now
    connection = await session.scalar(
        select(ProviderConnection).where(
            ProviderConnection.user_id == flow.user_id,
            ProviderConnection.provider == "kling",
        )
    )
    if connection is None:
        connection = ProviderConnection(
            user_id=flow.user_id,
            provider="kling",
            access_token_encrypted=encrypt_secret(
                tokens.access_token,
                settings.token_encryption_key,
            ),
        )
    connection.access_token_encrypted = encrypt_secret(
        tokens.access_token,
        settings.token_encryption_key,
    )
    if tokens.refresh_token:
        connection.refresh_token_encrypted = encrypt_secret(
            tokens.refresh_token,
            settings.token_encryption_key,
        )
    connection.expires_at = (
        now + timedelta(seconds=tokens.expires_in) if tokens.expires_in else None
    )
    connection.connection_metadata = {
        "client_id": flow.client_id,
        "scopes": list(flow.scopes),
    }
    session.add(connection)
    await session.commit()
    target = f"{settings.frontend_base_url.rstrip('/')}?{urlencode({'kling': 'connected'})}"
    return RedirectResponse(target, status_code=303)


@router.delete("/kling", status_code=204)
async def kling_disconnect(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    connection = await session.scalar(
        select(ProviderConnection).where(
            ProviderConnection.user_id == user.id,
            ProviderConnection.provider == "kling",
        )
    )
    if connection is not None:
        await session.delete(connection)
        await session.commit()

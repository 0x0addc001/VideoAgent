from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.config import Settings
from videoagent.models import ProviderConnection
from videoagent.providers.oauth import KlingOAuthGateway
from videoagent.security import decrypt_secret, encrypt_secret


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


async def resolve_kling_access_token(
    session: AsyncSession,
    *,
    user_id: object,
    settings: Settings,
    gateway: KlingOAuthGateway,
) -> str | None:
    result = await session.execute(
        select(ProviderConnection).where(
            ProviderConnection.user_id == user_id,
            ProviderConnection.provider == "kling",
        )
    )
    connection = result.scalar_one_or_none()
    if connection is None:
        return None

    now = datetime.now(UTC)
    access_token = decrypt_secret(
        connection.access_token_encrypted,
        settings.token_encryption_key,
    )
    if connection.expires_at is None or _as_utc(connection.expires_at) > now + timedelta(
        seconds=60
    ):
        return access_token
    if connection.refresh_token_encrypted is None:
        return access_token

    refresh_token = decrypt_secret(
        connection.refresh_token_encrypted,
        settings.token_encryption_key,
    )
    client_id = settings.kling_oauth_client_id or str(
        connection.connection_metadata.get("client_id", "")
    )
    if not client_id:
        return access_token
    tokens = await gateway.refresh_access_token(
        refresh_token=refresh_token,
        client_id=client_id,
        resource=settings.kling_mcp_url,
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
    await session.commit()
    return tokens.access_token

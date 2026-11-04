from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import User
from videoagent.providers.base import VideoProvider
from videoagent.providers.kling import KlingVideoProvider
from videoagent.providers.kling_cli import KlingCLIVideoProvider
from videoagent.providers.mcp_client import StreamableHTTPToolClient
from videoagent.providers.mock import MockVideoProvider
from videoagent.providers.oauth import KlingOAuthGateway
from videoagent.services.provider_credentials import resolve_kling_access_token


async def resolve_video_provider(
    session: AsyncSession,
    *,
    user: User,
    settings: Settings,
    gateway: KlingOAuthGateway,
    allow_mock: bool,
    fallback: VideoProvider | None = None,
) -> VideoProvider:
    mode = settings.video_provider.lower()
    if mode == "mock":
        return MockVideoProvider()

    if settings.kling_backend.lower() == "cli":
        return KlingCLIVideoProvider(
            command=settings.kling_cli_command,
            timeout_seconds=settings.kling_cli_timeout_seconds,
        )

    token = await resolve_kling_access_token(
        session,
        user_id=user.id,
        settings=settings,
        gateway=gateway,
    )
    if token is None:
        if allow_mock and mode == "auto":
            return fallback or MockVideoProvider()
        raise AppError(
            status_code=409,
            code="KLING_NOT_CONNECTED",
            message="Connect a Kling account before generating.",
        )

    client = StreamableHTTPToolClient(settings.kling_mcp_url, token)
    return KlingVideoProvider(client)

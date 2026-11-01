from videoagent.config import Settings
from videoagent.providers.base import VideoProvider
from videoagent.providers.kling import KlingVideoProvider
from videoagent.providers.mcp_client import StreamableHTTPToolClient
from videoagent.providers.mock import MockVideoProvider


def build_video_provider(settings: Settings) -> VideoProvider:
    if settings.video_provider != "kling":
        return MockVideoProvider()
    if not settings.kling_access_token:
        raise ValueError("VIDEOAGENT_KLING_ACCESS_TOKEN is required for the Kling provider")
    client = StreamableHTTPToolClient(
        settings.kling_mcp_url,
        settings.kling_access_token,
    )
    return KlingVideoProvider(client)

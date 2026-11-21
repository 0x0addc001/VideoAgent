from videoagent.config import Settings
from videoagent.providers.base import VideoProvider
from videoagent.providers.mock import MockVideoProvider
from videoagent.providers.pippit import PippitVideoProvider
from videoagent.providers.wanx import WanxVideoProvider


def build_video_provider(settings: Settings) -> VideoProvider:
    mode = settings.video_provider.strip().lower()
    if mode == "mock":
        return MockVideoProvider()
    if mode in {"wanx", "dashscope"}:
        return WanxVideoProvider(
            api_key=settings.wanx_api_key,
            base_url=settings.wanx_base_url,
            model=settings.wanx_model,
            resolution=settings.wanx_resolution,
            timeout_seconds=settings.wanx_timeout_seconds,
        )
    if mode not in {"auto", "pippit"}:
        raise ValueError("VIDEOAGENT_VIDEO_PROVIDER must be auto, pippit, wanx, or mock")
    return PippitVideoProvider(
        command=settings.pippit_cli_command,
        model=settings.pippit_video_model,
        resolution=settings.pippit_video_resolution,
        access_key=settings.pippit_access_key,
        timeout_seconds=settings.pippit_timeout_seconds,
    )

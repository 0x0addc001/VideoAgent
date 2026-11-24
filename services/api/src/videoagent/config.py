from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class ExtraModel(BaseModel):
    """Operator-supplied model appended to the provider catalogue."""

    provider: str
    model: str
    label: str
    kind: Literal["video", "image"] = "video"
    modes: list[Literal["text_to_video", "image_to_video"]] = [
        "text_to_video",
        "image_to_video",
    ]
    max_duration: int = Field(default=15, ge=1, le=120)
    ratios: list[str] = ["16:9", "9:16", "1:1", "4:3", "3:4"]
    max_references: int = Field(default=0, ge=0, le=50)
    supports_audio: bool = False
    credits_per_second: int = Field(default=1, ge=1, le=1000)
    quality_tier: int = Field(default=2, ge=1, le=3)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="VIDEOAGENT_",
        extra="ignore",
    )

    app_name: str = "videoagent-api"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    database_url: str = "sqlite+aiosqlite:///./.data/videoagent.db"
    cookie_name: str = "videoagent_session"
    cookie_secure: bool = False
    session_ttl_days: int = Field(default=14, ge=1, le=90)
    session_secret: str = "development-only-change-me-32-bytes"
    token_encryption_key: str = "development-token-key-change-me!!!!!"
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    admin_emails: list[str] = []
    registration_mode: str = "open"
    generation_enabled: bool = True
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None
    llm_timeout_seconds: int = Field(default=45, ge=5, le=300)
    vision_base_url: str | None = None
    vision_api_key: str | None = None
    vision_models: list[str] = []
    vision_timeout_seconds: int = Field(default=120, ge=10, le=600)
    video_provider: str = "pippit"
    pippit_cli_command: str = "pippit-tool-cli"
    pippit_access_key: str | None = None
    pippit_video_model: str | None = None
    pippit_video_resolution: str | None = None
    pippit_timeout_seconds: int = Field(default=180, ge=10, le=1800)
    wanx_api_key: str | None = None
    wanx_base_url: str = "https://dashscope.aliyuncs.com"
    wanx_model: str = "wan2.6-t2v"
    wanx_resolution: str | None = None
    wanx_timeout_seconds: int = Field(default=300, ge=10, le=1800)
    kling_backend: str = "cli"
    kling_cli_command: str = "kling"
    kling_cli_timeout_seconds: int = Field(default=180, ge=10, le=1800)
    kling_expected_user_id: str | None = None
    kling_mcp_url: str = "https://klingai.com/mcp"
    kling_access_token: str | None = None
    kling_auth_base_url: str = "https://klingai.com/auth"
    kling_oauth_client_id: str | None = None
    kling_oauth_redirect_uri: str = "http://localhost:8000/api/v1/providers/kling/callback"
    kling_scopes: list[str] = [
        "generation.create",
        "generation.read",
        "account.credit.read",
    ]
    frontend_base_url: str = "http://localhost:3000"
    celery_enabled: bool = False
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"
    celery_poll_interval_seconds: int = 5
    media_dir: str = "./.data/media"
    media_storage: Literal["local", "oss"] = "local"
    oss_endpoint: str | None = None
    oss_bucket: str | None = None
    oss_access_key_id: str | None = None
    oss_access_key_secret: str | None = None
    oss_prefix: str = "videoagent"
    max_upload_bytes: int = Field(default=100 * 1024 * 1024, ge=1024)
    ffmpeg_command: str = "ffmpeg"
    ffprobe_command: str = "ffprobe"
    auth_rate_limit_per_minute: int = Field(default=20, ge=1)
    generation_rate_limit_per_minute: int = Field(default=30, ge=1)
    upload_rate_limit_per_minute: int = Field(default=20, ge=1)
    starting_user_credits: int = Field(default=0, ge=0)
    cli_model_discovery_enabled: bool = True
    demo_project_id: str | None = None
    extra_models: list[ExtraModel] = []
    disabled_models: list[str] = []

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")

    def ensure_runtime_paths(self) -> None:
        Path(self.media_dir).expanduser().resolve().mkdir(parents=True, exist_ok=True)
        if not self.is_sqlite:
            return
        database_path = self.database_url.removeprefix("sqlite+aiosqlite:///")
        if database_path == ":memory:":
            return
        Path(database_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    return Settings()

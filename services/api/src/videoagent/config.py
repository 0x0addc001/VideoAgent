from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    video_provider: str = "pippit"
    pippit_cli_command: str = "pippit-tool-cli"
    pippit_access_key: str | None = None
    pippit_video_model: str | None = None
    pippit_video_resolution: str | None = None
    pippit_timeout_seconds: int = Field(default=180, ge=10, le=1800)
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
    max_upload_bytes: int = Field(default=100 * 1024 * 1024, ge=1024)
    ffmpeg_command: str = "ffmpeg"
    ffprobe_command: str = "ffprobe"
    auth_rate_limit_per_minute: int = Field(default=20, ge=1)
    generation_rate_limit_per_minute: int = Field(default=30, ge=1)
    upload_rate_limit_per_minute: int = Field(default=20, ge=1)
    starting_user_credits: int = Field(default=0, ge=0)

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

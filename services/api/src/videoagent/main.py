from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from videoagent.agent.graph import StoryboardAgent
from videoagent.agent.planner import build_storyboard_planner
from videoagent.api.admin import router as admin_router
from videoagent.api.agent import router as agent_router
from videoagent.api.assets import router as assets_router
from videoagent.api.auth import router as auth_router
from videoagent.api.credits import router as credits_router
from videoagent.api.evaluation import router as evaluation_router
from videoagent.api.generation import router as generation_router
from videoagent.api.health import router as health_router
from videoagent.api.projects import router as projects_router
from videoagent.api.providers import router as providers_router
from videoagent.api.storyboards import router as storyboards_router
from videoagent.config import Settings, get_settings
from videoagent.db import Database
from videoagent.errors import AppError, app_error_handler
from videoagent.middleware import CSRFMiddleware, RateLimitMiddleware
from videoagent.providers.base import VideoProvider
from videoagent.providers.factory import build_video_provider
from videoagent.providers.oauth import build_kling_oauth_gateway


def create_app(
    settings: Settings | None = None,
    video_provider: VideoProvider | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        database = Database(resolved_settings)
        application.state.settings = resolved_settings
        application.state.database = database
        application.state.video_provider = video_provider or build_video_provider(resolved_settings)
        application.state.kling_gateway = build_kling_oauth_gateway(resolved_settings)
        application.state.storyboard_agent = StoryboardAgent(
            build_storyboard_planner(resolved_settings)
        )
        await database.create_schema()
        try:
            yield
        finally:
            await database.dispose()

    application = FastAPI(
        title="VideoAgent API",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(
        RateLimitMiddleware,
        auth_limit=resolved_settings.auth_rate_limit_per_minute,
        generation_limit=resolved_settings.generation_rate_limit_per_minute,
        upload_limit=resolved_settings.upload_rate_limit_per_minute,
    )
    application.add_middleware(
        CSRFMiddleware,
        allowed_origins=resolved_settings.allowed_origins,
    )
    application.add_exception_handler(AppError, app_error_handler)  # type: ignore[arg-type]
    application.include_router(health_router, prefix=resolved_settings.api_prefix)
    application.include_router(auth_router, prefix=resolved_settings.api_prefix)
    application.include_router(admin_router, prefix=resolved_settings.api_prefix)
    application.include_router(credits_router, prefix=resolved_settings.api_prefix)
    application.include_router(projects_router, prefix=resolved_settings.api_prefix)
    application.include_router(storyboards_router, prefix=resolved_settings.api_prefix)
    application.include_router(evaluation_router, prefix=resolved_settings.api_prefix)
    application.include_router(generation_router, prefix=resolved_settings.api_prefix)
    application.include_router(agent_router, prefix=resolved_settings.api_prefix)
    application.include_router(providers_router, prefix=resolved_settings.api_prefix)
    application.include_router(assets_router, prefix=resolved_settings.api_prefix)
    return application


app = create_app()

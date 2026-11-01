from collections.abc import AsyncIterator
from typing import Annotated, cast

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.agent.graph import StoryboardAgent
from videoagent.config import Settings
from videoagent.db import Database
from videoagent.errors import AppError
from videoagent.models import User
from videoagent.providers.base import VideoProvider
from videoagent.providers.oauth import KlingOAuthGateway
from videoagent.services.auth import get_user_for_session
from videoagent.services.provider_resolver import resolve_video_provider


def get_settings(request: Request) -> Settings:
    return cast(Settings, request.app.state.settings)


def get_database(request: Request) -> Database:
    return cast(Database, request.app.state.database)


def get_storyboard_agent(request: Request) -> StoryboardAgent:
    return cast(StoryboardAgent, request.app.state.storyboard_agent)


def get_kling_oauth_gateway(request: Request) -> KlingOAuthGateway:
    return cast(KlingOAuthGateway, request.app.state.kling_oauth)


async def get_session(
    database: Annotated[Database, Depends(get_database)],
) -> AsyncIterator[AsyncSession]:
    async with database.session() as session:
        yield session


async def get_current_user(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> User:
    token = request.cookies.get(settings.cookie_name)
    if token is None:
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Authentication is required.",
        )
    user = await get_user_for_session(session, token)
    if user is None:
        raise AppError(
            status_code=401,
            code="AUTHENTICATION_REQUIRED",
            message="Authentication is required.",
        )
    return user


async def get_video_provider(
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    gateway: Annotated[KlingOAuthGateway, Depends(get_kling_oauth_gateway)],
    user: Annotated[User, Depends(get_current_user)],
) -> VideoProvider:
    return await resolve_video_provider(
        session,
        user=user,
        settings=settings,
        gateway=gateway,
        allow_mock=True,
        fallback=cast(VideoProvider, request.app.state.video_provider),
    )

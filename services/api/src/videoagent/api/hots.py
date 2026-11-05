from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.api.skills import user_namespace
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Asset, HotsPost, User
from videoagent.schemas import HotsPostList, HotsPostRead
from videoagent.services.media import asset_path, save_upload

router = APIRouter(prefix="/hots", tags=["hots"])


def _post_read(post: HotsPost, owner: User, current_user: User) -> HotsPostRead:
    return HotsPostRead(
        id=post.id,
        asset_id=post.asset_id,
        title=post.title,
        prompt=post.prompt,
        skill=post.skill_id,
        author=user_namespace(owner.email),
        likes=post.like_count,
        is_mine=post.owner_id == current_user.id,
        created_at=post.created_at,
    )


@router.get("", response_model=HotsPostList)
async def list_hots_posts(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    mine: Annotated[bool, Query()] = False,
) -> HotsPostList:
    statement = (
        select(HotsPost, User)
        .join(User, User.id == HotsPost.owner_id)
        .join(Asset, Asset.id == HotsPost.asset_id)
        .where(Asset.deleted_at.is_(None))
        .order_by(HotsPost.created_at.desc())
    )
    if mine:
        statement = statement.where(HotsPost.owner_id == user.id)
    rows = (await session.execute(statement)).all()
    return HotsPostList(items=[_post_read(post, owner, user) for post, owner in rows])


@router.post("", response_model=HotsPostRead, status_code=status.HTTP_201_CREATED)
async def publish_hots_post(
    file: Annotated[UploadFile, File()],
    title: Annotated[str, Form(min_length=1, max_length=200)],
    prompt: Annotated[str, Form(max_length=20_000)],
    skill: Annotated[str, Form(max_length=120)],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> HotsPostRead:
    if file.content_type != "video/mp4":
        raise AppError(
            status_code=422,
            code="HOTS_VIDEO_REQUIRED",
            message="Hots posts require an MP4 video.",
        )
    normalized_title = title.strip()
    if not normalized_title:
        raise AppError(
            status_code=422,
            code="HOTS_TITLE_REQUIRED",
            message="A title is required.",
        )
    asset = await save_upload(
        session,
        owner_id=user.id,
        project_id=None,
        upload=file,
        settings=settings,
    )
    asset.permission = "public"
    post = HotsPost(
        owner_id=user.id,
        asset_id=asset.id,
        title=normalized_title,
        prompt=prompt.strip(),
        skill_id=skill.strip() or "auto",
    )
    session.add(asset)
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return _post_read(post, user, user)


@router.get("/{post_id}/video")
async def get_hots_video(
    post_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    post = await session.get(HotsPost, post_id)
    if post is None:
        raise AppError(
            status_code=404,
            code="HOTS_POST_NOT_FOUND",
            message="The Hots post was not found.",
        )
    asset = await session.get(Asset, post.asset_id)
    if asset is None or asset.deleted_at is not None or asset.permission != "public":
        raise AppError(
            status_code=404,
            code="HOTS_VIDEO_NOT_FOUND",
            message="The Hots video was not found.",
        )
    path = asset_path(asset, settings)
    if not path.exists():
        raise AppError(
            status_code=404,
            code="HOTS_VIDEO_NOT_FOUND",
            message="The Hots video file was not found.",
        )
    return FileResponse(path, media_type=asset.content_type, filename=asset.filename)

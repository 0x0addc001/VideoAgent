from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.api.skills import user_namespace
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Asset, HotsLike, HotsPost, User
from videoagent.schemas import HotsPostList, HotsPostRead, HotsPublishFromAsset
from videoagent.services.media import asset_path, save_upload
from videoagent.services.storyboards import owned_project_or_404

router = APIRouter(prefix="/hots", tags=["hots"])


def _post_read(
    post: HotsPost,
    owner: User,
    current_user: User,
    *,
    likes: int = 0,
    is_liked: bool = False,
) -> HotsPostRead:
    return HotsPostRead(
        id=post.id,
        asset_id=post.asset_id,
        title=post.title,
        prompt=post.prompt,
        skill=post.skill_id,
        author=user_namespace(owner.email),
        likes=likes,
        is_mine=post.owner_id == current_user.id,
        is_liked=is_liked,
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
    post_ids = [post.id for post, _owner in rows]
    like_counts: dict[UUID, int] = {}
    liked_post_ids: set[UUID] = set()
    if post_ids:
        like_counts = dict(
            (
                await session.execute(
                    select(HotsLike.post_id, func.count(HotsLike.id))
                    .where(HotsLike.post_id.in_(post_ids))
                    .group_by(HotsLike.post_id)
                )
            ).all()
        )
        liked_post_ids = set(
            (
                await session.scalars(
                    select(HotsLike.post_id).where(
                        HotsLike.post_id.in_(post_ids),
                        HotsLike.user_id == user.id,
                    )
                )
            ).all()
        )
    return HotsPostList(
        items=[
            _post_read(
                post,
                owner,
                user,
                likes=like_counts.get(post.id, 0),
                is_liked=post.id in liked_post_ids,
            )
            for post, owner in rows
        ]
    )


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


@router.post(
    "/from-asset/{asset_id}",
    response_model=HotsPostRead,
    status_code=status.HTTP_201_CREATED,
)
async def publish_asset_to_hots(
    asset_id: UUID,
    payload: HotsPublishFromAsset,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> HotsPostRead:
    asset = await session.get(Asset, asset_id)
    if asset is None or asset.deleted_at is not None:
        raise AppError(
            status_code=404,
            code="ASSET_NOT_FOUND",
            message="The final-cut asset was not found.",
        )
    if asset.project_id is not None:
        await owned_project_or_404(session, asset.project_id, user.id)
    elif asset.owner_id != user.id:
        raise AppError(
            status_code=404,
            code="ASSET_NOT_FOUND",
            message="The final-cut asset was not found.",
        )
    if asset.kind != "export" or not asset.content_type.startswith("video/"):
        raise AppError(
            status_code=422,
            code="EXPORTED_VIDEO_REQUIRED",
            message="Only an exported final-cut video can be published.",
        )
    existing = await session.scalar(select(HotsPost).where(HotsPost.asset_id == asset.id))
    if existing is not None:
        owner = await session.get(User, existing.owner_id)
        if owner is None:
            raise AppError(
                status_code=404,
                code="HOTS_POST_NOT_FOUND",
                message="The published video was not found.",
            )
        return _post_read(existing, owner, user)
    asset.permission = "public"
    post = HotsPost(
        owner_id=user.id,
        asset_id=asset.id,
        title=payload.title.strip(),
        prompt=payload.prompt.strip(),
        skill_id=payload.skill.strip() or "auto",
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return _post_read(post, user, user)


@router.post("/{post_id}/like", response_model=HotsPostRead)
async def toggle_hots_like(
    post_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> HotsPostRead:
    post = await session.get(HotsPost, post_id)
    if post is None:
        raise AppError(
            status_code=404,
            code="HOTS_POST_NOT_FOUND",
            message="The Hots post was not found.",
        )
    if post.owner_id == user.id:
        raise AppError(
            status_code=409,
            code="SELF_LIKE_NOT_ALLOWED",
            message="A Hots post cannot be liked by its author.",
        )
    owner = await session.get(User, post.owner_id)
    if owner is None:
        raise AppError(
            status_code=404,
            code="HOTS_POST_NOT_FOUND",
            message="The Hots post was not found.",
        )
    existing = await session.scalar(
        select(HotsLike).where(
            HotsLike.post_id == post.id,
            HotsLike.user_id == user.id,
        )
    )
    if existing is None:
        session.add(HotsLike(post_id=post.id, user_id=user.id))
    else:
        await session.delete(existing)
    await session.flush()
    likes = (
        await session.scalar(
            select(func.count(HotsLike.id)).where(HotsLike.post_id == post.id)
        )
        or 0
    )
    is_liked = existing is None
    await session.commit()
    return _post_read(post, owner, user, likes=likes, is_liked=is_liked)


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

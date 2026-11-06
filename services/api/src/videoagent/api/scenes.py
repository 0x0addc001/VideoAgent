from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Project, Scene, Storyboard, User
from videoagent.schemas import AssetRead
from videoagent.services.media import asset_read, save_upload
from videoagent.services.storyboards import owned_project_or_404

router = APIRouter(prefix="/scenes", tags=["scenes"])


async def owned_scene_or_404(
    session: AsyncSession,
    scene_id: UUID,
    user_id: UUID,
) -> tuple[Scene, Project]:
    row = (
        await session.execute(
            select(Scene, Project)
            .join(Storyboard, Storyboard.id == Scene.storyboard_id)
            .join(Project, Project.id == Storyboard.project_id)
            .where(Scene.id == scene_id)
        )
    ).one_or_none()
    if row is None:
        raise AppError(
            status_code=404,
            code="SCENE_NOT_FOUND",
            message="The scene was not found.",
        )
    scene, project = row
    await owned_project_or_404(session, project.id, user_id)
    return scene, project


@router.post(
    "/{scene_id}/assets",
    response_model=AssetRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_scene_image(
    scene_id: UUID,
    file: Annotated[UploadFile, File()],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AssetRead:
    scene, project = await owned_scene_or_404(session, scene_id, user.id)
    if not (file.content_type or "").startswith("image/"):
        raise AppError(
            status_code=422,
            code="IMAGE_REQUIRED",
            message="Scene assets must be image files.",
        )
    asset = await save_upload(
        session,
        owner_id=user.id,
        project_id=project.id,
        upload=file,
        settings=settings,
    )
    asset.filename = f"scene-{scene.id}-{asset.filename}"[:256]
    await session.commit()
    await session.refresh(asset)
    return asset_read(asset)

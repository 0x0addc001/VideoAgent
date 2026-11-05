from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Asset, User
from videoagent.schemas import (
    ProjectProgressRead,
    VisualReviewCommand,
    VisualReviewModelList,
    VisualReviewModelRead,
    VisualReviewRead,
)
from videoagent.services.media import asset_path
from videoagent.services.progress import project_progress
from videoagent.services.storyboards import load_storyboard, owned_project_or_404
from videoagent.services.visual_review import evaluate_final_cut
from videoagent.services.workflow import get_or_create_workflow

router = APIRouter(prefix="/projects/{project_id}", tags=["evaluation"])


@router.get("/progress", response_model=ProjectProgressRead)
async def get_project_progress(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectProgressRead:
    project = await owned_project_or_404(session, project_id, user.id)
    workflow = await get_or_create_workflow(session, project_id=project.id)
    storyboard = await load_storyboard(session, project.id)
    return project_progress(project, workflow, storyboard)


@router.get("/visual-review/models", response_model=VisualReviewModelList)
async def list_visual_review_models(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> VisualReviewModelList:
    await owned_project_or_404(session, project_id, user.id)
    configured = bool(settings.vision_api_key and settings.vision_base_url)
    models = settings.vision_models if configured else []
    return VisualReviewModelList(
        items=[VisualReviewModelRead(id=model, label=model) for model in models]
    )


@router.post("/visual-review", response_model=VisualReviewRead)
async def review_final_cut(
    project_id: UUID,
    command: VisualReviewCommand,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> VisualReviewRead:
    project = await owned_project_or_404(session, project_id, user.id)
    asset = await session.scalar(
        select(Asset).where(
            Asset.id == command.asset_id,
            Asset.project_id == project.id,
            Asset.owner_id == user.id,
            Asset.kind == "export",
            Asset.deleted_at.is_(None),
        )
    )
    if asset is None:
        raise AppError(
            status_code=404,
            code="FINAL_CUT_NOT_FOUND",
            message="The selected final cut was not found.",
        )
    path = asset_path(asset, settings)
    if not path.exists():
        raise AppError(
            status_code=404,
            code="FINAL_CUT_FILE_NOT_FOUND",
            message="The selected final cut file is unavailable.",
        )
    return await evaluate_final_cut(
        asset_id=asset.id,
        video_path=path,
        command=command,
        settings=settings,
    )

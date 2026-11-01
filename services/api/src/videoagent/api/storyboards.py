from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session
from videoagent.errors import AppError
from videoagent.models import User
from videoagent.schemas import StoryboardRead, StoryboardReplace
from videoagent.services.storyboards import (
    load_storyboard,
    owned_project_or_404,
)
from videoagent.services.storyboards import replace_storyboard as replace_storyboard_service

router = APIRouter(prefix="/projects/{project_id}/storyboard", tags=["storyboards"])


@router.get("", response_model=StoryboardRead)
async def get_storyboard(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StoryboardRead:
    await owned_project_or_404(session, project_id, user.id)
    storyboard = await load_storyboard(session, project_id)
    if storyboard is None:
        raise AppError(
            status_code=404,
            code="STORYBOARD_NOT_FOUND",
            message="This project does not have a storyboard yet.",
        )
    return StoryboardRead.model_validate(storyboard)


@router.put("", response_model=StoryboardRead)
async def replace_storyboard(
    project_id: UUID,
    payload: StoryboardReplace,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StoryboardRead:
    await owned_project_or_404(session, project_id, user.id)
    storyboard = await replace_storyboard_service(session, project_id, payload.shots)
    await session.commit()
    return StoryboardRead.model_validate(storyboard)

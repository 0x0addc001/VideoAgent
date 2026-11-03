from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session
from videoagent.errors import AppError
from videoagent.models import User
from videoagent.schemas import EvaluationRead
from videoagent.services.evaluation import evaluate_storyboard
from videoagent.services.storyboards import load_storyboard, owned_project_or_404

router = APIRouter(prefix="/projects/{project_id}", tags=["evaluation"])


@router.post("/evaluate", response_model=EvaluationRead)
async def evaluate_project(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> EvaluationRead:
    await owned_project_or_404(session, project_id, user.id)
    storyboard = await load_storyboard(session, project_id)
    if storyboard is None:
        raise AppError(
            status_code=404,
            code="STORYBOARD_NOT_FOUND",
            message="This project does not have a storyboard yet.",
        )
    return evaluate_storyboard(storyboard.shots)

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session
from videoagent.models import AgentActivity, User
from videoagent.schemas import AgentActivityList, AgentActivityRead
from videoagent.services.storyboards import owned_project_or_404

router = APIRouter(tags=["agent"])


@router.get(
    "/projects/{project_id}/agent-activity/{run_id}",
    response_model=AgentActivityList,
)
async def list_agent_activity(
    project_id: UUID,
    run_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AgentActivityList:
    await owned_project_or_404(session, project_id, user.id)
    activities = (
        await session.scalars(
            select(AgentActivity)
            .where(
                AgentActivity.project_id == project_id,
                AgentActivity.run_id == run_id,
            )
            .order_by(AgentActivity.sequence)
        )
    ).all()
    return AgentActivityList(
        items=[AgentActivityRead.model_validate(activity) for activity in activities]
    )

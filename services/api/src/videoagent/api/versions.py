from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session
from videoagent.models import User
from videoagent.schemas import (
    StoryboardRead,
    StoryboardVersionCreate,
    StoryboardVersionList,
    StoryboardVersionRead,
)
from videoagent.services.storyboard_versions import (
    list_storyboard_versions,
    restore_storyboard_version,
    save_storyboard_version,
)
from videoagent.services.storyboards import owned_project_or_404

router = APIRouter(prefix="/projects/{project_id}/versions", tags=["versions"])


@router.get("", response_model=StoryboardVersionList)
async def get_versions(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StoryboardVersionList:
    await owned_project_or_404(
        session,
        project_id,
        user.id,
        required_permission="view",
    )
    return StoryboardVersionList(items=await list_storyboard_versions(session, project_id))


@router.post(
    "",
    response_model=StoryboardVersionRead,
    status_code=status.HTTP_201_CREATED,
)
async def save_version(
    project_id: UUID,
    payload: StoryboardVersionCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StoryboardVersionRead:
    project = await owned_project_or_404(session, project_id, user.id)
    return await save_storyboard_version(
        session,
        project=project,
        user_id=user.id,
        payload=payload,
    )


@router.post("/{version_id}/restore", response_model=StoryboardRead)
async def restore_version(
    project_id: UUID,
    version_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StoryboardRead:
    await owned_project_or_404(session, project_id, user.id)
    return await restore_storyboard_version(
        session,
        project_id=project_id,
        version_id=version_id,
    )

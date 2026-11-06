from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Project, User
from videoagent.schemas import (
    CollaborationPermission,
    ProjectCollaborationAcceptRead,
    ProjectCollaborationCreate,
    ProjectCollaborationRead,
)
from videoagent.services.collaboration import (
    accept_project_collaboration,
    create_project_collaboration,
    resolve_project_collaboration,
)

router = APIRouter(tags=["collaboration"])


@router.post(
    "/projects/{project_id}/collaborations",
    response_model=ProjectCollaborationRead,
)
async def create_collaboration(
    project_id: UUID,
    payload: ProjectCollaborationCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ProjectCollaborationRead:
    project = await session.scalar(
        select(Project).where(Project.id == project_id, Project.owner_id == user.id)
    )
    if project is None:
        raise AppError(
            status_code=404,
            code="PROJECT_NOT_FOUND",
            message="The project was not found.",
        )
    collaboration, token = await create_project_collaboration(
        session,
        project=project,
        owner_id=user.id,
        payload=payload,
    )
    return ProjectCollaborationRead(
        id=collaboration.id,
        project_id=project.id,
        permission=cast(CollaborationPermission, collaboration.permission),
        collaborator_email=collaboration.collaborator_email,
        share_url=(
            f"{settings.frontend_base_url.rstrip('/')}/en/collaboration/{token}"
        ),
        expires_at=collaboration.expires_at,
        created_at=collaboration.created_at,
    )


@router.post(
    "/collaborations/{token}/accept",
    response_model=ProjectCollaborationAcceptRead,
)
async def accept_collaboration(
    token: str,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectCollaborationAcceptRead:
    collaboration = await accept_project_collaboration(
        session,
        token=token,
        user=user,
    )
    return ProjectCollaborationAcceptRead(
        project_id=collaboration.project_id,
        permission=cast(CollaborationPermission, collaboration.permission),
    )


@router.get(
    "/collaborations/{token}",
    response_model=ProjectCollaborationRead,
)
async def inspect_collaboration(
    token: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ProjectCollaborationRead:
    collaboration = await resolve_project_collaboration(session, token)
    return ProjectCollaborationRead(
        id=collaboration.id,
        project_id=collaboration.project_id,
        permission=cast(CollaborationPermission, collaboration.permission),
        collaborator_email=collaboration.collaborator_email,
        share_url=(
            f"{settings.frontend_base_url.rstrip('/')}/en/collaboration/{token}"
        ),
        expires_at=collaboration.expires_at,
        created_at=collaboration.created_at,
    )

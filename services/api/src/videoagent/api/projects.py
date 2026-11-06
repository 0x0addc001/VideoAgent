from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session
from videoagent.models import (
    Project,
    ProjectCollaborator,
    ProjectState,
    ProjectWorkflow,
    User,
)
from videoagent.schemas import ProjectCreate, ProjectList, ProjectRead, ProjectUpdate
from videoagent.services.storyboards import (
    owned_project_or_404,
    project_access_permission,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectList)
async def list_projects(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectList:
    result = await session.execute(
        select(Project)
        .where(Project.owner_id == user.id, Project.state != ProjectState.ARCHIVED.value)
        .order_by(Project.created_at.desc())
    )
    projects_by_id = {project.id: project for project in result.scalars()}
    shared = (
        await session.execute(
            select(Project, ProjectCollaborator)
            .join(ProjectCollaborator, ProjectCollaborator.project_id == Project.id)
            .where(
                ProjectCollaborator.user_id == user.id,
                Project.state != ProjectState.ARCHIVED.value,
            )
        )
    ).all()
    permissions = {project_id: "owner" for project_id in projects_by_id}
    for project, membership in shared:
        projects_by_id[project.id] = project
        permissions[project.id] = membership.permission
    return ProjectList(
        items=[
            ProjectRead.model_validate(project).model_copy(
                update={"access_permission": permissions[project.id]}
            )
            for project in sorted(
                projects_by_id.values(),
                key=lambda item: item.created_at,
                reverse=True,
            )
        ]
    )


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectRead:
    project = Project(
        owner_id=user.id,
        title=payload.title.strip(),
        brief=payload.brief.strip(),
        state=ProjectState.DRAFT.value,
    )
    session.add(project)
    await session.flush()
    session.add(
        ProjectWorkflow(
            project_id=project.id,
            stage="concept",
            status="awaiting_approval",
        )
    )
    await session.commit()
    await session.refresh(project)
    return ProjectRead.model_validate(project)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectRead:
    project = await owned_project_or_404(
        session,
        project_id,
        user.id,
        required_permission="view",
    )
    _, permission = await project_access_permission(session, project_id, user.id)
    return ProjectRead.model_validate(project).model_copy(
        update={"access_permission": permission or "view"}
    )


@router.patch("/{project_id}", response_model=ProjectRead)
async def rename_project(
    project_id: UUID,
    payload: ProjectUpdate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectRead:
    project = await owned_project_or_404(session, project_id, user.id)
    if payload.title is not None:
        project.title = payload.title.strip()
    if payload.brief is not None:
        project.brief = payload.brief.strip()
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return ProjectRead.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    project = await owned_project_or_404(
        session,
        project_id,
        user.id,
        required_permission="owner",
    )
    project.state = ProjectState.ARCHIVED.value
    session.add(project)
    await session.commit()

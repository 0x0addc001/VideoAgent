from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session
from videoagent.errors import AppError
from videoagent.models import Project, ProjectState, User
from videoagent.schemas import ProjectCreate, ProjectList, ProjectRead

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
    return ProjectList(items=[ProjectRead.model_validate(item) for item in result.scalars()])


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
    await session.commit()
    await session.refresh(project)
    return ProjectRead.model_validate(project)


@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ProjectRead:
    result = await session.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == user.id,
            Project.state != ProjectState.ARCHIVED.value,
        )
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise AppError(
            status_code=404,
            code="PROJECT_NOT_FOUND",
            message="The project was not found.",
        )
    return ProjectRead.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    result = await session.execute(
        select(Project).where(
            Project.id == project_id,
            Project.owner_id == user.id,
            Project.state != ProjectState.ARCHIVED.value,
        )
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise AppError(
            status_code=404,
            code="PROJECT_NOT_FOUND",
            message="The project was not found.",
        )
    project.state = ProjectState.ARCHIVED.value
    session.add(project)
    await session.commit()

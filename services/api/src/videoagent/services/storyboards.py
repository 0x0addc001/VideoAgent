from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from videoagent.errors import AppError
from videoagent.models import Project, Shot, Storyboard
from videoagent.schemas import ShotInput


async def owned_project_or_404(
    session: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> Project:
    result = await session.execute(
        select(Project).where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalar_one_or_none()
    if project is None:
        raise AppError(
            status_code=404,
            code="PROJECT_NOT_FOUND",
            message="The project was not found.",
        )
    return project


async def load_storyboard(
    session: AsyncSession,
    project_id: UUID,
) -> Storyboard | None:
    result = await session.execute(
        select(Storyboard)
        .options(selectinload(Storyboard.shots))
        .where(Storyboard.project_id == project_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def replace_storyboard(
    session: AsyncSession,
    project_id: UUID,
    shots: list[ShotInput],
) -> Storyboard:
    storyboard = await load_storyboard(session, project_id)
    if storyboard is None:
        storyboard = Storyboard(project_id=project_id, version=1)
        session.add(storyboard)
        await session.flush()
    else:
        await session.execute(delete(Shot).where(Shot.storyboard_id == storyboard.id))
        storyboard.version += 1
        await session.flush()

    for index, shot_data in enumerate(shots):
        session.add(
            Shot(
                storyboard_id=storyboard.id,
                index=index,
                description=shot_data.description,
                prompt_en=shot_data.prompt_en,
                prompt_zh=shot_data.prompt_zh,
                duration_seconds=shot_data.duration_seconds,
                aspect_ratio=shot_data.aspect_ratio,
                generation_mode=shot_data.generation_mode,
                status="ready",
            )
        )
    await session.flush()
    saved = await load_storyboard(session, project_id)
    if saved is None:
        raise RuntimeError("storyboard disappeared after replacement")
    return saved

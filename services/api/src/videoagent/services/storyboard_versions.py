from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.errors import AppError
from videoagent.models import Project, StoryboardVersion
from videoagent.schemas import (
    CharacterInput,
    SceneInput,
    ShotInput,
    StoryboardRead,
    StoryboardVersionCreate,
    StoryboardVersionRead,
)
from videoagent.services.storyboards import load_storyboard, replace_storyboard


def version_read(version: StoryboardVersion) -> StoryboardVersionRead:
    snapshot = StoryboardRead.model_validate(version.snapshot)
    return StoryboardVersionRead(
        id=version.id,
        project_id=version.project_id,
        revision=version.revision,
        label=version.label,
        storyboard_version=version.storyboard_version,
        shot_count=len(snapshot.shots),
        character_count=len(snapshot.characters),
        scene_count=len(snapshot.scenes),
        created_at=version.created_at,
    )


async def list_storyboard_versions(
    session: AsyncSession,
    project_id: UUID,
) -> list[StoryboardVersionRead]:
    versions = (
        await session.scalars(
            select(StoryboardVersion)
            .where(StoryboardVersion.project_id == project_id)
            .order_by(StoryboardVersion.revision.desc())
        )
    ).all()
    return [version_read(version) for version in versions]


async def save_storyboard_version(
    session: AsyncSession,
    *,
    project: Project,
    user_id: UUID,
    payload: StoryboardVersionCreate,
) -> StoryboardVersionRead:
    storyboard = await load_storyboard(session, project.id)
    if storyboard is None:
        raise AppError(
            status_code=409,
            code="STORYBOARD_REQUIRED",
            message="Create the storyboard before saving a version.",
        )
    latest_revision = await session.scalar(
        select(func.max(StoryboardVersion.revision)).where(
            StoryboardVersion.project_id == project.id
        )
    )
    snapshot = StoryboardRead.model_validate(storyboard).model_dump(mode="json")
    version = StoryboardVersion(
        project_id=project.id,
        revision=(latest_revision or 0) + 1,
        label=payload.label.strip(),
        storyboard_version=storyboard.version,
        snapshot=snapshot,
        created_by_id=user_id,
    )
    session.add(version)
    await session.commit()
    await session.refresh(version)
    return version_read(version)


async def restore_storyboard_version(
    session: AsyncSession,
    *,
    project_id: UUID,
    version_id: UUID,
) -> StoryboardRead:
    version = await session.scalar(
        select(StoryboardVersion).where(
            StoryboardVersion.id == version_id,
            StoryboardVersion.project_id == project_id,
        )
    )
    if version is None:
        raise AppError(
            status_code=404,
            code="STORYBOARD_VERSION_NOT_FOUND",
            message="The storyboard version was not found.",
        )
    snapshot = StoryboardRead.model_validate(version.snapshot)
    restored = await replace_storyboard(
        session,
        project_id,
        [
            ShotInput(
                description=shot.description,
                prompt_en=shot.prompt_en,
                prompt_zh=shot.prompt_zh,
                duration_seconds=shot.duration_seconds,
                aspect_ratio=shot.aspect_ratio,
                generation_mode=shot.generation_mode,
            )
            for shot in snapshot.shots
        ],
        [
            CharacterInput(
                name=character.name,
                description=character.description,
                prompt_en=character.prompt_en,
                prompt_zh=character.prompt_zh,
            )
            for character in snapshot.characters
        ],
        [
            SceneInput(
                name=scene.name,
                description=scene.description,
                location=scene.location,
                prompt_en=scene.prompt_en,
                prompt_zh=scene.prompt_zh,
            )
            for scene in snapshot.scenes
        ],
    )
    for shot, snapshot_shot in zip(restored.shots, snapshot.shots, strict=False):
        shot.status = snapshot_shot.status
    await session.commit()
    await session.refresh(restored)
    return StoryboardRead.model_validate(restored)

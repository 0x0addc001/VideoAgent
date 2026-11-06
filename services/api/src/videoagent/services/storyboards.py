from typing import Literal
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from videoagent.errors import AppError
from videoagent.models import (
    Character,
    Project,
    ProjectCollaborator,
    ProjectState,
    Scene,
    Shot,
    Storyboard,
)
from videoagent.schemas import CharacterInput, SceneInput, ShotInput


async def project_access_permission(
    session: AsyncSession,
    project_id: UUID,
    user_id: UUID,
) -> tuple[Project | None, Literal["owner", "edit", "view"] | None]:
    project = await session.get(Project, project_id)
    if project is None or project.state == ProjectState.ARCHIVED.value:
        return None, None
    if project.owner_id == user_id:
        return project, "owner"
    membership = await session.scalar(
        select(ProjectCollaborator).where(
            ProjectCollaborator.project_id == project_id,
            ProjectCollaborator.user_id == user_id,
        )
    )
    if membership is None:
        return project, None
    return project, "edit" if membership.permission == "edit" else "view"


async def owned_project_or_404(
    session: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    *,
    required_permission: Literal["view", "edit", "owner"] = "edit",
) -> Project:
    project, permission = await project_access_permission(session, project_id, user_id)
    if project is None:
        raise AppError(
            status_code=404,
            code="PROJECT_NOT_FOUND",
            message="The project was not found.",
        )
    if permission is None:
        raise AppError(
            status_code=404,
            code="PROJECT_NOT_FOUND",
            message="The project was not found.",
        )
    if required_permission == "owner" and permission != "owner":
        raise AppError(
            status_code=403,
            code="PROJECT_OWNER_REQUIRED",
            message="Only the project owner can perform this action.",
        )
    if required_permission == "edit" and permission == "view":
        raise AppError(
            status_code=403,
            code="PROJECT_EDIT_FORBIDDEN",
            message="This collaboration link only grants view access.",
        )
    return project


async def load_storyboard(
    session: AsyncSession,
    project_id: UUID,
) -> Storyboard | None:
    result = await session.execute(
        select(Storyboard)
        .options(
            selectinload(Storyboard.shots),
            selectinload(Storyboard.characters),
            selectinload(Storyboard.scenes),
        )
        .where(Storyboard.project_id == project_id)
        .execution_options(populate_existing=True)
    )
    return result.scalar_one_or_none()


async def replace_storyboard(
    session: AsyncSession,
    project_id: UUID,
    shots: list[ShotInput],
    characters: list[CharacterInput] | None = None,
    scenes: list[SceneInput] | None = None,
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

    if characters is not None:
        existing_characters = list(
            (
                await session.scalars(
                    select(Character).where(Character.storyboard_id == storyboard.id)
                )
            ).all()
        )
        characters_by_name = {
            character.name.strip().casefold(): character for character in existing_characters
        }
        for position, existing_character in enumerate(existing_characters):
            existing_character.index = -(position + 1)
        if existing_characters:
            await session.flush()
        retained_character_ids: set[UUID] = set()
        for index, character_data in enumerate(characters):
            saved_character = characters_by_name.get(character_data.name.strip().casefold())
            if saved_character is None:
                saved_character = Character(storyboard_id=storyboard.id)
                session.add(saved_character)
            else:
                retained_character_ids.add(saved_character.id)
            saved_character.index = index
            saved_character.name = character_data.name
            saved_character.description = character_data.description
            saved_character.prompt_en = character_data.prompt_en
            saved_character.prompt_zh = character_data.prompt_zh
        for existing_character in existing_characters:
            if existing_character.id not in retained_character_ids:
                await session.delete(existing_character)

    if scenes is not None:
        existing_scenes = list(
            (await session.scalars(select(Scene).where(Scene.storyboard_id == storyboard.id))).all()
        )
        scenes_by_name = {scene.name.strip().casefold(): scene for scene in existing_scenes}
        for position, existing_scene in enumerate(existing_scenes):
            existing_scene.index = -(position + 1)
        if existing_scenes:
            await session.flush()
        retained_scene_ids: set[UUID] = set()
        for index, scene_data in enumerate(scenes):
            saved_scene = scenes_by_name.get(scene_data.name.strip().casefold())
            if saved_scene is None:
                saved_scene = Scene(storyboard_id=storyboard.id)
                session.add(saved_scene)
            else:
                retained_scene_ids.add(saved_scene.id)
            saved_scene.index = index
            saved_scene.name = scene_data.name
            saved_scene.description = scene_data.description
            saved_scene.location = scene_data.location
            saved_scene.prompt_en = scene_data.prompt_en
            saved_scene.prompt_zh = scene_data.prompt_zh
        for existing_scene in existing_scenes:
            if existing_scene.id not in retained_scene_ids:
                await session.delete(existing_scene)
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


async def reorder_storyboard(
    session: AsyncSession,
    project_id: UUID,
    shot_ids: list[UUID],
) -> Storyboard:
    storyboard = await load_storyboard(session, project_id)
    if storyboard is None:
        raise AppError(
            status_code=404,
            code="STORYBOARD_NOT_FOUND",
            message="This project does not have a storyboard yet.",
        )

    shots_by_id = {shot.id: shot for shot in storyboard.shots}
    if len(shot_ids) != len(set(shot_ids)) or set(shot_ids) != set(shots_by_id):
        raise AppError(
            status_code=422,
            code="INVALID_SHOT_ORDER",
            message="Shot order must contain every shot exactly once.",
        )

    for position, shot_id in enumerate(shot_ids):
        shots_by_id[shot_id].index = -(position + 1)
    await session.flush()
    for position, shot_id in enumerate(shot_ids):
        shots_by_id[shot_id].index = position
    storyboard.version += 1
    await session.flush()

    reordered = await load_storyboard(session, project_id)
    if reordered is None:
        raise RuntimeError("storyboard disappeared after reordering")
    return reordered

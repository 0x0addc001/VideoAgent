from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session
from videoagent.errors import AppError
from videoagent.models import User
from videoagent.schemas import (
    CharacterRead,
    CharacterUpdate,
    ShotRead,
    ShotUpdate,
    StoryboardRead,
    StoryboardReorder,
    StoryboardReplace,
)
from videoagent.services.storyboards import (
    load_storyboard,
    owned_project_or_404,
)
from videoagent.services.storyboards import reorder_storyboard as reorder_storyboard_service
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
    storyboard = await replace_storyboard_service(
        session,
        project_id,
        payload.shots,
        payload.characters,
    )
    await session.commit()
    return StoryboardRead.model_validate(storyboard)


@router.patch("/order", response_model=StoryboardRead)
async def reorder_storyboard(
    project_id: UUID,
    payload: StoryboardReorder,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> StoryboardRead:
    await owned_project_or_404(session, project_id, user.id)
    storyboard = await reorder_storyboard_service(session, project_id, payload.shot_ids)
    await session.commit()
    return StoryboardRead.model_validate(storyboard)


@router.patch("/shots/{shot_id}", response_model=ShotRead)
async def update_shot(
    project_id: UUID,
    shot_id: UUID,
    payload: ShotUpdate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ShotRead:
    await owned_project_or_404(session, project_id, user.id)
    storyboard = await load_storyboard(session, project_id)
    shot = (
        next(
            (item for item in storyboard.shots if item.id == shot_id),
            None,
        )
        if storyboard is not None
        else None
    )
    if shot is None:
        raise AppError(
            status_code=404,
            code="SHOT_NOT_FOUND",
            message="The shot was not found.",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(shot, field, value)
    await session.commit()
    await session.refresh(shot)
    return ShotRead.model_validate(shot)


@router.patch("/characters/{character_id}", response_model=CharacterRead)
async def update_character(
    project_id: UUID,
    character_id: UUID,
    payload: CharacterUpdate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CharacterRead:
    await owned_project_or_404(session, project_id, user.id)
    storyboard = await load_storyboard(session, project_id)
    character = (
        next(
            (item for item in storyboard.characters if item.id == character_id),
            None,
        )
        if storyboard is not None
        else None
    )
    if character is None:
        raise AppError(
            status_code=404,
            code="CHARACTER_NOT_FOUND",
            message="The character was not found.",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(character, field, value)
    await session.commit()
    await session.refresh(character)
    return CharacterRead.model_validate(character)

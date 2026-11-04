import re
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import User, UserSkill
from videoagent.schemas import (
    SkillOptimizeRequest,
    SkillOptimizeResponse,
    UserSkillCreate,
    UserSkillList,
    UserSkillRead,
)
from videoagent.services.skill_optimizer import optimize_skill

router = APIRouter(prefix="/skills", tags=["skills"])


def user_namespace(email: str) -> str:
    local = email.split("@", 1)[0].lower()
    normalized = re.sub(r"[^a-z0-9]+", "_", local).strip("_")
    return normalized[:64] or "creator"


def _skill_read(skill: UserSkill, user: User) -> UserSkillRead:
    return UserSkillRead(
        id=skill.id,
        user_id=user_namespace(user.email),
        skill_id=skill.skill_id,
        title=skill.title,
        description=skill.description,
        instructions=skill.instructions,
        prompt_template=skill.prompt_template,
        input_schema=skill.input_schema,
        output_schema=skill.output_schema,
        visibility=skill.visibility,
        created_at=skill.created_at,
        updated_at=skill.updated_at,
    )


@router.get("", response_model=UserSkillList)
async def list_skills(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserSkillList:
    skills = (
        await session.scalars(
            select(UserSkill)
            .where(UserSkill.owner_id == user.id)
            .order_by(UserSkill.updated_at.desc())
        )
    ).all()
    return UserSkillList(items=[_skill_read(skill, user) for skill in skills])


@router.post(
    "/optimize",
    response_model=SkillOptimizeResponse,
)
async def optimize_skill_draft(
    draft: SkillOptimizeRequest,
    user: Annotated[User, Depends(get_current_user)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> SkillOptimizeResponse:
    del user
    return await optimize_skill(draft, settings)


@router.post("", response_model=UserSkillRead, status_code=status.HTTP_201_CREATED)
async def create_skill(
    payload: UserSkillCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserSkillRead:
    existing = await session.scalar(
        select(UserSkill).where(
            UserSkill.owner_id == user.id,
            UserSkill.skill_id == payload.skill_id,
        )
    )
    if existing is not None:
        raise AppError(
            status_code=409,
            code="SKILL_ALREADY_EXISTS",
            message="A skill with this ID already exists.",
        )
    skill = UserSkill(
        owner_id=user.id,
        skill_id=payload.skill_id,
        title=payload.title,
        description=payload.description,
        instructions=payload.instructions,
        prompt_template=payload.prompt_template,
        input_schema=payload.input_schema,
        output_schema=payload.output_schema,
        visibility=payload.visibility,
    )
    session.add(skill)
    await session.commit()
    await session.refresh(skill)
    return _skill_read(skill, user)

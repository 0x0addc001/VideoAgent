import re
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import SkillLike, SkillUsage, User, UserSkill
from videoagent.schemas import (
    SkillEngagementList,
    SkillEngagementQuery,
    SkillEngagementRead,
    SkillEngagementRequest,
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


def _skill_read(
    skill: UserSkill,
    owner: User,
    current_user: User,
    *,
    likes: int = 0,
    uses: int = 0,
    is_liked: bool = False,
) -> UserSkillRead:
    return UserSkillRead(
        id=skill.id,
        user_id=user_namespace(owner.email),
        skill_id=skill.skill_id,
        title=skill.title,
        description=skill.description,
        instructions=skill.instructions,
        prompt_template=skill.prompt_template,
        input_schema=skill.input_schema,
        output_schema=skill.output_schema,
        visibility=skill.visibility,
        is_mine=skill.owner_id == current_user.id,
        likes=likes,
        uses=uses,
        is_liked=is_liked,
        created_at=skill.created_at,
        updated_at=skill.updated_at,
    )


@router.get("", response_model=UserSkillList)
async def list_skills(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserSkillList:
    rows = (
        await session.execute(
            select(UserSkill, User)
            .join(User, User.id == UserSkill.owner_id)
            .where(
                or_(
                    UserSkill.owner_id == user.id,
                    UserSkill.visibility == "public",
                )
            )
        )
    ).all()
    skill_keys = [f"{user_namespace(owner.email)}/{skill.skill_id}" for skill, owner in rows]
    like_counts: dict[str, int] = {}
    use_counts: dict[str, int] = {}
    liked_skill_keys: set[str] = set()
    if skill_keys:
        like_counts = dict(
            (
                await session.execute(
                    select(SkillLike.skill_key, func.count(SkillLike.id))
                    .where(SkillLike.skill_key.in_(skill_keys))
                    .group_by(SkillLike.skill_key)
                )
            ).all()
        )
        use_counts = dict(
            (
                await session.execute(
                    select(SkillUsage.skill_key, func.count(SkillUsage.id))
                    .where(SkillUsage.skill_key.in_(skill_keys))
                    .group_by(SkillUsage.skill_key)
                )
            ).all()
        )
        liked_skill_keys = set(
            (
                await session.scalars(
                    select(SkillLike.skill_key).where(
                        SkillLike.skill_key.in_(skill_keys),
                        SkillLike.user_id == user.id,
                    )
                )
            ).all()
        )

    ordered_rows = sorted(
        rows,
        key=lambda row: (
            like_counts.get(f"{user_namespace(row[1].email)}/{row[0].skill_id}", 0) * 3
            + use_counts.get(f"{user_namespace(row[1].email)}/{row[0].skill_id}", 0) * 2,
            row[0].updated_at,
        ),
        reverse=True,
    )
    return UserSkillList(
        items=[
            _skill_read(
                skill,
                owner,
                user,
                likes=like_counts.get(f"{user_namespace(owner.email)}/{skill.skill_id}", 0),
                uses=use_counts.get(f"{user_namespace(owner.email)}/{skill.skill_id}", 0),
                is_liked=(
                    f"{user_namespace(owner.email)}/{skill.skill_id}" in liked_skill_keys
                ),
            )
            for skill, owner in ordered_rows
        ]
    )


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
    return _skill_read(skill, user, user)


async def _engagement(
    skill_key: str,
    user_id: UUID,
    session: AsyncSession,
) -> SkillEngagementRead:
    likes = await session.scalar(
        select(func.count(SkillLike.id)).where(SkillLike.skill_key == skill_key)
    )
    uses = await session.scalar(
        select(func.count(SkillUsage.id)).where(SkillUsage.skill_key == skill_key)
    )
    is_liked = (
        await session.scalar(
            select(SkillLike.id).where(
                SkillLike.skill_key == skill_key,
                SkillLike.user_id == user_id,
            )
        )
    ) is not None
    return SkillEngagementRead(
        likes=likes or 0,
        uses=uses or 0,
        is_liked=is_liked,
    )


@router.post("/engagement/query", response_model=SkillEngagementList)
async def query_skill_engagement(
    payload: SkillEngagementQuery,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SkillEngagementList:
    skill_keys = list(dict.fromkeys(key.strip().lower() for key in payload.skill_keys if key))
    if not skill_keys:
        return SkillEngagementList(items={})
    like_counts = dict(
        (
            await session.execute(
                select(SkillLike.skill_key, func.count(SkillLike.id))
                .where(SkillLike.skill_key.in_(skill_keys))
                .group_by(SkillLike.skill_key)
            )
        ).all()
    )
    use_counts = dict(
        (
            await session.execute(
                select(SkillUsage.skill_key, func.count(SkillUsage.id))
                .where(SkillUsage.skill_key.in_(skill_keys))
                .group_by(SkillUsage.skill_key)
            )
        ).all()
    )
    liked_keys = set(
        (
            await session.scalars(
                select(SkillLike.skill_key).where(
                    SkillLike.skill_key.in_(skill_keys),
                    SkillLike.user_id == user.id,
                )
            )
        ).all()
    )
    return SkillEngagementList(
        items={
            key: SkillEngagementRead(
                likes=like_counts.get(key, 0),
                uses=use_counts.get(key, 0),
                is_liked=key in liked_keys,
            )
            for key in skill_keys
        }
    )


@router.post("/engagement/like", response_model=SkillEngagementRead)
async def toggle_skill_like(
    payload: SkillEngagementRequest,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SkillEngagementRead:
    if payload.skill_key.startswith(f"{user_namespace(user.email)}/"):
        raise AppError(
            status_code=409,
            code="SELF_LIKE_NOT_ALLOWED",
            message="A skill cannot be liked by its author.",
        )
    existing = await session.scalar(
        select(SkillLike).where(
            SkillLike.skill_key == payload.skill_key,
            SkillLike.user_id == user.id,
        )
    )
    if existing is None:
        session.add(SkillLike(skill_key=payload.skill_key, user_id=user.id))
    else:
        await session.delete(existing)
    await session.flush()
    engagement = await _engagement(payload.skill_key, user.id, session)
    await session.commit()
    return engagement


@router.post("/engagement/use", response_model=SkillEngagementRead)
async def record_skill_use(
    payload: SkillEngagementRequest,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> SkillEngagementRead:
    existing = await session.scalar(
        select(SkillUsage).where(
            SkillUsage.skill_key == payload.skill_key,
            SkillUsage.user_id == user.id,
        )
    )
    if existing is None:
        session.add(SkillUsage(skill_key=payload.skill_key, user_id=user.id))
        await session.flush()
    engagement = await _engagement(payload.skill_key, user.id, session)
    await session.commit()
    return engagement

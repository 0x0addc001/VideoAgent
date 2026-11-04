from typing import Any
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import ColumnElement

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import (
    AdminAuditLog,
    Asset,
    GenerationJob,
    Project,
    Session,
    User,
    UserStatus,
)
from videoagent.schemas import (
    AdminJobRead,
    AdminOverviewRead,
    AdminUserRead,
    AdminUserUpdate,
)
from videoagent.services.credits import get_or_create_account
from videoagent.services.platform_settings import generation_enabled, registration_mode


async def overview(
    session: AsyncSession,
    *,
    settings: Settings,
) -> AdminOverviewRead:
    async def count(model: type[Any], *conditions: ColumnElement[bool]) -> int:
        statement = select(func.count()).select_from(model)
        if conditions:
            statement = statement.where(*conditions)
        return int((await session.scalar(statement)) or 0)

    return AdminOverviewRead(
        users=await count(User),
        active_users=await count(User, User.status == UserStatus.ACTIVE.value),
        disabled_users=await count(User, User.status == UserStatus.DISABLED.value),
        projects=await count(Project),
        generation_jobs=await count(GenerationJob),
        running_jobs=await count(
            GenerationJob,
            GenerationJob.status.in_(["submitted", "queued", "running", "pending"]),
        ),
        failed_jobs=await count(
            GenerationJob,
            GenerationJob.status.in_(["failed", "cancelled", "submission_uncertain"]),
        ),
        assets=await count(Asset, Asset.deleted_at.is_(None)),
        generation_enabled=await generation_enabled(session, settings),
        registration_mode=await registration_mode(session, settings),
        provider=settings.video_provider,
        celery_enabled=settings.celery_enabled,
    )


async def user_read(
    session: AsyncSession,
    *,
    user: User,
    settings: Settings,
) -> AdminUserRead:
    account = await get_or_create_account(
        session,
        user_id=user.id,
        settings=settings,
    )
    project_count = int(
        (
            await session.scalar(
                select(func.count()).select_from(Project).where(Project.owner_id == user.id)
            )
        )
        or 0
    )
    return AdminUserRead(
        id=user.id,
        email=user.email,
        status=user.status,
        locale=user.locale,
        credits=account.balance,
        project_count=project_count,
        created_at=user.created_at,
    )


async def list_users(
    session: AsyncSession,
    *,
    query: str,
    limit: int,
    offset: int,
    settings: Settings,
) -> tuple[list[AdminUserRead], int]:
    normalized = query.strip().lower()
    filters = [User.email.contains(normalized)] if normalized else []
    total = int((await session.scalar(select(func.count()).select_from(User).where(*filters))) or 0)
    users = list(
        (
            await session.scalars(
                select(User)
                .where(*filters)
                .order_by(User.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
        ).all()
    )
    items: list[AdminUserRead] = []
    for user in users:
        items.append(
            await user_read(
                session,
                user=user,
                settings=settings,
            )
        )
    return items, total


async def update_user(
    session: AsyncSession,
    *,
    admin: User,
    user_id: UUID,
    payload: AdminUserUpdate,
) -> User:
    if user_id == admin.id:
        raise AppError(
            status_code=409,
            code="CANNOT_DISABLE_SELF",
            message="Administrators cannot change their own account status.",
        )
    user = await session.get(User, user_id)
    if user is None:
        raise AppError(
            status_code=404,
            code="USER_NOT_FOUND",
            message="The user was not found.",
        )
    user.status = payload.status
    if payload.status == UserStatus.DISABLED.value:
        await session.execute(delete(Session).where(Session.user_id == user.id))
    session.add(user)
    session.add(
        AdminAuditLog(
            admin_id=admin.id,
            action="user.status",
            target_type="user",
            target_id=str(user.id),
            details={"status": payload.status},
        )
    )
    await session.commit()
    await session.refresh(user)
    return user


async def list_jobs(
    session: AsyncSession,
    *,
    status: str | None,
    limit: int,
    offset: int,
) -> tuple[list[AdminJobRead], int]:
    filters = [GenerationJob.status == status] if status else []
    total = int(
        (await session.scalar(select(func.count()).select_from(GenerationJob).where(*filters))) or 0
    )
    rows = (
        await session.execute(
            select(GenerationJob, User, Project)
            .join(Project, Project.id == GenerationJob.project_id)
            .join(User, User.id == Project.owner_id)
            .where(*filters)
            .order_by(GenerationJob.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return (
        [
            AdminJobRead(
                id=job.id,
                user_id=user.id,
                user_email=user.email,
                project_id=project.id,
                project_title=project.title,
                provider=job.provider,
                status=job.status,
                error_code=job.error_code,
                result_url=job.result_url,
                created_at=job.created_at,
            )
            for job, user, project in rows
        ],
        total,
    )


async def list_audit(session: AsyncSession, *, limit: int) -> list[AdminAuditLog]:
    return list(
        (
            await session.scalars(
                select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(limit)
            )
        ).all()
    )


async def audit(
    session: AsyncSession,
    *,
    admin: User,
    action: str,
    target_type: str,
    target_id: str,
    details: dict[str, object] | None = None,
) -> None:
    session.add(
        AdminAuditLog(
            admin_id=admin.id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details or {},
        )
    )

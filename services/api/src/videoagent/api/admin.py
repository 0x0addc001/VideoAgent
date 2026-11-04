import asyncio
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import (
    get_admin_user,
    get_session,
    get_settings,
    get_video_provider,
)
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import GenerationJob, Project, User
from videoagent.providers.base import VideoProvider
from videoagent.providers.kling_cli import KlingCLIError, KlingCLIVideoProvider
from videoagent.providers.pippit import PippitCLIError, PippitVideoProvider
from videoagent.schemas import (
    AdminAuditList,
    AdminAuditRead,
    AdminCreditAdjustment,
    AdminIdentityRead,
    AdminInviteCreate,
    AdminInviteList,
    AdminInviteRead,
    AdminJobList,
    AdminOverviewRead,
    AdminSettingsRead,
    AdminSettingsUpdate,
    AdminUserList,
    AdminUserRead,
    AdminUserUpdate,
)
from videoagent.services import admin as admin_service
from videoagent.services.credits import admin_adjust_credits, refund_credits
from videoagent.services.invites import (
    create_invite,
    invite_read,
    list_invites,
    revoke_invite,
)
from videoagent.services.platform_settings import (
    GENERATION_ENABLED_KEY,
    REGISTRATION_MODE_KEY,
    set_setting,
)
from videoagent.services.platform_settings import (
    generation_enabled as read_generation_enabled,
)
from videoagent.services.platform_settings import (
    registration_mode as read_registration_mode,
)

router = APIRouter(prefix="/admin", tags=["admin"])


async def _pippit_provider_status(
    provider: VideoProvider,
    settings: Settings,
) -> dict[str, object]:
    try:
        candidate = (
            provider
            if isinstance(provider, PippitVideoProvider)
            else PippitVideoProvider(
                command=settings.pippit_cli_command,
                model=settings.pippit_video_model,
                resolution=settings.pippit_video_resolution,
                access_key=settings.pippit_access_key,
                timeout_seconds=settings.pippit_timeout_seconds,
            )
        )
        status = await candidate.account_status()
        connected = status.get("logged_in") is True
        credits = await candidate.get_credit_balance() if connected else None
        return {
            "provider": "pippit",
            "connected": connected,
            "credits": credits,
        }
    except (PippitCLIError, NotImplementedError):
        return {
            "provider": "pippit",
            "connected": False,
            "credits": None,
            "error": "Pippit status is unavailable.",
        }


async def _kling_provider_status(settings: Settings) -> dict[str, object]:
    if settings.kling_backend.lower() != "cli":
        return {
            "provider": "kling",
            "connected": None,
            "credits": None,
            "error": "Kling CLI is not the configured backend.",
        }
    try:
        candidate = KlingCLIVideoProvider(
            command=settings.kling_cli_command,
            timeout_seconds=settings.kling_cli_timeout_seconds,
        )
        status = await candidate.account_status()
        actual_user_id = str(status.get("userId") or "")
        expected_user_id = settings.kling_expected_user_id
        connected = bool(actual_user_id) and (
            not expected_user_id or actual_user_id == expected_user_id
        )
        credits = await candidate.credits() if connected else None
        return {
            "provider": "kling",
            "connected": connected,
            "credits": credits,
            "userId": actual_user_id or None,
            "expectedUserId": expected_user_id,
        }
    except (KlingCLIError, NotImplementedError):
        return {
            "provider": "kling",
            "connected": False,
            "credits": None,
            "error": "Kling CLI status is unavailable.",
        }


@router.get("/me", response_model=AdminIdentityRead)
async def admin_me(user: Annotated[User, Depends(get_admin_user)]) -> AdminIdentityRead:
    return AdminIdentityRead(email=user.email)


@router.get("/overview", response_model=AdminOverviewRead)
async def overview(
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AdminOverviewRead:
    del user
    return await admin_service.overview(session, settings=settings)


@router.get("/users", response_model=AdminUserList)
async def users(
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    query: str = "",
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AdminUserList:
    del user
    items, total = await admin_service.list_users(
        session,
        query=query,
        limit=limit,
        offset=offset,
        settings=settings,
    )
    return AdminUserList(items=items, total=total)


@router.patch("/users/{user_id}", response_model=AdminUserRead)
async def update_user(
    user_id: UUID,
    payload: AdminUserUpdate,
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AdminUserRead:
    target = await admin_service.update_user(
        session,
        admin=user,
        user_id=user_id,
        payload=payload,
    )
    return await admin_service.user_read(
        session,
        user=target,
        settings=settings,
    )


@router.post("/users/{user_id}/credits", response_model=AdminUserRead)
async def adjust_user_credits(
    user_id: UUID,
    payload: AdminCreditAdjustment,
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AdminUserRead:
    target = await session.get(User, user_id)
    if target is None:
        raise AppError(
            status_code=404,
            code="USER_NOT_FOUND",
            message="The user was not found.",
        )
    await admin_adjust_credits(
        session,
        user_id=target.id,
        amount=payload.amount,
        reason=payload.reason,
        settings=settings,
    )
    await admin_service.audit(
        session,
        admin=user,
        action="user.credits",
        target_type="user",
        target_id=str(target.id),
        details={"amount": payload.amount, "reason": payload.reason},
    )
    await session.commit()
    return await admin_service.user_read(
        session,
        user=target,
        settings=settings,
    )


@router.get("/jobs", response_model=AdminJobList)
async def jobs(
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    status_filter: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> AdminJobList:
    del user
    items, total = await admin_service.list_jobs(
        session,
        status=status_filter,
        limit=limit,
        offset=offset,
    )
    return AdminJobList(items=items, total=total)


@router.post("/jobs/{job_id}/refund", response_model=AdminJobList)
async def refund_job(
    job_id: UUID,
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AdminJobList:
    job = await session.get(GenerationJob, job_id)
    project = await session.get(Project, job.project_id) if job is not None else None
    if job is None or project is None:
        raise AppError(
            status_code=404,
            code="JOB_NOT_FOUND",
            message="The generation job was not found.",
        )
    if job.status not in {"failed", "cancelled", "submission_uncertain"}:
        raise AppError(
            status_code=409,
            code="JOB_NOT_REFUNDABLE",
            message="Only failed, cancelled, or uncertain jobs can be refunded.",
        )
    await refund_credits(
        session,
        user_id=project.owner_id,
        reference_id=str(job.id),
        settings=settings,
    )
    await admin_service.audit(
        session,
        admin=user,
        action="job.refund",
        target_type="generation_job",
        target_id=str(job.id),
        details={"status": job.status},
    )
    await session.commit()
    items, total = await admin_service.list_jobs(
        session,
        status=None,
        limit=50,
        offset=0,
    )
    return AdminJobList(items=items, total=total)


@router.get("/settings", response_model=AdminSettingsRead)
async def get_admin_settings(
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AdminSettingsRead:
    del user
    return AdminSettingsRead(
        generation_enabled=await read_generation_enabled(session, settings),
        registration_mode=await read_registration_mode(session, settings),
    )


@router.patch("/settings", response_model=AdminSettingsRead)
async def update_admin_settings(
    payload: AdminSettingsUpdate,
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AdminSettingsRead:
    if payload.generation_enabled is not None:
        await set_setting(
            session,
            key=GENERATION_ENABLED_KEY,
            value="true" if payload.generation_enabled else "false",
            admin_id=user.id,
        )
    if payload.registration_mode is not None:
        await set_setting(
            session,
            key=REGISTRATION_MODE_KEY,
            value=payload.registration_mode,
            admin_id=user.id,
        )
    await admin_service.audit(
        session,
        admin=user,
        action="settings.update",
        target_type="platform",
        target_id="settings",
        details=payload.model_dump(exclude_none=True),
    )
    await session.commit()
    return AdminSettingsRead(
        generation_enabled=await read_generation_enabled(session, settings),
        registration_mode=await read_registration_mode(session, settings),
    )


@router.get("/invites", response_model=AdminInviteList)
async def invites(
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AdminInviteList:
    del user
    return AdminInviteList(items=[invite_read(item) for item in await list_invites(session)])


@router.post(
    "/invites",
    response_model=AdminInviteRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_invite(
    payload: AdminInviteCreate,
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AdminInviteRead:
    invite, code = await create_invite(session, payload=payload, admin=user)
    return invite_read(invite, code=code)


@router.delete("/invites/{invite_id}", response_model=AdminInviteRead)
async def remove_invite(
    invite_id: UUID,
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AdminInviteRead:
    invite = await revoke_invite(session, invite_id=invite_id, admin=user)
    return invite_read(invite)


@router.get("/audit", response_model=AdminAuditList)
async def audit_logs(
    user: Annotated[User, Depends(get_admin_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    limit: int = Query(default=50, ge=1, le=200),
) -> AdminAuditList:
    del user
    return AdminAuditList(
        items=[
            AdminAuditRead.model_validate(item, from_attributes=True)
            for item in await admin_service.list_audit(session, limit=limit)
        ]
    )


@router.get("/provider")
async def provider_status(
    user: Annotated[User, Depends(get_admin_user)],
    provider: Annotated[VideoProvider, Depends(get_video_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    del user
    pippit, kling = await asyncio.gather(
        _pippit_provider_status(provider, settings),
        _kling_provider_status(settings),
    )
    return {
        "provider": provider.name,
        "pippit": pippit,
        "kling": kling,
    }

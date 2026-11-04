import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, cast
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.engine import CursorResult
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.errors import AppError
from videoagent.models import AdminAuditLog, InviteCode, User
from videoagent.schemas import AdminInviteCreate, AdminInviteRead


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.strip().encode()).hexdigest()


def invite_read(invite: InviteCode, *, code: str | None = None) -> AdminInviteRead:
    return AdminInviteRead(
        id=invite.id,
        code=code,
        label=invite.label,
        max_uses=invite.max_uses,
        use_count=invite.use_count,
        expires_at=invite.expires_at,
        revoked_at=invite.revoked_at,
        created_at=invite.created_at,
    )


async def create_invite(
    session: AsyncSession,
    *,
    payload: AdminInviteCreate,
    admin: User,
) -> tuple[InviteCode, str]:
    code = secrets.token_urlsafe(18)
    invite = InviteCode(
        code_hash=_hash_code(code),
        label=payload.label.strip(),
        max_uses=payload.max_uses,
        expires_at=datetime.now(UTC) + timedelta(hours=payload.expires_in_hours),
        created_by=admin.id,
    )
    session.add(invite)
    await session.flush()
    session.add(
        AdminAuditLog(
            admin_id=admin.id,
            action="invite.create",
            target_type="invite",
            target_id=str(invite.id),
            details={"label": invite.label, "max_uses": invite.max_uses},
        )
    )
    await session.commit()
    await session.refresh(invite)
    return invite, code


async def list_invites(session: AsyncSession) -> list[InviteCode]:
    result = await session.execute(select(InviteCode).order_by(InviteCode.created_at.desc()))
    return list(result.scalars())


async def revoke_invite(
    session: AsyncSession,
    *,
    invite_id: UUID,
    admin: User,
) -> InviteCode:
    invite = await session.get(InviteCode, invite_id)
    if invite is None:
        raise AppError(
            status_code=404,
            code="INVITE_NOT_FOUND",
            message="The invite code was not found.",
        )
    invite.revoked_at = datetime.now(UTC)
    session.add(
        AdminAuditLog(
            admin_id=admin.id,
            action="invite.revoke",
            target_type="invite",
            target_id=str(invite.id),
            details={},
        )
    )
    await session.commit()
    await session.refresh(invite)
    return invite


async def consume_invite(session: AsyncSession, code: str | None) -> None:
    if not code or not code.strip():
        raise AppError(
            status_code=403,
            code="INVITE_REQUIRED",
            message="A valid invite code is required.",
        )
    invite = await session.scalar(
        select(InviteCode).where(InviteCode.code_hash == _hash_code(code))
    )
    now = datetime.now(UTC)
    if (
        invite is None
        or invite.revoked_at is not None
        or (invite.expires_at is not None and invite.expires_at.replace(tzinfo=UTC) <= now)
        or invite.use_count >= invite.max_uses
    ):
        raise AppError(
            status_code=403,
            code="INVITE_INVALID",
            message="The invite code is invalid, expired, or already used.",
        )
    result = await session.execute(
        update(InviteCode)
        .where(
            InviteCode.id == invite.id,
            InviteCode.use_count < InviteCode.max_uses,
            InviteCode.revoked_at.is_(None),
        )
        .values(use_count=InviteCode.use_count + 1)
    )
    if cast(CursorResult[Any], result).rowcount != 1:
        raise AppError(
            status_code=403,
            code="INVITE_INVALID",
            message="The invite code is invalid, expired, or already used.",
        )
    await session.commit()

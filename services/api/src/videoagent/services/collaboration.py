import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.errors import AppError
from videoagent.models import Project, ProjectCollaboration, ProjectCollaborator, User
from videoagent.schemas import ProjectCollaborationCreate


def _now() -> datetime:
    return datetime.now(UTC)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_project_collaboration(
    session: AsyncSession,
    *,
    project: Project,
    owner_id: UUID,
    payload: ProjectCollaborationCreate,
) -> tuple[ProjectCollaboration, str]:
    token = secrets.token_urlsafe(32)
    collaboration = ProjectCollaboration(
        project_id=project.id,
        owner_id=owner_id,
        collaborator_email=(
            str(payload.collaborator_email).strip().lower() if payload.collaborator_email else None
        ),
        permission=payload.permission,
        token_hash=_token_hash(token),
        expires_at=_now() + timedelta(hours=payload.expires_in_hours),
    )
    session.add(collaboration)
    await session.commit()
    await session.refresh(collaboration)
    return collaboration, token


async def resolve_project_collaboration(
    session: AsyncSession,
    token: str,
) -> ProjectCollaboration:
    collaboration = await session.scalar(
        select(ProjectCollaboration).where(ProjectCollaboration.token_hash == _token_hash(token))
    )
    if (
        collaboration is None
        or collaboration.revoked_at is not None
        or collaboration.expires_at.replace(tzinfo=UTC) <= _now()
    ):
        raise AppError(
            status_code=404,
            code="COLLABORATION_NOT_FOUND",
            message="This collaboration link is no longer available.",
        )
    return collaboration


async def accept_project_collaboration(
    session: AsyncSession,
    *,
    token: str,
    user: User,
) -> ProjectCollaboration:
    collaboration = await resolve_project_collaboration(session, token)
    if (
        collaboration.collaborator_email
        and collaboration.collaborator_email.casefold() != user.email.casefold()
    ):
        raise AppError(
            status_code=403,
            code="COLLABORATION_EMAIL_MISMATCH",
            message="Sign in with the email address this invitation was sent to.",
        )
    membership = await session.scalar(
        select(ProjectCollaborator).where(
            ProjectCollaborator.project_id == collaboration.project_id,
            ProjectCollaborator.user_id == user.id,
        )
    )
    if membership is None:
        membership = ProjectCollaborator(
            project_id=collaboration.project_id,
            user_id=user.id,
            permission=collaboration.permission,
            invited_by_id=collaboration.owner_id,
        )
        session.add(membership)
    else:
        membership.permission = collaboration.permission
    await session.commit()
    return collaboration

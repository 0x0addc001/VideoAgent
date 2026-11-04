from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import CreditAccount, Session, User, UserStatus
from videoagent.schemas import RegisterRequest
from videoagent.security import (
    hash_password,
    hash_session_token,
    new_session_token,
    verify_password,
)


def normalize_email(email: str) -> str:
    return email.strip().lower()


async def get_user_by_email(session: AsyncSession, email: str) -> User | None:
    result = await session.execute(select(User).where(User.email == normalize_email(email)))
    return result.scalar_one_or_none()


async def register_user(
    session: AsyncSession,
    payload: RegisterRequest,
    settings: Settings,
) -> User:
    email = normalize_email(str(payload.email))
    if await get_user_by_email(session, email) is not None:
        raise AppError(
            status_code=409,
            code="EMAIL_ALREADY_REGISTERED",
            message="An account with this email already exists.",
        )

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        locale=payload.locale,
        status=UserStatus.ACTIVE.value,
    )
    session.add(user)
    await session.flush()
    session.add(
        CreditAccount(
            user_id=user.id,
            balance=settings.starting_user_credits,
        )
    )
    await session.commit()
    await session.refresh(user)
    return user


async def authenticate_user(session: AsyncSession, email: str, password: str) -> User:
    user = await get_user_by_email(session, email)
    if (
        user is None
        or user.status != UserStatus.ACTIVE.value
        or not verify_password(password, user.password_hash)
    ):
        raise AppError(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="The email or password is incorrect.",
        )
    return user


async def create_session(
    session: AsyncSession,
    user: User,
    settings: Settings,
) -> tuple[str, Session]:
    token = new_session_token()
    record = Session(
        user_id=user.id,
        token_hash=hash_session_token(token),
        expires_at=datetime.now(UTC) + timedelta(days=settings.session_ttl_days),
    )
    session.add(record)
    await session.commit()
    return token, record


async def get_user_for_session(session: AsyncSession, token: str) -> User | None:
    result = await session.execute(
        select(User)
        .join(Session, Session.user_id == User.id)
        .where(
            Session.token_hash == hash_session_token(token),
            Session.expires_at > datetime.now(UTC),
            User.status == UserStatus.ACTIVE.value,
        )
    )
    return result.scalar_one_or_none()


async def revoke_session(session: AsyncSession, token: str) -> None:
    await session.execute(delete(Session).where(Session.token_hash == hash_session_token(token)))
    await session.commit()

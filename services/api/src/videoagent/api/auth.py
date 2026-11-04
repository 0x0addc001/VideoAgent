from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import User
from videoagent.schemas import (
    LoginRequest,
    RegisterRequest,
    RegistrationPolicyRead,
    UpdateUserRequest,
    UserRead,
)
from videoagent.services.auth import (
    authenticate_user,
    create_session,
    get_user_by_email,
    register_user,
    revoke_session,
)
from videoagent.services.invites import consume_invite
from videoagent.services.platform_settings import registration_mode

router = APIRouter(prefix="/auth", tags=["auth"])


def set_session_cookie(
    response: Response,
    settings: Settings,
    token: str,
) -> None:
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> UserRead:
    if await get_user_by_email(session, str(payload.email)) is not None:
        raise AppError(
            status_code=409,
            code="EMAIL_ALREADY_REGISTERED",
            message="An account with this email already exists.",
        )
    mode = await registration_mode(session, settings)
    if mode == "closed":
        raise AppError(
            status_code=403,
            code="REGISTRATION_CLOSED",
            message="Registration is currently closed.",
        )
    if mode == "invite":
        await consume_invite(session, payload.invite_code)
    user = await register_user(session, payload, settings)
    token, _ = await create_session(session, user, settings)
    set_session_cookie(response, settings, token)
    return UserRead.model_validate(user)


@router.get("/registration-policy", response_model=RegistrationPolicyRead)
async def get_registration_policy(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RegistrationPolicyRead:
    return RegistrationPolicyRead(mode=await registration_mode(session, settings))


@router.post("/login", response_model=UserRead)
async def login(
    payload: LoginRequest,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> UserRead:
    user = await authenticate_user(session, str(payload.email), payload.password)
    token, _ = await create_session(session, user, settings)
    set_session_cookie(response, settings, token)
    return UserRead.model_validate(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> Response:
    token = request.cookies.get(settings.cookie_name)
    if token:
        await revoke_session(session, token)
    response.delete_cookie(settings.cookie_name, path="/")
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserRead)
async def me(user: Annotated[User, Depends(get_current_user)]) -> UserRead:
    return UserRead.model_validate(user)


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UpdateUserRequest,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> UserRead:
    user.locale = payload.locale
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserRead.model_validate(user)

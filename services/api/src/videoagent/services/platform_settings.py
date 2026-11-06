from typing import cast
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.config import Settings
from videoagent.models import PlatformSetting
from videoagent.schemas import RegistrationMode

GENERATION_ENABLED_KEY = "generation_enabled"
REGISTRATION_MODE_KEY = "registration_mode"
REGISTRATION_MODES = {"open", "invite", "closed"}


async def get_setting(
    session: AsyncSession,
    *,
    key: str,
    default: str,
) -> str:
    setting = await session.get(PlatformSetting, key)
    if setting is None:
        setting = PlatformSetting(key=key, value=default)
        session.add(setting)
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            setting = await session.get(PlatformSetting, key)
            if setting is None:
                raise
    return setting.value


async def set_setting(
    session: AsyncSession,
    *,
    key: str,
    value: str,
    admin_id: UUID,
) -> PlatformSetting:
    setting = await session.get(PlatformSetting, key)
    if setting is None:
        setting = PlatformSetting(key=key, value=value, updated_by=admin_id)
        session.add(setting)
    else:
        setting.value = value
        setting.updated_by = admin_id
    await session.commit()
    await session.refresh(setting)
    return setting


async def generation_enabled(
    session: AsyncSession,
    settings: Settings,
) -> bool:
    value = await get_setting(
        session,
        key=GENERATION_ENABLED_KEY,
        default="true" if settings.generation_enabled else "false",
    )
    return value.lower() == "true"


async def registration_mode(
    session: AsyncSession,
    settings: Settings,
) -> RegistrationMode:
    configured = settings.registration_mode
    default = configured if configured in REGISTRATION_MODES else "open"
    value = await get_setting(
        session,
        key=REGISTRATION_MODE_KEY,
        default=default,
    )
    return cast(RegistrationMode, value if value in REGISTRATION_MODES else "open")

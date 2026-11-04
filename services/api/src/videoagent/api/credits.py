from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.models import User
from videoagent.services.credits import credit_balance

router = APIRouter(tags=["credits"])


@router.get("/credits")
async def get_credits(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    return {
        "provider": "video_agent",
        "connected": True,
        "credits": await credit_balance(session, user_id=user.id, settings=settings),
    }

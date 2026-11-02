from typing import Annotated

from fastapi import APIRouter, Depends

from videoagent.api.dependencies import get_current_user, get_video_provider
from videoagent.errors import AppError
from videoagent.models import User
from videoagent.providers.base import VideoProvider
from videoagent.providers.pippit import (
    PippitCLIError,
    PippitCLIUnavailable,
    PippitNotAuthenticated,
    PippitVideoProvider,
)

router = APIRouter(prefix="/providers", tags=["providers"])


def _pippit_provider(provider: VideoProvider) -> PippitVideoProvider:
    if not isinstance(provider, PippitVideoProvider):
        raise AppError(
            status_code=409,
            code="PIPPIT_NOT_CONFIGURED",
            message="The Pippit video provider is not active.",
        )
    return provider


@router.get("/pippit")
async def pippit_status(
    user: Annotated[User, Depends(get_current_user)],
    provider: Annotated[VideoProvider, Depends(get_video_provider)],
) -> dict[str, object]:
    del user
    try:
        status = await _pippit_provider(provider).account_status()
    except PippitCLIUnavailable as exc:
        raise AppError(
            status_code=503,
            code="PIPPIT_CLI_UNAVAILABLE",
            message="Pippit CLI is not available on the server.",
        ) from exc
    except PippitCLIError as exc:
        raise AppError(
            status_code=502,
            code="PIPPIT_STATUS_UNAVAILABLE",
            message="The Pippit account status is temporarily unavailable.",
        ) from exc
    return {
        "provider": "pippit",
        "connected": status.get("logged_in") is True,
        "scope": "server",
    }


@router.get("/pippit/credits")
async def pippit_credits(
    user: Annotated[User, Depends(get_current_user)],
    provider: Annotated[VideoProvider, Depends(get_video_provider)],
) -> dict[str, object]:
    del user
    pippit = _pippit_provider(provider)
    try:
        credits = await pippit.get_credit_balance()
    except PippitNotAuthenticated:
        return {
            "provider": "pippit",
            "connected": False,
            "credits": None,
        }
    except PippitCLIUnavailable as exc:
        raise AppError(
            status_code=503,
            code="PIPPIT_CLI_UNAVAILABLE",
            message="Pippit CLI is not available on the server.",
        ) from exc
    except PippitCLIError as exc:
        raise AppError(
            status_code=502,
            code="PIPPIT_CREDITS_UNAVAILABLE",
            message="The Pippit credit balance is temporarily unavailable.",
        ) from exc
    return {
        "provider": "pippit",
        "connected": True,
        "credits": credits,
    }

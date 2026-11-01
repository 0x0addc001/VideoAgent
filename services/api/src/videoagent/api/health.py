from typing import Annotated

from fastapi import APIRouter, Depends, Response, status

from videoagent.api.dependencies import get_database, get_settings
from videoagent.config import Settings
from videoagent.db import Database
from videoagent.schemas import DependencyHealth, HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(
    response: Response,
    database: Annotated[Database, Depends(get_database)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> HealthResponse:
    try:
        await database.ping()
        dependency = "ok"
    except Exception:
        dependency = "error"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status="ok" if dependency == "ok" else "degraded",
        service=settings.app_name,
        dependencies=DependencyHealth(database=dependency),
    )

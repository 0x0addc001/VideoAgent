import asyncio
from typing import Any
from uuid import UUID

from videoagent.config import get_settings
from videoagent.db import Database
from videoagent.models import GenerationJob
from videoagent.providers.factory import build_video_provider
from videoagent.services.generation_jobs import refresh_generation_job
from videoagent.workers.celery_app import celery_app


async def _refresh_once(job_id: UUID) -> bool:
    settings = get_settings()
    database = Database(settings)
    provider = build_video_provider(settings)
    try:
        async with database.session() as session:
            job = await session.get(GenerationJob, job_id)
            if job is None or job.status in {"succeeded", "failed", "cancelled"}:
                return True
            return await refresh_generation_job(session, job, provider, settings)
    finally:
        await database.dispose()


@celery_app.task(  # type: ignore[untyped-decorator]
    bind=True,
    name="videoagent.poll_generation_job",
    max_retries=None,
)
def poll_generation_job(self: Any, job_id: str) -> str:
    completed = asyncio.run(_refresh_once(UUID(job_id)))
    if completed:
        return "completed"
    settings = get_settings()
    countdown = min(
        settings.celery_poll_interval_seconds * (2 ** min(self.request.retries, 4)),
        120,
    )
    raise self.retry(countdown=countdown)

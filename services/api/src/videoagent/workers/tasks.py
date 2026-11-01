import asyncio
from typing import Any
from uuid import UUID

from sqlalchemy import select

from videoagent.config import get_settings
from videoagent.db import Database
from videoagent.models import GenerationJob, Project, User
from videoagent.providers.oauth import build_kling_oauth_gateway
from videoagent.services.generation_jobs import refresh_generation_job
from videoagent.services.provider_resolver import resolve_video_provider
from videoagent.workers.celery_app import celery_app


async def _refresh_once(job_id: UUID) -> bool:
    settings = get_settings()
    database = Database(settings)
    gateway = build_kling_oauth_gateway(settings)
    try:
        async with database.session() as session:
            job = await session.get(GenerationJob, job_id)
            if job is None or job.status in {"succeeded", "failed", "cancelled"}:
                return True
            row = await session.execute(
                select(User)
                .join(Project, Project.owner_id == User.id)
                .where(Project.id == job.project_id)
            )
            user = row.scalar_one_or_none()
            if user is None:
                job.status = "failed"
                job.error_code = "PROJECT_OWNER_NOT_FOUND"
                await session.commit()
                return True
            try:
                provider = await resolve_video_provider(
                    session,
                    user=user,
                    settings=settings,
                    gateway=gateway,
                    allow_mock=False,
                )
            except Exception:
                job.status = "failed"
                job.error_code = "PROVIDER_AUTH_REQUIRED"
                await session.commit()
                return True
            return await refresh_generation_job(session, job, provider)
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

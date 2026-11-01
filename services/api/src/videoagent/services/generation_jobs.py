from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.models import GenerationJob, Shot
from videoagent.providers.base import VideoProvider

TERMINAL_JOB_STATUSES = {"succeeded", "failed", "cancelled"}


async def refresh_generation_job(
    session: AsyncSession,
    job: GenerationJob,
    provider: VideoProvider,
) -> bool:
    if job.status in TERMINAL_JOB_STATUSES:
        return True
    provider_job = await provider.status(job.provider_task_id)
    job.status = provider_job.status
    job.result_url = provider_job.result_url
    job.provider_response = provider_job.model_dump()

    shot = await session.get(Shot, job.shot_id)
    if shot is not None:
        if provider_job.status == "succeeded":
            shot.status = "completed"
        elif provider_job.status == "failed":
            shot.status = "failed"
        elif provider_job.status == "cancelled":
            shot.status = "cancelled"
        else:
            shot.status = "generating"
        session.add(shot)

    await session.commit()
    await session.refresh(job)
    return job.status in TERMINAL_JOB_STATUSES

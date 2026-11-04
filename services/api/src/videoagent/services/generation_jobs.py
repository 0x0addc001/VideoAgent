from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.config import Settings, get_settings
from videoagent.models import GenerationJob, Project, Shot
from videoagent.providers.base import VideoProvider
from videoagent.services.credits import refund_credits
from videoagent.services.media import materialize_generation_result

TERMINAL_JOB_STATUSES = {"succeeded", "failed", "cancelled"}


async def refresh_generation_job(
    session: AsyncSession,
    job: GenerationJob,
    provider: VideoProvider,
    settings: Settings | None = None,
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

    if provider_job.status == "succeeded":
        await materialize_generation_result(
            session,
            job,
            settings or get_settings(),
        )
    elif provider_job.status in {"failed", "cancelled"}:
        project = await session.get(Project, job.project_id)
        if project is not None:
            await refund_credits(
                session,
                user_id=project.owner_id,
                reference_id=str(job.id),
                settings=settings or get_settings(),
            )
    await session.commit()
    await session.refresh(job)
    return job.status in TERMINAL_JOB_STATUSES

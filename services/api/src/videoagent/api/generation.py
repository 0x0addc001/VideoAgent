from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import (
    get_current_user,
    get_session,
    get_settings,
    get_video_provider,
)
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import GenerationJob, Project, Shot, Storyboard, User
from videoagent.providers.base import CostEstimate, GenerationRequest, VideoProvider
from videoagent.schemas import GenerationApproval, GenerationJobRead
from videoagent.services.generation_jobs import refresh_generation_job

router = APIRouter(tags=["generation"])


async def owned_shot_or_404(
    session: AsyncSession,
    shot_id: UUID,
    user_id: UUID,
) -> tuple[Shot, Project]:
    result = await session.execute(
        select(Shot, Project)
        .join(Storyboard, Storyboard.id == Shot.storyboard_id)
        .join(Project, Project.id == Storyboard.project_id)
        .where(Shot.id == shot_id, Project.owner_id == user_id)
    )
    row = result.one_or_none()
    if row is None:
        raise AppError(
            status_code=404,
            code="SHOT_NOT_FOUND",
            message="The shot was not found.",
        )
    return row[0], row[1]


def provider_request(shot: Shot) -> GenerationRequest:
    return GenerationRequest(
        shot_id=shot.id,
        prompt=shot.prompt_en,
        duration_seconds=shot.duration_seconds,
        aspect_ratio=shot.aspect_ratio,
        generation_mode=shot.generation_mode,
    )


@router.post("/shots/{shot_id}/estimate", response_model=CostEstimate)
async def estimate_generation(
    shot_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[VideoProvider, Depends(get_video_provider)],
) -> CostEstimate:
    shot, _ = await owned_shot_or_404(session, shot_id, user.id)
    return await provider.estimate(provider_request(shot))


@router.post(
    "/shots/{shot_id}/generate",
    response_model=GenerationJobRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_shot(
    shot_id: UUID,
    payload: GenerationApproval,
    response: Response,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key", min_length=1, max_length=128)],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[VideoProvider, Depends(get_video_provider)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> GenerationJobRead:
    shot, project = await owned_shot_or_404(session, shot_id, user.id)

    existing_result = await session.execute(
        select(GenerationJob).where(
            GenerationJob.shot_id == shot.id,
            GenerationJob.idempotency_key == idempotency_key,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        response.status_code = status.HTTP_200_OK
        return GenerationJobRead.model_validate(existing)

    if not payload.approved:
        raise AppError(
            status_code=403,
            code="GENERATION_APPROVAL_REQUIRED",
            message="Generation requires explicit approval.",
        )

    provider_job = await provider.submit(provider_request(shot))
    job = GenerationJob(
        project_id=project.id,
        shot_id=shot.id,
        idempotency_key=idempotency_key,
        provider=provider_job.provider,
        provider_task_id=provider_job.task_id,
        status=provider_job.status,
        result_url=provider_job.result_url,
        provider_response=provider_job.model_dump(),
    )
    shot.status = "completed" if provider_job.status == "succeeded" else "generating"
    session.add(job)
    session.add(shot)
    await session.commit()
    await session.refresh(job)
    if settings.celery_enabled and job.status not in {"succeeded", "failed", "cancelled"}:
        from videoagent.workers.tasks import poll_generation_job

        poll_generation_job.delay(str(job.id))
    return GenerationJobRead.model_validate(job)


@router.get("/jobs/{job_id}", response_model=GenerationJobRead)
async def get_job(
    job_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[VideoProvider, Depends(get_video_provider)],
) -> GenerationJobRead:
    result = await session.execute(
        select(GenerationJob)
        .join(Project, Project.id == GenerationJob.project_id)
        .where(GenerationJob.id == job_id, Project.owner_id == user.id)
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise AppError(
            status_code=404,
            code="JOB_NOT_FOUND",
            message="The generation job was not found.",
        )
    await refresh_generation_job(session, job, provider)
    return GenerationJobRead.model_validate(job)

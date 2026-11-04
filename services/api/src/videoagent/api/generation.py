import re
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Header, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import (
    get_current_user,
    get_kling_gateway,
    get_session,
    get_settings,
    get_video_provider,
)
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import GenerationJob, Project, Shot, Storyboard, User
from videoagent.providers.base import CostEstimate, GenerationRequest, VideoProvider
from videoagent.providers.oauth import KlingOAuthGateway
from videoagent.schemas import GenerationApproval, GenerationJobRead
from videoagent.services.credits import refund_credits, reserve_credits
from videoagent.services.generation_jobs import refresh_generation_job
from videoagent.services.media import materialize_generation_result
from videoagent.services.platform_settings import generation_enabled
from videoagent.services.provider_resolver import resolve_video_provider

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


KLING_MODEL_ALIASES = {
    "Kling Video 4.0": "kling-video-v4_0",
    "Kling Video 3.0 Omni": "kling-video-v3_0_omni",
    "Kling Video 3.0": "kling-video-v3_0",
    "Kling Video 3.0 Turbo": "kling-video-v3_0_turbo",
    "Kling Video O1": "kling-video-o1",
    "Kling Video 2.6": "kling-video-v2_6",
    "Kling Video 2.5": "kling-video-v2_5",
}
PIPPIT_MODEL_ALIASES = {
    "Seedance 2.5 Draft": "Seedance_2.5_draft",
    "Seedance 2.5": "Seedance_2.5",
    "Seedance 2.0 Fast VIP": "seedance2.0_fast_vision",
    "Seedance 2.0 VIP": "seedance2.0_vision",
    "Seedance 2.0 Mini Preview": "Seedance_2.0_mini_lite",
    "Seedance 2.0 Mini": "Seedance_2.0_mini",
    "Wan 3.0": "wan3.0",
    "HappyHorse 1.1": "happyhorse-1.1",
}


def provider_request(shot: Shot, *, model: str | None = None) -> GenerationRequest:
    return GenerationRequest(
        shot_id=shot.id,
        prompt=shot.prompt_en,
        duration_seconds=shot.duration_seconds,
        aspect_ratio=shot.aspect_ratio,
        generation_mode=shot.generation_mode,
        model=model,
    )


def selected_model(project: Project) -> tuple[str | None, str | None]:
    match = re.search(r"(?:^|·\s*)(Kling|Pippit)/([^·\n]+)", project.brief)
    if match is None:
        return None, None
    provider = match.group(1).lower()
    label = match.group(2).strip()
    aliases = KLING_MODEL_ALIASES if provider == "kling" else PIPPIT_MODEL_ALIASES
    return provider, aliases.get(label, label)


async def provider_for_project(
    session: AsyncSession,
    *,
    user: User,
    project: Project,
    settings: Settings,
    default_provider: VideoProvider,
    gateway: KlingOAuthGateway,
) -> tuple[VideoProvider, str | None]:
    provider_name, model = selected_model(project)
    if settings.video_provider.lower() == "mock":
        return default_provider, None
    if provider_name == "pippit":
        return default_provider, model
    if provider_name != "kling":
        return default_provider, None
    provider = await resolve_video_provider(
        session,
        user=user,
        settings=settings,
        gateway=gateway,
        allow_mock=False,
    )
    return provider, model


@router.post("/shots/{shot_id}/estimate", response_model=CostEstimate)
async def estimate_generation(
    shot_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    provider: Annotated[VideoProvider, Depends(get_video_provider)],
    gateway: Annotated[KlingOAuthGateway, Depends(get_kling_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CostEstimate:
    shot, project = await owned_shot_or_404(session, shot_id, user.id)
    if not await generation_enabled(session, settings):
        raise AppError(
            status_code=503,
            code="GENERATION_DISABLED",
            message="Video generation is temporarily unavailable.",
        )
    selected_provider, model = await provider_for_project(
        session,
        user=user,
        project=project,
        settings=settings,
        default_provider=provider,
        gateway=gateway,
    )
    return await selected_provider.estimate(provider_request(shot, model=model))


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
    gateway: Annotated[KlingOAuthGateway, Depends(get_kling_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> GenerationJobRead:
    shot, project = await owned_shot_or_404(session, shot_id, user.id)
    if not await generation_enabled(session, settings):
        raise AppError(
            status_code=503,
            code="GENERATION_DISABLED",
            message="Video generation is temporarily unavailable.",
        )

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

    selected_provider, model = await provider_for_project(
        session,
        user=user,
        project=project,
        settings=settings,
        default_provider=provider,
        gateway=gateway,
    )
    request = provider_request(shot, model=model)
    job_id = uuid4()
    estimate = await selected_provider.estimate(request)
    await reserve_credits(
        session,
        user_id=user.id,
        amount=estimate.credits,
        reference_id=str(job_id),
        settings=settings,
    )
    try:
        provider_job = await selected_provider.submit(request)
    except Exception:
        await refund_credits(
            session,
            user_id=user.id,
            reference_id=str(job_id),
            settings=settings,
        )
        raise
    job = GenerationJob(
        id=job_id,
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
    await session.flush()
    if provider_job.status == "succeeded":
        await materialize_generation_result(session, job, settings)
    elif provider_job.status in {"failed", "cancelled"}:
        await refund_credits(
            session,
            user_id=user.id,
            reference_id=str(job.id),
            settings=settings,
        )
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
    gateway: Annotated[KlingOAuthGateway, Depends(get_kling_gateway)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> GenerationJobRead:
    result = await session.execute(
        select(GenerationJob, Project)
        .join(Project, Project.id == GenerationJob.project_id)
        .where(GenerationJob.id == job_id, Project.owner_id == user.id)
    )
    row = result.one_or_none()
    if row is None:
        raise AppError(
            status_code=404,
            code="JOB_NOT_FOUND",
            message="The generation job was not found.",
        )
    job, project = row
    if job.provider == "kling":
        selected_provider = await resolve_video_provider(
            session,
            user=user,
            settings=settings,
            gateway=gateway,
            allow_mock=False,
        )
    else:
        selected_provider = provider
    await refresh_generation_job(session, job, selected_provider, settings)
    return GenerationJobRead.model_validate(job)

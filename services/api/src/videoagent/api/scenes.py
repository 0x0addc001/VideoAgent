import logging
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Project, Scene, Storyboard, User
from videoagent.providers.base import CostEstimate
from videoagent.providers.kling_cli import KlingCLIError, KlingCLIVideoProvider
from videoagent.providers.wanx_image import WanxImageError, WanxImageProvider
from videoagent.schemas import AssetRead, CharacterGenerationApproval, ModelSelection
from videoagent.services.credits import refund_credits, reserve_credits
from videoagent.services.image_models import resolve_image_model
from videoagent.services.image_references import resolve_reference_paths
from videoagent.services.media import (
    asset_read,
    materialize_visual_image,
    save_upload,
)
from videoagent.services.platform_settings import generation_enabled
from videoagent.services.storage import StorageError, build_storage
from videoagent.services.storyboards import owned_project_or_404

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scenes", tags=["scenes"])
IMAGE_GENERATION_CREDITS = 2


async def owned_scene_or_404(
    session: AsyncSession,
    scene_id: UUID,
    user_id: UUID,
) -> tuple[Scene, Project]:
    row = (
        await session.execute(
            select(Scene, Project)
            .join(Storyboard, Storyboard.id == Scene.storyboard_id)
            .join(Project, Project.id == Storyboard.project_id)
            .where(Scene.id == scene_id)
        )
    ).one_or_none()
    if row is None:
        raise AppError(
            status_code=404,
            code="SCENE_NOT_FOUND",
            message="The scene was not found.",
        )
    scene, project = row
    await owned_project_or_404(session, project.id, user_id)
    return scene, project


@router.post(
    "/{scene_id}/assets",
    response_model=AssetRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_scene_image(
    scene_id: UUID,
    file: Annotated[UploadFile, File()],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AssetRead:
    scene, project = await owned_scene_or_404(session, scene_id, user.id)
    if not (file.content_type or "").startswith("image/"):
        raise AppError(
            status_code=422,
            code="IMAGE_REQUIRED",
            message="Scene assets must be image files.",
        )
    asset = await save_upload(
        session,
        owner_id=user.id,
        project_id=project.id,
        upload=file,
        settings=settings,
    )
    asset.filename = f"scene-{scene.id}-{asset.filename}"[:256]
    await session.commit()
    await session.refresh(asset)
    return asset_read(asset)


@router.post("/{scene_id}/estimate", response_model=CostEstimate)
async def estimate_scene_image(
    scene_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    payload: ModelSelection | None = None,
) -> CostEstimate:
    await owned_scene_or_404(session, scene_id, user.id)
    provider_name, _ = resolve_image_model(payload, settings)
    if not await generation_enabled(session, settings):
        raise AppError(
            status_code=503,
            code="GENERATION_DISABLED",
            message="Image generation is temporarily unavailable.",
        )
    return CostEstimate(
        provider="mock" if settings.video_provider.lower() == "mock" else provider_name,
        credits=IMAGE_GENERATION_CREDITS,
        duration_seconds=0,
    )


@router.post(
    "/{scene_id}/generate",
    response_model=AssetRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_scene_image(
    scene_id: UUID,
    payload: CharacterGenerationApproval,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AssetRead:
    scene, project = await owned_scene_or_404(session, scene_id, user.id)
    if not payload.approved:
        raise AppError(
            status_code=403,
            code="GENERATION_APPROVAL_REQUIRED",
            message="Generation requires explicit approval.",
        )
    provider_name, model = resolve_image_model(payload, settings)
    if not await generation_enabled(session, settings):
        raise AppError(
            status_code=503,
            code="GENERATION_DISABLED",
            message="Image generation is temporarily unavailable.",
        )
    reference_paths: list[str] = []
    if payload.generation_mode == "image_to_image":
        asset_ids: list[UUID] = []
        if payload.reference_asset_id is not None:
            asset_ids.append(payload.reference_asset_id)
        asset_ids.extend(payload.reference_asset_ids)
        reference_paths = await resolve_reference_paths(
            session,
            project_id=project.id,
            asset_ids=asset_ids,
            settings=settings,
        )

    try:
        build_storage(settings)
    except StorageError as exc:
        raise AppError(
            status_code=503,
            code="MEDIA_STORAGE_UNAVAILABLE",
            message=f"Media storage is unavailable: {exc}",
        ) from exc

    reservation_id = str(uuid4())
    await reserve_credits(
        session,
        user_id=user.id,
        amount=IMAGE_GENERATION_CREDITS,
        reference_id=reservation_id,
        settings=settings,
    )
    try:
        if settings.video_provider.lower() == "mock":
            result_url = f"mock://scene/{uuid4()}"
        elif provider_name == "wanx":
            result_url = await WanxImageProvider(
                api_key=settings.wanx_api_key,
                base_url=settings.wanx_base_url,
                timeout_seconds=settings.wanx_timeout_seconds,
            ).generate_image(
                prompt=scene.prompt_en,
                generation_mode=payload.generation_mode,
                reference_image_path=reference_paths[0] if reference_paths else None,
                reference_image_paths=reference_paths,
                model=model,
            )
        else:
            provider = KlingCLIVideoProvider(
                command=settings.kling_cli_command,
                timeout_seconds=settings.kling_cli_timeout_seconds,
            )
            result_url = await provider.generate_image(
                prompt=scene.prompt_en,
                generation_mode=payload.generation_mode,
                reference_image_path=reference_paths[0] if reference_paths else None,
                reference_image_paths=reference_paths,
                model=model,
            )
        asset = await materialize_visual_image(
            session,
            owner_id=user.id,
            project_id=project.id,
            resource_type="scene",
            resource_id=scene.id,
            result_url=result_url,
            settings=settings,
        )
        await session.commit()
        await session.refresh(asset)
        return asset_read(asset)
    except Exception as exc:
        await session.rollback()
        try:
            await refund_credits(
                session,
                user_id=user.id,
                reference_id=reservation_id,
                settings=settings,
            )
        except Exception:  # noqa: BLE001 - never mask the generation error
            logger.exception("credit refund failed for %s", reservation_id)
        if isinstance(exc, AppError):
            raise
        message = str(exc)[:1200] if isinstance(exc, (KlingCLIError, WanxImageError)) else ""
        raise AppError(
            status_code=502,
            code="PROVIDER_IMAGE_GENERATION_FAILED",
            message=message or "The scene image provider rejected the request.",
        ) from exc

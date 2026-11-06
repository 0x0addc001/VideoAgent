from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Asset, Character, Project, Storyboard, User
from videoagent.providers.base import CostEstimate
from videoagent.providers.kling_cli import (
    DEFAULT_KLING_IMAGE_MODEL,
    KLING_IMAGE_MODELS,
    KlingCLIError,
    KlingCLIVideoProvider,
)
from videoagent.schemas import AssetRead, CharacterGenerationApproval, ModelSelection
from videoagent.services.credits import refund_credits, reserve_credits
from videoagent.services.media import (
    asset_path,
    asset_read,
    materialize_character_image,
    save_upload,
)
from videoagent.services.platform_settings import generation_enabled
from videoagent.services.storyboards import owned_project_or_404

router = APIRouter(prefix="/characters", tags=["characters"])
IMAGE_GENERATION_CREDITS = 2


def image_model_for(payload: ModelSelection | None) -> str:
    if payload and payload.provider not in {None, "kling"}:
        raise AppError(
            status_code=422,
            code="IMAGE_PROVIDER_UNSUPPORTED",
            message="The selected provider does not support image generation.",
        )
    model = payload.model if payload and payload.model else DEFAULT_KLING_IMAGE_MODEL
    if model not in KLING_IMAGE_MODELS:
        raise AppError(
            status_code=422,
            code="IMAGE_MODEL_UNSUPPORTED",
            message="The selected model does not support image generation.",
        )
    return model


async def owned_character_or_404(
    session: AsyncSession,
    character_id: UUID,
    user_id: UUID,
) -> tuple[Character, Project]:
    row = (
        await session.execute(
            select(Character, Project)
            .join(Storyboard, Storyboard.id == Character.storyboard_id)
            .join(Project, Project.id == Storyboard.project_id)
            .where(Character.id == character_id)
        )
    ).one_or_none()
    if row is None:
        raise AppError(
            status_code=404,
            code="CHARACTER_NOT_FOUND",
            message="The character was not found.",
        )
    character, project = row
    await owned_project_or_404(session, project.id, user_id)
    return character, project


@router.post("/{character_id}/estimate", response_model=CostEstimate)
async def estimate_character_image(
    character_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
    payload: ModelSelection | None = None,
) -> CostEstimate:
    await owned_character_or_404(session, character_id, user.id)
    image_model_for(payload)
    if not await generation_enabled(session, settings):
        raise AppError(
            status_code=503,
            code="GENERATION_DISABLED",
            message="Image generation is temporarily unavailable.",
        )
    return CostEstimate(
        provider="mock" if settings.video_provider.lower() == "mock" else "kling",
        credits=IMAGE_GENERATION_CREDITS,
        duration_seconds=0,
    )


@router.post(
    "/{character_id}/assets",
    response_model=AssetRead,
    status_code=status.HTTP_201_CREATED,
)
async def upload_character_image(
    character_id: UUID,
    file: Annotated[UploadFile, File()],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AssetRead:
    character, project = await owned_character_or_404(session, character_id, user.id)
    if not (file.content_type or "").startswith("image/"):
        raise AppError(
            status_code=422,
            code="IMAGE_REQUIRED",
            message="Character assets must be image files.",
        )
    asset = await save_upload(
        session,
        owner_id=user.id,
        project_id=project.id,
        upload=file,
        settings=settings,
    )
    asset.filename = f"character-{character.id}-{asset.filename}"[:256]
    await session.commit()
    await session.refresh(asset)
    return asset_read(asset)


@router.post(
    "/{character_id}/generate",
    response_model=AssetRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_character_image(
    character_id: UUID,
    payload: CharacterGenerationApproval,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AssetRead:
    character, project = await owned_character_or_404(session, character_id, user.id)
    if not payload.approved:
        raise AppError(
            status_code=403,
            code="GENERATION_APPROVAL_REQUIRED",
            message="Generation requires explicit approval.",
        )
    model = image_model_for(payload)
    if not await generation_enabled(session, settings):
        raise AppError(
            status_code=503,
            code="GENERATION_DISABLED",
            message="Image generation is temporarily unavailable.",
        )

    reference_path: str | None = None
    if payload.generation_mode == "image_to_image":
        if payload.reference_asset_id is None:
            raise AppError(
                status_code=422,
                code="REFERENCE_REQUIRED",
                message="Reference-image generation requires an image.",
            )
        reference = await session.scalar(
            select(Asset).where(
                Asset.id == payload.reference_asset_id,
                Asset.project_id == project.id,
                Asset.deleted_at.is_(None),
            )
        )
        if reference is None or not reference.content_type.startswith("image/"):
            raise AppError(
                status_code=422,
                code="REFERENCE_INVALID",
                message="The selected reference is not an image in this project.",
            )
        path = asset_path(reference, settings)
        if not path.exists():
            raise AppError(
                status_code=404,
                code="REFERENCE_FILE_NOT_FOUND",
                message="The selected reference image file is unavailable.",
            )
        reference_path = str(path)

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
            result_url = f"mock://character/{uuid4()}"
        else:
            provider = KlingCLIVideoProvider(
                command=settings.kling_cli_command,
                timeout_seconds=settings.kling_cli_timeout_seconds,
            )
            result_url = await provider.generate_image(
                prompt=character.prompt_en,
                generation_mode=payload.generation_mode,
                reference_image_path=reference_path,
                model=model,
            )
        asset = await materialize_character_image(
            session,
            owner_id=user.id,
            project_id=project.id,
            character_id=character.id,
            result_url=result_url,
            settings=settings,
        )
        await session.commit()
        await session.refresh(asset)
        return asset_read(asset)
    except Exception as exc:
        await session.rollback()
        await refund_credits(
            session,
            user_id=user.id,
            reference_id=reservation_id,
            settings=settings,
        )
        if isinstance(exc, AppError):
            raise
        message = str(exc)[:1200] if isinstance(exc, KlingCLIError) else ""
        raise AppError(
            status_code=502,
            code="PROVIDER_IMAGE_GENERATION_FAILED",
            message=message or "The character image provider rejected the request.",
        ) from exc

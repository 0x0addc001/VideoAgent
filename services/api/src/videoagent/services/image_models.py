"""Resolve which provider should run a requested image model."""

from __future__ import annotations

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.schemas import ModelSelection
from videoagent.services.model_catalog import model_catalog

DEFAULT_IMAGE_MODEL = "kling-image-v3_0"


def resolve_image_model(
    payload: ModelSelection | None,
    settings: Settings,
) -> tuple[str, str]:
    model = payload.model if payload and payload.model else DEFAULT_IMAGE_MODEL
    if payload and payload.provider and payload.provider not in {"kling", "wanx"}:
        raise AppError(
            status_code=422,
            code="IMAGE_PROVIDER_UNSUPPORTED",
            message="The selected provider does not support image generation.",
        )
    options = {option.model: option for option in model_catalog(settings) if option.kind == "image"}
    option = options.get(model)
    if option is None:
        raise AppError(
            status_code=422,
            code="IMAGE_MODEL_UNSUPPORTED",
            message="The selected model does not support image generation.",
        )
    if payload and payload.provider and payload.provider != option.provider:
        raise AppError(
            status_code=422,
            code="IMAGE_PROVIDER_UNSUPPORTED",
            message="The selected provider does not support this image model.",
        )
    return option.provider, model

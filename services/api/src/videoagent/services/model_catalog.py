"""Single source of truth for the selectable model catalogue.

The catalogue is served by ``GET /api/v1/providers/models`` so the product UI
never has to bake model ids into the bundle. Operators can append models with
``VIDEOAGENT_EXTRA_MODELS`` or hide defaults with ``VIDEOAGENT_DISABLED_MODELS``.
"""

from __future__ import annotations

from dataclasses import dataclass

from videoagent.config import Settings


@dataclass(frozen=True)
class ModelOption:
    provider: str
    model: str
    label: str
    kind: str = "video"

    @property
    def display(self) -> str:
        return f"{self.provider.title()}/{self.label}"

    def as_dict(self) -> dict[str, str]:
        return {
            "provider": self.provider,
            "model": self.model,
            "label": self.label,
            "display": self.display,
            "kind": self.kind,
        }


VIDEO_MODELS: tuple[ModelOption, ...] = (
    # Kling (China region)
    ModelOption("kling", "kling-video-v4_0", "Kling Video 4.0"),
    ModelOption("kling", "kling-video-v4_0_flash", "Kling Video 4.0 Flash"),
    ModelOption("kling", "kling-video-v3_0_omni", "Kling Video 3.0 Omni"),
    ModelOption("kling", "kling-video-v3_0", "Kling Video 3.0"),
    ModelOption("kling", "kling-video-v3_0_turbo", "Kling Video 3.0 Turbo"),
    ModelOption("kling", "kling-video-o1", "Kling Video O1"),
    ModelOption("kling", "kling-video-v2_6", "Kling Video 2.6"),
    ModelOption("kling", "kling-video-v2_5", "Kling Video 2.5"),
    # Pippit
    ModelOption("pippit", "Seedance_2.5_draft", "Seedance 2.5 Draft"),
    ModelOption("pippit", "Seedance_2.5", "Seedance 2.5"),
    ModelOption("pippit", "seedance2.0_fast_vision", "Seedance 2.0 Fast VIP"),
    ModelOption("pippit", "seedance2.0_vision", "Seedance 2.0 VIP"),
    ModelOption("pippit", "Seedance_2.0_mini_lite", "Seedance 2.0 Mini Preview"),
    ModelOption("pippit", "Seedance_2.0_mini", "Seedance 2.0 Mini"),
    ModelOption("pippit", "wan3.0", "Wan 3.0"),
    ModelOption("pippit", "happyhorse-1.1", "HappyHorse 1.1"),
    # Alibaba Cloud Model Studio (Wanx)
    ModelOption("wanx", "wan2.6-t2v", "Wan 2.6"),
    ModelOption("wanx", "wan3.0-video-prime", "Wan 3.0 Prime"),
)

IMAGE_MODELS: tuple[ModelOption, ...] = (
    ModelOption("kling", "kling-image-v3_0", "Kling Image 3.0", "image"),
    ModelOption("kling", "kling-image-v3_0_omni", "Kling Image 3.0 Omni", "image"),
    ModelOption("kling", "kling-image-o1", "Kling Image O1", "image"),
    ModelOption("kling", "kling-image-v2_1", "Kling Image 2.1", "image"),
)

DEFAULT_MODELS: tuple[ModelOption, ...] = VIDEO_MODELS + IMAGE_MODELS


def model_catalog(settings: Settings | None = None) -> list[ModelOption]:
    """Return the default catalogue with operator overrides applied."""
    options = list(DEFAULT_MODELS)
    if settings is None:
        return options

    disabled = {value.strip() for value in settings.disabled_models if value.strip()}
    if disabled:
        options = [
            option
            for option in options
            if option.model not in disabled and option.display not in disabled
        ]

    options.extend(
        ModelOption(
            provider=extra.provider.strip().lower(),
            model=extra.model.strip(),
            label=extra.label.strip(),
            kind=extra.kind,
        )
        for extra in settings.extra_models
        if extra.model.strip() and extra.label.strip()
    )
    return options


def resolve_model_id(provider: str, value: str) -> str:
    """Map a ``Provider/Label`` brief tag to its model id, falling back to ``value``."""
    provider = provider.strip().lower()
    candidate = value.strip()
    for option in DEFAULT_MODELS:
        if option.provider != provider:
            continue
        if candidate in {option.model, option.label, option.display}:
            return option.model
    return candidate

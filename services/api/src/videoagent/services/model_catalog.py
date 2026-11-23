"""Single source of truth for the selectable model catalogue.

The catalogue is served by ``GET /api/v1/providers/models`` so the product UI
never has to bake model ids into the bundle. Each entry also carries the
capabilities and cost the auto-router needs: supported modes, maximum duration,
native aspect ratios, reference limits, audio support, credits per second and a
quality tier.

Operators can append models with ``VIDEOAGENT_EXTRA_MODELS`` or hide defaults
with ``VIDEOAGENT_DISABLED_MODELS``.
"""

from __future__ import annotations

from dataclasses import dataclass

from videoagent.config import Settings

VIDEO_MODE = "video"
IMAGE_MODE = "image"


@dataclass(frozen=True)
class ModelOption:
    provider: str
    model: str
    label: str
    kind: str = VIDEO_MODE
    modes: tuple[str, ...] = ("text_to_video", "image_to_video")
    max_duration: int = 15
    ratios: tuple[str, ...] = ("16:9", "9:16", "1:1", "4:3", "3:4")
    max_references: int = 0
    supports_audio: bool = False
    credits_per_second: int = 1
    quality_tier: int = 2

    @property
    def display(self) -> str:
        return f"{self.provider.title()}/{self.label}"

    def estimated_credits(self, duration_seconds: int) -> int:
        return max(1, self.credits_per_second * max(1, duration_seconds))

    def as_dict(self) -> dict[str, object]:
        return {
            "provider": self.provider,
            "model": self.model,
            "label": self.label,
            "display": self.display,
            "kind": self.kind,
            "modes": list(self.modes),
            "max_duration": self.max_duration,
            "ratios": list(self.ratios),
            "max_references": self.max_references,
            "supports_audio": self.supports_audio,
            "credits_per_second": self.credits_per_second,
            "quality_tier": self.quality_tier,
        }


def _kling(model: str, label: str, *, credits: int = 2, tier: int = 3) -> ModelOption:
    return ModelOption(
        "kling",
        model,
        label,
        max_duration=30,
        ratios=("16:9", "9:16", "1:1", "21:9"),
        max_references=10,
        credits_per_second=credits,
        quality_tier=tier,
    )


def _pippit(
    model: str, label: str, *, credits: int = 1, tier: int = 2, refs: int = 5
) -> ModelOption:
    return ModelOption(
        "pippit",
        model,
        label,
        max_duration=30,
        ratios=("16:9", "9:16", "1:1", "21:9"),
        max_references=refs,
        credits_per_second=credits,
        quality_tier=tier,
    )


def _wanx_image(
    model: str,
    label: str,
    *,
    refs: int = 0,
    credits: int = 1,
    tier: int = 2,
) -> ModelOption:
    return ModelOption(
        "wanx",
        model,
        label,
        IMAGE_MODE,
        modes=("text_to_image", "image_to_image") if refs else ("text_to_image",),
        max_duration=1,
        ratios=(),
        max_references=refs,
        credits_per_second=credits,
        quality_tier=tier,
    )


def _wanx(
    model: str,
    label: str,
    *,
    max_duration: int = 15,
    refs: int = 1,
    audio: bool = False,
    credits: int = 1,
    tier: int = 2,
) -> ModelOption:
    return ModelOption(
        "wanx",
        model,
        label,
        max_duration=max_duration,
        ratios=("16:9", "9:16", "1:1", "4:3", "3:4"),
        max_references=refs,
        supports_audio=audio,
        credits_per_second=credits,
        quality_tier=tier,
    )


VIDEO_MODELS: tuple[ModelOption, ...] = (
    # Kling (China region)
    _kling("kling-video-v4_0", "Kling Video 4.0"),
    _kling("kling-video-v4_0_flash", "Kling Video 4.0 Flash", credits=1, tier=2),
    _kling("kling-video-v3_0_omni", "Kling Video 3.0 Omni", credits=2),
    _kling("kling-video-v3_0", "Kling Video 3.0", credits=2, tier=2),
    _kling("kling-video-v3_0_turbo", "Kling Video 3.0 Turbo", credits=1, tier=2),
    _kling("kling-video-o1", "Kling Video O1", credits=2),
    _kling("kling-video-v2_6", "Kling Video 2.6", credits=1, tier=2),
    _kling("kling-video-v2_5", "Kling Video 2.5", credits=1, tier=1),
    # Pippit
    _pippit("Seedance_2.5", "Seedance 2.5"),
    _pippit("seedance2.0_fast_vision", "Seedance 2.0 Fast VIP", tier=1),
    _pippit("seedance2.0_vision", "Seedance 2.0 VIP"),
    _pippit("Seedance_2.0_mini_lite", "Seedance 2.0 Mini Preview", tier=1),
    _pippit("Seedance_2.0_mini", "Seedance 2.0 Mini", tier=1),
    _pippit("wan3.0", "Wan 3.0", credits=2),
    _pippit("happyhorse-1.1", "HappyHorse 1.1", tier=1),
    # Alibaba Cloud Model Studio (Wanx)
    _wanx("wan2.6-t2v", "Wan 2.6"),
    _wanx("wan2.7-t2v", "Wan 2.7", tier=3),
    _wanx(
        "wan3.0-video-prime",
        "Wan 3.0 Prime",
        max_duration=30,
        refs=3,
        audio=True,
        credits=2,
        tier=3,
    ),
)

IMAGE_MODELS: tuple[ModelOption, ...] = (
    ModelOption("kling", "kling-image-v4_0", "Kling Image 4.0", IMAGE_MODE),
    ModelOption("kling", "kling-image-v3_0", "Kling Image 3.0", IMAGE_MODE),
    ModelOption("kling", "kling-image-v3_0_omni", "Kling Image 3.0 Omni", IMAGE_MODE),
    ModelOption("kling", "kling-image-o1", "Kling Image O1", IMAGE_MODE),
    ModelOption("kling", "kling-image-v2_1", "Kling Image 2.1", IMAGE_MODE),
    # Alibaba Cloud Model Studio image models
    _wanx_image("wan2.7-image", "Wan 2.7 Image"),
    _wanx_image("wan2.7-image-pro", "Wan 2.7 Image Pro", tier=3),
    _wanx_image("wanx2.1-t2i-turbo", "Wanx 2.1 T2I Turbo"),
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

    from videoagent.services.cli_model_discovery import cli_models
    from videoagent.services.model_discovery import discovered_models

    seen = {(option.provider, option.model) for option in options}
    for discovered in cli_models():
        key = (discovered.provider, discovered.model)
        if key not in seen:
            options.append(discovered)
            seen.add(key)
    for discovered in discovered_models():
        key = (discovered.provider, discovered.model)
        if key not in seen:
            options.append(discovered)
            seen.add(key)

    options.extend(
        ModelOption(
            provider=extra.provider.strip().lower(),
            model=extra.model.strip(),
            label=extra.label.strip(),
            kind=extra.kind,
            modes=tuple(extra.modes),
            max_duration=extra.max_duration,
            ratios=tuple(extra.ratios),
            max_references=extra.max_references,
            supports_audio=extra.supports_audio,
            credits_per_second=extra.credits_per_second,
            quality_tier=extra.quality_tier,
        )
        for extra in settings.extra_models
        if extra.model.strip() and extra.label.strip()
    )
    return options


def model_provider(model: str, settings: Settings | None = None) -> str:
    """Return the provider that owns a model id, defaulting to Kling."""
    for option in model_catalog(settings):
        if option.model == model:
            return option.provider
    return "kling"


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

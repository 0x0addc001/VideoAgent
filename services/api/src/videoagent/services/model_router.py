"""Auto model routing: turn shot options into a ranked model recommendation.

The user fills in the shot options (generation mode, duration, aspect ratio,
references, audio and a budget/quality preference). This module hard-filters the
catalogue by capability and provider availability, then scores what is left so
the API can explain why a model was recommended.
"""

from __future__ import annotations

import shutil
from dataclasses import dataclass

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.services.model_catalog import ModelOption, model_catalog

PREFERENCES: dict[str, tuple[float, float, float]] = {
    # (cost, quality, fit)
    "budget": (0.60, 0.10, 0.30),
    "balanced": (0.34, 0.33, 0.33),
    "quality": (0.15, 0.55, 0.30),
}

REASON_CODES = (
    "ratio_native",
    "duration_fits",
    "references_supported",
    "audio_supported",
    "cheapest",
    "highest_quality",
    "mock_provider",
)


@dataclass(frozen=True)
class RoutingRequest:
    generation_mode: str = "text_to_video"
    duration_seconds: int = 5
    aspect_ratio: str = "16:9"
    reference_image_count: int = 0
    audio_enabled: bool = False
    preference: str = "balanced"


@dataclass(frozen=True)
class Candidate:
    option: ModelOption
    score: int
    estimated_credits: int
    reasons: tuple[str, ...]

    def as_dict(self) -> dict[str, object]:
        return {
            "provider": self.option.provider,
            "model": self.option.model,
            "label": self.option.label,
            "display": self.option.display,
            "estimated_credits": self.estimated_credits,
            "score": self.score,
            "reasons": list(self.reasons),
        }


def provider_available(provider: str, settings: Settings) -> bool:
    """Best-effort availability check from server configuration."""
    if provider == "mock":
        return True
    if provider == "wanx":
        return bool(settings.wanx_api_key)
    if provider == "pippit":
        return shutil.which(settings.pippit_cli_command) is not None
    if provider == "kling":
        if settings.kling_backend.lower() == "cli":
            return shutil.which(settings.kling_cli_command) is not None
        # MCP needs a per-user OAuth token; only assume it when it is the
        # configured provider, otherwise it would recommend something the
        # current user cannot use.
        return settings.video_provider.lower() == "kling"
    return False


def _fits(option: ModelOption, request: RoutingRequest) -> bool:
    if request.generation_mode not in option.modes:
        return False
    if request.aspect_ratio not in option.ratios:
        return False
    if request.duration_seconds > option.max_duration:
        return False
    if request.reference_image_count > option.max_references:
        return False
    return not (request.audio_enabled and not option.supports_audio)


def _score(
    option: ModelOption,
    request: RoutingRequest,
    *,
    cheapest: int,
    best_tier: int,
    weight: tuple[float, float, float],
) -> tuple[int, tuple[str, ...]]:
    ratio_native = request.aspect_ratio in option.ratios
    references_ok = request.reference_image_count <= option.max_references
    fit = (0.6 if ratio_native else 0.15) + 0.2 + (0.2 if references_ok else 0.0)
    cost = 1.0 - (option.credits_per_second / max(cheapest, 1)) if cheapest else 1.0
    quality = (option.quality_tier - 1) / 2

    score = round(
        100 * (weight[0] * max(cost, 0.0) + weight[1] * quality + weight[2] * min(fit, 1.0))
    )

    reasons: list[str] = []
    reasons.append("ratio_native")
    reasons.append("duration_fits")
    if request.reference_image_count:
        reasons.append("references_supported")
    if request.audio_enabled:
        reasons.append("audio_supported")
    if option.credits_per_second == cheapest:
        reasons.append("cheapest")
    if option.quality_tier == best_tier:
        reasons.append("highest_quality")
    return score, tuple(reasons)


def recommend_models(
    *,
    settings: Settings,
    request: RoutingRequest,
    limit: int = 3,
) -> list[Candidate]:
    """Return ranked candidates, or raise when no model can satisfy the options."""
    if settings.video_provider.lower() == "mock":
        mock = ModelOption(
            "mock",
            "mock",
            "Mock",
            max_duration=30,
            ratios=("16:9", "9:16", "1:1", "21:9"),
            max_references=10,
            supports_audio=True,
            credits_per_second=1,
            quality_tier=1,
        )
        return [
            Candidate(
                option=mock,
                score=100,
                estimated_credits=request.duration_seconds,
                reasons=("mock_provider",),
            )
        ][:limit]

    weight = PREFERENCES.get(request.preference.lower(), PREFERENCES["balanced"])
    options = [
        option
        for option in model_catalog(settings)
        if option.kind == "video"
        and _fits(option, request)
        and provider_available(option.provider, settings)
    ]
    if not options:
        raise AppError(
            status_code=409,
            code="NO_MODEL_MATCHES_OPTIONS",
            message=(
                "No available model supports "
                f"{request.generation_mode.replace('_', ' ')}, "
                f"{request.duration_seconds}s, {request.aspect_ratio}, "
                f"{request.reference_image_count} reference image(s)"
                + (" and audio." if request.audio_enabled else ".")
            ),
        )

    cheapest = min(option.credits_per_second for option in options)
    best_tier = max(option.quality_tier for option in options)
    candidates = []
    for option in options:
        score, reasons = _score(
            option,
            request,
            cheapest=cheapest,
            best_tier=best_tier,
            weight=weight,
        )
        candidates.append(
            Candidate(
                option=option,
                score=score,
                estimated_credits=option.estimated_credits(request.duration_seconds),
                reasons=reasons,
            )
        )
    candidates.sort(key=lambda item: (-item.score, item.estimated_credits))
    return candidates[:limit]

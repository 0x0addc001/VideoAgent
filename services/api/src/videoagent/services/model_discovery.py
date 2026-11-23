"""Discover media models from the DashScope OpenAI-compatible catalogue.

``GET {llm_base_url}/models`` currently lists chat and image models (191 at the
time of writing) but no video models, so discovery only contributes image
entries. Results are cached for ten minutes and discovery failures degrade to
the static catalogue.
"""

from __future__ import annotations

import time

import httpx

from videoagent.config import Settings
from videoagent.services.model_catalog import ModelOption

CACHE_TTL_SECONDS = 600
FAILURE_TTL_SECONDS = 60
IMAGE_PREFIXES = ("wan", "z-image")
IMAGE_EXCLUDE = ("qwen-image",)

_cache_expires = 0.0
_cached_models: list[ModelOption] = []


def is_image_model(model_id: str) -> bool:
    lowered = model_id.lower()
    if "video" in lowered or any(marker in lowered for marker in IMAGE_EXCLUDE):
        return False
    return lowered.startswith(IMAGE_PREFIXES)


def _option(model_id: str) -> ModelOption:
    from videoagent.services.model_catalog import ModelOption

    return ModelOption(
        provider="wanx",
        model=model_id,
        label=model_id,
        kind="image",
        modes=("text_to_image",),
        max_duration=1,
        ratios=(),
        credits_per_second=1,
        quality_tier=2,
    )


async def refresh_discovered_models(settings: Settings) -> list[ModelOption]:
    """Fetch and cache image models exposed by the compatible endpoint."""
    global _cache_expires, _cached_models

    now = time.monotonic()
    if now < _cache_expires:
        return list(_cached_models)
    if not settings.llm_api_key or not settings.llm_base_url:
        return list(_cached_models)

    url = f"{settings.llm_base_url.rstrip('/')}/models"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                url,
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            )
        response.raise_for_status()
        payload = response.json()
    except Exception:
        _cache_expires = now + FAILURE_TTL_SECONDS
        return list(_cached_models)

    data = payload.get("data") if isinstance(payload, dict) else None
    ids = {str(item.get("id")) for item in data or [] if isinstance(item, dict) and item.get("id")}
    _cached_models = [_option(model_id) for model_id in sorted(ids) if is_image_model(model_id)]
    _cache_expires = now + CACHE_TTL_SECONDS
    return list(_cached_models)


def discovered_models() -> list[ModelOption]:
    return list(_cached_models)


def reset_discovery_cache() -> None:
    global _cache_expires, _cached_models
    _cache_expires = 0.0
    _cached_models = []

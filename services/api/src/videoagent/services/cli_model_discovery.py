"""Discover models from the installed provider CLIs.

Pippit exposes ``pippit-tool-cli model`` (video) and Kling exposes
``kling who_am_i`` with ``availableModels`` per mode. Both are best-effort: a
missing binary or a failed command leaves the static catalogue untouched.
Results are cached for ten minutes.
"""

from __future__ import annotations

import asyncio
import json
import shutil
import time

from videoagent.config import Settings
from videoagent.services.model_catalog import ModelOption

CACHE_TTL_SECONDS = 600
FAILURE_TTL_SECONDS = 60
VIDEO_MODES = {"text_to_video", "image_to_video", "omni_ref_video", "motion_control"}
IMAGE_MODES = {"text_to_image", "image_to_image"}

_cache_expires = 0.0
_cached_models: list[ModelOption] = []


async def _run_json(command: list[str], timeout_seconds: float = 20) -> object | None:
    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(process.communicate(), timeout=timeout_seconds)
    except Exception:
        return None
    if process.returncode != 0:
        return None
    for line in reversed(stdout.decode("utf-8", "replace").splitlines()):
        candidate = line.strip()
        if not candidate.startswith(("{", "[")):
            continue
        try:
            parsed: object = json.loads(candidate)
            return parsed
        except json.JSONDecodeError:
            continue
    return None


def parse_pippit_models(payload: object) -> list[ModelOption]:
    if not isinstance(payload, dict):
        return []
    options: list[ModelOption] = []
    for entry in payload.get("models") or []:
        if not isinstance(entry, dict):
            continue
        key = entry.get("key")
        if not key or entry.get("kind") != "video":
            continue
        if str(key).endswith("_draft"):
            # Draft previews need the two-phase draft_task_id flow; not wired yet.
            continue
        options.append(
            ModelOption(
                "pippit",
                str(key),
                str(entry.get("name") or key),
                max_duration=30,
                ratios=("16:9", "9:16", "1:1", "21:9"),
                max_references=5,
            )
        )
    return options


def parse_kling_models(payload: object) -> list[ModelOption]:
    body = payload.get("body") if isinstance(payload, dict) else None
    if not isinstance(body, dict):
        return []
    available = body.get("availableModels")
    if not isinstance(available, dict):
        return []

    modes: dict[str, set[str]] = {}
    labels: dict[str, str] = {}
    for mode, info in available.items():
        if not isinstance(info, dict) or mode not in VIDEO_MODES | IMAGE_MODES:
            continue
        for entry in info.get("models") or []:
            if not isinstance(entry, dict):
                continue
            model = entry.get("model") or entry.get("id")
            if not model:
                continue
            modes.setdefault(str(model), set()).add(str(mode))
            alias = entry.get("alias") or entry.get("name")
            if alias:
                labels.setdefault(str(model), str(alias).split(",")[0].strip())

    options: list[ModelOption] = []
    for model, entry_modes in modes.items():
        kind = "image" if entry_modes <= IMAGE_MODES else "video"
        options.append(
            ModelOption(
                "kling",
                model,
                labels.get(model, model),
                kind,
                modes=tuple(sorted(entry_modes)),
                max_duration=30,
                ratios=("16:9", "9:16", "1:1", "4:3", "3:4", "21:9"),
                max_references=10,
                credits_per_second=2,
                quality_tier=3,
            )
        )
    return options


async def refresh_cli_models(settings: Settings) -> list[ModelOption]:
    global _cache_expires, _cached_models

    if not settings.cli_model_discovery_enabled:
        return list(_cached_models)
    now = time.monotonic()
    if now < _cache_expires:
        return list(_cached_models)

    options: list[ModelOption] = []
    if shutil.which(settings.pippit_cli_command):
        options.extend(parse_pippit_models(await _run_json([settings.pippit_cli_command, "model"])))
    if shutil.which(settings.kling_cli_command):
        options.extend(
            parse_kling_models(await _run_json([settings.kling_cli_command, "--quiet", "who_am_i"]))
        )

    seen: set[tuple[str, str]] = set()
    deduped: list[ModelOption] = []
    for option in options:
        key = (option.provider, option.model)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(option)
    _cached_models = deduped
    _cache_expires = now + CACHE_TTL_SECONDS
    return list(_cached_models)


def cli_models() -> list[ModelOption]:
    return list(_cached_models)


def reset_cli_cache() -> None:
    global _cache_expires, _cached_models
    _cache_expires = 0.0
    _cached_models = []

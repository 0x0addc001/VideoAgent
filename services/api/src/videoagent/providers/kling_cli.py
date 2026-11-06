import asyncio
import json
import shutil
from collections.abc import Sequence
from typing import Any

from videoagent.providers.base import CostEstimate, GenerationRequest, JobStatus, ProviderJob

KLING_IMAGE_MODELS = frozenset(
    {
        "kling-image-v3_0_omni",
        "kling-image-o1",
        "kling-image-v3_0",
        "kling-image-v2_1",
    }
)
DEFAULT_KLING_IMAGE_MODEL = "kling-image-v3_0"


class KlingCLIError(RuntimeError):
    """Raised when the domestic Kling CLI cannot complete a command."""


class KlingCLIUnavailable(KlingCLIError):
    """Raised when the domestic Kling CLI executable is missing."""


def _normalize_status(value: Any) -> JobStatus:
    normalized = str(value or "submitted").lower()
    if normalized in {"success", "succeeded", "completed", "done"}:
        return "succeeded"
    if normalized in {"failed", "error"}:
        return "failed"
    if normalized in {"cancelled", "canceled"}:
        return "cancelled"
    if normalized in {"running", "processing", "in_progress"}:
        return "running"
    if normalized in {"queued", "pending"}:
        return "queued"
    return "submitted"


def _result_url(body: dict[str, Any]) -> str | None:
    works = body.get("works")
    if not isinstance(works, list):
        return None
    for work in works:
        if not isinstance(work, dict):
            continue
        for key in ("urlWithoutWatermark", "url"):
            value = work.get(key)
            if isinstance(value, str) and value:
                return value
    return None


class KlingCLIVideoProvider:
    name = "kling"

    def __init__(
        self,
        *,
        command: Sequence[str] | str | None,
        timeout_seconds: float = 180,
    ) -> None:
        self._command: tuple[str, ...]
        if command is None:
            raise KlingCLIUnavailable("Kling CLI is not configured.")
        if isinstance(command, str):
            executable = shutil.which(command)
            if executable is None:
                raise KlingCLIUnavailable("Kling CLI is not installed.")
            self._command = (executable,)
        else:
            resolved = tuple(command)
            if not resolved:
                raise KlingCLIUnavailable("Kling CLI is not configured.")
            self._command = resolved
        self._timeout_seconds = timeout_seconds

    async def _run_json(self, *args: str) -> dict[str, Any]:
        try:
            process = await asyncio.create_subprocess_exec(
                *self._command,
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError as exc:
            raise KlingCLIUnavailable("Kling CLI is not installed.") from exc
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self._timeout_seconds,
            )
        except TimeoutError as exc:
            process.kill()
            await process.communicate()
            raise KlingCLIError("Kling CLI command timed out.") from exc
        if process.returncode != 0:
            error = stderr.decode("utf-8", errors="replace").strip()
            raise KlingCLIError(error[-1000:] or "Kling CLI command failed.")
        try:
            payload = json.loads(stdout.decode("utf-8-sig").strip())
        except json.JSONDecodeError as exc:
            raise KlingCLIError("Kling CLI returned invalid JSON.") from exc
        if not isinstance(payload, dict):
            raise KlingCLIError("Kling CLI returned an invalid response.")
        if payload.get("ok") is False:
            raise KlingCLIError(
                str(payload.get("message") or payload.get("error") or "Kling CLI failed.")
            )
        body = payload.get("body")
        return body if isinstance(body, dict) else payload

    async def estimate(self, request: GenerationRequest) -> CostEstimate:
        return CostEstimate(
            provider=self.name,
            credits=max(1, request.duration_seconds),
            duration_seconds=request.duration_seconds,
        )

    async def submit(self, request: GenerationRequest) -> ProviderJob:
        if request.generation_mode not in {"text_to_video", "image_to_video"}:
            raise KlingCLIError(f"Unsupported Kling generation mode: {request.generation_mode}")
        if not request.model:
            raise KlingCLIError("A Kling model is required.")
        image_paths = list(
            dict.fromkeys(
                [
                    *request.reference_image_paths,
                    *([request.reference_image_path] if request.reference_image_path else []),
                ]
            )
        )
        if request.generation_mode == "image_to_video" and not image_paths:
            raise KlingCLIError("Kling image-to-video requires a reference image.")
        use_omni_reference = bool(
            request.reference_video_paths
            or request.reference_audio_paths
            or len(image_paths) > 1
            or request.task_type in {"reference", "edit", "extend"}
        )
        command = "omni_ref_video" if use_omni_reference else request.generation_mode
        args = [
            "--quiet",
            command,
            "--model",
            request.model,
            "--duration",
            str(request.duration_seconds),
            "--aspect_ratio",
            request.aspect_ratio,
        ]
        if request.resolution:
            args.extend(["--resolution", request.resolution])
        if request.audio_enabled is not None and use_omni_reference:
            args.extend(["--enable_audio", "true" if request.audio_enabled else "false"])
        for path in image_paths:
            args.extend(["--image", path])
        for path in request.reference_video_paths:
            args.extend(["--video", path])
        for path in request.reference_audio_paths:
            args.extend(["--audio", path])
        args.append(request.prompt)
        body = await self._run_json(*args)
        generation_id = body.get("generationId") or body.get("generation_id")
        if not isinstance(generation_id, str) or not generation_id:
            raise KlingCLIError("Kling did not return a generationId.")
        return ProviderJob(
            provider=self.name,
            task_id=generation_id,
            status=_normalize_status(body.get("status")),
            result_url=_result_url(body),
        )

    async def status(self, task_id: str) -> ProviderJob:
        body = await self._run_json("--quiet", "query_tasks", task_id)
        resolved_id = body.get("generationId") or body.get("generation_id")
        return ProviderJob(
            provider=self.name,
            task_id=resolved_id if isinstance(resolved_id, str) else task_id,
            status=_normalize_status(body.get("status")),
            result_url=_result_url(body),
        )

    async def generate_image(
        self,
        *,
        prompt: str,
        generation_mode: str,
        reference_image_path: str | None = None,
        model: str = DEFAULT_KLING_IMAGE_MODEL,
        aspect_ratio: str = "3:4",
    ) -> str:
        if generation_mode not in {"text_to_image", "image_to_image"}:
            raise KlingCLIError(f"Unsupported Kling image generation mode: {generation_mode}")
        if generation_mode == "image_to_image" and not reference_image_path:
            raise KlingCLIError("Kling image-to-image requires a reference image.")
        args = [
            "--quiet",
            generation_mode,
            "--model",
            model,
            "--aspect_ratio",
            aspect_ratio,
            "--img_resolution",
            "2k",
        ]
        if reference_image_path:
            args.extend(["--image", reference_image_path])
        args.extend([prompt, "--poll=60"])
        body = await self._run_json(*args)
        result = _result_url(body)
        if not result:
            generation_id = body.get("generationId") or body.get("generation_id")
            suffix = f" ({generation_id})" if generation_id else ""
            raise KlingCLIError(f"Kling did not return a generated image{suffix}.")
        return result

    async def account_status(self) -> dict[str, Any]:
        body = await self._run_json("--quiet", "who_am_i")
        user = body.get("user")
        user_id = user.get("userId") if isinstance(user, dict) else None
        return {
            "connected": True,
            "userId": str(user_id) if user_id is not None else None,
        }

    async def credits(self) -> int | float | None:
        body = await self._run_json("--quiet", "account")
        value = body.get("availableRemainCredits")
        return value if isinstance(value, int | float) else None

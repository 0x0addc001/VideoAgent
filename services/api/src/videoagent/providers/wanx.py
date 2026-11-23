"""Alibaba Cloud Model Studio (DashScope) Wanx video provider.

Wanx is asynchronous: submit returns a ``task_id`` and the client polls
``/api/v1/tasks/{task_id}`` until the job reports SUCCEEDED/FAILED. Result URLs
stay valid for 24 hours, so the media service must download them promptly.
"""

from __future__ import annotations

import base64
import mimetypes
from pathlib import Path
from typing import Any

import httpx

from videoagent.providers.base import CostEstimate, GenerationRequest, ProviderJob
from videoagent.services.model_catalog import credits_for

SUPPORTED_RATIOS = {"16:9", "9:16", "1:1", "4:3", "3:4"}
DEFAULT_RATIO = "16:9"
TERMINAL_STATUSES = {
    "SUCCEEDED": "succeeded",
    "FAILED": "failed",
    "CANCELED": "failed",
    "UNKNOWN": "failed",
}
DEFAULT_MODEL = "wan2.6-t2v"


class WanxError(RuntimeError):
    """Base error for the Wanx provider."""


class WanxNotConfigured(WanxError):
    """Raised when no DashScope API key is configured."""


class WanxAPIError(WanxError):
    """Raised when DashScope rejects a request or returns malformed data."""


def normalize_resolution(value: str | None) -> str | None:
    """Map UI style resolutions (``720p``, ``1080``) onto Wanx's ``720P`` form."""
    if not value:
        return None
    candidate = value.strip().upper()
    if candidate in {"720P", "1080P"}:
        return candidate
    if candidate in {"720", "1080"}:
        return f"{candidate}P"
    return None


def image_reference(value: str) -> str:
    """Return a URL or a base64 data URI that Wanx accepts as ``img_url``."""
    if value.startswith(("http://", "https://", "data:")):
        return value
    path = Path(value).expanduser()
    if not path.is_file():
        raise WanxError(f"Reference image not found: {value}")
    mime = mimetypes.guess_type(path.name)[0] or "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


class WanxVideoProvider:
    name = "wanx"

    def __init__(
        self,
        *,
        api_key: str | None,
        base_url: str = "https://dashscope.aliyuncs.com",
        model: str = DEFAULT_MODEL,
        resolution: str | None = None,
        timeout_seconds: float = 300,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not api_key:
            raise WanxNotConfigured(
                "Set VIDEOAGENT_WANX_API_KEY to a DashScope API key to use Wanx."
            )
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model or DEFAULT_MODEL
        self._resolution = resolution
        self._timeout_seconds = timeout_seconds
        self._transport = transport

    async def estimate(self, request: GenerationRequest) -> CostEstimate:
        duration = min(15, max(2, request.duration_seconds))
        return CostEstimate(
            provider=self.name,
            credits=credits_for(self.name, request.model, duration),
            duration_seconds=duration,
        )

    def _payload(self, request: GenerationRequest) -> dict[str, Any]:
        if request.generation_mode not in {"text_to_video", "image_to_video"}:
            raise WanxError(f"Unsupported Wanx generation mode: {request.generation_mode}")
        duration = min(15, max(2, request.duration_seconds))
        payload: dict[str, Any] = {
            "model": request.model or self._model,
            "input": {"prompt": request.prompt},
            "parameters": {
                "duration": duration,
                "ratio": request.aspect_ratio
                if request.aspect_ratio in SUPPORTED_RATIOS
                else DEFAULT_RATIO,
                "prompt_extend": True,
            },
        }
        resolution = normalize_resolution(request.resolution or self._resolution)
        if resolution:
            payload["parameters"]["resolution"] = resolution
        if request.generation_mode == "image_to_video":
            references = list(request.reference_image_paths)
            if not references and request.reference_image_path:
                references = [request.reference_image_path]
            if not references:
                raise WanxError("Wanx image-to-video requires a reference image.")
            payload["input"]["img_url"] = image_reference(references[0])
        return payload

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        if method == "POST":
            # DashScope only supports the async protocol over HTTP.
            headers["X-DashScope-Async"] = "enable"
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout_seconds,
                transport=self._transport,
            ) as client:
                response = await client.request(
                    method,
                    f"{self._base_url}{path}",
                    headers=headers,
                    **kwargs,
                )
        except httpx.TimeoutException as exc:
            raise WanxAPIError("DashScope request timed out.") from exc
        except httpx.HTTPError as exc:
            raise WanxAPIError(f"DashScope request failed: {exc}") from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise WanxAPIError(
                f"DashScope returned a non-JSON response (HTTP {response.status_code})."
            ) from exc
        if not isinstance(payload, dict):
            raise WanxAPIError("DashScope returned an unexpected response.")

        if response.status_code >= 400 or payload.get("code"):
            code = payload.get("code") or f"HTTP_{response.status_code}"
            message = payload.get("message") or "DashScope rejected the request."
            raise WanxAPIError(f"{code}: {message}")
        return payload

    async def submit(self, request: GenerationRequest) -> ProviderJob:
        payload = self._payload(request)
        response = await self._request(
            "POST",
            "/api/v1/services/aigc/video-generation/video-synthesis",
            json=payload,
        )
        output = response.get("output")
        task_id = output.get("task_id") if isinstance(output, dict) else None
        if not isinstance(task_id, str) or not task_id:
            raise WanxAPIError("DashScope did not return a task_id.")
        return ProviderJob(provider=self.name, task_id=task_id, status="submitted")

    async def status(self, task_id: str) -> ProviderJob:
        response = await self._request("GET", f"/api/v1/tasks/{task_id}")
        output = response.get("output")
        if not isinstance(output, dict):
            raise WanxAPIError("DashScope returned a task without output.")
        raw_status = str(output.get("task_status") or "UNKNOWN")
        mapped = TERMINAL_STATUSES.get(raw_status, "running")
        result_url = output.get("video_url") if mapped == "succeeded" else None
        if mapped == "succeeded" and not isinstance(result_url, str):
            return ProviderJob(provider=self.name, task_id=task_id, status="failed")
        return ProviderJob(
            provider=self.name,
            task_id=task_id,
            status=mapped,
            result_url=result_url,
        )

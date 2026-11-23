"""Alibaba Cloud Model Studio (DashScope) Wanx image provider."""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx


class WanxImageError(RuntimeError):
    """Raised when the Wanx image endpoint rejects or cannot finish a request."""


class WanxImageProvider:
    name = "wanx"

    def __init__(
        self,
        *,
        api_key: str | None,
        base_url: str = "https://dashscope.aliyuncs.com",
        timeout_seconds: float = 300,
        poll_interval: float = 3.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        if not api_key:
            raise WanxImageError("Set VIDEOAGENT_WANX_API_KEY to a DashScope API key.")
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds
        self._poll_interval = poll_interval
        self._transport = transport

    async def _request(
        self,
        method: str,
        path: str,
        *,
        async_header: bool = True,
        **kwargs: Any,
    ) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        if method == "POST" and async_header:
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
        except httpx.HTTPError as exc:
            raise WanxImageError(f"DashScope image request failed: {exc}") from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise WanxImageError(
                f"DashScope returned a non-JSON response (HTTP {response.status_code})."
            ) from exc
        if not isinstance(payload, dict):
            raise WanxImageError("DashScope returned an unexpected response.")
        if response.status_code >= 400 or payload.get("code"):
            code = payload.get("code") or f"HTTP_{response.status_code}"
            message = payload.get("message") or "DashScope rejected the image request."
            raise WanxImageError(f"{code}: {message}")
        return payload

    async def generate_image(
        self,
        *,
        prompt: str,
        generation_mode: str,
        reference_image_path: str | None,
        model: str,
    ) -> str:
        if generation_mode != "text_to_image":
            raise WanxImageError(
                "Wanx image models currently support text-to-image only; "
                "pick a Kling image model for reference-image generation."
            )
        del reference_image_path
        if model.startswith("wan2.7-image"):
            return await self._generate_multimodal(model=model, prompt=prompt)
        submitted = await self._request(
            "POST",
            "/api/v1/services/aigc/text2image/image-synthesis",
            json={
                "model": model,
                "input": {"prompt": prompt},
                "parameters": {"size": "1024*1024", "n": 1, "prompt_extend": True},
            },
        )
        output = submitted.get("output") or {}
        task_id = output.get("task_id")
        if not isinstance(task_id, str) or not task_id:
            raise WanxImageError("DashScope did not return an image task_id.")

        deadline = time.monotonic() + self._timeout_seconds
        while time.monotonic() < deadline:
            status = await self._request("GET", f"/api/v1/tasks/{task_id}")
            result = status.get("output") or {}
            state = result.get("task_status")
            if state == "SUCCEEDED":
                results = result.get("results") or []
                url = results[0].get("url") if results and isinstance(results[0], dict) else None
                if isinstance(url, str) and url:
                    return url
                raise WanxImageError("DashScope reported success without an image URL.")
            if state in {"FAILED", "CANCELED", "UNKNOWN"}:
                raise WanxImageError(f"DashScope image task {state.lower()}.")
            await asyncio.sleep(self._poll_interval)
        raise WanxImageError("DashScope image task timed out.")

    async def _generate_multimodal(self, *, model: str, prompt: str) -> str:
        """Wan 2.7 images use the synchronous multimodal-generation endpoint."""
        payload = await self._request(
            "POST",
            "/api/v1/services/aigc/multimodal-generation/generation",
            json={
                "model": model,
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": [{"text": prompt}],
                        }
                    ]
                },
                "parameters": {"size": "1024*1024", "n": 1, "watermark": False},
            },
            async_header=False,
        )
        output = payload.get("output") or {}
        choices = output.get("choices") or []
        if not choices or not isinstance(choices[0], dict):
            raise WanxImageError("DashScope returned no image choices.")
        content = (choices[0].get("message") or {}).get("content") or []
        for item in content:
            if isinstance(item, dict):
                url = item.get("image") or item.get("url")
                if isinstance(url, str) and url:
                    return url
        raise WanxImageError("DashScope returned no image URL.")

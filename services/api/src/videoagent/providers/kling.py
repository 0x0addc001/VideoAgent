from typing import Any, Protocol

from videoagent.providers.base import CostEstimate, GenerationRequest, JobStatus, ProviderJob


class KlingToolClient(Protocol):
    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]: ...


def _first(mapping: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = mapping.get(key)
        if value is not None:
            return value
    return None


def _unwrap(payload: dict[str, Any]) -> dict[str, Any]:
    for key in ("task", "data", "result"):
        nested = payload.get(key)
        if isinstance(nested, dict):
            return nested
    return payload


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


def _result_url(task: dict[str, Any]) -> str | None:
    direct = _first(task, "videoUrl", "video_url", "url", "resultUrl", "result_url")
    if isinstance(direct, str):
        return direct
    urls = _first(task, "urls", "videos", "outputs")
    if isinstance(urls, list) and urls:
        first = urls[0]
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            value = _first(first, "url", "videoUrl", "video_url")
            return value if isinstance(value, str) else None
    return None


class KlingVideoProvider:
    name = "kling"

    def __init__(self, client: KlingToolClient) -> None:
        self._client = client

    async def estimate(self, request: GenerationRequest) -> CostEstimate:
        return CostEstimate(
            provider=self.name,
            credits=max(1, request.duration_seconds),
            duration_seconds=request.duration_seconds,
        )

    async def submit(self, request: GenerationRequest) -> ProviderJob:
        tool_name = {
            "text_to_video": "text_to_video",
            "image_to_video": "image_to_video",
        }.get(request.generation_mode)
        if tool_name is None:
            raise ValueError(f"Unsupported Kling generation mode: {request.generation_mode}")

        arguments: dict[str, Any] = {
            "prompt": request.prompt,
            "duration": request.duration_seconds,
            "aspectRatio": request.aspect_ratio,
        }
        if request.model:
            arguments["model"] = request.model
        if request.generation_mode == "image_to_video":
            if not request.reference_image_path:
                raise ValueError("Kling image-to-video requires a reference image.")
            arguments["image"] = request.reference_image_path
        raw = await self._client.call_tool(tool_name, arguments)
        task = _unwrap(raw)
        task_id = _first(task, "taskId", "task_id", "id")
        if not isinstance(task_id, str) or not task_id:
            raise ValueError("Kling did not return a task ID")
        return ProviderJob(
            provider=self.name,
            task_id=task_id,
            status=_normalize_status(_first(task, "status", "state")),
            result_url=_result_url(task),
        )

    async def status(self, task_id: str) -> ProviderJob:
        raw = await self._client.call_tool("query_tasks", {"taskIds": [task_id]})
        tasks = raw.get("tasks")
        if isinstance(tasks, list) and tasks and isinstance(tasks[0], dict):
            task: dict[str, Any] = tasks[0]
        else:
            task = _unwrap(raw)
        resolved_id = _first(task, "taskId", "task_id", "id")
        return ProviderJob(
            provider=self.name,
            task_id=resolved_id if isinstance(resolved_id, str) else task_id,
            status=_normalize_status(_first(task, "status", "state")),
            result_url=_result_url(task),
        )

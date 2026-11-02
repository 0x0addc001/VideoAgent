import asyncio
import json
import os
import shutil
from collections.abc import Sequence
from typing import Any

from videoagent.providers.base import CostEstimate, GenerationRequest, ProviderJob


class PippitCLIError(RuntimeError):
    """Raised when the Pippit CLI cannot complete a command."""


class PippitCLIUnavailable(PippitCLIError):
    """Raised when the configured Pippit CLI executable cannot be found."""


class PippitNotAuthenticated(PippitCLIError):
    """Raised when the server-owned Pippit account has not been authorized."""


def task_reference(thread_id: str, run_id: str) -> str:
    return json.dumps(
        {"thread_id": thread_id, "run_id": run_id},
        ensure_ascii=True,
        separators=(",", ":"),
        sort_keys=True,
    )


def parse_task_reference(value: str) -> tuple[str, str]:
    try:
        payload = json.loads(value)
    except json.JSONDecodeError as exc:
        raise PippitCLIError("Pippit task reference is invalid.") from exc
    if not isinstance(payload, dict):
        raise PippitCLIError("Pippit task reference is invalid.")
    thread_id = payload.get("thread_id")
    run_id = payload.get("run_id")
    if not isinstance(thread_id, str) or not thread_id:
        raise PippitCLIError("Pippit task reference is missing thread_id.")
    if not isinstance(run_id, str) or not run_id:
        raise PippitCLIError("Pippit task reference is missing run_id.")
    return thread_id, run_id


def _resolve_command(command: Sequence[str] | str | None) -> tuple[str, ...]:
    if command is None:
        raise PippitCLIUnavailable("Pippit CLI is not configured.")
    if not isinstance(command, str):
        resolved = tuple(command)
        if not resolved:
            raise PippitCLIUnavailable("Pippit CLI is not configured.")
        return resolved
    executable = shutil.which(command)
    if executable is None:
        raise PippitCLIUnavailable("Pippit CLI is not installed.")
    return (executable,)


def _number(value: object) -> int | float:
    if isinstance(value, bool):
        raise PippitCLIError("Pippit returned an invalid credit balance.")
    try:
        parsed = float(str(value))
    except (TypeError, ValueError) as exc:
        raise PippitCLIError("Pippit returned an invalid credit balance.") from exc
    return int(parsed) if parsed.is_integer() else parsed


def _video_url(payload: dict[str, Any]) -> str | None:
    videos = payload.get("videos")
    if not isinstance(videos, list):
        return None
    for item in videos:
        if not isinstance(item, dict):
            continue
        for key in ("download_url", "url"):
            value = item.get(key)
            if isinstance(value, str) and value:
                return value
    return None


class PippitVideoProvider:
    name = "pippit"

    def __init__(
        self,
        *,
        command: Sequence[str] | str | None,
        model: str | None = None,
        resolution: str | None = None,
        access_key: str | None = None,
        timeout_seconds: float = 180,
    ) -> None:
        self._command = _resolve_command(command)
        self._model = model
        self._resolution = resolution
        self._access_key = access_key
        self._timeout_seconds = timeout_seconds

    async def _run_json(self, *args: str) -> dict[str, Any]:
        environment = os.environ.copy()
        if self._access_key:
            environment["XYQ_ACCESS_KEY"] = self._access_key
        try:
            process = await asyncio.create_subprocess_exec(
                *self._command,
                *args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=environment,
            )
        except FileNotFoundError as exc:
            raise PippitCLIUnavailable("Pippit CLI is not installed.") from exc

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self._timeout_seconds,
            )
        except TimeoutError as exc:
            process.kill()
            await process.communicate()
            raise PippitCLIError("Pippit CLI command timed out.") from exc

        if process.returncode != 0:
            error_text = stderr.decode("utf-8", errors="replace").lower()
            if "login" in error_text or "登录" in error_text:
                raise PippitNotAuthenticated("Pippit CLI is not authenticated.")
            raise PippitCLIError(f"Pippit CLI exited with status {process.returncode}.")

        try:
            payload = json.loads(stdout.decode("utf-8-sig").strip())
        except json.JSONDecodeError as exc:
            raise PippitCLIError("Pippit CLI returned invalid JSON.") from exc
        if not isinstance(payload, dict):
            raise PippitCLIError("Pippit CLI returned an invalid response.")
        return payload

    async def estimate(self, request: GenerationRequest) -> CostEstimate:
        return CostEstimate(
            provider=self.name,
            credits=max(1, request.duration_seconds),
            duration_seconds=request.duration_seconds,
        )

    async def submit(self, request: GenerationRequest) -> ProviderJob:
        if request.generation_mode != "text_to_video":
            raise ValueError("Pippit currently supports text-to-video generation only.")
        args = [
            "generate-video",
            "--prompt",
            request.prompt,
            "--duration",
            str(request.duration_seconds),
            "--ratio",
            request.aspect_ratio,
            "--source",
            "videoagent",
        ]
        if self._model:
            args.extend(["--model", self._model])
        if self._resolution:
            args.extend(["--resolution", self._resolution])
        payload = await self._run_json(*args)
        thread_id = payload.get("thread_id")
        run_id = payload.get("run_id")
        if not isinstance(thread_id, str) or not thread_id:
            raise PippitCLIError("Pippit did not return a thread_id.")
        if not isinstance(run_id, str) or not run_id:
            raise PippitCLIError("Pippit did not return a run_id.")
        return ProviderJob(
            provider=self.name,
            task_id=task_reference(thread_id, run_id),
            status="submitted",
        )

    async def status(self, task_id: str) -> ProviderJob:
        thread_id, run_id = parse_task_reference(task_id)
        payload = await self._run_json(
            "query-result",
            "--thread-id",
            thread_id,
            "--run-id",
            run_id,
        )
        if payload.get("error_message"):
            return ProviderJob(provider=self.name, task_id=task_id, status="failed")
        if payload.get("completed") is not True:
            return ProviderJob(provider=self.name, task_id=task_id, status="running")
        result_url = _video_url(payload)
        return ProviderJob(
            provider=self.name,
            task_id=task_id,
            status="succeeded" if result_url else "failed",
            result_url=result_url,
        )

    async def account_status(self) -> dict[str, Any]:
        return await self._run_json("status")

    async def get_credit_balance(self) -> int | float:
        status = await self.account_status()
        if status.get("logged_in") is not True:
            raise PippitNotAuthenticated("Pippit CLI is not authenticated.")
        payload = await self._run_json("get-credit-balance")
        return _number(payload.get("total_remain_amount"))

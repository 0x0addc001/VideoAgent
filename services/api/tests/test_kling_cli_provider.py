from uuid import uuid4

import pytest

from videoagent.providers.base import GenerationRequest
from videoagent.providers.kling_cli import KlingCLIVideoProvider


def request() -> GenerationRequest:
    return GenerationRequest(
        shot_id=uuid4(),
        prompt="A cinematic Shanghai morning",
        duration_seconds=5,
        aspect_ratio="16:9",
        generation_mode="text_to_video",
        model="kling-video-v4_0",
    )


@pytest.mark.unit
async def test_kling_cli_submits_domestic_text_to_video(monkeypatch):
    provider = KlingCLIVideoProvider(command=("kling",))
    calls: list[tuple[str, ...]] = []

    async def capture(*args: str) -> dict[str, object]:
        calls.append(args)
        return {
            "generationId": "domestic-generation-1",
            "status": "submitted",
        }

    monkeypatch.setattr(provider, "_run_json", capture)
    job = await provider.submit(request())

    assert job.provider == "kling"
    assert job.task_id == "domestic-generation-1"
    assert job.status == "submitted"
    assert calls == [
        (
            "--quiet",
            "text_to_video",
            "--model",
            "kling-video-v4_0",
            "--duration",
            "5",
            "--aspect_ratio",
            "16:9",
            "A cinematic Shanghai morning",
        )
    ]


@pytest.mark.unit
async def test_kling_cli_maps_completed_result(monkeypatch):
    provider = KlingCLIVideoProvider(command=("kling",))

    async def completed(*args: str) -> dict[str, object]:
        assert args == ("--quiet", "query_tasks", "domestic-generation-1")
        return {
            "generationId": "domestic-generation-1",
            "status": "COMPLETED",
            "works": [{"url": "https://cdn.example.com/video.mp4"}],
        }

    monkeypatch.setattr(provider, "_run_json", completed)
    job = await provider.status("domestic-generation-1")

    assert job.status == "succeeded"
    assert job.result_url == "https://cdn.example.com/video.mp4"


@pytest.mark.unit
async def test_kling_cli_reports_domestic_identity_and_credits(monkeypatch):
    provider = KlingCLIVideoProvider(command=("kling",))

    async def identity(*args: str) -> dict[str, object]:
        if args == ("--quiet", "who_am_i"):
            return {"user": {"userId": 5867025089}}
        assert args == ("--quiet", "account")
        return {"availableRemainCredits": 42}

    monkeypatch.setattr(provider, "_run_json", identity)

    assert await provider.account_status() == {
        "connected": True,
        "userId": "5867025089",
    }
    assert await provider.credits() == 42

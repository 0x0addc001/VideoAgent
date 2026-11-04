import json
import sys
from pathlib import Path
from uuid import uuid4

import pytest

from videoagent.providers.base import GenerationRequest
from videoagent.providers.pippit import PippitVideoProvider, task_reference

FAKE_CLI = Path(__file__).parent / "fixtures" / "fake_pippit_cli.py"


def provider() -> PippitVideoProvider:
    return PippitVideoProvider(
        command=(sys.executable, str(FAKE_CLI)),
        model="Seedance_2.0_mini",
        resolution="720p",
    )


def request() -> GenerationRequest:
    return GenerationRequest(
        shot_id=uuid4(),
        prompt="A creator filming a quiet vlog in a studio",
        duration_seconds=5,
        aspect_ratio="9:16",
        generation_mode="text_to_video",
    )


@pytest.mark.unit
async def test_pippit_submits_video_and_returns_recoverable_task_reference():
    job = await provider().submit(request())

    assert job.provider == "pippit"
    assert job.status == "submitted"
    assert json.loads(job.task_id) == {
        "thread_id": "thread-test-1",
        "run_id": "run-test-1",
    }
    assert json.loads(task_reference("thread-test-1", "run-test-1")) == json.loads(job.task_id)


@pytest.mark.unit
async def test_pippit_maps_completed_cli_result_to_video_url():
    job = await provider().status(task_reference("thread-test-1", "run-test-1"))

    assert job.provider == "pippit"
    assert job.status == "succeeded"
    assert job.result_url == "https://media.example.com/pippit/video.mp4"


@pytest.mark.unit
async def test_pippit_reads_authentication_and_credit_balance():
    client = provider()

    status = await client.account_status()
    credits = await client.get_credit_balance()

    assert status == {"logged_in": True, "source": "test"}
    assert credits == 42


@pytest.mark.unit
async def test_pippit_rejects_non_text_generation():
    image_request = request().model_copy(update={"generation_mode": "image_to_video"})

    with pytest.raises(ValueError, match="text-to-video"):
        await provider().submit(image_request)


@pytest.mark.unit
async def test_pippit_request_model_overrides_provider_default(monkeypatch):
    client = provider()
    calls: list[tuple[str, ...]] = []

    async def capture(*args: str) -> dict[str, str]:
        calls.append(args)
        return {"thread_id": "thread-test-1", "run_id": "run-test-1"}

    monkeypatch.setattr(client, "_run_json", capture)
    await client.submit(request().model_copy(update={"model": "Seedance_2.5"}))

    assert calls == [
        (
            "generate-video",
            "--prompt",
            "A creator filming a quiet vlog in a studio",
            "--duration",
            "5",
            "--ratio",
            "9:16",
            "--source",
            "videoagent",
            "--model",
            "Seedance_2.5",
            "--resolution",
            "720p",
        )
    ]

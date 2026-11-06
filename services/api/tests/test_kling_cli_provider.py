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
async def test_kling_cli_uses_omni_reference_for_multimodal_inputs(monkeypatch):
    provider = KlingCLIVideoProvider(command=("kling",))
    calls: list[tuple[str, ...]] = []

    async def capture(*args: str) -> dict[str, object]:
        calls.append(args)
        return {
            "generationId": "omni-generation-1",
            "status": "submitted",
        }

    monkeypatch.setattr(provider, "_run_json", capture)
    base = request().model_copy(
        update={
            "duration_seconds": 10,
            "aspect_ratio": "21:9",
            "generation_mode": "image_to_video",
            "reference_image_paths": ["C:/media/a.png", "C:/media/b.png"],
            "reference_video_paths": ["C:/media/motion.mp4"],
            "reference_audio_paths": ["C:/media/voice.mp3"],
            "audio_enabled": True,
            "resolution": "1080p",
            "task_type": "reference",
        }
    )

    job = await provider.submit(base)

    assert job.task_id == "omni-generation-1"
    assert calls == [
        (
            "--quiet",
            "omni_ref_video",
            "--model",
            "kling-video-v4_0",
            "--duration",
            "10",
            "--aspect_ratio",
            "21:9",
            "--resolution",
            "1080p",
            "--enable_audio",
            "true",
            "--image",
            "C:/media/a.png",
            "--image",
            "C:/media/b.png",
            "--video",
            "C:/media/motion.mp4",
            "--audio",
            "C:/media/voice.mp3",
            "A cinematic Shanghai morning",
        )
    ]


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


@pytest.mark.unit
async def test_kling_cli_generates_character_image_with_reference(monkeypatch):
    provider = KlingCLIVideoProvider(command=("kling",))
    calls: list[tuple[str, ...]] = []

    async def capture(*args: str) -> dict[str, object]:
        calls.append(args)
        return {
            "generationId": "image-generation-1",
            "status": "succeeded",
            "works": [{"url": "https://cdn.example.com/character.png"}],
        }

    monkeypatch.setattr(provider, "_run_json", capture)
    result = await provider.generate_image(
        prompt="Editorial portrait of Mara",
        generation_mode="image_to_image",
        reference_image_path="C:/media/reference.jpg",
    )

    assert result == "https://cdn.example.com/character.png"
    assert calls == [
        (
            "--quiet",
            "image_to_image",
            "--model",
            "kling-image-v3_0",
            "--aspect_ratio",
            "3:4",
            "--img_resolution",
            "2k",
            "--image",
            "C:/media/reference.jpg",
            "Editorial portrait of Mara",
            "--poll=60",
        )
    ]

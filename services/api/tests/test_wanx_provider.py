import base64
import json
from uuid import uuid4

import httpx
import pytest

from videoagent.config import Settings
from videoagent.providers.base import GenerationRequest
from videoagent.providers.factory import build_video_provider
from videoagent.providers.wanx import (
    WanxAPIError,
    WanxNotConfigured,
    WanxVideoProvider,
    normalize_resolution,
)


def request(**overrides: object) -> GenerationRequest:
    values: dict[str, object] = {
        "shot_id": uuid4(),
        "prompt": "A creator walking through a rain-soaked Tokyo alley",
        "duration_seconds": 5,
        "aspect_ratio": "9:16",
        "generation_mode": "text_to_video",
    }
    values.update(overrides)
    return GenerationRequest(**values)


def provider(handler, **overrides: object) -> WanxVideoProvider:
    options: dict[str, object] = {
        "api_key": "sk-test",
        "base_url": "https://dashscope.example.com",
        "model": "wan2.6-t2v",
        "transport": httpx.MockTransport(handler),
    }
    options.update(overrides)
    return WanxVideoProvider(**options)


@pytest.mark.unit
def test_wanx_requires_an_api_key():
    with pytest.raises(WanxNotConfigured):
        WanxVideoProvider(api_key=None)


@pytest.mark.unit
def test_resolution_normalization():
    assert normalize_resolution("720p") == "720P"
    assert normalize_resolution("1080") == "1080P"
    assert normalize_resolution("4k") is None
    assert normalize_resolution(None) is None


@pytest.mark.unit
async def test_wanx_submits_async_task_with_expected_payload():
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["async_header"] = request.headers.get("X-DashScope-Async")
        captured["auth"] = request.headers.get("Authorization")
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"output": {"task_id": "task-1", "task_status": "PENDING"}})

    job = await provider(handler).submit(request(duration_seconds=30))

    assert job.provider == "wanx"
    assert job.status == "submitted"
    assert job.task_id == "task-1"
    assert captured["url"] == (
        "https://dashscope.example.com/api/v1/services/aigc/video-generation/video-synthesis"
    )
    assert captured["async_header"] == "enable"
    assert captured["auth"] == "Bearer sk-test"
    body = captured["body"]
    assert body["model"] == "wan2.6-t2v"
    assert body["input"]["prompt"].startswith("A creator walking")
    # Wanx caps clips at 15 seconds.
    assert body["parameters"]["duration"] == 15
    assert body["parameters"]["ratio"] == "9:16"


@pytest.mark.unit
async def test_wanx_encodes_local_reference_images_as_data_uris(tmp_path):
    image = tmp_path / "reference.png"
    image.write_bytes(b"\x89PNG\r\n\x1a\npayload")
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"output": {"task_id": "task-2"}})

    await provider(handler).submit(
        request(
            generation_mode="image_to_video",
            reference_image_paths=[str(image)],
        )
    )

    img_url = captured["body"]["input"]["img_url"]
    prefix = "data:image/png;base64,"
    assert img_url.startswith(prefix)
    assert base64.b64decode(img_url[len(prefix) :]) == b"\x89PNG\r\n\x1a\npayload"


@pytest.mark.unit
async def test_wanx_maps_task_status_and_video_url():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/api/v1/tasks/task-9")
        return httpx.Response(
            200,
            json={
                "output": {
                    "task_id": "task-9",
                    "task_status": "SUCCEEDED",
                    "video_url": "https://dashscope.example.com/out.mp4",
                }
            },
        )

    job = await provider(handler).status("task-9")

    assert job.status == "succeeded"
    assert job.result_url == "https://dashscope.example.com/out.mp4"


@pytest.mark.unit
@pytest.mark.parametrize("status", ["PENDING", "RUNNING"])
async def test_wanx_reports_in_progress_tasks_as_running(status):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"output": {"task_status": status}})

    job = await provider(handler).status("task-3")

    assert job.status == "running"
    assert job.result_url is None


@pytest.mark.unit
@pytest.mark.parametrize("status", ["FAILED", "CANCELED", "UNKNOWN"])
async def test_wanx_reports_terminal_failures(status):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"output": {"task_status": status}})

    job = await provider(handler).status("task-4")

    assert job.status == "failed"


@pytest.mark.unit
async def test_wanx_surfaces_api_error_codes():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            401,
            json={"code": "InvalidApiKey", "message": "No API-key provided."},
        )

    with pytest.raises(WanxAPIError, match="InvalidApiKey"):
        await provider(handler).submit(request())


@pytest.mark.unit
async def test_wanx_estimate_clamps_duration_to_model_range():
    estimate = await provider(lambda request: httpx.Response(200, json={})).estimate(
        request(duration_seconds=1)
    )

    assert estimate.provider == "wanx"
    assert estimate.duration_seconds == 2
    assert estimate.credits == 2


@pytest.mark.unit
def test_factory_builds_wanx_provider_from_settings():
    settings = Settings(
        video_provider="wanx",
        wanx_api_key="sk-test",
        wanx_model="wan2.2-t2v-plus",
    )

    built = build_video_provider(settings)

    assert isinstance(built, WanxVideoProvider)

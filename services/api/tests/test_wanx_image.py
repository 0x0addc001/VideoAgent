import json

import httpx
import pytest

from videoagent.providers.wanx_image import WanxImageError, WanxImageProvider


def provider(handler, **overrides: object) -> WanxImageProvider:
    options: dict[str, object] = {
        "api_key": "sk-test",
        "base_url": "https://dashscope.example.com",
        "poll_interval": 0,
        "transport": httpx.MockTransport(handler),
    }
    options.update(overrides)
    return WanxImageProvider(**options)


@pytest.mark.unit
async def test_wanx_image_submits_and_polls_until_success():
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            captured["url"] = str(request.url)
            captured["body"] = json.loads(request.content)
            return httpx.Response(200, json={"output": {"task_id": "img-task-1"}})
        captured["poll"] = str(request.url)
        return httpx.Response(
            200,
            json={
                "output": {
                    "task_status": "SUCCEEDED",
                    "results": [{"url": "https://dashscope.example.com/out.png"}],
                }
            },
        )

    url = await provider(handler).generate_image(
        prompt="A quiet studio portrait",
        generation_mode="text_to_image",
        reference_image_path=None,
        model="wanx2.1-t2i-turbo",
    )

    assert url == "https://dashscope.example.com/out.png"
    assert captured["url"] == (
        "https://dashscope.example.com/api/v1/services/aigc/text2image/image-synthesis"
    )
    body = captured["body"]
    assert body["model"] == "wanx2.1-t2i-turbo"
    assert body["input"]["prompt"] == "A quiet studio portrait"
    assert captured["poll"].endswith("/api/v1/tasks/img-task-1")


@pytest.mark.unit
async def test_wanx_image_reports_failed_tasks():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(200, json={"output": {"task_id": "img-task-2"}})
        return httpx.Response(200, json={"output": {"task_status": "FAILED"}})

    with pytest.raises(WanxImageError, match="failed"):
        await provider(handler).generate_image(
            prompt="x",
            generation_mode="text_to_image",
            reference_image_path=None,
            model="wanx2.1-t2i-turbo",
        )


@pytest.mark.unit
async def test_wan27_image_uses_the_multimodal_endpoint():
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["async_header"] = request.headers.get("X-DashScope-Async")
        captured["body"] = json.loads(request.content)
        return httpx.Response(
            200,
            json={
                "output": {
                    "choices": [
                        {"message": {"content": [{"image": "https://cdn.example/wan.png"}]}}
                    ]
                }
            },
        )

    url = await provider(handler).generate_image(
        prompt="A blue rubber duck",
        generation_mode="text_to_image",
        reference_image_path=None,
        model="wan2.7-image",
    )

    assert url == "https://cdn.example/wan.png"
    assert captured["url"].endswith("/api/v1/services/aigc/multimodal-generation/generation")
    assert captured["async_header"] is None
    body = captured["body"]
    assert body["model"] == "wan2.7-image"
    assert body["input"]["messages"][0]["content"][0]["text"] == "A blue rubber duck"


@pytest.mark.unit
async def test_wanx_image_rejects_image_to_image():
    with pytest.raises(WanxImageError, match="text-to-image"):
        await provider(lambda request: httpx.Response(200, json={})).generate_image(
            prompt="x",
            generation_mode="image_to_image",
            reference_image_path="/tmp/ref.png",
            model="wan2.7-image",
        )

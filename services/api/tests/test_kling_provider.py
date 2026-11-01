from typing import Any
from uuid import uuid4

import pytest
from mcp import types

from videoagent.providers.base import GenerationRequest
from videoagent.providers.kling import KlingVideoProvider
from videoagent.providers.mcp_client import result_payload


class FakeToolClient:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    async def call_tool(self, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        self.calls.append((name, arguments))
        if name == "text_to_video":
            return {"taskId": "kling-task-1", "status": "submitted"}
        if name == "query_tasks":
            return {
                "tasks": [
                    {
                        "taskId": "kling-task-1",
                        "status": "succeeded",
                        "videoUrl": "https://media.example.com/kling/video.mp4",
                    }
                ]
            }
        raise AssertionError(f"Unexpected tool: {name}")


@pytest.mark.unit
async def test_kling_provider_maps_text_to_video_request():
    client = FakeToolClient()
    provider = KlingVideoProvider(client)
    request = GenerationRequest(
        shot_id=uuid4(),
        prompt="A cinematic perfume bottle",
        duration_seconds=5,
        aspect_ratio="16:9",
        generation_mode="text_to_video",
    )

    job = await provider.submit(request)

    assert job.provider == "kling"
    assert job.task_id == "kling-task-1"
    assert job.status == "submitted"
    assert client.calls == [
        (
            "text_to_video",
            {
                "prompt": "A cinematic perfume bottle",
                "duration": 5,
                "aspectRatio": "16:9",
            },
        )
    ]


@pytest.mark.unit
async def test_kling_provider_normalizes_task_result():
    client = FakeToolClient()
    provider = KlingVideoProvider(client)

    job = await provider.status("kling-task-1")

    assert job.status == "succeeded"
    assert job.result_url == "https://media.example.com/kling/video.mp4"
    assert client.calls == [("query_tasks", {"taskIds": ["kling-task-1"]})]


@pytest.mark.unit
async def test_kling_provider_estimates_usage_by_duration():
    provider = KlingVideoProvider(FakeToolClient())
    request = GenerationRequest(
        shot_id=uuid4(),
        prompt="A product story",
        duration_seconds=8,
        aspect_ratio="9:16",
        generation_mode="text_to_video",
    )

    estimate = await provider.estimate(request)

    assert estimate.provider == "kling"
    assert estimate.credits == 8
    assert estimate.duration_seconds == 8


@pytest.mark.unit
def test_mcp_text_result_is_parsed_without_exposing_transport_wrapper():
    result = types.CallToolResult(
        content=[
            types.TextContent(
                type="text",
                text='{"taskId":"task-from-text","status":"submitted"}',
            )
        ]
    )

    assert result_payload(result) == {
        "taskId": "task-from-text",
        "status": "submitted",
    }

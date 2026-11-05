import json
from types import SimpleNamespace

import pytest

from tests.conftest import register
from videoagent.agent.planner import OpenAIStoryboardPlanner, PlanningContext


@pytest.mark.api
async def test_local_agent_turns_user_brief_into_bilingual_storyboard(client):
    assert (await register(client, locale="zh-CN")).status_code == 201
    project_response = await client.post(
        "/api/v1/projects",
        json={
            "title": "香水发布",
            "brief": "制作一支十五秒的高级香水广告",
        },
    )
    assert project_response.status_code == 201
    project = project_response.json()

    response = await client.post(
        f"/api/v1/projects/{project['id']}/messages",
        json={"content": "突出玻璃瓶的光泽，结尾展示品牌名称"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user_message"]["role"] == "user"
    assert body["assistant_message"]["role"] == "assistant"
    assert "整体设定" in body["assistant_message"]["content"]
    assert body["workflow"]["stage"] == "concept"
    assert len(body["storyboard"]["shots"]) == 3
    assert all(shot["prompt_en"] for shot in body["storyboard"]["shots"])
    assert all(shot["prompt_zh"] for shot in body["storyboard"]["shots"])


@pytest.mark.api
async def test_agent_rejects_empty_message(client):
    assert (await register(client)).status_code == 201
    project = await client.post("/api/v1/projects", json={"title": "Empty prompt"})

    response = await client.post(
        f"/api/v1/projects/{project.json()['id']}/messages",
        json={"content": "   "},
    )

    assert response.status_code == 422


@pytest.mark.api
async def test_agent_uses_the_prompt_language_instead_of_account_locale(client):
    assert (await register(client, locale="en")).status_code == 201
    project = (
        await client.post(
            "/api/v1/projects",
            json={"title": "城市夜行", "brief": "制作一支雨夜城市短片"},
        )
    ).json()

    response = await client.post(
        f"/api/v1/projects/{project['id']}/messages",
        json={"content": "先梳理整体设定和人物关系"},
    )

    assert response.status_code == 200
    assert "整体设定" in response.json()["assistant_message"]["content"]


@pytest.mark.api
async def test_local_agent_uses_hook_duration_and_aspect_settings(client):
    assert (await register(client)).status_code == 201
    project = (
        await client.post(
            "/api/v1/projects",
            json={
                "title": "Proof-led product film",
                "brief": (
                    "A precise product demonstration\n\n"
                    "Production settings: product_film · Hook proof · Product · "
                    "9:16 · 10s · Kling/Kling Video 4.0 · 720p · "
                    "Audio auto · Review ask"
                ),
            },
        )
    ).json()

    response = await client.post(
        f"/api/v1/projects/{project['id']}/messages",
        json={"content": "Show the result before explaining the product"},
    )

    assert response.status_code == 200
    shots = response.json()["storyboard"]["shots"]
    assert all(shot["duration_seconds"] == 10 for shot in shots)
    assert all(shot["aspect_ratio"] == "9:16" for shot in shots)
    assert "visibly demonstrating the product result or proof" in shots[0]["prompt_en"]


@pytest.mark.unit
async def test_openai_compatible_planner_falls_back_when_json_schema_is_unsupported():
    class UnsupportedStructuredModel:
        async def ainvoke(self, prompt: str) -> object:
            raise RuntimeError("This response_format type is unavailable now")

    class PlainChatModel:
        async def ainvoke(self, messages: list[tuple[str, str]]) -> object:
            assert messages[0][0] == "system"
            return SimpleNamespace(
                content=json.dumps(
                    {
                        "assistant_message": "Storyboard ready.",
                        "storyboard": {
                            "shots": [
                                {
                                    "description": "Reveal",
                                    "prompt_en": "A cinematic product reveal",
                                    "prompt_zh": "电影感产品亮相",
                                    "duration_seconds": 5,
                                    "aspect_ratio": "16:9",
                                    "generation_mode": "text_to_video",
                                }
                            ]
                        },
                    }
                )
            )

    planner = object.__new__(OpenAIStoryboardPlanner)
    planner._structured = UnsupportedStructuredModel()  # type: ignore[attr-defined]
    planner._chat = PlainChatModel()  # type: ignore[attr-defined]

    result = await planner.plan(
        PlanningContext(
            locale="en",
            project_title="Fallback",
            project_brief="Product reveal",
            user_message="Create a shot",
        )
    )

    assert result.assistant_message == "Storyboard ready."
    assert result.storyboard.shots[0].prompt_en == "A cinematic product reveal"


@pytest.mark.api
async def test_other_user_cannot_message_project(client):
    assert (await register(client, email="owner@example.com")).status_code == 201
    project = await client.post("/api/v1/projects", json={"title": "Private"})
    project_id = project.json()["id"]
    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await register(client, email="other@example.com")).status_code == 201

    response = await client.post(
        f"/api/v1/projects/{project_id}/messages",
        json={"content": "Hijack"},
    )

    assert response.status_code == 404

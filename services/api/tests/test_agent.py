import pytest

from tests.conftest import register


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
    assert "故事板" in body["assistant_message"]["content"]
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

import pytest

from tests.conftest import register


@pytest.mark.api
async def test_skill_studio_optimizes_and_persists_a_structured_skill(client):
    assert (await register(client, email="skill-author@example.com")).status_code == 201

    optimized = await client.post(
        "/api/v1/skills/optimize",
        json={
            "idea": "Make product videos feel like a premium editorial campaign",
            "title": "Editorial product film",
            "locale": "en",
        },
    )
    assert optimized.status_code == 200
    draft = optimized.json()
    assert draft["skill_id"] == "editorial_product_film"
    assert "Goal" in draft["instructions"]
    assert draft["input_schema"]["required"] == ["request"]

    created = await client.post(
        "/api/v1/skills",
        json={**draft, "visibility": "private"},
    )
    assert created.status_code == 201
    skill = created.json()
    assert skill["user_id"] == "skill_author"
    assert skill["visibility"] == "private"

    listed = await client.get("/api/v1/skills")
    assert listed.status_code == 200
    assert [item["skill_id"] for item in listed.json()["items"]] == ["editorial_product_film"]

    duplicate = await client.post(
        "/api/v1/skills",
        json={**draft, "visibility": "public"},
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "SKILL_ALREADY_EXISTS"


@pytest.mark.api
async def test_skill_studio_requires_authentication(client):
    response = await client.post(
        "/api/v1/skills/optimize",
        json={"idea": "Build a reusable storyboard review skill"},
    )

    assert response.status_code == 401


@pytest.mark.api
async def test_public_skill_engagement_is_discoverable_and_deduplicated(client):
    assert (await register(client, email="skill-owner@example.com")).status_code == 201
    created = await client.post(
        "/api/v1/skills",
        json={
            "skill_id": "editorial_vlog",
            "title": "Editorial vlog",
            "description": "Build a restrained editorial vlog.",
            "instructions": "Preserve subject identity and natural motion.",
            "prompt_template": "Create an editorial vlog from:",
            "input_schema": {"type": "object"},
            "output_schema": {"type": "object"},
            "visibility": "public",
        },
    )
    assert created.status_code == 201
    skill_key = "skill_owner/editorial_vlog"
    self_like = await client.post(
        "/api/v1/skills/engagement/like",
        json={"skill_key": skill_key},
    )
    assert self_like.status_code == 409
    assert self_like.json()["error"]["code"] == "SELF_LIKE_NOT_ALLOWED"

    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await register(client, email="skill-viewer@example.com")).status_code == 201

    listed = await client.get("/api/v1/skills")
    assert listed.status_code == 200
    skill = listed.json()["items"][0]
    assert skill["user_id"] == "skill_owner"
    assert skill["is_mine"] is False
    assert skill["likes"] == 0
    assert skill["uses"] == 0

    liked = await client.post(
        "/api/v1/skills/engagement/like",
        json={"skill_key": skill_key},
    )
    assert liked.status_code == 200
    assert liked.json() == {"likes": 1, "uses": 0, "is_liked": True}

    used = await client.post(
        "/api/v1/skills/engagement/use",
        json={"skill_key": skill_key},
    )
    assert used.status_code == 200
    assert used.json() == {"likes": 1, "uses": 1, "is_liked": True}
    queried = await client.post(
        "/api/v1/skills/engagement/query",
        json={"skill_keys": [skill_key]},
    )
    assert queried.status_code == 200
    assert queried.json()["items"][skill_key] == {
        "likes": 1,
        "uses": 1,
        "is_liked": True,
    }

    repeated_use = await client.post(
        "/api/v1/skills/engagement/use",
        json={"skill_key": skill_key},
    )
    assert repeated_use.status_code == 200
    assert repeated_use.json()["uses"] == 1

    unliked = await client.post(
        "/api/v1/skills/engagement/like",
        json={"skill_key": skill_key},
    )
    assert unliked.status_code == 200
    assert unliked.json() == {"likes": 0, "uses": 1, "is_liked": False}

    built_in_use = await client.post(
        "/api/v1/skills/engagement/use",
        json={"skill_key": "kling/text_to_video"},
    )
    assert built_in_use.status_code == 200
    assert built_in_use.json()["uses"] == 1

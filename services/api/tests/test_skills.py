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

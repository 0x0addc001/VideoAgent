import pytest

from tests.conftest import register


async def create_project(client, title: str = "Storyboard project") -> dict:
    response = await client.post(
        "/api/v1/projects",
        json={"title": title, "brief": "A short product film"},
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.api
async def test_user_can_create_and_read_ordered_storyboard(client):
    assert (await register(client)).status_code == 201
    project = await create_project(client)

    created = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "The product emerges from shadow.",
                    "prompt_en": "Cinematic product reveal in a dark studio",
                    "prompt_zh": "暗色影棚中的电影感产品展示",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                },
                {
                    "description": "A close-up of the label.",
                    "prompt_en": "Macro shot of the product label",
                    "duration_seconds": 3,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                },
            ]
        },
    )

    assert created.status_code == 200
    body = created.json()
    assert body["version"] == 1
    assert [shot["index"] for shot in body["shots"]] == [0, 1]
    assert body["shots"][0]["prompt_zh"] == "暗色影棚中的电影感产品展示"

    fetched = await client.get(f"/api/v1/projects/{project['id']}/storyboard")
    assert fetched.status_code == 200
    assert fetched.json()["shots"][1]["prompt_en"] == "Macro shot of the product label"


@pytest.mark.api
async def test_replacing_storyboard_increments_version_and_removes_old_shots(client):
    assert (await register(client)).status_code == 201
    project = await create_project(client)

    first = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "First",
                    "prompt_en": "First shot",
                    "duration_seconds": 5,
                    "aspect_ratio": "9:16",
                    "generation_mode": "text_to_video",
                }
            ]
        },
    )
    assert first.status_code == 200

    second = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "Replacement",
                    "prompt_en": "Replacement shot",
                    "duration_seconds": 3,
                    "aspect_ratio": "1:1",
                    "generation_mode": "image_to_video",
                }
            ]
        },
    )

    assert second.status_code == 200
    assert second.json()["version"] == 2
    assert len(second.json()["shots"]) == 1
    assert second.json()["shots"][0]["prompt_en"] == "Replacement shot"


@pytest.mark.api
async def test_reordering_storyboard_preserves_shot_ids(client):
    assert (await register(client)).status_code == 201
    project = await create_project(client)
    created = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "First",
                    "prompt_en": "First shot",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                },
                {
                    "description": "Second",
                    "prompt_en": "Second shot",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                },
            ]
        },
    )
    assert created.status_code == 200
    original = created.json()
    original_ids = [shot["id"] for shot in original["shots"]]

    reordered = await client.patch(
        f"/api/v1/projects/{project['id']}/storyboard/order",
        json={"shot_ids": list(reversed(original_ids))},
    )

    assert reordered.status_code == 200
    payload = reordered.json()
    assert [shot["id"] for shot in payload["shots"]] == list(reversed(original_ids))
    assert [shot["index"] for shot in payload["shots"]] == [0, 1]
    assert payload["version"] == original["version"] + 1


@pytest.mark.api
async def test_reordering_storyboard_rejects_partial_shot_set(client):
    assert (await register(client)).status_code == 201
    project = await create_project(client)
    created = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "Only",
                    "prompt_en": "Only shot",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                }
            ]
        },
    )
    assert created.status_code == 200

    shot_id = created.json()["shots"][0]["id"]
    reordered = await client.patch(
        f"/api/v1/projects/{project['id']}/storyboard/order",
        json={"shot_ids": [shot_id, shot_id]},
    )

    assert reordered.status_code == 422


@pytest.mark.api
async def test_storyboard_rejects_invalid_generation_mode(client):
    assert (await register(client)).status_code == 201
    project = await create_project(client)

    response = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "Invalid",
                    "prompt_en": "Invalid shot",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "unknown_mode",
                }
            ]
        },
    )

    assert response.status_code == 422


@pytest.mark.api
async def test_other_user_cannot_read_or_replace_storyboard(client):
    assert (await register(client, email="owner@example.com")).status_code == 201
    project = await create_project(client)
    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await register(client, email="intruder@example.com")).status_code == 201

    read = await client.get(f"/api/v1/projects/{project['id']}/storyboard")
    write = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "Hijacked",
                    "prompt_en": "Hijacked shot",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                }
            ]
        },
    )

    assert read.status_code == 404
    assert write.status_code == 404

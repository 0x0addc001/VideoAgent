from pathlib import Path

import pytest

from tests.conftest import register

POSTER = (
    Path(__file__).resolve().parents[3]
    / "apps"
    / "web"
    / "public"
    / "media"
    / "vlog-hero-poster.jpg"
)


async def project_with_character(client) -> tuple[dict, dict]:
    assert (await register(client)).status_code == 201
    project_response = await client.post(
        "/api/v1/projects",
        json={"title": "Character project", "brief": "A character-led short film"},
    )
    assert project_response.status_code == 201
    project = project_response.json()
    storyboard_response = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "characters": [
                {
                    "name": "Mara",
                    "description": "A reserved photographer in her early thirties.",
                    "prompt_en": (
                        "Editorial character portrait of Mara, natural skin texture, "
                        "cinematic blue window light"
                    ),
                }
            ],
            "shots": [
                {
                    "description": "Mara enters the studio",
                    "prompt_en": "Mara enters a quiet blue-lit studio",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                }
            ],
        },
    )
    assert storyboard_response.status_code == 200
    return project, storyboard_response.json()["characters"][0]


@pytest.mark.api
async def test_character_image_generation_persists_downloadable_asset(client):
    project, character = await project_with_character(client)

    estimate = await client.post(f"/api/v1/characters/{character['id']}/estimate")
    assert estimate.status_code == 200
    assert estimate.json() == {
        "provider": "mock",
        "credits": 2,
        "duration_seconds": 0,
    }

    response = await client.post(
        f"/api/v1/characters/{character['id']}/generate",
        json={"approved": True, "generation_mode": "text_to_image"},
    )

    assert response.status_code == 201
    asset = response.json()
    assert asset["project_id"] == project["id"]
    assert asset["kind"] == "generated"
    assert asset["content_type"] == "image/jpeg"
    assert asset["filename"].startswith(f"character-{character['id']}-")
    content = await client.get(asset["content_url"])
    assert content.status_code == 200
    assert content.headers["content-type"].startswith("image/jpeg")
    assert (await client.get("/api/v1/credits")).json()["credits"] == 98


@pytest.mark.api
async def test_character_reference_generation_requires_project_image(client):
    _, character = await project_with_character(client)

    missing = await client.post(
        f"/api/v1/characters/{character['id']}/generate",
        json={"approved": True, "generation_mode": "image_to_image"},
    )
    assert missing.status_code == 422
    assert missing.json()["error"]["code"] == "REFERENCE_REQUIRED"

    upload = await client.post(
        f"/api/v1/characters/{character['id']}/assets",
        files={"file": ("portrait.jpg", POSTER.read_bytes(), "image/jpeg")},
    )
    assert upload.status_code == 201
    reference = upload.json()
    assert reference["filename"].startswith(f"character-{character['id']}-")

    generated = await client.post(
        f"/api/v1/characters/{character['id']}/generate",
        json={
            "approved": True,
            "generation_mode": "image_to_image",
            "reference_asset_id": reference["id"],
        },
    )
    assert generated.status_code == 201
    assert generated.json()["content_type"] == "image/jpeg"


@pytest.mark.api
async def test_character_generation_rejects_non_image_provider(client):
    _, character = await project_with_character(client)

    response = await client.post(
        f"/api/v1/characters/{character['id']}/generate",
        json={
            "approved": True,
            "generation_mode": "text_to_image",
            "provider": "pippit",
            "model": "Seedance_2.5",
        },
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "IMAGE_PROVIDER_UNSUPPORTED"

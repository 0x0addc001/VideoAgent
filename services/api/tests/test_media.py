import pytest

from tests.conftest import register
from tests.test_generation import project_with_shot


@pytest.mark.api
async def test_asset_upload_download_and_validation(client):
    assert (await register(client)).status_code == 201
    project = (
        await client.post(
            "/api/v1/projects",
            json={"title": "Media project", "brief": "Reference upload"},
        )
    ).json()

    uploaded = await client.post(
        f"/api/v1/projects/{project['id']}/assets",
        files={"file": ("reference.png", b"\x89PNG\r\n\x1a\ncontent", "image/png")},
    )

    assert uploaded.status_code == 201
    asset = uploaded.json()
    assert asset["kind"] == "upload"
    assert asset["content_type"] == "image/png"
    downloaded = await client.get(asset["content_url"])
    assert downloaded.status_code == 200
    assert downloaded.content.startswith(b"\x89PNG")

    rejected = await client.post(
        f"/api/v1/projects/{project['id']}/assets",
        files={"file": ("payload.mp4", b"not-video", "video/mp4")},
    )
    assert rejected.status_code == 422
    assert rejected.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


@pytest.mark.api
async def test_mock_generation_export_and_share(client):
    project, shot = await project_with_shot(client)
    generated = await client.post(
        f"/api/v1/shots/{shot['id']}/generate",
        headers={"Idempotency-Key": "media-export-generation"},
        json={"approved": True},
    )
    assert generated.status_code == 201
    completed = await client.get(f"/api/v1/jobs/{generated.json()['id']}")
    assert completed.status_code == 200
    assert completed.json()["status"] == "succeeded"

    rendered_from_agent = await client.post(
        f"/api/v1/projects/{project['id']}/messages",
        json={"content": "Render the final cut"},
    )
    assert rendered_from_agent.status_code == 200
    assert rendered_from_agent.json()["assistant_message"]["metadata"]["action"] == (
        "render_final_cut"
    )

    exported = await client.post(
        f"/api/v1/projects/{project['id']}/exports",
        json={
            "aspect_ratios": ["21:9"],
            "captions": "A generated product story",
            "permission": "private",
        },
    )

    assert exported.status_code == 200
    payload = exported.json()
    assert len(payload["items"]) == 1
    assert payload["items"][0]["kind"] == "export"
    assert payload["items"][0]["filename"].endswith("-21x9.mp4")
    assert payload["cover"]["kind"] == "cover"
    download = await client.get(payload["items"][0]["content_url"])
    assert download.status_code == 200
    assert download.headers["content-type"].startswith("video/mp4")

    shared = await client.post(
        f"/api/v1/assets/{payload['items'][0]['id']}/share",
        json={"expires_in_hours": 1},
    )
    assert shared.status_code == 200
    share = shared.json()
    public_download = await client.get(share["share_url"])
    assert public_download.status_code == 200

    published = await client.post(
        f"/api/v1/hots/from-asset/{payload['items'][0]['id']}",
        json={
            "title": "Export acceptance",
            "prompt": "A generated short",
            "skill": "auto",
        },
    )
    assert published.status_code == 201
    assert published.json()["asset_id"] == payload["items"][0]["id"]
    assert (await client.get(f"/api/v1/hots/{published.json()['id']}/video")).status_code == 200

    revoked = await client.delete(f"/api/v1/shares/{share['id']}")
    assert revoked.status_code == 204
    unavailable = await client.get(share["share_url"])
    assert unavailable.status_code == 404


@pytest.mark.api
async def test_export_requires_every_shot_to_be_generated(client):
    assert (await register(client, email="final-cut-gate@example.com")).status_code == 201
    project = (
        await client.post(
            "/api/v1/projects",
            json={"title": "Two-shot film", "brief": "A complete two-shot story"},
        )
    ).json()
    storyboard = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "characters": [
                {
                    "name": "Lead",
                    "description": "The recurring lead.",
                    "prompt_en": "Cinematic portrait of the lead",
                }
            ],
            "scenes": [
                {
                    "name": "Studio",
                    "location": "Production studio",
                    "description": "A controlled production set.",
                    "prompt_en": "Cinematic production studio",
                }
            ],
            "shots": [
                {
                    "description": "Opening",
                    "prompt_en": "Cinematic opening",
                },
                {
                    "description": "Closing",
                    "prompt_en": "Cinematic closing",
                },
            ],
        },
    )
    shot_id = storyboard.json()["shots"][0]["id"]
    generated = await client.post(
        f"/api/v1/shots/{shot_id}/generate",
        headers={"Idempotency-Key": "incomplete-final-cut"},
        json={"approved": True},
    )
    assert generated.status_code == 201
    completed = await client.get(f"/api/v1/jobs/{generated.json()['id']}")
    assert completed.status_code == 200
    assert completed.json()["status"] == "succeeded"
    incomplete = await client.post(
        f"/api/v1/projects/{project['id']}/exports",
        json={"aspect_ratios": ["16:9"]},
    )
    assert incomplete.status_code == 409
    assert incomplete.json()["error"]["code"] == "SHOTS_NOT_READY"


@pytest.mark.api
async def test_shot_asset_upload_selection_rename_and_delete(client):
    project, shot = await project_with_shot(client)
    uploaded = await client.post(
        f"/api/v1/projects/{project['id']}/assets",
        data={"shot_id": shot["id"]},
        files={"file": ("reference.png", b"\x89PNG\r\n\x1a\ncontent", "image/png")},
    )
    assert uploaded.status_code == 201
    asset = uploaded.json()
    assert asset["shot_id"] == shot["id"]

    selected = await client.put(
        f"/api/v1/projects/{project['id']}/asset-selections",
        json={
            "resource_type": "shot",
            "resource_id": shot["id"],
            "asset_id": asset["id"],
        },
    )
    assert selected.status_code == 200
    assert selected.json()["items"][0]["asset_id"] == asset["id"]

    renamed = await client.patch(
        f"/api/v1/assets/{asset['id']}",
        json={"filename": "opening-reference.png"},
    )
    assert renamed.status_code == 200
    assert renamed.json()["filename"] == "opening-reference.png"

    deleted = await client.delete(f"/api/v1/assets/{asset['id']}")
    assert deleted.status_code == 204
    assets = await client.get(f"/api/v1/projects/{project['id']}/assets")
    assert all(item["id"] != asset["id"] for item in assets.json()["items"])

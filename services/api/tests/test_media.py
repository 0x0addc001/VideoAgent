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

    exported = await client.post(
        f"/api/v1/projects/{project['id']}/exports",
        json={
            "aspect_ratios": ["16:9"],
            "captions": "A generated product story",
            "permission": "private",
        },
    )

    assert exported.status_code == 200
    payload = exported.json()
    assert len(payload["items"]) == 1
    assert payload["items"][0]["kind"] == "export"
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

    revoked = await client.delete(f"/api/v1/shares/{share['id']}")
    assert revoked.status_code == 204
    unavailable = await client.get(share["share_url"])
    assert unavailable.status_code == 404

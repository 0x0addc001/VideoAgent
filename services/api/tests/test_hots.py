import pytest

from tests.conftest import register

MP4_BYTES = b"\x00\x00\x00\x18ftypmp42\x00\x00\x00\x00mp42isom" + b"\x00" * 32


@pytest.mark.api
async def test_hots_video_publish_persists_and_serves_content(client):
    assert (await register(client, email="hots-author@example.com")).status_code == 201

    published = await client.post(
        "/api/v1/hots",
        data={
            "title": "Rain at midnight",
            "prompt": "A quiet rain-soaked street at midnight",
            "skill": "video_agent/creator_vlog",
        },
        files={"file": ("rain.mp4", MP4_BYTES, "video/mp4")},
    )
    assert published.status_code == 201
    post = published.json()
    assert post["title"] == "Rain at midnight"
    assert post["author"] == "hots_author"
    assert post["is_mine"] is True

    listed = await client.get("/api/v1/hots")
    assert listed.status_code == 200
    assert listed.json()["items"][0]["id"] == post["id"]

    video = await client.get(f"/api/v1/hots/{post['id']}/video")
    assert video.status_code == 200
    assert video.headers["content-type"] == "video/mp4"
    assert video.content == MP4_BYTES


@pytest.mark.api
async def test_hots_rejects_non_video_uploads(client):
    assert (await register(client, email="invalid-hots@example.com")).status_code == 201

    response = await client.post(
        "/api/v1/hots",
        data={"title": "Not a video", "prompt": "Still image", "skill": "auto"},
        files={"file": ("still.png", b"\x89PNG\r\n\x1a\n", "image/png")},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "HOTS_VIDEO_REQUIRED"

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


@pytest.mark.api
async def test_hots_likes_are_persisted_and_toggle_per_user(client):
    assert (await register(client, email="liked-author@example.com")).status_code == 201
    published = await client.post(
        "/api/v1/hots",
        data={
            "title": "Blue hour",
            "prompt": "A blue-hour portrait in a quiet studio",
            "skill": "video_agent/creator_vlog",
        },
        files={"file": ("blue-hour.mp4", MP4_BYTES, "video/mp4")},
    )
    assert published.status_code == 201
    post_id = published.json()["id"]
    self_like = await client.post(f"/api/v1/hots/{post_id}/like")
    assert self_like.status_code == 409
    assert self_like.json()["error"]["code"] == "SELF_LIKE_NOT_ALLOWED"

    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await register(client, email="liked-viewer@example.com")).status_code == 201

    listed = await client.get("/api/v1/hots")
    assert listed.status_code == 200
    assert listed.json()["items"][0]["is_liked"] is False

    liked = await client.post(f"/api/v1/hots/{post_id}/like")
    assert liked.status_code == 200
    assert liked.json()["likes"] == 1
    assert liked.json()["is_liked"] is True

    relisted = await client.get("/api/v1/hots")
    assert relisted.json()["items"][0]["likes"] == 1
    assert relisted.json()["items"][0]["is_liked"] is True

    unliked = await client.post(f"/api/v1/hots/{post_id}/like")
    assert unliked.status_code == 200
    assert unliked.json()["likes"] == 0
    assert unliked.json()["is_liked"] is False

import pytest

from tests.conftest import register


@pytest.mark.api
async def test_scene_is_editable_and_owns_uploaded_reference_images(client):
    assert (await register(client)).status_code == 201
    project = (
        await client.post(
            "/api/v1/projects",
            json={"title": "Scene test", "brief": "A scene-led short"},
        )
    ).json()
    created = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "Wide establishing shot",
                    "prompt_en": "A person crosses an empty studio",
                }
            ],
            "scenes": [
                {
                    "name": "Studio",
                    "location": "Downtown loft",
                    "description": "A warm production loft with large windows.",
                    "prompt_en": "Cinematic production loft, warm daylight",
                }
            ],
        },
    )
    assert created.status_code == 200
    scene = created.json()["scenes"][0]
    assert scene["location"] == "Downtown loft"

    edited = await client.patch(
        f"/api/v1/projects/{project['id']}/storyboard/scenes/{scene['id']}",
        json={"location": "Sunlit loft"},
    )
    assert edited.status_code == 200
    assert edited.json()["location"] == "Sunlit loft"

    upload = await client.post(
        f"/api/v1/scenes/{scene['id']}/assets",
        files={"file": ("scene.jpg", b"\xff\xd8\xff\xe0scene", "image/jpeg")},
    )
    assert upload.status_code == 201
    assert upload.json()["filename"].startswith(f"scene-{scene['id']}-")

    selection = await client.put(
        f"/api/v1/projects/{project['id']}/asset-selections",
        json={
            "resource_type": "scene",
            "resource_id": scene["id"],
            "asset_id": upload.json()["id"],
        },
    )
    assert selection.status_code == 200
    assert selection.json()["items"][0]["resource_type"] == "scene"

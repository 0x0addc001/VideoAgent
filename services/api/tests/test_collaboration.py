import pytest

from tests.conftest import register


@pytest.mark.api
async def test_project_collaboration_link_grants_editor_access(client):
    assert (await register(client, email="owner@example.com")).status_code == 201
    project = (
        await client.post(
            "/api/v1/projects",
            json={"title": "Collaborative film", "brief": "A shared story"},
        )
    ).json()
    storyboard = (
        await client.put(
            f"/api/v1/projects/{project['id']}/storyboard",
            json={
                "shots": [
                    {
                        "description": "Opening shot",
                        "prompt_en": "A cinematic opening shot",
                    }
                ]
            },
        )
    ).json()
    invitation = await client.post(
        f"/api/v1/projects/{project['id']}/collaborations",
        json={
            "permission": "edit",
            "collaborator_email": "editor@example.com",
        },
    )
    assert invitation.status_code == 200
    token = invitation.json()["share_url"].rsplit("/", 1)[-1]

    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await register(client, email="editor@example.com")).status_code == 201
    accepted = await client.post(f"/api/v1/collaborations/{token}/accept")
    assert accepted.status_code == 200
    assert accepted.json() == {"project_id": project["id"], "permission": "edit"}
    assert (await client.get(f"/api/v1/projects/{project['id']}")).status_code == 200
    workspace = await client.get("/api/v1/workspace")
    assert workspace.status_code == 200
    assert project["id"] in {
        item["id"] for item in workspace.json()["recents"]
    }
    assert (
        await client.get(f"/api/v1/projects/{project['id']}/storyboard")
    ).status_code == 200
    shot_id = storyboard["shots"][0]["id"]
    edited = await client.patch(
        f"/api/v1/projects/{project['id']}/storyboard/shots/{shot_id}",
        json={"description": "Edited by collaborator"},
    )
    assert edited.status_code == 200
    assert edited.json()["description"] == "Edited by collaborator"


@pytest.mark.api
async def test_collaboration_email_and_view_permissions_are_enforced(client):
    assert (await register(client, email="owner@example.com")).status_code == 201
    project = (
        await client.post("/api/v1/projects", json={"title": "Review cut"})
    ).json()
    invitation = await client.post(
        f"/api/v1/projects/{project['id']}/collaborations",
        json={
            "permission": "view",
            "collaborator_email": "reviewer@example.com",
        },
    )
    token = invitation.json()["share_url"].rsplit("/", 1)[-1]

    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await register(client, email="other@example.com")).status_code == 201
    wrong_email = await client.post(f"/api/v1/collaborations/{token}/accept")
    assert wrong_email.status_code == 403
    assert wrong_email.json()["error"]["code"] == "COLLABORATION_EMAIL_MISMATCH"

    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await register(client, email="reviewer@example.com")).status_code == 201
    assert (await client.post(f"/api/v1/collaborations/{token}/accept")).status_code == 200
    assert (await client.get(f"/api/v1/projects/{project['id']}")).status_code == 200
    denied = await client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"title": "Reviewer may not rename"},
    )
    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "PROJECT_EDIT_FORBIDDEN"

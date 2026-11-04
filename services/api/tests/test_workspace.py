import pytest

from tests.conftest import register


@pytest.mark.api
async def test_workspace_groups_history_and_clears_folder_when_deleted(client):
    assert (await register(client)).status_code == 201
    first = (
        await client.post("/api/v1/projects", json={"title": "Campaign", "brief": "One"})
    ).json()
    second = (
        await client.post("/api/v1/projects", json={"title": "Documentary", "brief": "Two"})
    ).json()

    workspace = await client.get("/api/v1/workspace")
    assert workspace.status_code == 200
    assert {item["id"] for item in workspace.json()["recents"]} == {
        first["id"],
        second["id"],
    }

    folder_response = await client.post(
        "/api/v1/workspace/folders",
        json={"name": "Brand work"},
    )
    assert folder_response.status_code == 201
    folder = folder_response.json()

    moved = await client.put(
        f"/api/v1/workspace/threads/{first['id']}/folder",
        json={"folder_id": folder["id"]},
    )
    assert moved.status_code == 204
    workspace = (await client.get("/api/v1/workspace")).json()
    grouped = next(item for item in workspace["recents"] if item["id"] == first["id"])
    assert grouped["folder_id"] == folder["id"]

    deleted = await client.delete(f"/api/v1/workspace/folders/{folder['id']}")
    assert deleted.status_code == 204
    workspace = (await client.get("/api/v1/workspace")).json()
    ungrouped = next(item for item in workspace["recents"] if item["id"] == first["id"])
    assert ungrouped["folder_id"] is None


@pytest.mark.api
async def test_workflow_requires_approval_at_each_refinement_stage(client):
    assert (await register(client)).status_code == 201
    project = (
        await client.post(
            "/api/v1/projects",
            json={"title": "Layered story", "brief": "A short branded drama"},
        )
    ).json()
    first_turn = await client.post(
        f"/api/v1/projects/{project['id']}/messages",
        json={"content": "Start with the overall direction"},
    )

    assert first_turn.status_code == 200
    assert first_turn.json()["workflow"] == {
        "project_id": project["id"],
        "stage": "concept",
        "status": "awaiting_approval",
        "updated_at": first_turn.json()["workflow"]["updated_at"],
    }

    concept = await client.post(
        f"/api/v1/projects/{project['id']}/workflow/decision",
        json={"choice": "approve"},
    )
    assert concept.status_code == 200
    assert concept.json()["workflow"]["stage"] == "outline"

    outline = await client.post(
        f"/api/v1/projects/{project['id']}/workflow/decision",
        json={"choice": "approve"},
    )
    assert outline.status_code == 200
    assert outline.json()["workflow"]["stage"] == "script"

    revised = await client.post(
        f"/api/v1/projects/{project['id']}/workflow/decision",
        json={"choice": "custom", "instruction": "Make the ending more restrained."},
    )
    assert revised.status_code == 200
    assert revised.json()["workflow"]["stage"] == "script"

    approved = await client.post(
        f"/api/v1/projects/{project['id']}/workflow/decision",
        json={"choice": "approve"},
    )
    assert approved.status_code == 200
    assert approved.json()["workflow"] == {
        "project_id": project["id"],
        "stage": "ready",
        "status": "approved",
        "updated_at": approved.json()["workflow"]["updated_at"],
    }

    repeated = await client.post(
        f"/api/v1/projects/{project['id']}/workflow/decision",
        json={"choice": "approve"},
    )
    assert repeated.status_code == 409

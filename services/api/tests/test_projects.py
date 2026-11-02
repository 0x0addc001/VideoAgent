import pytest

from tests.conftest import register


@pytest.mark.api
async def test_user_can_create_and_read_own_project(client):
    assert (await register(client)).status_code == 201

    created = await client.post(
        "/api/v1/projects",
        json={"title": "Product launch", "brief": "A cinematic launch video"},
    )

    assert created.status_code == 201
    project = created.json()
    assert project["title"] == "Product launch"
    assert project["state"] == "draft"

    fetched = await client.get(f"/api/v1/projects/{project['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == project["id"]


@pytest.mark.api
async def test_project_list_only_contains_current_users_projects(app, client):
    assert (await register(client, email="first@example.com")).status_code == 201
    first_project = await client.post("/api/v1/projects", json={"title": "First"})
    assert first_project.status_code == 201

    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await register(client, email="second@example.com")).status_code == 201
    second_project = await client.post("/api/v1/projects", json={"title": "Second"})
    assert second_project.status_code == 201

    projects = await client.get("/api/v1/projects")
    assert projects.status_code == 200
    assert [item["title"] for item in projects.json()["items"]] == ["Second"]

    forbidden = await client.get(f"/api/v1/projects/{first_project.json()['id']}")
    assert forbidden.status_code == 404


@pytest.mark.api
async def test_anonymous_project_access_is_rejected(client):
    response = await client.get("/api/v1/projects")

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"


@pytest.mark.api
async def test_user_can_delete_own_project(client):
    assert (await register(client)).status_code == 201
    created = await client.post("/api/v1/projects", json={"title": "Delete me"})
    assert created.status_code == 201

    deleted = await client.delete(f"/api/v1/projects/{created.json()['id']}")

    assert deleted.status_code == 204
    assert (await client.get("/api/v1/projects")).json()["items"] == []
    assert (
        await client.get(f"/api/v1/projects/{created.json()['id']}")
    ).status_code == 404


@pytest.mark.api
async def test_user_can_rename_own_project(client):
    assert (await register(client)).status_code == 201
    created = await client.post("/api/v1/projects", json={"title": "Old title"})
    assert created.status_code == 201

    renamed = await client.patch(
        f"/api/v1/projects/{created.json()['id']}",
        json={"title": "  New title  "},
    )

    assert renamed.status_code == 200
    assert renamed.json()["title"] == "New title"

import pytest

from tests.conftest import register


@pytest.mark.api
async def test_register_logs_user_in_and_persists_locale(client):
    response = await register(client, locale="zh-CN")

    assert response.status_code == 201
    assert response.json()["email"] == "creator@example.com"
    assert response.json()["locale"] == "zh-CN"
    assert "password" not in response.text
    assert response.cookies.get("videoagent_session")

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "creator@example.com"


@pytest.mark.api
async def test_duplicate_email_is_rejected_without_disclosing_hash(client):
    first = await register(client)
    assert first.status_code == 201

    second = await register(client)
    assert second.status_code == 409
    assert second.json()["error"]["code"] == "EMAIL_ALREADY_REGISTERED"


@pytest.mark.api
async def test_logout_revokes_session(client):
    assert (await register(client)).status_code == 201
    assert (await client.post("/api/v1/auth/logout")).status_code == 204
    assert (await client.get("/api/v1/auth/me")).status_code == 401


@pytest.mark.api
async def test_user_can_update_supported_locale(client):
    assert (await register(client)).status_code == 201

    response = await client.patch("/api/v1/auth/me", json={"locale": "zh-CN"})

    assert response.status_code == 200
    assert response.json()["locale"] == "zh-CN"


@pytest.mark.api
async def test_unsupported_locale_is_rejected(client):
    response = await register(client, locale="fr")

    assert response.status_code == 422

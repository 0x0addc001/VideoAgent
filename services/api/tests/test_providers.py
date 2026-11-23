import sys
from pathlib import Path

import pytest

from tests.conftest import register
from videoagent.config import ExtraModel
from videoagent.providers.oauth import OAuthTokens
from videoagent.providers.pippit import PippitVideoProvider

FAKE_CLI = Path(__file__).parent / "fixtures" / "fake_pippit_cli.py"


def fake_provider() -> PippitVideoProvider:
    return PippitVideoProvider(command=(sys.executable, str(FAKE_CLI)))


@pytest.mark.api
async def test_pippit_status_is_server_scoped(app, client):
    assert (await register(client)).status_code == 201
    app.state.video_provider = fake_provider()

    response = await client.get("/api/v1/providers/pippit")

    assert response.status_code == 200
    assert response.json() == {
        "provider": "pippit",
        "connected": True,
        "scope": "server",
    }


@pytest.mark.api
async def test_pippit_credit_balance_is_read_from_cli(app, client):
    assert (await register(client)).status_code == 201
    app.state.video_provider = fake_provider()

    response = await client.get("/api/v1/providers/pippit/credits")

    assert response.status_code == 200
    assert response.json() == {
        "provider": "pippit",
        "connected": True,
        "credits": 42,
    }


@pytest.mark.api
async def test_model_catalogue_lists_every_provider_without_auth(client):
    response = await client.get("/api/v1/providers/models")

    assert response.status_code == 200
    items = response.json()["items"]
    providers = {item["provider"] for item in items}
    assert providers == {"kling", "pippit", "wanx"}
    wanx = [item for item in items if item["provider"] == "wanx" and item["kind"] == "video"]
    assert [item["model"] for item in wanx] == [
        "wan2.6-t2v",
        "wan2.7-t2v",
        "wan3.0-video-prime",
    ]
    assert all(item["display"].startswith(item["provider"].title() + "/") for item in items)


@pytest.mark.api
async def test_model_catalogue_applies_operator_overrides(app, client):
    app.state.settings.extra_models = [
        ExtraModel(provider="wanx", model="wan2.2-t2v-plus", label="Wan 2.2 Plus")
    ]
    app.state.settings.disabled_models = ["wan3.0-video-prime"]

    response = await client.get("/api/v1/providers/models")

    models = {(item["provider"], item["model"]) for item in response.json()["items"]}
    assert ("wanx", "wan2.2-t2v-plus") in models
    assert ("wanx", "wan3.0-video-prime") not in models


class FakeKlingGateway:
    async def register_client(self, *, redirect_uri, scopes):
        del redirect_uri, scopes
        return "client-test"

    def authorization_url(
        self, *, client_id, redirect_uri, state, code_challenge, scopes, resource
    ):
        del client_id, redirect_uri, code_challenge, scopes, resource
        return f"https://kling.example/authorize?state={state}"

    async def exchange_code(self, *, code, client_id, redirect_uri, code_verifier, resource):
        del code, client_id, redirect_uri, code_verifier, resource
        return OAuthTokens(
            access_token="access-test",
            refresh_token="refresh-test",
            expires_in=3600,
        )


@pytest.mark.api
async def test_kling_oauth_connects_and_disconnects(app, client):
    from urllib.parse import parse_qs, urlparse

    assert (await register(client)).status_code == 201
    app.state.kling_gateway = FakeKlingGateway()

    connect = await client.get(
        "/api/v1/providers/kling/connect",
        follow_redirects=False,
    )
    assert connect.status_code == 200
    state = parse_qs(urlparse(connect.json()["authorization_url"]).query)["state"][0]

    callback = await client.get(
        f"/api/v1/providers/kling/callback?code=code-1&state={state}",
        follow_redirects=False,
    )
    assert callback.status_code == 303
    assert "kling=connected" in callback.headers["location"]

    status = await client.get("/api/v1/providers/kling")
    assert status.json()["connected"] is True

    replay = await client.get(
        f"/api/v1/providers/kling/callback?code=code-1&state={state}",
        follow_redirects=False,
    )
    assert replay.status_code == 400

    disconnect = await client.delete("/api/v1/providers/kling")
    assert disconnect.status_code == 204
    assert (await client.get("/api/v1/providers/kling")).json()["connected"] is False

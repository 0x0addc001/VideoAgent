from collections.abc import AsyncIterator
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select

from tests.conftest import register
from videoagent.config import Settings
from videoagent.main import create_app
from videoagent.models import ProviderConnection
from videoagent.providers.oauth import KlingOAuthGateway, OAuthTokens


class FakeKlingOAuthGateway(KlingOAuthGateway):
    def __init__(self) -> None:
        self.exchanged_codes: list[str] = []

    async def register_client(self, *, redirect_uri: str, scopes: list[str]) -> str:
        assert redirect_uri.endswith("/api/v1/providers/kling/callback")
        assert "generation.create" in scopes
        return "test-client-id"

    def authorization_url(
        self,
        *,
        client_id: str,
        redirect_uri: str,
        state: str,
        code_challenge: str,
        scopes: list[str],
        resource: str,
    ) -> str:
        assert client_id == "test-client-id"
        assert code_challenge
        return (
            "https://kling.example/authorize"
            f"?state={state}&redirect_uri={redirect_uri}&resource={resource}"
        )

    async def exchange_code(
        self,
        *,
        code: str,
        client_id: str,
        redirect_uri: str,
        code_verifier: str,
        resource: str,
    ) -> OAuthTokens:
        assert client_id == "test-client-id"
        assert code_verifier
        assert resource == "https://kling.ai/mcp"
        self.exchanged_codes.append(code)
        return OAuthTokens(
            access_token="access-token-secret",
            refresh_token="refresh-token-secret",
            expires_in=3600,
            token_type="Bearer",
        )


@pytest.fixture
async def oauth_context(
    tmp_path: Path,
) -> AsyncIterator[tuple[AsyncClient, object, FakeKlingOAuthGateway]]:
    settings = Settings(
        database_url=f"sqlite+aiosqlite:///{(tmp_path / 'oauth.db').as_posix()}",
        cookie_secure=False,
        session_secret="test-session-secret-at-least-32-bytes",
        token_encryption_key="test-token-key-32-bytes-long!!!!!!",
    )
    gateway = FakeKlingOAuthGateway()
    app = create_app(settings, kling_oauth=gateway)
    async with (
        app.router.lifespan_context(app),
        AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
            follow_redirects=False,
        ) as client,
    ):
        yield client, app, gateway


@pytest.mark.api
async def test_kling_oauth_stores_encrypted_tokens(oauth_context):
    client, app, gateway = oauth_context
    assert (await register(client, locale="zh-CN")).status_code == 201

    connect = await client.post("/api/v1/providers/kling/connect")
    assert connect.status_code == 200
    authorization_url = connect.json()["authorization_url"]
    state = parse_qs(urlparse(authorization_url).query)["state"][0]

    callback = await client.get(
        "/api/v1/providers/kling/callback",
        params={"state": state, "code": "authorization-code"},
    )
    assert callback.status_code == 302
    assert callback.headers["location"].endswith("/zh-CN/projects?kling=connected")
    assert gateway.exchanged_codes == ["authorization-code"]

    status = await client.get("/api/v1/providers/kling")
    assert status.status_code == 200
    assert status.json()["connected"] is True

    async with app.state.database.session() as session:
        connection = (await session.execute(select(ProviderConnection))).scalar_one()
        assert "access-token-secret" not in connection.access_token_encrypted
        assert "refresh-token-secret" not in connection.refresh_token_encrypted


@pytest.mark.api
async def test_kling_oauth_rejects_invalid_state(oauth_context):
    client, _, _ = oauth_context
    assert (await register(client)).status_code == 201

    response = await client.get(
        "/api/v1/providers/kling/callback",
        params={"state": "invalid-state", "code": "code"},
    )

    assert response.status_code == 302
    assert "kling=invalid_state" in response.headers["location"]


@pytest.mark.api
async def test_user_can_disconnect_kling(oauth_context):
    client, _, _ = oauth_context
    assert (await register(client)).status_code == 201

    response = await client.delete("/api/v1/providers/kling")

    assert response.status_code == 204
    status = await client.get("/api/v1/providers/kling")
    assert status.json()["connected"] is False

from httpx import ASGITransport, AsyncClient

from tests.conftest import register
from videoagent.config import Settings
from videoagent.main import create_app


async def test_rejects_cross_origin_write_requests(client):
    response = await client.post(
        "/api/v1/auth/register",
        headers={"Origin": "https://evil.example"},
        json={
            "email": "attacker@example.com",
            "password": "Correct-Horse-Battery9",
            "locale": "en",
        },
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CSRF_ORIGIN_REJECTED"


async def test_rate_limits_auth_requests(tmp_path):
    settings = Settings(
        database_url=f"sqlite+aiosqlite:///{(tmp_path / 'rate.db').as_posix()}",
        cookie_secure=False,
        session_secret="test-session-secret-at-least-32-bytes",
        token_encryption_key="test-token-key-32-bytes-long!!!!!!",
        video_provider="mock",
        media_dir=str(tmp_path / "media"),
        auth_rate_limit_per_minute=1,
    )
    application = create_app(settings)
    async with application.router.lifespan_context(application):
        transport = ASGITransport(app=application)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            first = await register(client, email="first@example.com")
            second = await register(client, email="second@example.com")

    assert first.status_code == 201
    assert second.status_code == 429
    assert second.json()["error"]["code"] == "RATE_LIMITED"

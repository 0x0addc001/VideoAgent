from collections.abc import AsyncIterator
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from videoagent.config import Settings
from videoagent.main import create_app


@pytest.fixture
async def app(tmp_path: Path):
    settings = Settings(
        database_url=f"sqlite+aiosqlite:///{(tmp_path / 'test.db').as_posix()}",
        cookie_secure=False,
        session_secret="test-session-secret-at-least-32-bytes",
        token_encryption_key="test-token-key-32-bytes-long!!!!!!",
    )
    application = create_app(settings)
    async with application.router.lifespan_context(application):
        yield application


@pytest.fixture
async def client(app) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client


async def register(
    client: AsyncClient,
    *,
    email: str = "creator@example.com",
    password: str = "Correct-Horse-Battery9",
    locale: str = "en",
):
    return await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "locale": locale},
    )

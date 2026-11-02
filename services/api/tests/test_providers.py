import sys
from pathlib import Path

import pytest

from tests.conftest import register
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

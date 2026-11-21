import sys
from pathlib import Path

import pytest

from tests.conftest import register
from videoagent.config import ExtraModel
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
    wanx = [item for item in items if item["provider"] == "wanx"]
    assert [item["model"] for item in wanx] == ["wan2.6-t2v", "wan3.0-video-prime"]
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

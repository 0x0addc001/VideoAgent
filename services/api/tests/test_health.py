import pytest


@pytest.mark.api
async def test_health_reports_service_and_dependencies(client):
    response = await client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "videoagent-api"
    assert body["dependencies"]["database"] == "ok"

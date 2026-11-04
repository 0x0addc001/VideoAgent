import pytest

from tests.conftest import register
from videoagent.api.generation import selected_model
from videoagent.providers.base import (
    CostEstimate,
    GenerationRequest,
    ProviderJob,
)


class DelayedProvider:
    name = "delayed"

    def __init__(self) -> None:
        self.status_calls = 0

    async def estimate(self, request: GenerationRequest) -> CostEstimate:
        return CostEstimate(
            provider=self.name,
            credits=request.duration_seconds,
            duration_seconds=request.duration_seconds,
        )

    async def submit(self, request: GenerationRequest) -> ProviderJob:
        return ProviderJob(
            provider=self.name,
            task_id="delayed-task-1",
            status="submitted",
        )

    async def status(self, task_id: str) -> ProviderJob:
        self.status_calls += 1
        if self.status_calls == 1:
            return ProviderJob(
                provider=self.name,
                task_id=task_id,
                status="running",
            )
        return ProviderJob(
            provider=self.name,
            task_id=task_id,
            status="succeeded",
            result_url="https://media.example.com/delayed.mp4",
        )


async def project_with_shot(client) -> tuple[dict, dict]:
    assert (await register(client)).status_code == 201
    project_response = await client.post(
        "/api/v1/projects",
        json={"title": "Generation project", "brief": "A five-second product film"},
    )
    project = project_response.json()
    storyboard_response = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "A bottle spinning in warm light",
                    "prompt_en": "A glass bottle spinning in warm cinematic light",
                    "prompt_zh": "玻璃瓶在温暖电影光线下旋转",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                }
            ]
        },
    )
    assert storyboard_response.status_code == 200
    return project, storyboard_response.json()["shots"][0]


@pytest.mark.api
async def test_generation_rejects_missing_approval(client):
    project, shot = await project_with_shot(client)

    response = await client.post(
        f"/api/v1/shots/{shot['id']}/generate",
        headers={"Idempotency-Key": "approval-test"},
        json={"approved": False},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "GENERATION_APPROVAL_REQUIRED"


@pytest.mark.api
async def test_generation_submits_mock_provider_and_persists_job(client):
    project, shot = await project_with_shot(client)

    response = await client.post(
        f"/api/v1/shots/{shot['id']}/generate",
        headers={"Idempotency-Key": "generate-once"},
        json={"approved": True},
    )

    assert response.status_code == 201
    job = response.json()
    assert job["project_id"] == project["id"]
    assert job["shot_id"] == shot["id"]
    assert job["provider"] == "mock"
    assert job["status"] == "submitted"
    assert job["provider_task_id"].startswith("mock-")
    assert job["result_url"] is None

    fetched = await client.get(f"/api/v1/jobs/{job['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["status"] == "succeeded"
    assert fetched.json()["result_url"].startswith("/api/v1/assets/")

    assets = await client.get(f"/api/v1/projects/{project['id']}/assets")
    assert assets.status_code == 200
    generated = [item for item in assets.json()["items"] if item["kind"] == "generated"]
    assert len(generated) == 1
    assert generated[0]["shot_id"] == shot["id"]
    content = await client.get(generated[0]["content_url"])
    assert content.status_code == 200
    assert content.headers["content-type"].startswith("video/mp4")

    credits = await client.get("/api/v1/credits")
    assert credits.json()["credits"] == 95


@pytest.mark.api
async def test_same_idempotency_key_returns_existing_job(client):
    _, shot = await project_with_shot(client)
    headers = {"Idempotency-Key": "same-generation"}
    payload = {"approved": True}

    first = await client.post(
        f"/api/v1/shots/{shot['id']}/generate",
        headers=headers,
        json=payload,
    )
    second = await client.post(
        f"/api/v1/shots/{shot['id']}/generate",
        headers=headers,
        json=payload,
    )

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]


@pytest.mark.api
async def test_generation_estimate_returns_provider_cost(client):
    _, shot = await project_with_shot(client)

    response = await client.post(f"/api/v1/shots/{shot['id']}/estimate")

    assert response.status_code == 200
    assert response.json() == {
        "provider": "mock",
        "credits": 5,
        "duration_seconds": 5,
    }


@pytest.mark.unit
def test_pippit_model_label_maps_to_cli_model_id():
    project = type(
        "Project",
        (),
        {"brief": "Production settings: · Pippit/Seedance 2.5 · 9:16"},
    )()

    assert selected_model(project) == ("pippit", "Seedance_2.5")


@pytest.mark.api
async def test_polling_refreshes_running_job_and_completes_shot(app, client):
    app.state.video_provider = DelayedProvider()
    _, shot = await project_with_shot(client)

    created = await client.post(
        f"/api/v1/shots/{shot['id']}/generate",
        headers={"Idempotency-Key": "delayed-generation"},
        json={"approved": True},
    )
    assert created.status_code == 201
    job = created.json()
    assert job["status"] == "submitted"

    running = await client.get(f"/api/v1/jobs/{job['id']}")
    assert running.status_code == 200
    assert running.json()["status"] == "running"

    completed = await client.get(f"/api/v1/jobs/{job['id']}")
    assert completed.status_code == 200
    assert completed.json()["status"] == "succeeded"
    assert completed.json()["result_url"].endswith("delayed.mp4")

    storyboard = await client.get(f"/api/v1/projects/{job['project_id']}/storyboard")
    assert storyboard.json()["shots"][0]["status"] == "completed"

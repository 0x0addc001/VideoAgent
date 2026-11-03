import pytest

from tests.conftest import register


async def create_storyboard(client, *, mixed_ratios: bool = False) -> str:
    assert (await register(client)).status_code == 201
    project = (
        await client.post(
            "/api/v1/projects",
            json={"title": "Review project", "brief": "A concise product story"},
        )
    ).json()
    response = await client.put(
        f"/api/v1/projects/{project['id']}/storyboard",
        json={
            "shots": [
                {
                    "description": "Opening",
                    "prompt_en": "A cinematic opening shot in a dark studio with warm rim light",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                },
                {
                    "description": "Product",
                    "prompt_en": "A detailed product macro shot with shallow depth of field",
                    "duration_seconds": 4,
                    "aspect_ratio": "9:16" if mixed_ratios else "16:9",
                    "generation_mode": "text_to_video",
                },
                {
                    "description": "Close",
                    "prompt_en": "A clean hero closing shot with controlled camera movement",
                    "duration_seconds": 5,
                    "aspect_ratio": "1:1" if mixed_ratios else "16:9",
                    "generation_mode": "text_to_video",
                },
            ]
        },
    )
    assert response.status_code == 200
    return project["id"]


@pytest.mark.api
async def test_project_evaluation_returns_metrics_and_suggestions(client):
    project_id = await create_storyboard(client)

    response = await client.post(f"/api/v1/projects/{project_id}/evaluate")

    assert response.status_code == 200
    body = response.json()
    assert 0 <= body["overall_score"] <= 100
    assert {metric["key"] for metric in body["metrics"]} == {
        "consistency",
        "coverage",
        "clarity",
        "pacing",
    }
    assert all(0 <= metric["score"] <= 100 for metric in body["metrics"])
    assert body["suggestions"]


@pytest.mark.api
async def test_inconsistent_ratios_lower_consistency_score(client):
    project_id = await create_storyboard(client, mixed_ratios=True)

    response = await client.post(f"/api/v1/projects/{project_id}/evaluate")

    assert response.status_code == 200
    consistency = next(
        metric for metric in response.json()["metrics"] if metric["key"] == "consistency"
    )
    assert consistency["score"] < 100
    assert "UNIFY_ASPECT_RATIO" in {
        suggestion["code"] for suggestion in response.json()["suggestions"]
    }

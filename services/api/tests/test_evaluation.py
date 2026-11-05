from pathlib import Path
from uuid import uuid4

import pytest

from tests.conftest import register
from videoagent.config import Settings
from videoagent.schemas import VisualReviewCommand, VisualReviewMetric
from videoagent.services import visual_review

POSTER = (
    Path(__file__).resolve().parents[3]
    / "apps"
    / "web"
    / "public"
    / "media"
    / "vlog-hero-poster.jpg"
)


async def create_storyboard(client) -> str:
    assert (await register(client)).status_code == 201
    project = (
        await client.post(
            "/api/v1/projects",
            json={"title": "Progress project", "brief": "A concise product story"},
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
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                },
                {
                    "description": "Close",
                    "prompt_en": "A clean hero closing shot with controlled camera movement",
                    "duration_seconds": 5,
                    "aspect_ratio": "16:9",
                    "generation_mode": "text_to_video",
                },
            ]
        },
    )
    assert response.status_code == 200
    return project["id"]


@pytest.mark.api
async def test_project_progress_tracks_storyboard_and_workflow_state(client):
    project_id = await create_storyboard(client)

    response = await client.get(f"/api/v1/projects/{project_id}/progress")

    assert response.status_code == 200
    body = response.json()
    assert body["percent"] == 30
    assert body["workflow_stage"] == "concept"
    assert body["workflow_status"] == "awaiting_approval"
    assert body["total_shots"] == 3
    assert body["completed_shots"] == 0


@pytest.mark.api
async def test_visual_review_models_are_empty_without_a_configured_evaluator(client):
    project_id = await create_storyboard(client)

    response = await client.get(f"/api/v1/projects/{project_id}/visual-review/models")

    assert response.status_code == 200
    assert response.json() == {"items": []}


@pytest.mark.api
async def test_visual_review_rejects_non_final_cut_assets(client):
    project_id = await create_storyboard(client)

    response = await client.post(
        f"/api/v1/projects/{project_id}/visual-review",
        json={
            "asset_id": "00000000-0000-0000-0000-000000000099",
            "model": "vision-model",
            "metrics": ["character_consistency", "style_consistency"],
        },
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "FINAL_CUT_NOT_FOUND"


@pytest.mark.unit
async def test_visual_review_aggregates_requested_model_metrics(monkeypatch):
    async def fake_frames(*args, **kwargs):
        del args, kwargs
        return [POSTER]

    async def fake_request(*, command, **kwargs):
        del kwargs
        return visual_review.VisualReviewAnalysis(
            metrics=[
                VisualReviewMetric(
                    key=metric,
                    score=90 if metric == "character_consistency" else 80,
                    rationale=f"Visible evidence supports {metric}.",
                )
                for metric in command.metrics
            ],
            summary="The final cut is visually coherent.",
        )

    monkeypatch.setattr(visual_review, "_extract_frames", fake_frames)
    monkeypatch.setattr(visual_review, "_request_visual_review", fake_request)
    settings = Settings(
        vision_base_url="https://vision.example.com/v1",
        vision_api_key="test-key",
        vision_models=["vision-model"],
    )

    result = await visual_review.evaluate_final_cut(
        asset_id=uuid4(),
        video_path=POSTER,
        command=VisualReviewCommand(
            asset_id=uuid4(),
            model="vision-model",
            metrics=["character_consistency", "style_consistency"],
        ),
        settings=settings,
    )

    assert result.overall_score == 85
    assert result.frame_count == 1
    assert [metric.key for metric in result.metrics] == [
        "character_consistency",
        "style_consistency",
    ]

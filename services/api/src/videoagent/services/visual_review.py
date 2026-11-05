import asyncio
import base64
import json
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import UUID

import httpx
from pydantic import BaseModel, Field

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.schemas import (
    VisualReviewCommand,
    VisualReviewMetric,
    VisualReviewMetricKey,
    VisualReviewRead,
)

METRIC_GUIDANCE: dict[VisualReviewMetricKey, str] = {
    "character_consistency": (
        "Identity, face, hair, costume, body proportions, and screen continuity "
        "for recurring people."
    ),
    "style_consistency": (
        "Color, lighting, texture, lens language, art direction, and visual "
        "treatment across frames."
    ),
    "prompt_alignment": (
        "Whether visible subjects, actions, environments, and camera intent match "
        "the approved shot prompts."
    ),
    "temporal_stability": (
        "Flicker, warping, anatomy drift, background instability, and continuity "
        "between adjacent frames and shots."
    ),
}


class VisualReviewAnalysis(BaseModel):
    metrics: list[VisualReviewMetric]
    summary: str = Field(min_length=1, max_length=2000)


async def _extract_frames(
    video: Path,
    output_dir: Path,
    settings: Settings,
) -> list[Path]:
    pattern = output_dir / "frame-%02d.jpg"
    process = await asyncio.create_subprocess_exec(
        settings.ffmpeg_command,
        "-y",
        "-i",
        str(video),
        "-vf",
        "fps=1/3,scale=768:-2",
        "-frames:v",
        "4",
        "-q:v",
        "3",
        str(pattern),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(process.communicate(), timeout=90)
    except TimeoutError:
        process.kill()
        await process.communicate()
        raise AppError(
            status_code=504,
            code="FRAME_EXTRACTION_TIMEOUT",
            message="Visual review frame extraction timed out.",
        ) from None
    if process.returncode != 0:
        raise AppError(
            status_code=422,
            code="FRAME_EXTRACTION_FAILED",
            message=stderr.decode("utf-8", errors="replace")[-1200:],
        )
    frames = await asyncio.to_thread(lambda: sorted(output_dir.glob("frame-*.jpg")))
    if not frames:
        raise AppError(
            status_code=422,
            code="FRAME_EXTRACTION_FAILED",
            message="No frames could be extracted from the final cut.",
        )
    return frames


async def evaluate_final_cut(
    *,
    asset_id: UUID,
    video_path: Path,
    command: VisualReviewCommand,
    settings: Settings,
) -> VisualReviewRead:
    api_key = settings.vision_api_key
    base_url = settings.vision_base_url
    if not api_key or not base_url or command.model not in settings.vision_models:
        raise AppError(
            status_code=503,
            code="VISUAL_REVIEW_UNAVAILABLE",
            message="No configured visual evaluator is available for this model.",
        )

    with tempfile.TemporaryDirectory(prefix="videoagent-review-") as temporary:
        frames = await _extract_frames(video_path, Path(temporary), settings)
        image_parts: list[dict[str, Any]] = [
            {
                "type": "image_url",
                "image_url": {
                    "url": "data:image/jpeg;base64,"
                    + base64.b64encode(frame.read_bytes()).decode("ascii")
                },
            }
            for frame in frames
        ]
        metric_lines = "\n".join(
            f"- {metric}: {METRIC_GUIDANCE[metric]}" for metric in command.metrics
        )
        response = await _request_visual_review(
            command=command,
            metric_lines=metric_lines,
            image_parts=image_parts,
            settings=settings,
            base_url=base_url,
            api_key=api_key,
        )

    selected = {metric.key for metric in response.metrics}
    if selected != set(command.metrics):
        raise AppError(
            status_code=502,
            code="VISUAL_REVIEW_INVALID",
            message="The visual evaluator returned an incomplete metric set.",
        )
    overall = round(sum(metric.score for metric in response.metrics) / len(response.metrics))
    return VisualReviewRead(
        asset_id=asset_id,
        model=command.model,
        overall_score=overall,
        metrics=response.metrics,
        summary=response.summary,
        frame_count=len(frames),
        updated_at=datetime.now(UTC),
    )


async def _request_visual_review(
    *,
    command: VisualReviewCommand,
    metric_lines: str,
    image_parts: list[dict[str, Any]],
    settings: Settings,
    base_url: str,
    api_key: str,
) -> VisualReviewAnalysis:
    schema = VisualReviewAnalysis.model_json_schema()
    prompt = (
        "Evaluate only the visible evidence in these representative final-cut "
        "frames. Score each requested metric from 0 (fail) to 100 (excellent). "
        "Be conservative when evidence is insufficient. Return one JSON object "
        f"matching this schema:\n{json.dumps(schema)}\nMetrics:\n{metric_lines}"
    )
    payload = {
        "model": command.model,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt}, *image_parts],
            }
        ],
        "response_format": {"type": "json_object"},
    }
    url = base_url.rstrip("/")
    if not url.endswith("/chat/completions"):
        url = f"{url}/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=settings.vision_timeout_seconds) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
    except Exception as exc:
        raise AppError(
            status_code=502,
            code="VISUAL_REVIEW_FAILED",
            message=f"The visual evaluator failed: {str(exc)[:800]}",
        ) from exc
    if not isinstance(content, str):
        raise AppError(
            status_code=502,
            code="VISUAL_REVIEW_INVALID",
            message="The visual evaluator returned a non-text response.",
        )
    start = content.find("{")
    end = content.rfind("}")
    if start < 0 or end < start:
        raise AppError(
            status_code=502,
            code="VISUAL_REVIEW_INVALID",
            message="The visual evaluator did not return a JSON object.",
        )
    return VisualReviewAnalysis.model_validate_json(content[start : end + 1])

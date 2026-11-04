from collections.abc import Sequence
from statistics import pstdev

from videoagent.models import Shot
from videoagent.schemas import (
    EvaluationMetric,
    EvaluationRead,
    EvaluationSuggestion,
)


def _coverage_score(shots: Sequence[Shot]) -> int:
    if not shots:
        return 0
    if len(shots) == 1:
        return 45
    if len(shots) == 2:
        return 75
    return 100


def _consistency_score(shots: Sequence[Shot]) -> int:
    if not shots:
        return 0
    ratio_penalty = max(0, len({shot.aspect_ratio for shot in shots}) - 1) * 30
    duration_spread = pstdev(shot.duration_seconds for shot in shots)
    duration_penalty = min(30, round(duration_spread * 10))
    return max(0, 100 - ratio_penalty - duration_penalty)


def _clarity_score(shots: Sequence[Shot]) -> int:
    if not shots:
        return 0
    scores: list[int] = []
    for shot in shots:
        prompt = shot.prompt_en.strip()
        word_count = len(prompt.split())
        if word_count < 6:
            scores.append(45)
        elif word_count < 12:
            scores.append(78)
        elif word_count <= 45:
            scores.append(100)
        else:
            scores.append(72)
    return round(sum(scores) / len(scores))


def _pacing_score(shots: Sequence[Shot]) -> int:
    if not shots:
        return 0
    durations = [shot.duration_seconds for shot in shots]
    average = sum(durations) / len(durations)
    if 3 <= average <= 7 and max(durations) <= 10:
        return 100
    if average <= 10:
        return 82
    return max(35, round(100 - abs(average - 5) * 12))


def evaluate_storyboard(shots: Sequence[Shot]) -> EvaluationRead:
    scores = {
        "consistency": _consistency_score(shots),
        "coverage": _coverage_score(shots),
        "clarity": _clarity_score(shots),
        "pacing": _pacing_score(shots),
    }
    suggestions: list[EvaluationSuggestion] = []
    if scores["coverage"] < 80:
        suggestions.append(EvaluationSuggestion(code="ADD_SHOTS", severity="high"))
    if scores["consistency"] < 80:
        suggestions.append(EvaluationSuggestion(code="UNIFY_ASPECT_RATIO", severity="high"))
    if scores["clarity"] < 85:
        suggestions.append(EvaluationSuggestion(code="IMPROVE_PROMPTS", severity="medium"))
    if scores["pacing"] < 85:
        suggestions.append(EvaluationSuggestion(code="BALANCE_PACING", severity="medium"))
    if not suggestions:
        suggestions.append(EvaluationSuggestion(code="READY", severity="low"))

    overall = round(
        scores["consistency"] * 0.3
        + scores["coverage"] * 0.2
        + scores["clarity"] * 0.3
        + scores["pacing"] * 0.2
    )
    return EvaluationRead(
        overall_score=overall,
        metrics=[EvaluationMetric(key=key, score=score) for key, score in scores.items()],
        suggestions=suggestions,
    )

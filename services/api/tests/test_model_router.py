import pytest

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.services.model_router import (
    RoutingRequest,
    provider_available,
    recommend_models,
)


def wanx_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "video_provider": "wanx",
        "wanx_api_key": "sk-test",
    }
    values.update(overrides)
    return Settings(**values)


@pytest.mark.unit
def test_duration_filters_models_that_cannot_reach_it():
    candidates = recommend_models(
        settings=wanx_settings(),
        request=RoutingRequest(duration_seconds=20),
    )

    assert [candidate.option.model for candidate in candidates] == ["wan3.0-video-prime"]


@pytest.mark.unit
def test_reference_count_filters_models_without_enough_slots():
    candidates = recommend_models(
        settings=wanx_settings(),
        request=RoutingRequest(
            generation_mode="image_to_video",
            reference_image_count=2,
        ),
    )

    assert [candidate.option.model for candidate in candidates] == ["wan3.0-video-prime"]


@pytest.mark.unit
def test_audio_requirement_filters_models_without_audio():
    candidates = recommend_models(
        settings=wanx_settings(),
        request=RoutingRequest(audio_enabled=True),
    )

    assert [candidate.option.model for candidate in candidates] == ["wan3.0-video-prime"]


@pytest.mark.unit
def test_unsupported_ratio_reports_no_candidate_with_a_clear_error():
    with pytest.raises(AppError) as excinfo:
        recommend_models(
            settings=wanx_settings(),
            request=RoutingRequest(aspect_ratio="21:9"),
        )

    assert excinfo.value.code == "NO_MODEL_MATCHES_OPTIONS"
    assert "21:9" in excinfo.value.message


@pytest.mark.unit
def test_budget_preference_prefers_the_cheapest_native_ratio_model():
    candidates = recommend_models(
        settings=wanx_settings(),
        request=RoutingRequest(aspect_ratio="9:16", preference="budget"),
    )

    assert candidates[0].option.credits_per_second == 1
    assert "cheapest" in candidates[0].reasons
    assert "ratio_native" in candidates[0].reasons


@pytest.mark.unit
def test_quality_preference_prefers_the_highest_tier():
    candidates = recommend_models(
        settings=wanx_settings(),
        request=RoutingRequest(aspect_ratio="9:16", preference="quality"),
    )

    assert candidates[0].option.quality_tier == 3
    assert "highest_quality" in candidates[0].reasons


@pytest.mark.unit
def test_unavailable_provider_models_are_filtered_out():
    with pytest.raises(AppError):
        recommend_models(
            settings=wanx_settings(wanx_api_key=None),
            request=RoutingRequest(),
        )


@pytest.mark.unit
def test_mock_provider_routes_to_the_mock_model():
    candidates = recommend_models(
        settings=Settings(video_provider="mock"),
        request=RoutingRequest(aspect_ratio="21:9", audio_enabled=True),
    )

    assert candidates[0].option.provider == "mock"
    assert candidates[0].reasons == ("mock_provider",)


@pytest.mark.unit
def test_provider_availability_reads_configuration(monkeypatch):
    settings = wanx_settings()

    assert provider_available("wanx", settings) is True
    assert provider_available("unknown", settings) is False

    monkeypatch.setattr("shutil.which", lambda command: None)
    assert provider_available("pippit", settings) is False
    monkeypatch.setattr("shutil.which", lambda command: "/usr/local/bin/tool")
    assert provider_available("pippit", settings) is True

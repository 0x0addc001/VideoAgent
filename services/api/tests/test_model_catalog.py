import pytest

from videoagent.config import ExtraModel, Settings
from videoagent.services.model_catalog import (
    DEFAULT_MODELS,
    model_catalog,
    resolve_model_id,
)


@pytest.mark.unit
def test_catalog_covers_all_providers_and_kinds():
    providers = {option.provider for option in DEFAULT_MODELS}
    kinds = {option.kind for option in DEFAULT_MODELS}

    assert providers == {"kling", "pippit", "wanx"}
    assert kinds == {"video", "image"}


@pytest.mark.unit
def test_extra_and_disabled_models_shape_the_catalog():
    settings = Settings(
        extra_models=[ExtraModel(provider="wanx", model="wan2.2-t2v-plus", label="Wan 2.2 Plus")],
        disabled_models=["kling-video-v2_5"],
    )

    catalog = model_catalog(settings)
    models = {option.model for option in catalog}

    assert "wan2.2-t2v-plus" in models
    assert "kling-video-v2_5" not in models


@pytest.mark.unit
def test_disabled_models_accept_display_labels():
    settings = Settings(disabled_models=["Wanx/Wan 3.0 Prime"])

    models = {option.model for option in model_catalog(settings)}

    assert "wan3.0-video-prime" not in models


@pytest.mark.unit
def test_resolve_model_id_maps_labels_ids_and_display_names():
    assert resolve_model_id("wanx", "Wan 2.6") == "wan2.6-t2v"
    assert resolve_model_id("wanx", "wan2.6-t2v") == "wan2.6-t2v"
    assert resolve_model_id("kling", "Kling/Kling Video 4.0") == "kling-video-v4_0"
    assert resolve_model_id("pippit", "Seedance 2.5") == "Seedance_2.5"


@pytest.mark.unit
def test_unknown_model_falls_back_to_the_raw_value():
    assert resolve_model_id("wanx", "wan-future") == "wan-future"

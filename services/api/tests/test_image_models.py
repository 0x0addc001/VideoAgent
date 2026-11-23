import pytest

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.schemas import ModelSelection
from videoagent.services.image_models import resolve_image_model


@pytest.mark.unit
def test_image_model_defaults_to_kling():
    provider, model = resolve_image_model(None, Settings())

    assert provider == "kling"
    assert model == "kling-image-v3_0"


@pytest.mark.unit
def test_wanx_image_model_resolves_to_the_wanx_provider():
    provider, model = resolve_image_model(
        ModelSelection(provider="wanx", model="wan2.7-image"),
        Settings(),
    )

    assert provider == "wanx"
    assert model == "wan2.7-image"


@pytest.mark.unit
def test_provider_mismatch_is_rejected():
    with pytest.raises(AppError) as excinfo:
        resolve_image_model(
            ModelSelection(provider="kling", model="wan2.7-image"),
            Settings(),
        )

    assert excinfo.value.code == "IMAGE_PROVIDER_UNSUPPORTED"


@pytest.mark.unit
def test_unknown_image_model_is_rejected():
    with pytest.raises(AppError) as excinfo:
        resolve_image_model(ModelSelection(model="not-a-model"), Settings())

    assert excinfo.value.code == "IMAGE_MODEL_UNSUPPORTED"

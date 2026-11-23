import pytest

from videoagent.services.cli_model_discovery import (
    parse_kling_models,
    parse_pippit_models,
)


@pytest.mark.unit
def test_pippit_parser_keeps_video_models_and_skips_drafts():
    payload = {
        "models": [
            {"key": "Seedance_2.5", "name": "Seedance 2.5", "kind": "video"},
            {"key": "Seedance_2.5_draft", "name": "Seedance 2.5 Draft", "kind": "video"},
            {"key": "wan3.0", "name": "Wan 3.0", "kind": "video"},
            {"name": "智能图片V2", "kind": "image"},
        ]
    }

    options = parse_pippit_models(payload)

    assert [option.model for option in options] == ["Seedance_2.5", "wan3.0"]
    assert all(option.provider == "pippit" for option in options)
    assert all(option.kind == "video" for option in options)


@pytest.mark.unit
def test_kling_parser_maps_modes_to_kinds():
    payload = {
        "body": {
            "availableModels": {
                "text_to_video": {"models": [{"model": "kling-video-v4_0", "alias": "视频4.0"}]},
                "image_to_video": {"models": [{"model": "kling-video-v4_0"}]},
                "text_to_image": {"models": [{"model": "kling-image-v4_0", "alias": "图片4.0"}]},
                "image_to_image": {"models": [{"model": "kling-image-v4_0"}]},
            }
        }
    }

    options = {option.model: option for option in parse_kling_models(payload)}

    assert options["kling-video-v4_0"].kind == "video"
    assert options["kling-video-v4_0"].label == "视频4.0"
    assert set(options["kling-video-v4_0"].modes) == {"text_to_video", "image_to_video"}
    assert options["kling-image-v4_0"].kind == "image"
    assert options["kling-image-v4_0"].label == "图片4.0"


@pytest.mark.unit
def test_parsers_tolerate_unexpected_payloads():
    assert parse_pippit_models(None) == []
    assert parse_pippit_models({"models": "bad"}) == []
    assert parse_kling_models({"body": None}) == []

import pytest

from videoagent.services.naming import (
    PERSON_NAMES_EN,
    PERSON_NAMES_ZH,
    compact_name,
    is_generic,
    pick_character_name,
)


@pytest.mark.unit
def test_compact_name_keeps_five_cjk_characters_or_two_words():
    assert compact_name("电影感室内创作空间") == "电影感室内"
    assert compact_name("Approve outline and build script") == "Approve outline"
    assert compact_name("  雨夜，街道。 ") == "雨夜街道"


@pytest.mark.unit
def test_generic_names_are_detected():
    assert is_generic("主场景")
    assert is_generic("Primary set")
    assert is_generic("")
    assert not is_generic("周野")


@pytest.mark.unit
def test_character_names_follow_the_source_language():
    chinese = pick_character_name("故事围绕雨夜咖啡师展开")
    english = pick_character_name("A barista working the night shift")

    assert chinese in PERSON_NAMES_ZH
    assert english in PERSON_NAMES_EN

import pytest

from videoagent.services.naming import (
    character_label,
    compact_name,
    is_generic,
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
    assert character_label("故事围绕雨夜咖啡师展开") == "咖啡师"
    assert character_label("A black man working the night shift") == "black man"
    assert character_label("A quiet forest") == "Person"

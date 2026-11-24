"""Generate short, human-readable names for storyboard objects.

Names and descriptions are authored by the script/storyboard stage before any
image exists; never derive them from generated assets or thumbnails.
"""

from __future__ import annotations

import re

CJK_PATTERN = re.compile(r"[\u4e00-\u9fff]")
GENERIC_NAMES = {
    "主角",
    "主角色",
    "主场景",
    "角色",
    "场景",
    "人物",
    "lead",
    "lead character",
    "main character",
    "protagonist",
    "hero",
    "primary set",
    "main scene",
    "character",
    "scene",
}
CJK_LIMIT = 5
WORD_LIMIT = 2
CHARACTER_KEYWORDS = (
    "vlogger",
    "vlog",
    "博主",
    "up主",
    "主播",
    "旅行者",
    "游客",
    "行人",
    "黑人",
    "白人",
    "亚裔",
    "男人",
    "女人",
    "女孩",
    "男孩",
    "少年",
    "少女",
    "老人",
    "咖啡师",
    "舞者",
    "歌手",
    "学生",
    "警察",
    "医生",
    "侦探",
    "宇航员",
    "机器人",
    "演员",
    "模特",
    "运动员",
    "black man",
    "black woman",
    "woman",
    "girl",
    "boy",
    "man",
    "barista",
    "dancer",
    "singer",
    "student",
    "detective",
    "astronaut",
    "robot",
    "model",
    "athlete",
)


def compact_name(text: str, *, cjk_limit: int = CJK_LIMIT, word_limit: int = WORD_LIMIT) -> str:
    cleaned = re.sub(r"[\s，。！？、；：,.!?;:“”\"'（）()]+", " ", text or "").strip()
    if not cleaned:
        return ""
    if CJK_PATTERN.search(cleaned):
        return cleaned.replace(" ", "")[:cjk_limit]
    return " ".join(cleaned.split()[:word_limit])


def is_generic(name: str | None) -> bool:
    return not (name or "").strip() or (name or "").strip().casefold() in GENERIC_NAMES


def character_label(*texts: str) -> str:
    sample = " ".join(text for text in texts if text).casefold()
    if "vlog" in sample or "博主" in sample or "up主" in sample:
        return "博主" if CJK_PATTERN.search(sample) else "Vlogger"
    for keyword in CHARACTER_KEYWORDS:
        if keyword.casefold() in sample:
            return compact_name(keyword)
    return "人物" if CJK_PATTERN.search(sample) else "Person"


def _fallback(text: str, chinese: str, english: str) -> str:
    return chinese if CJK_PATTERN.search(text or "") else english


def sanitize_name(
    raw: str | None,
    *,
    description: str = "",
    location: str = "",
    fallback: str = "",
) -> str:
    name = (raw or "").strip()
    if not name or name.casefold() in GENERIC_NAMES:
        quoted = re.search(r"[“\"]([^”\"]{1,80})[”\"]", description or "")
        source = quoted.group(1) if quoted else (location or description)
        resolved = compact_name(source) or compact_name(description)
        return resolved or fallback or _fallback(description, "角色", "Character")
    return compact_name(name) or fallback


TIME_ALIASES = (
    ("晨光", "清晨"),
    ("清晨", "清晨"),
    ("早晨", "早晨"),
    ("上午", "上午"),
    ("正午", "正午"),
    ("午后", "午后"),
    ("白天", "白天"),
    ("黄昏", "黄昏"),
    ("傍晚", "傍晚"),
    ("夜晚", "夜晚"),
    ("夜里", "夜里"),
    ("深夜", "深夜"),
    ("黎明", "黎明"),
    ("morning", "morning"),
    ("dawn", "dawn"),
    ("dusk", "dusk"),
    ("night", "night"),
)
PLACE_ALIASES = (
    ("站台", "站台"),
    ("主干道", "街道"),
    ("街道", "街道"),
    ("胡同", "胡同"),
    ("窄巷", "巷"),
    ("巷", "巷"),
    ("门洞", "门洞"),
    ("公园", "公园"),
    ("长椅", "长椅"),
    ("室内", "室内"),
    ("屋顶", "屋顶"),
    ("天台", "天台"),
    ("咖啡店", "咖啡店"),
    ("海边", "海边"),
    ("办公室", "办公室"),
    ("地铁", "地铁"),
    ("走廊", "走廊"),
    ("楼梯", "楼梯"),
    ("车内", "车内"),
    ("street", "street"),
    ("room", "room"),
    ("rooftop", "rooftop"),
    ("cafe", "cafe"),
    ("park", "park"),
    ("beach", "beach"),
    ("office", "office"),
    ("subway", "subway"),
)


def derive_shot_name(description: str) -> str:
    text = (description or "").casefold()
    time = next((label for key, label in TIME_ALIASES if key in text), "")
    place = next((label for key, label in PLACE_ALIASES if key in text), "")
    if not time:
        time = "清晨" if "晨" in text else "白天"
    if not place:
        place = "室内"
    if CJK_PATTERN.search(time + place):
        return f"{time}{place}"
    return f"{time} {place}"

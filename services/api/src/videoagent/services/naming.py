"""Generate short, human-readable names for storyboard objects."""

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


def compact_name(text: str, *, cjk_limit: int = CJK_LIMIT, word_limit: int = WORD_LIMIT) -> str:
    cleaned = re.sub(r"[\s，。！？、；：,.!?;:“”\"'（）()]+", " ", text or "").strip()
    if not cleaned:
        return ""
    if CJK_PATTERN.search(cleaned):
        return cleaned.replace(" ", "")[:cjk_limit]
    return " ".join(cleaned.split()[:word_limit])


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

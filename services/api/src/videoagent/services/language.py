import re
from typing import Literal

CJK_PATTERN = re.compile(r"[\u3400-\u9fff]")


def detect_locale(
    *texts: str | None,
    fallback: str = "en",
) -> Literal["en", "zh-CN"]:
    for text in texts:
        if text and CJK_PATTERN.search(text):
            return "zh-CN"
    return "zh-CN" if fallback == "zh-CN" else "en"

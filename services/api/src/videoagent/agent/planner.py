import re
from typing import Literal, Protocol

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from videoagent.config import Settings
from videoagent.schemas import ShotInput, StoryboardReplace


class StoryboardPlan(BaseModel):
    assistant_message: str
    storyboard: StoryboardReplace


class PlanningContext(BaseModel):
    locale: Literal["en", "zh-CN"]
    project_title: str
    project_brief: str
    user_message: str


class StoryboardPlanner(Protocol):
    async def plan(self, context: PlanningContext) -> StoryboardPlan: ...


class LocalStoryboardPlanner:
    """Deterministic planner for local development and automated tests."""

    async def plan(self, context: PlanningContext) -> StoryboardPlan:
        subject = context.user_message or context.project_brief or context.project_title
        chinese = context.locale == "zh-CN"
        hook_match = re.search(r"Hook\s+([a-z]+)", context.project_brief, re.IGNORECASE)
        hook = hook_match.group(1).lower() if hook_match else "auto"
        duration_match = re.search(r"·\s*(\d+)s\s*·", context.project_brief)
        duration = min(15, max(1, int(duration_match.group(1)))) if duration_match else 5
        aspect_match = re.search(r"·\s*(16:9|9:16|1:1)\s*·", context.project_brief)
        aspect_ratio = aspect_match.group(1) if aspect_match else "16:9"
        hook_guidance = {
            "visual": "Open with a striking, instantly readable visual.",
            "narrative": "Open with a concise visual question or narrative twist.",
            "spoken": "Open with a direct spoken hook delivered to camera.",
            "sound": "Open with a distinctive sound cue that establishes the mood.",
            "proof": "Open by visibly demonstrating the product result or proof.",
        }.get(hook, "")
        hook_guidance_zh = {
            "visual": "以直接、清晰的强视觉画面开场。",
            "narrative": "以简洁的视觉疑问或叙事反转开场。",
            "spoken": "以面向镜头的直接口播钩子开场。",
            "sound": "以建立情绪的标志性声音开场。",
            "proof": "以可见的产品效果或实证开场。",
        }.get(hook, "")
        opening_prompt = (
            f"Cinematic establishing shot for {subject}, dramatic lighting. {hook_guidance}"
        ).strip()
        shots = [
            ShotInput(
                description="电影感建立镜头" if chinese else "Cinematic establishing shot",
                prompt_en=opening_prompt,
                prompt_zh=(
                    f"为“{subject}”设计电影感建立镜头，戏剧化光影。{hook_guidance_zh}"
                    if chinese
                    else None
                ),
                duration_seconds=duration,
                aspect_ratio=aspect_ratio,
                generation_mode="text_to_video",
            ),
            ShotInput(
                description="产品细节镜头" if chinese else "Product detail shot",
                prompt_en=f"Macro product detail shot for {subject}, shallow depth of field",
                prompt_zh=f"“{subject}”的产品细节微距镜头，浅景深" if chinese else None,
                duration_seconds=duration,
                aspect_ratio=aspect_ratio,
                generation_mode="text_to_video",
            ),
            ShotInput(
                description="品牌收尾镜头" if chinese else "Hero closing shot",
                prompt_en=f"Hero closing shot for {subject}, elegant camera movement",
                prompt_zh=f"“{subject}”的英雄收尾镜头，优雅运镜" if chinese else None,
                duration_seconds=duration,
                aspect_ratio=aspect_ratio,
                generation_mode="text_to_video",
            ),
        ]
        message = (
            "我已经生成一版包含三个镜头的故事板。你可以先调整说明和提示词，再批准生成。"
            if chinese
            else (
                "I drafted a three-shot storyboard. Review and refine it "
                "before approving generation."
            )
        )
        return StoryboardPlan(
            assistant_message=message,
            storyboard=StoryboardReplace(shots=shots),
        )


class OpenAIStoryboardPlanner:
    def __init__(self, settings: Settings) -> None:
        if not settings.llm_api_key or not settings.llm_model:
            raise ValueError("LLM provider is not configured")
        model = ChatOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            model=settings.llm_model,
            temperature=0.4,
        )
        self._model = model.with_structured_output(StoryboardPlan)

    async def plan(self, context: PlanningContext) -> StoryboardPlan:
        prompt = (
            "Create a production-ready three-shot video storyboard. "
            "Return prompts in English and a Chinese prompt when the locale is zh-CN. "
            "Each shot must be between 1 and 15 seconds. "
            f"Locale: {context.locale}. Project: {context.project_title}. "
            f"Brief: {context.project_brief}. User request: {context.user_message}"
        )
        result = await self._model.ainvoke(prompt)
        if not isinstance(result, StoryboardPlan):
            raise TypeError("LLM returned an unexpected structured response")
        return result


def build_storyboard_planner(settings: Settings) -> StoryboardPlanner:
    if settings.llm_api_key and settings.llm_model:
        return OpenAIStoryboardPlanner(settings)
    return LocalStoryboardPlanner()

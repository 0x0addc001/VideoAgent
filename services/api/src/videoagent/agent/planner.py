import json
import logging
import re
from typing import Literal, Protocol

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

from videoagent.config import Settings
from videoagent.schemas import CharacterInput, SceneInput, ShotInput, StoryboardReplace

logger = logging.getLogger(__name__)


class StoryboardPlan(BaseModel):
    assistant_message: str
    storyboard: StoryboardReplace


class PlanningContext(BaseModel):
    locale: Literal["en", "zh-CN"]
    project_title: str
    project_brief: str
    user_message: str
    workflow_stage: Literal["concept", "outline", "script", "ready"] = "concept"
    workflow_status: Literal["awaiting_approval", "approved"] = "awaiting_approval"
    conversation_context: str = ""
    storyboard_context: str = ""
    selected_skill: str | None = None
    skill_instructions: str | None = None


class StoryboardPlanner(Protocol):
    async def plan(self, context: PlanningContext) -> StoryboardPlan: ...


class LocalStoryboardPlanner:
    """Deterministic planner for local development and automated tests."""

    display_name = "VideoAgent local planner"

    async def plan(self, context: PlanningContext) -> StoryboardPlan:
        subject = context.user_message or context.project_brief or context.project_title
        chinese = context.locale == "zh-CN"
        if context.workflow_stage == "concept":
            return StoryboardPlan(
                assistant_message=(
                    "我先确认整体设定，并把题材、受众、叙事目标、情绪、视觉方向、"
                    "角色与场景需求整理到 Settings。信息足够后再生成 Outlines、"
                    "Scenes、Characters 和 Shots。"
                    if chinese
                    else (
                        "I’m collecting the creative settings first: story, audience, "
                        "narrative goal, tone, visual direction, and the Character and "
                        "Scene requirements. After the direction is clear, I’ll create "
                        "the Outlines, Characters, Scenes, and Shots."
                    )
                ),
                storyboard=StoryboardReplace(shots=[], characters=[], scenes=[]),
            )
        hook_match = re.search(r"Hook\s+([a-z]+)", context.project_brief, re.IGNORECASE)
        hook = hook_match.group(1).lower() if hook_match else "auto"
        duration_match = re.search(r"·\s*(\d+)s\s*·", context.project_brief)
        duration = min(15, max(1, int(duration_match.group(1)))) if duration_match else 5
        aspect_match = re.search(
            r"·\s*(21:9|16:9|9:16|1:1)\s*·",
            context.project_brief,
        )
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
            f"Cinematic establishing shot for {subject}, clear subject action, "
            f"motivated camera movement, dramatic lighting, and ambient sound. "
            f"{hook_guidance}"
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
                prompt_en=(
                    f"Macro product detail shot for {subject}, controlled push-in, "
                    "shallow depth of field, readable texture, and natural sound"
                ),
                prompt_zh=f"“{subject}”的产品细节微距镜头，浅景深" if chinese else None,
                duration_seconds=duration,
                aspect_ratio=aspect_ratio,
                generation_mode="text_to_video",
            ),
            ShotInput(
                description="品牌收尾镜头" if chinese else "Hero closing shot",
                prompt_en=(
                    f"Hero closing shot for {subject}, elegant camera movement, "
                    "clear final composition, restrained sound, and stable identity"
                ),
                prompt_zh=f"“{subject}”的英雄收尾镜头，优雅运镜" if chinese else None,
                duration_seconds=duration,
                aspect_ratio=aspect_ratio,
                generation_mode="text_to_video",
            ),
        ]
        character_name = "主角" if chinese else "Lead"
        character_description = (
            f"故事的核心人物，围绕“{subject}”展开。"
            if chinese
            else f"The central character whose story revolves around {subject}."
        )
        characters = [
            CharacterInput(
                name=character_name,
                description=character_description,
                prompt_en=(
                    f"Cinematic character portrait for {subject}, consistent identity, "
                    "natural skin texture, production-ready costume and lighting"
                ),
                prompt_zh=(
                    f"“{subject}”的电影感角色定妆照，稳定身份特征，自然肤质，成片级服装与灯光"
                    if chinese
                    else None
                ),
            )
        ]
        scene_name = "主场景" if chinese else "Primary set"
        scene_location = "电影感室内创作空间" if chinese else "Cinematic interior studio"
        scenes = [
            SceneInput(
                name=scene_name,
                location=scene_location,
                description=(
                    f"承载“{subject}”叙事的连续空间，包含可识别的环境层次、灯光和道具关系。"
                    if chinese
                    else (
                        f"A continuous story space for {subject}, with readable "
                        "environment layers, practical light, and reusable set dressing."
                    )
                ),
                prompt_en=(
                    f"Cinematic environment plate for {subject}, consistent layout, "
                    "production-ready lighting and set dressing"
                ),
                prompt_zh=(
                    f"“{subject}”的电影感场景设定图，空间布局稳定，成片级灯光与陈设"
                    if chinese
                    else None
                ),
            )
        ]
        messages = {
            "concept": (
                "我先确定整体设定：题材、受众、核心冲突、情绪和视觉方向。确认后我再展开分集与分镜。"
                if chinese
                else (
                    "I have framed the creative direction: story, audience, dramatic "
                    "question, tone, and visual language. Approve it before I expand the outline."
                )
            ),
            "outline": (
                "整体设定已锁定。这是分集与分镜大纲，重点检查叙事推进、冲突升级和收束。"
                if chinese
                else (
                    "The overall direction is locked. Review this episode and shot outline "
                    "for progression, escalation, and a clear ending."
                )
            ),
            "script": (
                "分镜大纲已锁定。这是逐场剧本，包含动作、对白或旁白、镜头、光线和声音。"
                if chinese
                else (
                    "The outline is locked. Review the scene script, including action, "
                    "dialogue or voice-over, camera, light, and sound."
                )
            ),
            "ready": (
                "剧本已批准，可以进入镜头生成。"
                if chinese
                else "The script is approved and ready for shot generation."
            ),
        }
        return StoryboardPlan(
            assistant_message=messages[context.workflow_stage],
            storyboard=StoryboardReplace(
                shots=shots,
                characters=characters,
                scenes=scenes,
            ),
        )


class OpenAIStoryboardPlanner:
    def __init__(self, settings: Settings) -> None:
        if not settings.llm_api_key or not settings.llm_model:
            raise ValueError("LLM provider is not configured")
        self._chat = ChatOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
            model=settings.llm_model,
            temperature=0.4,
            max_tokens=1800,
            timeout=settings.llm_timeout_seconds,
            max_retries=0,
        )
        self._structured = self._chat.with_structured_output(StoryboardPlan)
        self.display_name = f"LLM/{settings.llm_model}"

    async def _enforce_stage_plan(
        self,
        result: StoryboardPlan,
        context: PlanningContext,
    ) -> StoryboardPlan:
        if context.workflow_stage == "concept":
            result.storyboard.shots = []
            result.storyboard.characters = []
            result.storyboard.scenes = []
            return result
        fallback = await LocalStoryboardPlanner().plan(context)
        if not result.storyboard.shots:
            result.storyboard.shots = fallback.storyboard.shots
        if not result.storyboard.characters:
            result.storyboard.characters = fallback.storyboard.characters
        if not result.storyboard.scenes:
            result.storyboard.scenes = fallback.storyboard.scenes
        return result

    async def plan(self, context: PlanningContext) -> StoryboardPlan:
        stage_instruction = {
            "concept": (
                "Keep the assistant message focused on the overall creative treatment, "
                "audience, conflict, tone, and visual direction."
            ),
            "outline": (
                "Keep the assistant message focused on the episode and shot outline, "
                "progression, escalation, and ending."
            ),
            "script": (
                "Keep the assistant message focused on the scene-by-scene production script "
                "with action, dialogue, camera, light, and sound."
            ),
            "ready": "Confirm that the approved script is ready for generation.",
        }[context.workflow_stage]
        prompt = (
            "Create a production-ready three-shot video storyboard. "
            "At the concept stage, do not create Shots, Characters, or Scenes yet; "
            "return empty arrays while you collect and summarize the creative settings. "
            "After concept approval, create reusable Characters and Scenes first, then "
            "organize Shots around those production objects. "
            "Also define one to three recurring characters with distinct names, "
            "descriptions, and reusable English image prompts when characters are "
            "relevant to the brief. "
            "Define one to three reusable scenes with distinct names, physical "
            "locations, descriptions, and English environment-image prompts. "
            "Characters and scenes are production objects referenced by the shots. "
            "When refining an existing plan, preserve Character and Scene names "
            "unless the director explicitly requests a rename. "
            "Each shot must specify visible action, camera movement, lighting, and "
            "sound, while preserving character identity and scene geography across "
            "the sequence. Use keyframes or reference roles when they materially "
            "improve continuity. "
            "Return prompts in English and a Chinese prompt when the locale is zh-CN. "
            "Each shot must be between 3 and 30 seconds when the selected model "
            "supports it; otherwise stay within the model's stated limit. "
            f"Workflow stage: {context.workflow_stage}. {stage_instruction} "
            f"Locale: {context.locale}. Project: {context.project_title}. "
            f"Brief: {context.project_brief}. User request: {context.user_message}. "
            f"Workflow status: {context.workflow_status}. "
            f"Selected skill: {context.selected_skill or 'auto'}. "
            f"Skill instructions: {context.skill_instructions or 'none'}. "
            f"Recent conversation memory:\n{context.conversation_context or 'none'}. "
            f"Current storyboard state:\n{context.storyboard_context or 'none'}."
        )
        try:
            result = await self._structured.ainvoke(prompt)
            if not isinstance(result, StoryboardPlan):
                raise TypeError("LLM returned an unexpected structured response")
            return await self._enforce_stage_plan(result, context)
        except Exception as exc:
            if "response_format" not in str(exc).lower():
                return await self._fallback_to_local(context, exc)

        schema = json.dumps(StoryboardPlan.model_json_schema(), ensure_ascii=False)
        try:
            fallback = await self._chat.ainvoke(
                [
                    (
                        "system",
                        "Return one valid JSON object only, with no Markdown fences. "
                        f"It must validate against this JSON Schema: {schema}",
                    ),
                    ("human", prompt),
                ]
            )
        except Exception as exc:
            return await self._fallback_to_local(context, exc)
        content = fallback.content
        if not isinstance(content, str):
            return await self._fallback_to_local(
                context,
                TypeError("LLM returned a non-text structured response"),
            )
        start = content.find("{")
        end = content.rfind("}")
        if start < 0 or end < start:
            return await self._fallback_to_local(
                context,
                ValueError("LLM did not return a JSON object"),
            )
        try:
            result = StoryboardPlan.model_validate_json(content[start : end + 1])
        except Exception as exc:
            return await self._fallback_to_local(context, exc)
        return await self._enforce_stage_plan(result, context)

    async def _fallback_to_local(
        self,
        context: PlanningContext,
        error: Exception,
    ) -> StoryboardPlan:
        logger.warning(
            "Remote storyboard planner failed; using local fallback: %s",
            error,
        )
        plan = await LocalStoryboardPlanner().plan(context)
        notice = (
            "远程规划服务暂时不可用，本次已使用本地规划兜底； "
            "你可以继续审阅和修改当前方案，稍后再重试远程规划。"
            if context.locale == "zh-CN"
            else (
                "The remote planner is temporarily unavailable. "
                "A local planning fallback was used for this run; you can keep "
                "reviewing and editing this plan and retry the remote planner later."
            )
        )
        plan.assistant_message = f"{plan.assistant_message}\n\n{notice}"
        return plan


def build_storyboard_planner(settings: Settings) -> StoryboardPlanner:
    if settings.llm_api_key and settings.llm_model:
        return OpenAIStoryboardPlanner(settings)
    return LocalStoryboardPlanner()

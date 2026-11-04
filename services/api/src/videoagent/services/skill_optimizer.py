import json
import re

from langchain_openai import ChatOpenAI

from videoagent.config import Settings
from videoagent.schemas import SkillOptimizeRequest, SkillOptimizeResponse


def _slug(value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")
    return normalized[:80] or "custom_video_skill"


def _title_from_slug(skill_id: str) -> str:
    return " ".join(part.capitalize() for part in skill_id.split("_"))


def _local_skill(draft: SkillOptimizeRequest) -> SkillOptimizeResponse:
    chinese = draft.locale == "zh-CN"
    source = draft.title or draft.idea
    skill_id = _slug(source)
    title = draft.title or _title_from_slug(skill_id)
    description = draft.description or draft.idea
    instructions = draft.instructions or (
        "Goal\n"
        f"{draft.idea}\n\n"
        "When to use\n"
        "Use this skill when the user's request matches the capability above.\n\n"
        "Inputs\n"
        "Collect the creative goal, required references, duration, aspect ratio, "
        "and any constraints before execution.\n\n"
        "Procedure\n"
        "1. Clarify missing inputs.\n"
        "2. Produce a concise plan.\n"
        "3. Require approval before paid or destructive actions.\n"
        "4. Execute and return inspectable results.\n\n"
        "Output\n"
        "Return the result, assumptions, and any next actions.\n\n"
        "Quality gates\n"
        "Preserve user intent, identify unsupported capabilities, and do not "
        "invent completed work."
    )
    if chinese:
        instructions = draft.instructions or (
            "目标\n"
            f"{draft.idea}\n\n"
            "适用场景\n"
            "当用户请求符合上述能力时使用。\n\n"
            "输入\n"
            "执行前收集创作目标、参考素材、时长、画幅和限制条件。\n\n"
            "执行步骤\n"
            "1. 补齐必要输入。\n"
            "2. 给出简洁计划。\n"
            "3. 付费或不可逆操作前请求批准。\n"
            "4. 执行并返回可检查的结果。\n\n"
            "输出\n"
            "返回结果、假设和下一步操作。\n\n"
            "质量门禁\n"
            "保持用户意图，明确不支持的能力，不得虚构已完成工作。"
        )
    prompt_template = (
        f"使用 {title} 完成以下任务：\n" if chinese else f"Use {title} to complete this request:\n"
    )
    return SkillOptimizeResponse(
        skill_id=skill_id,
        title=title,
        description=description,
        instructions=instructions,
        prompt_template=prompt_template,
        input_schema={
            "type": "object",
            "properties": {
                "request": {"type": "string"},
                "references": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["request"],
        },
        output_schema={
            "type": "object",
            "properties": {
                "result": {"type": "string"},
                "assumptions": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["result"],
        },
    )


async def optimize_skill(
    draft: SkillOptimizeRequest,
    settings: Settings,
) -> SkillOptimizeResponse:
    if not settings.llm_api_key or not settings.llm_model:
        return _local_skill(draft)

    chat = ChatOpenAI(
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
        model=settings.llm_model,
        temperature=0.3,
    )
    schema = json.dumps(SkillOptimizeResponse.model_json_schema(), ensure_ascii=False)
    prompt = (
        "You are the VideoAgent Skill Architect. Rewrite the user's rough idea as "
        "a production-ready agent skill. Be concrete, scoped, and testable. Include "
        "when to use it, required inputs, execution steps, approval gates, output "
        "contract, failure handling, and quality checks. Use a stable lower_snake_case "
        "skill_id. Return one JSON object only, with no Markdown fences, matching this "
        f"schema: {schema}. Locale: {draft.locale}. Idea: {draft.idea}. "
        f"Current title: {draft.title or ''}. Current description: "
        f"{draft.description or ''}. Current instructions: {draft.instructions or ''}."
    )
    try:
        response = await chat.ainvoke(
            [
                (
                    "system",
                    "Return only a valid JSON object. No commentary or code fences.",
                ),
                ("human", prompt),
            ]
        )
        content = response.content
        if not isinstance(content, str):
            return _local_skill(draft)
        start = content.find("{")
        end = content.rfind("}")
        if start < 0 or end < start:
            return _local_skill(draft)
        return SkillOptimizeResponse.model_validate_json(content[start : end + 1])
    except Exception:
        return _local_skill(draft)

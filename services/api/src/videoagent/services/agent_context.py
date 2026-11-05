import re
from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.models import Conversation, Message, UserSkill
from videoagent.services.storyboards import load_storyboard

RECENT_MESSAGE_LIMIT = 8
MESSAGE_CHARACTER_LIMIT = 600
STORYBOARD_SHOT_LIMIT = 20
PRODUCTION_SETTINGS = re.compile(r"Production settings:\s*([^·\n]+)", re.IGNORECASE)


@dataclass(frozen=True)
class AgentContext:
    recent_message_count: int
    conversation_context: str
    storyboard_context: str
    selected_skill: str | None
    skill_instructions: str | None


def _clip(value: str, limit: int) -> str:
    normalized = " ".join(value.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 1].rstrip()}…"


async def build_agent_context(
    session: AsyncSession,
    *,
    project_id: UUID,
    owner_id: UUID,
    project_brief: str,
    exclude_message_id: UUID | None = None,
) -> AgentContext:
    filters = [Conversation.project_id == project_id]
    if exclude_message_id is not None:
        filters.append(Message.id != exclude_message_id)
    messages = list(
        (
            await session.scalars(
                select(Message)
                .join(Conversation, Conversation.id == Message.conversation_id)
                .where(*filters)
                .order_by(Message.created_at.desc())
                .limit(RECENT_MESSAGE_LIMIT)
            )
        ).all()
    )
    messages.reverse()
    conversation_context = "\n".join(
        f"{message.role}: {_clip(message.content, MESSAGE_CHARACTER_LIMIT)}" for message in messages
    )

    storyboard = await load_storyboard(session, project_id)
    storyboard_lines: list[str] = []
    if storyboard is not None:
        if storyboard.characters:
            storyboard_lines.append(
                "Characters: "
                + "; ".join(
                    f"{character.name}: {_clip(character.description, 180)}"
                    for character in storyboard.characters
                )
            )
        storyboard_lines.extend(
            f"Shot {shot.index + 1}: {_clip(shot.description, 220)} "
            f"({shot.duration_seconds}s, {shot.aspect_ratio})"
            for shot in storyboard.shots[:STORYBOARD_SHOT_LIMIT]
        )

    skill_match = PRODUCTION_SETTINGS.search(project_brief)
    selected_skill = skill_match.group(1).strip() if skill_match else None
    if selected_skill and selected_skill.lower() in {"auto", "none"}:
        selected_skill = None

    skill_instructions: str | None = None
    if selected_skill:
        skill = await session.scalar(
            select(UserSkill).where(
                UserSkill.owner_id == owner_id,
                UserSkill.skill_id == selected_skill,
            )
        )
        if skill is not None:
            skill_instructions = "\n".join(
                (
                    f"Skill: {skill.title} ({skill.skill_id})",
                    f"Instructions: {skill.instructions}",
                    f"Starter prompt: {skill.prompt_template}",
                )
            )

    return AgentContext(
        recent_message_count=len(messages),
        conversation_context=conversation_context,
        storyboard_context="\n".join(storyboard_lines),
        selected_skill=selected_skill,
        skill_instructions=skill_instructions,
    )

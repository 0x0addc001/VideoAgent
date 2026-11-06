import re
from typing import Annotated, Literal, cast
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from videoagent.agent.graph import StoryboardAgent
from videoagent.api.dependencies import (
    get_current_user,
    get_session,
    get_settings,
    get_storyboard_agent,
)
from videoagent.config import Settings
from videoagent.models import Conversation, Message, User
from videoagent.schemas import (
    AgentMessageCreate,
    AgentTurnResponse,
    ExportRequest,
    MessageList,
    MessageRead,
    StoryboardRead,
    WorkflowStage,
    WorkflowStateRead,
)
from videoagent.services.agent_activity import AgentActivityRecorder
from videoagent.services.agent_context import build_agent_context
from videoagent.services.language import detect_locale
from videoagent.services.media import export_project
from videoagent.services.storyboards import (
    load_storyboard,
    owned_project_or_404,
    replace_storyboard,
)
from videoagent.services.workflow import get_or_create_workflow

router = APIRouter(prefix="/projects/{project_id}/messages", tags=["agent"])
FINAL_CUT_REQUEST = re.compile(
    r"(?:"
    r"\b(?:render|export|assemble)\s+(?:the\s+)?(?:final\s+cut|film)\b"
    r"|\bfinal\s+cut\s+please\b"
    r"|(?:生成|合成|导出|制作)(?:最终)?成片"
    r"|(?:生成|合成|导出)(?:最终)?视频"
    r")",
    re.IGNORECASE,
)


async def get_conversation(
    session: AsyncSession,
    project_id: UUID,
) -> Conversation:
    result = await session.execute(
        select(Conversation).where(Conversation.project_id == project_id)
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        conversation = Conversation(project_id=project_id)
        session.add(conversation)
        await session.flush()
    return conversation


@router.get("", response_model=MessageList)
async def list_messages(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> MessageList:
    project = await owned_project_or_404(
        session,
        project_id,
        user.id,
        required_permission="view",
    )
    result = await session.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.project_id == project.id)
    )
    conversation = result.scalar_one_or_none()
    messages = conversation.messages if conversation is not None else []
    return MessageList(items=[MessageRead.model_validate(message) for message in messages])


@router.post("", response_model=AgentTurnResponse)
async def create_agent_message(
    project_id: UUID,
    payload: AgentMessageCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    agent: Annotated[StoryboardAgent, Depends(get_storyboard_agent)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AgentTurnResponse:
    project = await owned_project_or_404(session, project_id, user.id)
    conversation = await get_conversation(session, project.id)
    workflow = await get_or_create_workflow(session, project_id=project.id)
    run_id = payload.run_id or uuid4()
    reporter = AgentActivityRecorder(
        session,
        project_id=project.id,
        run_id=run_id,
    )
    locale = detect_locale(
        project.brief,
        payload.content,
        fallback=user.locale,
    )

    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=payload.content,
        metadata_json={},
    )
    session.add(user_message)
    await session.flush()

    context = await build_agent_context(
        session,
        project_id=project.id,
        owner_id=user.id,
        project_brief=project.brief,
        exclude_message_id=user_message.id,
    )
    await reporter.emit(
        "context",
        "Assembled working context",
        f"locale={locale} · workflow={workflow.stage}/{workflow.status} · "
        "project title, brief, and current request",
    )
    await reporter.emit(
        "memory",
        "Loaded project memory",
        f"{context.recent_message_count} recent messages · current Characters, Scenes, and Shots · "
        "8-message rolling window with 600 characters per message",
    )
    if context.selected_skill:
        await reporter.emit(
            "skill",
            "Loaded Skill selection",
            (
                f"{context.selected_skill} · persisted instructions attached"
                if context.skill_instructions
                else f"{context.selected_skill} · built-in or selection-only Skill"
            ),
        )

    if FINAL_CUT_REQUEST.search(payload.content):
        storyboard = await load_storyboard(session, project.id)
        if storyboard is None:
            raise RuntimeError("Workflow response is missing a storyboard")
        await reporter.emit(
            "state",
            "Preparing the final cut",
            f"Assembling all {len(storyboard.shots)} completed Shots.",
            "running",
        )
        export = await export_project(
            session,
            project=project,
            request=ExportRequest(),
            settings=settings,
        )
        assistant_message = Message(
            conversation_id=conversation.id,
            role="assistant",
            content=(
                f"成片已生成，共 {len(export.items)} 个版本。你可以在 Versions 中查看、分享或发布。"
                if locale == "zh-CN"
                else (
                    f"The final cut is ready in {len(export.items)} versions. "
                    "Open Versions to review, share, or publish it."
                )
            ),
            metadata_json={
                "action": "render_final_cut",
                "asset_ids": [str(asset.id) for asset in export.items],
            },
        )
        session.add(assistant_message)
        await session.flush()
        await reporter.emit(
            "reply",
            "Final-cut reply ready",
            "The completed delivery is ready in Versions.",
        )
        await session.refresh(user_message)
        await session.refresh(assistant_message)
        return AgentTurnResponse(
            user_message=MessageRead.model_validate(user_message),
            assistant_message=MessageRead.model_validate(assistant_message),
            storyboard=StoryboardRead.model_validate(storyboard),
            workflow=WorkflowStateRead.model_validate(workflow),
        )

    try:
        plan = await agent.plan(
            locale=locale,
            project_title=project.title,
            project_brief=project.brief,
            user_message=payload.content,
            workflow_stage=cast(WorkflowStage, workflow.stage),
            workflow_status=cast(
                "Literal['awaiting_approval', 'approved']",
                workflow.status,
            ),
            conversation_context=context.conversation_context,
            storyboard_context=context.storyboard_context,
            selected_skill=context.selected_skill,
            skill_instructions=context.skill_instructions,
            activity=reporter.emit,
        )
    except Exception:
        await reporter.emit(
            "planning",
            "Planning failed",
            "The planner did not produce a valid StoryboardPlan.",
            "failed",
        )
        raise

    await reporter.emit(
        "state",
        "Updating Direction and Vision",
        "Updating Characters, Scenes, and Shots with the validated plan.",
        "running",
    )
    storyboard = await replace_storyboard(
        session,
        project.id,
        plan.storyboard.shots,
        plan.storyboard.characters,
        plan.storyboard.scenes,
    )
    await reporter.emit(
        "state",
        "Project state updated",
        f"Storyboard v{storyboard.version} · {len(storyboard.characters)} Characters · "
        f"{len(storyboard.scenes)} Scenes · {len(storyboard.shots)} Shots",
    )
    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=plan.assistant_message,
        metadata_json={
            "storyboard_id": str(storyboard.id),
            "storyboard_version": storyboard.version,
        },
    )
    session.add(assistant_message)
    await session.flush()
    await reporter.emit(
        "reply",
        "Director response ready",
        "The assistant message is ready to stream into the conversation.",
    )
    await session.refresh(user_message)
    await session.refresh(assistant_message)

    return AgentTurnResponse(
        user_message=MessageRead.model_validate(user_message),
        assistant_message=MessageRead.model_validate(assistant_message),
        storyboard=StoryboardRead.model_validate(storyboard),
        workflow=WorkflowStateRead.model_validate(workflow),
    )

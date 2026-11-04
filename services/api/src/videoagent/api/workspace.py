from typing import Annotated, Literal, cast
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from videoagent.agent.graph import StoryboardAgent
from videoagent.api.dependencies import (
    get_current_user,
    get_session,
    get_storyboard_agent,
)
from videoagent.errors import AppError
from videoagent.models import (
    Conversation,
    Message,
    Project,
    ProjectState,
    ProjectWorkflow,
    User,
    WorkspaceFolder,
    WorkspaceFolderItem,
)
from videoagent.schemas import (
    MessageRead,
    StoryboardRead,
    WorkflowDecisionRead,
    WorkflowDecisionRequest,
    WorkflowStage,
    WorkflowStateRead,
    WorkspaceFolderCreate,
    WorkspaceFolderRead,
    WorkspaceRead,
    WorkspaceThreadMove,
    WorkspaceThreadRead,
)
from videoagent.services.storyboards import (
    load_storyboard,
    owned_project_or_404,
    replace_storyboard,
)
from videoagent.services.workflow import get_or_create_workflow, next_workflow_stage

router = APIRouter(tags=["workspace"])


def _project_locale(locale: str) -> Literal["en", "zh-CN"]:
    return "zh-CN" if locale == "zh-CN" else "en"


async def _conversation_for_project(
    session: AsyncSession,
    project_id: UUID,
) -> Conversation:
    conversation = await session.scalar(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.project_id == project_id)
    )
    if conversation is not None:
        return conversation

    conversation = Conversation(project_id=project_id)
    session.add(conversation)
    await session.flush()
    return conversation


async def _owned_folder_or_404(
    session: AsyncSession,
    folder_id: UUID,
    user_id: UUID,
) -> WorkspaceFolder:
    folder = await session.scalar(
        select(WorkspaceFolder).where(
            WorkspaceFolder.id == folder_id,
            WorkspaceFolder.owner_id == user_id,
        )
    )
    if folder is None:
        raise AppError(
            status_code=404,
            code="WORKSPACE_FOLDER_NOT_FOUND",
            message="The project folder was not found.",
        )
    return folder


@router.get("/workspace", response_model=WorkspaceRead)
async def get_workspace(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> WorkspaceRead:
    folders = list(
        (
            await session.scalars(
                select(WorkspaceFolder)
                .where(WorkspaceFolder.owner_id == user.id)
                .order_by(WorkspaceFolder.updated_at.desc())
            )
        ).all()
    )
    projects = list(
        (
            await session.scalars(
                select(Project)
                .where(
                    Project.owner_id == user.id,
                    Project.state != ProjectState.ARCHIVED.value,
                )
                .order_by(Project.updated_at.desc())
            )
        ).all()
    )
    project_ids = [project.id for project in projects]
    folder_assignments: dict[UUID, UUID] = {}
    if project_ids:
        for item in (
            await session.scalars(
                select(WorkspaceFolderItem).where(WorkspaceFolderItem.project_id.in_(project_ids))
            )
        ).all():
            folder_assignments[item.project_id] = item.folder_id

    conversations: dict[UUID, Conversation] = {}
    if project_ids:
        rows = (
            await session.scalars(
                select(Conversation)
                .options(selectinload(Conversation.messages))
                .where(Conversation.project_id.in_(project_ids))
            )
        ).all()
        conversations = {conversation.project_id: conversation for conversation in rows}

    workflows = {}
    if project_ids:
        workflow_rows = (
            await session.scalars(
                select(ProjectWorkflow).where(ProjectWorkflow.project_id.in_(project_ids))
            )
        ).all()
        workflows = {workflow.project_id: workflow for workflow in workflow_rows}

    recents: list[WorkspaceThreadRead] = []
    for project in projects:
        conversation = conversations.get(project.id)
        messages = conversation.messages if conversation is not None else []
        workflow = workflows.get(project.id)
        recents.append(
            WorkspaceThreadRead(
                id=project.id,
                title=project.title,
                brief=project.brief,
                folder_id=folder_assignments.get(project.id),
                message_count=len(messages),
                preview=messages[-1].content[:220] if messages else None,
                stage=workflow.stage if workflow is not None else "concept",
                status=(workflow.status if workflow is not None else "awaiting_approval"),
                created_at=project.created_at,
                updated_at=project.updated_at,
            )
        )

    return WorkspaceRead(
        folders=[WorkspaceFolderRead.model_validate(folder) for folder in folders],
        recents=recents,
    )


@router.post(
    "/workspace/folders",
    response_model=WorkspaceFolderRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_workspace_folder(
    payload: WorkspaceFolderCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> WorkspaceFolderRead:
    folder = WorkspaceFolder(owner_id=user.id, name=payload.name)
    session.add(folder)
    await session.commit()
    await session.refresh(folder)
    return WorkspaceFolderRead.model_validate(folder)


@router.patch("/workspace/folders/{folder_id}", response_model=WorkspaceFolderRead)
async def rename_workspace_folder(
    folder_id: UUID,
    payload: WorkspaceFolderCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> WorkspaceFolderRead:
    folder = await _owned_folder_or_404(session, folder_id, user.id)
    folder.name = payload.name
    await session.commit()
    await session.refresh(folder)
    return WorkspaceFolderRead.model_validate(folder)


@router.delete("/workspace/folders/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_folder(
    folder_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    folder = await _owned_folder_or_404(session, folder_id, user.id)
    await session.execute(
        delete(WorkspaceFolderItem).where(WorkspaceFolderItem.folder_id == folder.id)
    )
    await session.delete(folder)
    await session.commit()


@router.put("/workspace/threads/{project_id}/folder", status_code=status.HTTP_204_NO_CONTENT)
async def move_workspace_thread(
    project_id: UUID,
    payload: WorkspaceThreadMove,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    project = await owned_project_or_404(session, project_id, user.id)
    if project.state == ProjectState.ARCHIVED.value:
        raise AppError(
            status_code=404,
            code="PROJECT_NOT_FOUND",
            message="The project was not found.",
        )

    if payload.folder_id is not None:
        await _owned_folder_or_404(session, payload.folder_id, user.id)

    await session.execute(
        delete(WorkspaceFolderItem).where(WorkspaceFolderItem.project_id == project.id)
    )
    if payload.folder_id is not None:
        session.add(
            WorkspaceFolderItem(
                folder_id=payload.folder_id,
                project_id=project.id,
            )
        )
    await session.commit()


@router.get("/projects/{project_id}/workflow", response_model=WorkflowStateRead)
async def get_project_workflow(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> WorkflowStateRead:
    await owned_project_or_404(session, project_id, user.id)
    workflow = await get_or_create_workflow(session, project_id=project_id)
    return WorkflowStateRead.model_validate(workflow)


@router.post(
    "/projects/{project_id}/workflow/decision",
    response_model=WorkflowDecisionRead,
)
async def decide_workflow(
    project_id: UUID,
    payload: WorkflowDecisionRequest,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    agent: Annotated[StoryboardAgent, Depends(get_storyboard_agent)],
) -> WorkflowDecisionRead:
    project = await owned_project_or_404(session, project_id, user.id)
    workflow = await get_or_create_workflow(session, project_id=project.id)
    if workflow.stage == "ready" and payload.choice == "approve":
        raise AppError(
            status_code=409,
            code="WORKFLOW_ALREADY_APPROVED",
            message="The script is already approved for generation.",
        )
    if payload.choice in {"refine", "custom"} and not payload.instruction:
        raise AppError(
            status_code=422,
            code="WORKFLOW_INSTRUCTION_REQUIRED",
            message="A revision instruction is required.",
        )

    conversation = await _conversation_for_project(session, project.id)
    locale = _project_locale(user.locale)
    decision_text = (
        f"Approve {workflow.stage}" if payload.choice == "approve" else (payload.instruction or "")
    )
    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=decision_text,
        metadata_json={
            "workflow_stage": workflow.stage,
            "workflow_choice": payload.choice,
        },
    )
    session.add(user_message)
    await session.flush()

    storyboard = await load_storyboard(session, project.id)
    target_stage = workflow.stage
    if payload.choice == "approve":
        target_stage = next_workflow_stage(workflow.stage)

    if target_stage == "ready":
        if storyboard is None:
            raise AppError(
                status_code=409,
                code="STORYBOARD_REQUIRED",
                message="A storyboard is required before approval.",
            )
        assistant_content = (
            "剧本已批准，故事板已锁定，可以进入镜头生成。你可以继续在画布中调整单个镜头。"
            if locale == "zh-CN"
            else (
                "The script is approved and the storyboard is locked for generation. "
                "You can still refine individual shots on the canvas."
            )
        )
        workflow.stage = "ready"
        workflow.status = "approved"
    else:
        if payload.choice == "approve":
            stage_request = {
                "outline": (
                    "Lock the approved overall setting. Produce a compact episode and "
                    "shot outline that establishes progression, conflict, and a clear ending."
                ),
                "script": (
                    "Lock the approved outline. Develop every shot into a production-ready "
                    "scene script with action, dialogue or voice-over, camera, light, and sound."
                ),
            }[target_stage]
        else:
            stage_request = (
                f"Revise the current {workflow.stage} without advancing. "
                f"User direction: {payload.instruction}"
            )
        plan = await agent.plan(
            locale=locale,
            project_title=project.title,
            project_brief=project.brief,
            user_message=stage_request,
            workflow_stage=cast(WorkflowStage, target_stage),
        )
        storyboard = await replace_storyboard(
            session,
            project.id,
            plan.storyboard.shots,
        )
        assistant_content = plan.assistant_message
        workflow.stage = target_stage
        workflow.status = "awaiting_approval"

    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=assistant_content,
        metadata_json={
            "workflow_stage": workflow.stage,
            "workflow_status": workflow.status,
            "approval_choice": payload.choice,
        },
    )
    session.add(assistant_message)
    session.add(workflow)
    await session.commit()
    await session.refresh(user_message)
    await session.refresh(assistant_message)
    await session.refresh(workflow)
    if storyboard is None:
        raise RuntimeError("Workflow response is missing a storyboard")
    return WorkflowDecisionRead(
        user_message=MessageRead.model_validate(user_message),
        assistant_message=MessageRead.model_validate(assistant_message),
        storyboard=StoryboardRead.model_validate(storyboard),
        workflow=WorkflowStateRead.model_validate(workflow),
    )

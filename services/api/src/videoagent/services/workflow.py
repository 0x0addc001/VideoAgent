from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.models import ProjectWorkflow

WORKFLOW_STAGES = ("concept", "outline", "script", "ready")


async def get_or_create_workflow(
    session: AsyncSession,
    *,
    project_id: UUID,
) -> ProjectWorkflow:
    workflow = await session.scalar(
        select(ProjectWorkflow).where(ProjectWorkflow.project_id == project_id)
    )
    if workflow is not None:
        return workflow

    workflow = ProjectWorkflow(
        project_id=project_id,
        stage="concept",
        status="awaiting_approval",
    )
    session.add(workflow)
    await session.commit()
    await session.refresh(workflow)
    return workflow


def next_workflow_stage(stage: str) -> str:
    try:
        index = WORKFLOW_STAGES.index(stage)
    except ValueError:
        return "concept"
    return WORKFLOW_STAGES[min(index + 1, len(WORKFLOW_STAGES) - 1)]

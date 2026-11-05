from datetime import UTC, datetime

from videoagent.models import Project, ProjectWorkflow, Storyboard
from videoagent.schemas import ProjectProgressRead

WORKFLOW_POINTS = {
    "concept": 15,
    "outline": 30,
    "script": 45,
    "ready": 55,
}


def project_progress(
    project: Project,
    workflow: ProjectWorkflow,
    storyboard: Storyboard | None,
) -> ProjectProgressRead:
    total_shots = len(storyboard.shots) if storyboard is not None else 0
    completed_shots = (
        sum(shot.status == "completed" for shot in storyboard.shots)
        if storyboard is not None
        else 0
    )
    brief_points = 10 if project.brief.strip() else 0
    storyboard_points = 5 if total_shots > 0 else 0
    workflow_points = WORKFLOW_POINTS.get(workflow.stage, 0)
    generation_points = round(30 * completed_shots / total_shots) if total_shots else 0
    percent = min(
        100,
        brief_points + storyboard_points + workflow_points + generation_points,
    )
    return ProjectProgressRead(
        percent=percent,
        workflow_stage=workflow.stage,
        workflow_status=workflow.status,
        total_shots=total_shots,
        completed_shots=completed_shots,
        updated_at=datetime.now(UTC),
    )

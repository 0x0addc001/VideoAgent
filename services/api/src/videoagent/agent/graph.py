from typing import Any, Literal, TypedDict, cast

from langgraph.graph import END, START, StateGraph

from videoagent.agent.planner import (
    PlanningContext,
    StoryboardPlan,
    StoryboardPlanner,
)
from videoagent.services.agent_activity import ActivityReporter


class AgentState(TypedDict, total=False):
    locale: Literal["en", "zh-CN"]
    project_title: str
    project_brief: str
    user_message: str
    workflow_stage: Literal["concept", "outline", "script", "ready"]
    workflow_status: Literal["awaiting_approval", "approved"]
    conversation_context: str
    storyboard_context: str
    selected_skill: str | None
    skill_instructions: str | None
    activity: ActivityReporter | None
    plan: StoryboardPlan | None


class StoryboardAgent:
    def __init__(self, planner: StoryboardPlanner) -> None:
        async def plan_node(state: AgentState) -> dict[str, object]:
            activity = state.get("activity")
            if activity is not None:
                await activity(
                    "planning",
                    f"Planning with {getattr(planner, 'display_name', 'storyboard planner')}",
                    "Turning the bounded context into a structured Direction and Vision plan.",
                    "running",
                )
            context = PlanningContext(
                locale=state["locale"],
                project_title=state["project_title"],
                project_brief=state["project_brief"],
                user_message=state["user_message"],
                workflow_stage=state["workflow_stage"],
                workflow_status=state.get("workflow_status", "awaiting_approval"),
                conversation_context=state.get("conversation_context", ""),
                storyboard_context=state.get("storyboard_context", ""),
                selected_skill=state.get("selected_skill"),
                skill_instructions=state.get("skill_instructions"),
            )
            plan = await planner.plan(context)
            if activity is not None:
                await activity(
                    "planning",
                    "Storyboard plan ready",
                    f"Selected {len(plan.storyboard.characters or [])} Characters "
                    f"and {len(plan.storyboard.shots)} Shots.",
                    "completed",
                )
                await activity(
                    "validation",
                    "Validated structured plan",
                    "StoryboardPlan passed schema validation before state was changed.",
                    "completed",
                )
            return {"plan": plan}

        builder = StateGraph(AgentState)
        builder.add_node("plan_storyboard", plan_node)
        builder.add_edge(START, "plan_storyboard")
        builder.add_edge("plan_storyboard", END)
        self._graph: Any = builder.compile()

    async def plan(
        self,
        *,
        locale: Literal["en", "zh-CN"],
        project_title: str,
        project_brief: str,
        user_message: str,
        workflow_stage: Literal["concept", "outline", "script", "ready"] = "concept",
        workflow_status: Literal["awaiting_approval", "approved"] = "awaiting_approval",
        conversation_context: str = "",
        storyboard_context: str = "",
        selected_skill: str | None = None,
        skill_instructions: str | None = None,
        activity: ActivityReporter | None = None,
    ) -> StoryboardPlan:
        result = cast(
            dict[str, object],
            await self._graph.ainvoke(
                {
                    "locale": locale,
                    "project_title": project_title,
                    "project_brief": project_brief,
                    "user_message": user_message,
                    "workflow_stage": workflow_stage,
                    "workflow_status": workflow_status,
                    "conversation_context": conversation_context,
                    "storyboard_context": storyboard_context,
                    "selected_skill": selected_skill,
                    "skill_instructions": skill_instructions,
                    "activity": activity,
                }
            ),
        )
        plan = result.get("plan")
        if not isinstance(plan, StoryboardPlan):
            raise RuntimeError("Agent did not produce a structured storyboard plan")
        return plan

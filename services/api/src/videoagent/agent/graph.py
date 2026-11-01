from typing import Any, Literal, TypedDict, cast

from langgraph.graph import END, START, StateGraph

from videoagent.agent.planner import (
    PlanningContext,
    StoryboardPlan,
    StoryboardPlanner,
)


class AgentState(TypedDict, total=False):
    locale: Literal["en", "zh-CN"]
    project_title: str
    project_brief: str
    user_message: str
    plan: StoryboardPlan | None


class StoryboardAgent:
    def __init__(self, planner: StoryboardPlanner) -> None:
        async def plan_node(state: AgentState) -> dict[str, object]:
            context = PlanningContext(
                locale=state["locale"],
                project_title=state["project_title"],
                project_brief=state["project_brief"],
                user_message=state["user_message"],
            )
            return {"plan": await planner.plan(context)}

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
    ) -> StoryboardPlan:
        result = cast(
            dict[str, object],
            await self._graph.ainvoke(
                {
                    "locale": locale,
                    "project_title": project_title,
                    "project_brief": project_brief,
                    "user_message": user_message,
                }
            ),
        )
        plan = result.get("plan")
        if not isinstance(plan, StoryboardPlan):
            raise RuntimeError("Agent did not produce a structured storyboard plan")
        return plan

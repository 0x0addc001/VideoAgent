from collections.abc import Awaitable, Callable
from typing import Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.models import AgentActivity

AgentActivityKind = Literal[
    "context",
    "memory",
    "skill",
    "planning",
    "validation",
    "state",
    "reply",
]
AgentActivityStatus = Literal["running", "completed", "failed"]
ActivityReporter = Callable[
    [AgentActivityKind, str, str | None, AgentActivityStatus],
    Awaitable[None],
]


class AgentActivityRecorder:
    def __init__(
        self,
        session: AsyncSession,
        *,
        project_id: UUID,
        run_id: UUID,
    ) -> None:
        self._session = session
        self._project_id = project_id
        self._run_id = run_id
        self._sequence = 0
        self._running: dict[AgentActivityKind, AgentActivity] = {}

    async def emit(
        self,
        kind: AgentActivityKind,
        label: str,
        detail: str | None = None,
        status: AgentActivityStatus = "completed",
    ) -> None:
        running = self._running.get(kind)
        if running is not None and status in {"completed", "failed"}:
            running.label = label
            running.detail = detail
            running.status = status
            self._running.pop(kind, None)
            await self._session.commit()
            return

        self._sequence += 1
        activity = AgentActivity(
            project_id=self._project_id,
            run_id=self._run_id,
            sequence=self._sequence,
            kind=kind,
            label=label,
            detail=detail,
            status=status,
        )
        self._session.add(activity)
        if status == "running":
            self._running[kind] = activity
        await self._session.commit()

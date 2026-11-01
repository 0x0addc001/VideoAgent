from uuid import uuid4

from videoagent.providers.base import CostEstimate, GenerationRequest, ProviderJob


class MockVideoProvider:
    name = "mock"

    def __init__(self) -> None:
        self._jobs: dict[str, ProviderJob] = {}

    async def estimate(self, request: GenerationRequest) -> CostEstimate:
        return CostEstimate(
            provider=self.name,
            credits=max(1, request.duration_seconds),
            duration_seconds=request.duration_seconds,
        )

    async def submit(self, request: GenerationRequest) -> ProviderJob:
        task_id = f"mock-{uuid4()}"
        job = ProviderJob(
            provider=self.name,
            task_id=task_id,
            status="succeeded",
            result_url=f"https://media.example.com/mock/{request.shot_id}.mp4",
        )
        self._jobs[task_id] = job
        return job

    async def status(self, task_id: str) -> ProviderJob:
        return self._jobs[task_id]

from typing import Literal, Protocol
from uuid import UUID

from pydantic import BaseModel

JobStatus = Literal[
    "pending",
    "submission_uncertain",
    "submitted",
    "queued",
    "running",
    "succeeded",
    "failed",
    "cancelled",
]


class GenerationRequest(BaseModel):
    shot_id: UUID
    prompt: str
    duration_seconds: int
    aspect_ratio: str
    generation_mode: str
    model: str | None = None
    reference_image_path: str | None = None


class CostEstimate(BaseModel):
    provider: str
    credits: int
    duration_seconds: int


class ProviderJob(BaseModel):
    provider: str
    task_id: str
    status: JobStatus
    result_url: str | None = None


class VideoProvider(Protocol):
    name: str

    async def estimate(self, request: GenerationRequest) -> CostEstimate: ...

    async def submit(self, request: GenerationRequest) -> ProviderJob: ...

    async def status(self, task_id: str) -> ProviderJob: ...

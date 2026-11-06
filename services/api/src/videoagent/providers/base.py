from typing import Literal, Protocol
from uuid import UUID

from pydantic import BaseModel, Field

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
    reference_image_paths: list[str] = Field(default_factory=list)
    reference_video_paths: list[str] = Field(default_factory=list)
    reference_audio_paths: list[str] = Field(default_factory=list)
    audio_enabled: bool | None = None
    resolution: str | None = None
    task_type: Literal["auto", "reference", "edit", "extend"] = "auto"


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

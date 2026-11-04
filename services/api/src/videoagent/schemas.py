from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

SupportedLocale = Literal["en", "zh-CN"]


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    locale: SupportedLocale
    created_at: datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    locale: SupportedLocale = "en"
    invite_code: str | None = Field(default=None, max_length=256)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UpdateUserRequest(BaseModel):
    locale: SupportedLocale


RegistrationMode = Literal["open", "invite", "closed"]


class RegistrationPolicyRead(BaseModel):
    mode: RegistrationMode


class AdminIdentityRead(BaseModel):
    email: EmailStr


class AdminOverviewRead(BaseModel):
    users: int
    active_users: int
    disabled_users: int
    projects: int
    generation_jobs: int
    running_jobs: int
    failed_jobs: int
    assets: int
    generation_enabled: bool
    registration_mode: RegistrationMode
    provider: str
    celery_enabled: bool


class AdminUserRead(BaseModel):
    id: UUID
    email: EmailStr
    status: Literal["active", "disabled"]
    locale: SupportedLocale
    credits: int
    project_count: int
    created_at: datetime


class AdminUserList(BaseModel):
    items: list[AdminUserRead]
    total: int


class AdminUserUpdate(BaseModel):
    status: Literal["active", "disabled"]


class AdminCreditAdjustment(BaseModel):
    amount: int = Field(ge=-1_000_000, le=1_000_000)
    reason: str = Field(min_length=1, max_length=200)

    @field_validator("amount")
    @classmethod
    def amount_must_not_be_zero(cls, value: int) -> int:
        if value == 0:
            raise ValueError("Credit adjustment must not be zero")
        return value


class AdminJobRead(BaseModel):
    id: UUID
    user_id: UUID
    user_email: EmailStr
    project_id: UUID
    project_title: str
    provider: str
    status: str
    error_code: str | None
    result_url: str | None
    created_at: datetime


class AdminJobList(BaseModel):
    items: list[AdminJobRead]
    total: int


class AdminSettingsRead(BaseModel):
    generation_enabled: bool
    registration_mode: RegistrationMode


class AdminSettingsUpdate(BaseModel):
    generation_enabled: bool | None = None
    registration_mode: RegistrationMode | None = None


class AdminInviteCreate(BaseModel):
    label: str = Field(default="", max_length=120)
    max_uses: int = Field(default=1, ge=1, le=10_000)
    expires_in_hours: int = Field(default=24 * 7, ge=1, le=24 * 365)


class AdminInviteRead(BaseModel):
    id: UUID
    code: str | None = None
    label: str
    max_uses: int
    use_count: int
    expires_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime


class AdminInviteList(BaseModel):
    items: list[AdminInviteRead]


class AdminAuditRead(BaseModel):
    id: UUID
    admin_id: UUID
    action: str
    target_type: str
    target_id: str
    details: dict[str, object]
    created_at: datetime


class AdminAuditList(BaseModel):
    items: list[AdminAuditRead]


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    brief: str = Field(default="", max_length=20_000)


class ProjectUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    brief: str
    state: str
    created_at: datetime
    updated_at: datetime


class ProjectList(BaseModel):
    items: list[ProjectRead]


WorkflowStage = Literal["concept", "outline", "script", "ready"]
WorkflowStatus = Literal["awaiting_approval", "approved"]


class WorkflowStateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: UUID
    stage: WorkflowStage
    status: WorkflowStatus
    updated_at: datetime


class WorkspaceFolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)

    @field_validator("name")
    @classmethod
    def name_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Folder name must not be blank")
        return normalized


class WorkspaceFolderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    created_at: datetime
    updated_at: datetime


class WorkspaceThreadRead(BaseModel):
    id: UUID
    title: str
    brief: str
    folder_id: UUID | None
    message_count: int
    preview: str | None
    stage: WorkflowStage
    status: WorkflowStatus
    created_at: datetime
    updated_at: datetime


class WorkspaceRead(BaseModel):
    folders: list[WorkspaceFolderRead]
    recents: list[WorkspaceThreadRead]


class WorkspaceThreadMove(BaseModel):
    folder_id: UUID | None = None


WorkflowDecision = Literal["approve", "refine", "custom"]


class WorkflowDecisionRequest(BaseModel):
    choice: WorkflowDecision
    instruction: str | None = Field(default=None, max_length=20_000)

    @field_validator("instruction")
    @classmethod
    def instruction_must_not_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Instruction must not be blank")
        return normalized


GenerationMode = Literal["text_to_video", "image_to_video"]
AspectRatio = Literal["16:9", "9:16", "1:1"]
ShotStatus = Literal["draft", "ready", "queued", "generating", "completed", "failed", "cancelled"]
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


class ShotInput(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    prompt_en: str = Field(min_length=1, max_length=4000)
    prompt_zh: str | None = Field(default=None, max_length=4000)
    duration_seconds: int = Field(default=5, ge=1, le=15)
    aspect_ratio: AspectRatio = "16:9"
    generation_mode: GenerationMode = "text_to_video"


class StoryboardReplace(BaseModel):
    shots: list[ShotInput] = Field(min_length=1, max_length=50)


class StoryboardReorder(BaseModel):
    shot_ids: list[UUID] = Field(min_length=1, max_length=50)


class ShotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    index: int
    description: str
    prompt_en: str
    prompt_zh: str | None
    duration_seconds: int
    aspect_ratio: AspectRatio
    generation_mode: GenerationMode
    status: ShotStatus


class StoryboardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    version: int
    shots: list[ShotRead]
    created_at: datetime
    updated_at: datetime


EvaluationMetricKey = Literal["consistency", "coverage", "clarity", "pacing"]
EvaluationSuggestionCode = Literal[
    "ADD_SHOTS",
    "UNIFY_ASPECT_RATIO",
    "IMPROVE_PROMPTS",
    "BALANCE_PACING",
    "READY",
]


class EvaluationMetric(BaseModel):
    key: EvaluationMetricKey
    score: int = Field(ge=0, le=100)


class EvaluationSuggestion(BaseModel):
    code: EvaluationSuggestionCode
    severity: Literal["high", "medium", "low"]


class EvaluationRead(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    metrics: list[EvaluationMetric]
    suggestions: list[EvaluationSuggestion]


class GenerationApproval(BaseModel):
    approved: bool


class GenerationJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    shot_id: UUID
    provider: str
    provider_task_id: str
    status: JobStatus
    result_url: str | None
    error_code: str | None
    created_at: datetime


AssetKind = Literal["upload", "generated", "export", "cover", "subtitle"]
AssetPermission = Literal["private", "public"]


def _default_aspect_ratios() -> list[AspectRatio]:
    return ["16:9", "9:16", "1:1"]


class AssetRead(BaseModel):
    id: UUID
    project_id: UUID | None
    shot_id: UUID | None
    kind: AssetKind
    filename: str
    content_type: str
    byte_size: int
    checksum: str
    permission: AssetPermission
    content_url: str
    created_at: datetime
    updated_at: datetime


class AssetList(BaseModel):
    items: list[AssetRead]


class ShareLinkCreate(BaseModel):
    expires_in_hours: int = Field(default=24, ge=1, le=24 * 30)


class ShareLinkRead(BaseModel):
    id: UUID
    asset_id: UUID
    token: str
    share_url: str
    expires_at: datetime
    revoked_at: datetime | None
    created_at: datetime


class ExportRequest(BaseModel):
    aspect_ratios: list[AspectRatio] = Field(
        default_factory=_default_aspect_ratios,
        min_length=1,
        max_length=3,
    )
    soundtrack_asset_id: UUID | None = None
    captions: str | None = Field(default=None, max_length=20_000)
    permission: AssetPermission = "private"


class ExportResponse(BaseModel):
    items: list[AssetRead]
    cover: AssetRead | None = None


class AgentMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=20_000)

    @field_validator("content")
    @classmethod
    def content_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Message must not be blank")
        return normalized


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    role: Literal["user", "assistant", "system", "tool"]
    content: str
    metadata: dict[str, object] = Field(default_factory=dict, validation_alias="metadata_json")
    created_at: datetime


class AgentTurnResponse(BaseModel):
    user_message: MessageRead
    assistant_message: MessageRead
    storyboard: StoryboardRead
    workflow: WorkflowStateRead


class WorkflowDecisionRead(BaseModel):
    user_message: MessageRead
    assistant_message: MessageRead
    storyboard: StoryboardRead
    workflow: WorkflowStateRead


class MessageList(BaseModel):
    items: list[MessageRead]


class DependencyHealth(BaseModel):
    database: Literal["ok", "error"]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    dependencies: DependencyHealth

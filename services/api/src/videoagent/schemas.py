import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

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
    title: str | None = Field(default=None, min_length=1, max_length=200)
    brief: str | None = Field(default=None, max_length=20_000)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "ProjectUpdate":
        if self.title is None and self.brief is None:
            raise ValueError("At least one project field must be provided")
        return self


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    brief: str
    state: str
    access_permission: Literal["owner", "edit", "view"] = "owner"
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
    run_id: UUID | None = None

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
AspectRatio = Literal["21:9", "16:9", "9:16", "1:1"]
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
    duration_seconds: int = Field(default=5, ge=1, le=30)
    aspect_ratio: AspectRatio = "16:9"
    generation_mode: GenerationMode = "text_to_video"


class ShotUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=500)
    prompt_en: str | None = Field(default=None, min_length=1, max_length=4000)
    prompt_zh: str | None = Field(default=None, max_length=4000)
    duration_seconds: int | None = Field(default=None, ge=1, le=30)
    aspect_ratio: AspectRatio | None = None
    generation_mode: GenerationMode | None = None

    @model_validator(mode="after")
    def at_least_one_field(self) -> "ShotUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one shot field must be provided")
        return self


class CharacterInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    prompt_en: str = Field(min_length=1, max_length=4000)
    prompt_zh: str | None = Field(default=None, max_length=4000)


class CharacterUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    prompt_en: str | None = Field(default=None, min_length=1, max_length=4000)
    prompt_zh: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "CharacterUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one character field must be provided")
        return self


class SceneInput(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    location: str = Field(min_length=1, max_length=240)
    prompt_en: str = Field(min_length=1, max_length=4000)
    prompt_zh: str | None = Field(default=None, max_length=4000)


class SceneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    location: str | None = Field(default=None, min_length=1, max_length=240)
    prompt_en: str | None = Field(default=None, min_length=1, max_length=4000)
    prompt_zh: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def at_least_one_field(self) -> "SceneUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one scene field must be provided")
        return self


class StoryboardReplace(BaseModel):
    shots: list[ShotInput] = Field(default_factory=list, max_length=50)
    characters: list[CharacterInput] | None = Field(default=None, max_length=20)
    scenes: list[SceneInput] | None = Field(default=None, max_length=20)


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


class CharacterRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    index: int
    name: str
    description: str
    prompt_en: str
    prompt_zh: str | None


class SceneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    index: int
    name: str
    description: str
    location: str
    prompt_en: str
    prompt_zh: str | None


class StoryboardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    version: int
    shots: list[ShotRead]
    characters: list[CharacterRead]
    scenes: list[SceneRead]
    created_at: datetime
    updated_at: datetime


class StoryboardVersionCreate(BaseModel):
    label: str = Field(default="Manual save", min_length=1, max_length=120)


class StoryboardVersionRead(BaseModel):
    id: UUID
    project_id: UUID
    revision: int
    label: str
    storyboard_version: int
    shot_count: int
    character_count: int
    scene_count: int
    created_at: datetime


class StoryboardVersionList(BaseModel):
    items: list[StoryboardVersionRead]


class ProjectProgressRead(BaseModel):
    percent: int = Field(ge=0, le=100)
    workflow_stage: WorkflowStage
    workflow_status: WorkflowStatus
    total_shots: int = Field(ge=0)
    completed_shots: int = Field(ge=0)
    updated_at: datetime


VisualReviewMetricKey = Literal[
    "character_consistency",
    "style_consistency",
    "prompt_alignment",
    "temporal_stability",
]


class VisualReviewCommand(BaseModel):
    asset_id: UUID
    model: str = Field(min_length=1, max_length=200)
    metrics: list[VisualReviewMetricKey] = Field(min_length=1, max_length=4)

    @field_validator("metrics")
    @classmethod
    def metrics_must_be_unique(
        cls,
        value: list[VisualReviewMetricKey],
    ) -> list[VisualReviewMetricKey]:
        return list(dict.fromkeys(value))


class VisualReviewMetric(BaseModel):
    key: VisualReviewMetricKey
    score: int = Field(ge=0, le=100)
    rationale: str = Field(min_length=1, max_length=1200)


class VisualReviewRead(BaseModel):
    asset_id: UUID
    model: str
    overall_score: int = Field(ge=0, le=100)
    metrics: list[VisualReviewMetric]
    summary: str = Field(min_length=1, max_length=2000)
    frame_count: int = Field(ge=1)
    updated_at: datetime


class VisualReviewModelRead(BaseModel):
    id: str
    label: str


class VisualReviewModelList(BaseModel):
    items: list[VisualReviewModelRead]


GenerationProvider = Literal["kling", "pippit"]


class ModelSelection(BaseModel):
    provider: GenerationProvider | None = None
    model: str | None = Field(default=None, min_length=1, max_length=200)


class GenerationApproval(ModelSelection):
    approved: bool
    generation_mode: GenerationMode = "text_to_video"
    reference_asset_id: UUID | None = None
    reference_asset_ids: list[UUID] = Field(default_factory=list, max_length=15)
    audio_enabled: bool | None = None
    resolution: Literal["720p", "1080p", "4k"] | None = None
    task_type: Literal["auto", "reference", "edit", "extend"] = "auto"


ImageGenerationMode = Literal["text_to_image", "image_to_image"]


class CharacterGenerationApproval(ModelSelection):
    approved: bool
    generation_mode: ImageGenerationMode = "text_to_image"
    reference_asset_id: UUID | None = None


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
    return ["21:9", "16:9", "9:16", "1:1"]


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


class AssetUpdate(BaseModel):
    filename: str = Field(min_length=1, max_length=256)


ResourceType = Literal["shot", "character", "scene"]


class ResourceSelectionUpdate(BaseModel):
    resource_type: ResourceType
    resource_id: UUID
    asset_id: UUID | None = None


class ResourceSelectionRead(BaseModel):
    resource_type: ResourceType
    resource_id: UUID
    asset_id: UUID


class ResourceSelectionList(BaseModel):
    items: list[ResourceSelectionRead]


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


CollaborationPermission = Literal["view", "edit"]


class ProjectCollaborationCreate(BaseModel):
    permission: CollaborationPermission = "edit"
    collaborator_email: EmailStr | None = None
    expires_in_hours: int = Field(default=24 * 7, ge=1, le=24 * 90)


class ProjectCollaborationRead(BaseModel):
    id: UUID
    project_id: UUID
    permission: CollaborationPermission
    collaborator_email: str | None
    share_url: str
    expires_at: datetime
    created_at: datetime


class ProjectCollaborationAcceptRead(BaseModel):
    project_id: UUID
    permission: CollaborationPermission


class ExportRequest(BaseModel):
    aspect_ratios: list[AspectRatio] = Field(
        default_factory=_default_aspect_ratios,
        min_length=1,
        max_length=4,
    )
    soundtrack_asset_id: UUID | None = None
    captions: str | None = Field(default=None, max_length=20_000)
    permission: AssetPermission = "private"


class ExportResponse(BaseModel):
    items: list[AssetRead]
    cover: AssetRead | None = None


class SkillOptimizeRequest(BaseModel):
    idea: str = Field(min_length=3, max_length=8_000)
    title: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=4_000)
    instructions: str | None = Field(default=None, max_length=20_000)
    locale: SupportedLocale = "en"

    @field_validator("idea")
    @classmethod
    def idea_must_not_be_blank(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Idea must not be blank")
        return normalized


class SkillOptimizeResponse(BaseModel):
    skill_id: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1, max_length=4_000)
    instructions: str = Field(min_length=1, max_length=20_000)
    prompt_template: str = Field(min_length=1, max_length=4_000)
    input_schema: dict[str, object] = Field(default_factory=dict)
    output_schema: dict[str, object] = Field(default_factory=dict)

    @field_validator("skill_id")
    @classmethod
    def normalize_skill_id(cls, value: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")
        if not normalized:
            raise ValueError("Skill ID must contain letters or numbers")
        return normalized[:120]


class UserSkillCreate(SkillOptimizeResponse):
    visibility: Literal["private", "public"] = "public"


class UserSkillRead(SkillOptimizeResponse):
    id: UUID
    user_id: str
    visibility: Literal["private", "public"]
    is_mine: bool
    likes: int
    uses: int
    is_liked: bool
    created_at: datetime
    updated_at: datetime


class UserSkillList(BaseModel):
    items: list[UserSkillRead]


class SkillEngagementRead(BaseModel):
    likes: int
    uses: int
    is_liked: bool


class SkillEngagementRequest(BaseModel):
    skill_key: str = Field(min_length=3, max_length=240)

    @field_validator("skill_key")
    @classmethod
    def normalize_skill_key(cls, value: str) -> str:
        parts = value.strip().lower().split("/")
        if len(parts) != 2:
            raise ValueError("Skill key must include a namespace")
        normalized = "/".join(re.sub(r"[^a-z0-9_]+", "_", part).strip("_") for part in parts)
        if len(normalized) < 3 or normalized.startswith("/"):
            raise ValueError("Skill key must include a namespace and Skill ID")
        return normalized[:240]


class SkillEngagementQuery(BaseModel):
    skill_keys: list[str] = Field(default_factory=list, max_length=100)


class SkillEngagementList(BaseModel):
    items: dict[str, SkillEngagementRead]


class HotsPostRead(BaseModel):
    id: UUID
    asset_id: UUID
    title: str
    prompt: str
    skill: str
    author: str
    likes: int
    is_mine: bool
    is_liked: bool
    created_at: datetime


class HotsPostList(BaseModel):
    items: list[HotsPostRead]


class HotsPublishFromAsset(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    prompt: str = Field(default="", max_length=20_000)
    skill: str = Field(default="auto", max_length=120)


class AgentMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=20_000)
    run_id: UUID | None = None

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


class AgentActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    run_id: UUID
    sequence: int
    kind: AgentActivityKind
    label: str
    detail: str | None
    status: AgentActivityStatus
    created_at: datetime


class AgentActivityList(BaseModel):
    items: list[AgentActivityRead]


class DependencyHealth(BaseModel):
    database: Literal["ok", "error"]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    dependencies: DependencyHealth

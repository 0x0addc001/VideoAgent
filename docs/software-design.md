# VideoAgent 软件设计说明书

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.1 |
| 文档状态 | 已评审通过 |
| 编写日期 | 2026-11-02 |
| 产品名称 | VideoAgent |
| 后端技术 | Python + FastAPI |
| 前端技术 | Next.js + TypeScript |
| 模型服务 | Pippit CLI：Seedance 2.5 Draft、Seedance 2.5、Seedance 2.0 Fast VIP、Seedance 2.0 VIP、Seedance 2.0 Mini 体验版、Seedance 2.0 Mini、Wan 3.0、HappyHorse 1.1 |

## 1. 文档目的

本文档描述 VideoAgent 的产品目标、系统架构、核心模块、Agent 编排、数据模型、接口规范、Pippit CLI 集成、安全策略、测试策略及部署方式，供产品、前端、后端、测试和运维研发人员共同参考。

本文档是 MVP 实现基线。涉及外部服务能力变化、付费生成策略或生产部署架构的修改，应通过新的设计决策记录变更，不应直接修改历史决策。

## 2. 产品概述

VideoAgent 是一个面向内容创作者、营销人员和普通用户的 AI 视频创作平台。用户通过自然语言对话、上传素材或选择模板，在 Agent 协助下完成创意策划、故事板设计、视频镜头生成、结果审核及最终视频合成。

系统同时提供：

- **Agent 模式：** 从创意到故事板再到视频成片。
- **直接生成模式：** 为单个镜头或图片直接设置参数并生成。
- **素材模式：** 基于产品图、角色图或参考视频生成内容。
- **项目管理：** 保存项目状态、对话、素材、任务和导出结果。

系统借鉴 Lumina 的对话式生成、Pippit 的创作模板和素材工作流，但采用可控制的镜头级故事板及 Provider 抽象，避免将业务流程绑定到单一视频模型。

## 3. 产品目标与范围

### 3.1 MVP 目标

- 当前公开界面固定为英文；中文路由统一重定向到英文。
- 支持项目创建、编辑、恢复和删除。
- 支持图片、视频等创作素材上传。
- 支持 Agent 生成创意方案和多镜头故事板。
- 支持镜头参数编辑和积分成本估算。
- 支持故事板即时评估，计算一致性、覆盖度、提示清晰度和节奏。
- 支持服务端统一授权的 Pippit CLI。
- 支持 Pippit 文本生成视频、任务查询和积分余额读取。
- 支持异步任务提交、状态查询、失败恢复和结果保存。
- 支持镜头审核、重新生成、排序和 FFmpeg 合成。
- 支持 MP4 下载和公开只读分享。
- 保证 Pippit Access Key、CLI 登录文件和服务端路径不暴露给浏览器。

### 3.2 MVP 不包含

- 订阅、充值或平台积分销售。
- 多人实时协作。
- 专业非线性视频编辑器。
- 数字人、声音克隆和音乐生成。
- Marketplace、联盟营销和模板交易。
- Provider 自动竞价或自动模型路由。
- 移动端原生 App。

## 4. 用户与核心场景

### 4.1 目标用户

- 普通内容创作者。
- 电商和产品营销人员。
- 社交媒体运营人员。
- 广告创意和短视频制作人员。

### 4.2 核心用户流程

```text
登录
  → 在首页多设定创作框描述创意
  → 提交时自动创建默认项目
  → 直接进入项目工作区
  → Agent 追问并生成创意方案
  → 编辑故事板和镜头
  → 查看预计积分
  → 确认生成
  → 查看生成进度
  → 审核并重新生成镜头
  → 合成视频
  → 导出或分享
```

## 5. 总体架构

```text
┌─────────────────────────────────────────────────────────┐
│ Next.js Web                                             │
│ 对话 / 故事板 / 视频预览 / 时间线 / 中英文界面          │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS / SSE
┌─────────────────────────▼───────────────────────────────┐
│ FastAPI                                                 │
│ Auth / Projects / Assets / Agent / Jobs                 │
└────────────┬──────────────────────────┬─────────────────┘
             │                          │
┌────────────▼────────────┐  ┌──────────▼─────────────────┐
│ LangGraph               │  │ PostgreSQL                 │
│ Agent 工作流 / 审批     │  │ 业务数据 / Checkpoint      │
└────────────┬────────────┘  └────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│ Celery Worker + Redis/Broker                            │
│ 生成提交 / 轮询 / 下载 / 缩略图 / FFmpeg 合成          │
└────────────┬────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────┐
│ Pippit CLI / S3 或 MinIO / FFmpeg                       │
└─────────────────────────────────────────────────────────┘
```

生产环境通过 Nginx 或 Caddy 使用统一域名：

- `/` 路由到 Next.js。
- `/api/*` 路由到 FastAPI。
- `/api/projects/{id}/events` 使用 SSE。
- API 代理必须关闭响应缓冲。
- 使用同域 HttpOnly Cookie 管理会话。

## 6. 技术栈

| 模块 | 技术 |
| --- | --- |
| Web 前端 | Next.js App Router、React、TypeScript |
| UI | Tailwind CSS、shadcn/ui、Radix UI、Lucide |
| 国际化 | next-intl |
| 前端状态 | TanStack Query、Zustand |
| 表单校验 | React Hook Form、Zod |
| 时间线 | dnd-kit |
| API | FastAPI、Uvicorn |
| Agent | LangGraph |
| 模型调用 | LangChain OpenAI-compatible Provider |
| 数据校验 | Pydantic v2 |
| 视频服务 | Pippit CLI 1.x |
| 服务端授权 | CLI 浏览器登录或 `XYQ_ACCESS_KEY` |
| MCP | Python MCP SDK（非当前默认视频链路） |
| 数据库 | PostgreSQL |
| ORM | SQLAlchemy 2 Async、asyncpg |
| 迁移 | Alembic |
| 任务队列 | Celery |
| MVP Broker | Redis |
| 生产 Broker | RabbitMQ 可选 |
| 实时事件 | sse-starlette、Redis Pub/Sub |
| 对象存储 | S3、MinIO、Boto3 |
| 视频处理 | FFmpeg、ffprobe |
| 图片处理 | Pillow |
| 用户认证 | fastapi-users、Argon2 |
| 凭据加密 | cryptography AES-256-GCM |
| 日志 | structlog |
| 单元测试 | pytest、pytest-asyncio |
| E2E 测试 | Playwright |
| Python 环境 | uv、pyproject.toml |
| 代码质量 | Ruff、mypy |
| 本地环境 | Docker Compose |

依赖版本在项目初始化时锁定为稳定版本，并提交 `uv.lock`、`pnpm-lock.yaml` 等锁文件。

## 7. 项目结构

```text
VideoAgent/
├── apps/
│   └── web/
│       ├── src/app/
│       ├── src/components/
│       ├── src/features/
│       ├── src/lib/api/
│       └── messages/
├── services/
│   └── api/
│       ├── pyproject.toml
│       ├── alembic/
│       ├── src/videoagent/
│       │   ├── api/
│       │   ├── agent/
│       │   ├── db/
│       │   ├── providers/
│       │   ├── services/
│       │   ├── workers/
│       │   └── main.py
│       └── tests/
├── contracts/
│   └── openapi.json
├── deploy/
│   ├── docker-compose.yml
│   ├── nginx/
│   └── Dockerfiles
├── docs/
├── Makefile
├── README.md
└── .env.example
```

前后端契约以 FastAPI 生成的 OpenAPI 文档为准，前端客户端类型通过 OpenAPI 自动生成。

## 8. 模块划分

| 模块 | 职责 |
| --- | --- |
| `api.auth` | 注册、登录、会话和用户信息 |
| `api.projects` | 项目生命周期和权限 |
| `api.assets` | 上传、下载和素材管理 |
| `api.agent` | 消息、流式响应和工作流控制 |
| `api.jobs` | 生成任务查询和取消 |
| `api.exports` | 合成、导出和分享 |
| `agent.graph` | LangGraph 图定义 |
| `agent.nodes` | 创意、故事板、审核、导出节点 |
| `agent.schemas` | Pydantic 输入输出模型 |
| `providers.base` | Provider 抽象接口 |
| `providers.pippit` | Pippit CLI 适配器 |
| `providers.mock` | 无外部依赖的测试 Provider |
| `services.media` | 上传校验、缩略图和 FFmpeg |
| `workers.generation` | Pippit 任务轮询 |
| `workers.export` | 视频合成和转码 |

## 9. Agent 设计

### 9.1 基本策略

MVP 使用一个主 Agent 和多个确定性工作流节点，不采用无限制 ReAct 循环，也不在首版拆成多个自由对话 Agent。

- LangGraph 控制业务阶段和人工审批。
- LangChain OpenAI-compatible Provider 执行模型调用。
- Pydantic 校验模型输出和工具参数。
- Celery 执行耗时的外部任务。
- PostgreSQL 保存工作流检查点。

### 9.2 主流程

```text
intake
  → load_project_context
  → classify_intent
  → gather_requirements
  → create_treatment
  → create_storyboard
  → validate_storyboard
  → await_plan_approval
  → estimate_cost
  → await_generation_approval
  → submit_generation_jobs
  → wait_for_jobs
  → review_results
  → revise_shots
  → assemble_video
  → await_export_approval
  → export_video
  → completed
```

失败状态：

```text
auth_required
insufficient_credits
provider_unavailable
generation_failed
cancelled
```

### 9.3 工作流状态

```python
class VideoProjectState(TypedDict):
    project_id: UUID
    locale: Literal["en", "zh-CN"]

    brief: str
    aspect_ratio: str
    target_duration: int | None

    treatment: dict | None
    storyboard: list[dict]

    reference_assets: list[UUID]
    approval: dict | None

    active_jobs: list[UUID]
    failed_jobs: list[UUID]
    completed_assets: list[UUID]

    step: str
    last_error: str | None
```

### 9.4 Agent 工具

只允许 Agent 使用业务级白名单工具：

```text
create_storyboard
update_shot
estimate_generation_cost
submit_generation
get_generation_status
regenerate_shot
assemble_video
export_video
```

以下操作不能由 Agent 自主执行：

- 删除 Element 或项目。
- 断开 Provider。
- 支付或充值。
- 修改安全设置。
- 执行任意 Shell 命令。
- 访问用户未授权的其他项目。

### 9.5 审批策略

以下动作必须由用户显式确认：

- 提交任何可能计费的视频或图片生成。
- 重新生成已完成镜头。
- 把 Provider 积分用于批量任务。
- 发布公开分享链接。
- 删除项目或素材。

审批记录包含用户、项目、操作、参数摘要、预计费用和时间。

## 10. LangGraph 与 Celery

LangGraph 和 Celery 职责分离：

- LangGraph 决定业务阶段。
- Celery 负责长时间任务执行。
- PostgreSQL 保存最终状态和检查点。
- Redis 传递实时事件。

任务流程：

1. LangGraph 创建镜头和生成计划。
2. 用户批准生成。
3. FastAPI 创建数据库任务和本地幂等键。
4. API 调用 `pippit-tool-cli generate-video` 提交任务。
5. 保存 thread ID 与 run ID 组成的标准化任务引用。
6. Celery 调用 `pippit-tool-cli query-result` 轮询。
7. 成功后将媒体复制到应用对象存储。
8. 发布 `job.completed` 事件。
9. SSE 更新前端。
10. 所有镜头完成后恢复 LangGraph 审核节点。

具备不确定性的提交不能自动重发。提交超时但未获得 Provider Task ID 时，任务进入 `submission_uncertain`，通过查询账户近期任务进行人工或自动对账。

## 11. Pippit CLI 集成

### 11.1 连接方式

```text
运维在 API 主机安装 Pippit CLI
  → 运维执行 pippit-tool-cli login
  → CLI 将设备凭据保存到操作系统安全存储
  → 或 CI 注入 VIDEOAGENT_PIPPIT_ACCESS_KEY
  → FastAPI 通过受限子进程调用 CLI
  → 读取 Pippit 账户状态和积分
```

Pippit 授权由服务端统一持有，不对每个 VideoAgent 用户单独发起 Kling
授权。所有用户共享当前 Pippit 账户及其积分池；如果未来需要用户级计费，
必须新增租户级凭据隔离和额度服务，不能直接复用该服务账户模型。

### 11.2 Provider 接口

```python
class VideoProvider(Protocol):
    async def capabilities(self) -> ProviderCapabilities: ...
    async def estimate(self, request: GenerationRequest) -> CostEstimate: ...
    async def submit(self, request: GenerationRequest) -> ProviderJob: ...
    async def status(self, job_id: str) -> JobStatus: ...
    async def cancel(self, job_id: str) -> None: ...
```

### 11.3 首版 Pippit 能力

```text
pippit-tool-cli status
pippit-tool-cli get-credit-balance
pippit-tool-cli generate-video
pippit-tool-cli query-result
```

首版仅开放文本生成视频。Provider 使用参数数组启动 CLI，不经过 Shell
字符串拼接；stdout 仅接受 JSON，stderr 和完整命令参数不返回到浏览器。
模型与分辨率由服务端环境变量可选配置，留空时使用 CLI 服务的默认值。

### 11.4 凭据与进程安全

- CLI 登录文件由操作系统安全存储管理，不写入仓库或数据库。
- `VIDEOAGENT_PIPPIT_ACCESS_KEY` 仅作为服务端秘密环境变量注入子进程。
- 浏览器、API 响应和日志均不返回 Access Key。
- CLI 命令使用 `asyncio.create_subprocess_exec` 的参数数组形式执行。
- 子进程受超时控制；超时后终止进程，不自动重提计费任务。
- Web 进程必须只允许受信用户触发生成，并在调用前执行显式审批。

## 12. 数据模型

| 表 | 关键字段 | 说明 |
| --- | --- | --- |
| `users` | `id`, `email`, `locale`, `status` | 用户和语言偏好 |
| `sessions` | `id`, `user_id`, `expires_at` | 服务端会话 |
| `projects` | `id`, `owner_id`, `title`, `state`, `brief` | 视频项目 |
| `conversations` | `id`, `project_id` | 项目对话 |
| `messages` | `id`, `role`, `content`, `metadata` | 对话和工具消息 |
| `storyboards` | `id`, `project_id`, `version` | 故事板版本 |
| `shots` | `id`, `storyboard_id`, `index`, `prompt`, `status` | 镜头定义 |
| `assets` | `id`, `project_id`, `kind`, `storage_key` | 上传和生成媒体 |
| `provider_connections` | `id`, `user_id`, `provider`, `encrypted_tokens` | 历史 OAuth 表，当前 Pippit 链路不使用 |
| `generation_jobs` | `id`, `shot_id`, `provider_task_id`, `status` | 生成任务 |
| `tool_runs` | `id`, `job_id`, `tool_name`, `request_id`, `status` | 工具调用审计 |
| `usage_ledger` | `id`, `user_id`, `project_id`, `amount`, `metadata` | 积分和费用记录 |
| `exports` | `id`, `project_id`, `asset_id`, `status` | 最终导出 |
| `public_shares` | `id`, `project_id`, `token_hash`, `expires_at` | 公开分享 |

统一使用 UUID 主键、UTC 时间戳和数据库外键。Provider 原始响应保存在 `JSONB` 字段中，业务逻辑只消费标准化对象。

## 13. 核心状态定义

### 13.1 项目状态

```text
draft
planning
awaiting_plan_approval
generating
review
assembling
completed
failed
archived
```

### 13.2 镜头状态

```text
draft
ready
queued
generating
completed
failed
cancelled
```

### 13.3 生成任务状态

```text
pending
submission_uncertain
submitted
queued
running
succeeded
failed
cancelled
```

## 14. API 设计

### 14.1 通用规范

- 基础路径：`/api/v1`。
- 认证：HttpOnly 服务端会话 Cookie。
- 成功响应使用 JSON；文件上传使用预签名 URL。
- 错误统一返回稳定错误码。
- 列表接口使用游标分页。
- 所有计费写操作支持 `Idempotency-Key` 请求头。
- OpenAPI 是前后端接口契约。

统一错误响应：

```json
{
  "error": {
    "code": "KLING_INSUFFICIENT_CREDITS",
    "message": "Insufficient credits",
    "details": {},
    "requestId": "req_..."
  }
}
```

### 14.2 主要接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 |
| POST | `/auth/logout` | 退出 |
| GET | `/auth/me` | 当前用户 |
| GET/POST | `/projects` | 项目列表和创建 |
| GET/PATCH/DELETE | `/projects/{id}` | 项目操作 |
| POST | `/projects/{id}/messages` | 发送消息并流式返回 |
| GET | `/projects/{id}/events` | 项目 SSE 事件 |
| GET | `/projects/{id}/storyboard` | 获取故事板 |
| PATCH | `/shots/{id}` | 修改镜头 |
| POST | `/shots/{id}/estimate` | 积分估算 |
| POST | `/shots/{id}/generate` | 创建生成任务 |
| GET | `/jobs/{id}` | 查询任务 |
| POST | `/jobs/{id}/cancel` | 取消任务 |
| POST | `/assets/presign` | 获取上传地址 |
| POST | `/assets/complete` | 确认上传 |
| GET | `/providers/pippit` | 服务端 Pippit 状态 |
| GET | `/providers/pippit/credits` | Pippit 积分余额 |
| POST | `/projects/{id}/export` | 合成导出 |
| POST | `/projects/{id}/share` | 创建公开分享 |
| GET | `/health` | 健康检查 |

### 14.3 SSE 事件

```json
{
  "event": "job.updated",
  "projectId": "uuid",
  "jobId": "uuid",
  "status": "running",
  "progress": 45,
  "occurredAt": "2026-11-01T12:00:00Z"
}
```

事件至少包括：

- `agent.message`
- `agent.requires_approval`
- `job.updated`
- `asset.created`
- `export.updated`
- `workflow.failed`

客户端断线重连时先调用 REST API 获取完整状态，再恢复 SSE，避免丢失事件。

## 15. 素材与媒体处理

### 15.1 上传

1. 前端向 FastAPI 请求预签名上传 URL。
2. 浏览器直接上传到 MinIO/S3。
3. FastAPI 校验文件类型、文件头、大小和 checksum。
4. 生成缩略图和媒体元数据。
5. 上传完成后才允许被镜头引用。

### 15.2 生成结果

- Provider 临时 URL 不直接作为长期播放地址。
- Worker 下载结果并保存到应用对象存储。
- 记录时长、宽高、编码、文件大小和 checksum。
- 失败下载按照安全退避策略重试。

### 15.3 导出

- 使用 FFmpeg 参数数组调用，禁止字符串拼接 Shell 命令。
- 统一分辨率、帧率和音频参数。
- 输出 MP4，并生成封面缩略图。
- 导出任务可取消，临时文件在完成或失败后清理。

## 16. 前端设计

### 16.1 信息架构

- 首页：右侧导航和居中的多设定创作聊天框；提交即创建项目。
- 项目列表。
- 项目工作区：对话、故事板、素材和镜头编辑。
- 素材库。
- Pippit 服务端授权状态。
- 生成历史。
- 设置。
- 公开分享页。

### 16.2 项目工作区

桌面端采用三栏：

```text
Agent 对话 | 视频预览与故事板 | 镜头检查器
```

移动端采用标签页：

```text
Agent | Canvas | Inspector
```

镜头检查器包含：

- Prompt 中英文版本。
- 参考图和参考视频。
- 生成模式。
- 宽高比。
- 时长。
- Provider 模型参数。
- 积分估算。
- 生成和重试按钮。

### 16.3 前端状态

- TanStack Query：项目、镜头、任务、积分等服务端状态。
- Zustand：当前镜头、侧栏、播放器和时间线选择。
- 聊天 Token 使用流式 `fetch`。
- 项目事件使用 SSE。
- 不将 Provider 凭据、Access Key 或敏感任务内容写入 localStorage。

## 17. 中英文支持

路由：

```text
/en/...
/zh-CN/...
```

国际化范围包括：

- 界面文案、按钮、表单校验。
- Agent 对话和故事板说明。
- 错误码对应的用户提示。
- 任务状态和通知。
- 模板、推荐 Prompt 和空状态。
- 公开分享页。
- 日期、时间和数字格式。

Agent 输出支持三种 Prompt 模式：

- 中文说明 + 英文模型 Prompt。
- 全中文。
- 中英双语对照。

后端 API 使用稳定错误码；用户可读文案由前端翻译资源提供。用户选择语言后同时保存到用户资料和 Cookie。

## 18. 安全与隐私

- 所有项目、镜头、任务和资产必须校验资源所有权。
- 会话 Cookie 使用 HttpOnly、Secure、SameSite。
- 修改类 Cookie API 校验 CSRF Token 或受控 Origin。
- Pippit CLI 登录文件放在服务账号可访问但受严格权限保护的位置。
- `VIDEOAGENT_PIPPIT_ACCESS_KEY` 只保存在秘密管理系统或服务环境变量中。
- 上传文件限制类型、大小和扩展名，并检查文件头。
- 素材通过短期签名 URL 访问。
- Agent 工具使用服务端白名单和 Pydantic 参数校验。
- 上传文件、OCR 文本和文件名视为不可信数据，防止 Prompt Injection。
- 不使用 Agent 生成的内容拼接 Shell 命令。
- 用户、项目和生成接口使用独立限流。
- 删除用户或断开 Provider 时删除相关凭据。
- 日志不记录密码、Cookie、Token、Authorization Header。

## 19. 可靠性设计

- Celery 使用延迟确认，避免 Worker 崩溃导致任务立即丢失。
- 数据库任务状态为业务事实来源。
- 提交、查询、下载和导出使用不同重试策略。
- 查询和下载采用指数退避；生成提交禁止盲目重试。
- 任务设置最长运行时间和超时告警。
- Celery Beat 定期清理过期任务和孤立临时文件。
- SSE 支持 Last-Event-ID 或“重新获取完整状态”的恢复方式。
- LangGraph Checkpoint 支持审批和失败后的恢复。

## 20. 可观测性

使用 structlog 输出结构化日志，至少包含：

- `request_id`
- `user_id`
- `project_id`
- `job_id`
- `tool_run_id`
- `provider`
- `tool_name`
- `duration_ms`
- `error_code`

关键指标：

- 生成任务成功率。
- Provider 平均排队时间和生成时间。
- Pippit CLI 命令错误率。
- 任务重复提交次数。
- 单项目积分使用量。
- SSE 活跃连接数。
- Worker 队列积压。
- FFmpeg 导出失败率。

## 21. 测试策略

测试以测试驱动开发为主要工作方式。详细测试范围、测试用例、覆盖目标和质量门禁见 `docs/software-test-plan.md`。

整体原则：

- 每个业务能力先编写失败测试，再实现最小代码，最后重构。
- CI 仅使用 Mock Provider，不执行真实付费生成。
- 单元测试不依赖 PostgreSQL、Redis、MinIO 或 Pippit 网络。
- 集成测试使用可重复、可清理的真实基础设施。
- Pippit 状态和余额只读 Smoke Test 使用受控服务账户。
- 真实生成测试必须人工触发并显式限制次数和积分预算。

## 22. 配置项

后端至少需要：

```text
DATABASE_URL
REDIS_URL
CELERY_BROKER_URL
CELERY_RESULT_BACKEND
S3_ENDPOINT
S3_BUCKET
S3_ACCESS_KEY
S3_SECRET_KEY
SESSION_SECRET
TOKEN_ENCRYPTION_KEY
PIPPIT_CLI_COMMAND
PIPPIT_ACCESS_KEY
PIPPIT_VIDEO_MODEL
PIPPIT_VIDEO_RESOLUTION
LLM_BASE_URL
LLM_API_KEY
LLM_MODEL
```

所有敏感值通过环境变量或密钥管理服务提供，不提交到 Git。

## 23. 部署设计

本地开发使用 Docker Compose：

```text
web
api
worker
beat
postgres
redis
minio
reverse-proxy
```

生产环境使用独立镜像：

- Next.js 镜像。
- FastAPI 镜像。
- Celery Worker 镜像。
- Celery Beat 镜像。
- Nginx/Caddy 反向代理。
- 外部 PostgreSQL。
- Redis 或 RabbitMQ。
- S3 兼容对象存储。

部署流程：

1. 安装锁定依赖。
2. 执行 Ruff、mypy 和测试。
3. 构建前后端镜像。
4. 执行 Alembic 迁移。
5. 滚动更新 API。
6. 更新 Worker。
7. 检查健康和 Provider 状态。

## 24. 实施阶段

### 阶段 1：基础工程

- 初始化目录和依赖。
- 启动 Docker 服务。
- 完成中英文设计系统和基础页面。
- 建立 OpenAPI 前端客户端。

### 阶段 2：用户、项目和素材

- 登录和会话。
- 项目工作区。
- S3/MinIO 上传。
- 故事板数据模型。

### 阶段 3：Agent 与 Mock Provider

- LangGraph 工作流。
- 对话和结构化输出。
- 故事板编辑。
- Celery 和 SSE。
- 无积分消耗的完整模拟流程。

### 阶段 4：Pippit 集成

- CLI 安装、服务端授权和凭据隔离。
- 视频模型发现和参数适配。
- 身份和积分查询。
- 正式生成、轮询、下载和恢复。

### 阶段 5：合成与发布

- 镜头审核。
- FFmpeg 合成。
- 导出和公开分享。

### 阶段 6：测试和部署

- pytest、Playwright。
- 安全和权限测试。
- Docker 部署。
- 运维文档。

## 25. 验收标准

MVP 满足以下条件才视为完成：

1. 中文和英文界面均可完整使用。
2. 用户能够创建、修改、归档和删除自己的项目。
3. Agent 能生成符合 Pydantic Schema 的多镜头故事板。
4. 用户可以在生成前查看并批准预计积分费用。
5. 刷新页面或重启服务后任务状态不会丢失。
6. Pippit Access Key 和 CLI 登录文件不出现在浏览器、日志或公开接口中。
7. 生成任务不会因自动重试造成重复扣费。
8. 用户可以审核、重新生成、排序和合成镜头。
9. 最终视频可下载，并能创建可撤销的公开分享链接。
10. Mock Provider 的自动化测试全部通过。
11. Pippit 状态和积分只读 Smoke Test 通过。
12. 在账户有积分且用户授权的情况下，至少完成一次真实视频生成和导出。

## 26. 主要风险

| 风险 | 应对措施 |
| --- | --- |
| Pippit CLI 参数或输出变化 | 命令契约测试、Provider 隔离、版本锁定 |
| 生成提交超时导致不确定状态 | 本地幂等键、任务对账、禁止盲目重试 |
| 视频生成耗时长 | Celery、持久任务、SSE、超时与取消 |
| 费用误用 | 审批门、预算上限、积分流水 |
| Token 泄露 | 服务端加密、日志脱敏、Cookie 安全 |
| 前后端类型不一致 | OpenAPI 自动生成客户端 |
| 文件过大或非法上传 | 预签名、大小和 MIME 校验 |
| Celery 与 LangGraph 状态重复 | 明确数据库事实来源和单向事件流 |
| 中英文内容不同步 | 统一翻译键、双语测试、Agent Locale 状态 |

## 27. 待确认事项

以下事项不影响开始实现，但影响生产部署：

- 使用哪个 OpenAI-compatible 模型服务平台。
- 生产部署服务器和域名。
- 是否在 MVP 中开放公开分享。
- 媒体保留时间和最大上传大小。
- 是否为服务端 Pippit 账户补充积分以执行真实生成验收。
- 生产 Celery Broker 是否直接使用 RabbitMQ。

## 28. 变更记录

| 版本 | 日期 | 状态 | 说明 |
| --- | --- | --- | --- |
| v0.1 | 2026-11-01 | 待评审 | 初始软件设计 |
| v1.0 | 2026-11-01 | 已评审通过 | 确定 Python 后端、中英文及 TDD 要求 |

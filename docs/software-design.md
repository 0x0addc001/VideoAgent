# VideoAgent 软件设计说明书

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.2 |
| 更新日期 | 2026-11-04 |
| 后端技术 | Python + FastAPI |
| 前端技术 | Next.js + TypeScript |
| 模型技术 | Seedance 2.5 Draft（Pippit）、Seedance 2.5（Pippit）、Seedance 2.0 Fast VIP（Pippit）、Seedance 2.0 VIP（Pippit）、Seedance 2.0 Mini 体验版（Pippit）、Seedance 2.0 Mini（Pippit）、Wan 3.0（Pippit）、HappyHorse 1.1（Pippit） |

## 1. 文档目的

本文档描述 VideoAgent 的产品目标、系统架构、核心模块、Agent 编排、数据模型、接口规范、Pippit CLI 集成、安全策略、测试策略及部署方式，供产品、前端、后端、测试和运维研发人员共同参考。

本文档同时记录当前代码基线与后续目标架构。未在代码中落地的能力会明确标注为“目标”，不能作为现有交付能力引用。涉及外部服务能力变化、付费生成策略或生产部署架构的修改，应通过新的设计决策记录变更。

## 2. 产品概述

VideoAgent 是一个面向内容创作者、营销人员和普通用户的 AI 视频创作平台。当前版本以“用户是导演”为核心，通过统一的左侧工作台进入 Agents、Skills、Hots、Assets 和 Docs；用户从首页创作框描述创意后创建项目，进入项目工作区与 VideoAgent 协作生成故事板并发起镜头生成。

系统同时提供：

- **Agents：** 首页创作入口和项目内 VideoAgent 对话。
- **Skills：** 单一可搜索 Skill 目录，使用 `user_id/skill_id` 标识，并支持用户发布。
- **Hots：** 可搜索社区作品流，展示作者、喜欢数并支持当前会话内发布。
- **Assets：** 用户成品与半成品作品库，按 Video/Skill 分页并支持搜索。
- **Docs：** 六份中英文文档、全文搜索、固定深色主题和左侧可折叠目录。
- **项目管理：** 保存项目状态、对话、故事板和生成任务。

系统借鉴 Lumina 的对话式生成、Pippit 的创作模板和 Kling/OpenArt 的创作工作台组织方式，但当前视频执行链路统一由服务端 Pippit CLI Provider 承担，并通过 Provider 接口保留后续扩展空间。

## 3. 产品目标与范围

### 3.1 MVP 目标

- 当前公开产品界面固定为英文；`/zh-CN` 路由统一重定向到 `/en`。
- 项目主页与正式产品首页复用 `packages/landing` 同一套 UI，项目主页仅将不可用动作替换为预览提示。
- 首页采用左侧导航、连续视频背景、居中创作框和自定义透明下拉控件。
- 搜索、语言、通知、积分和头像使用半透明表面，相关菜单统一向下展开；头像支持登录、注册和退出。
- Hots 展示作者与喜欢数，并支持当前浏览器会话内的本地发布。
- 支持项目创建、编辑、恢复和删除。
- 支持 Agent 生成创意方案和多镜头故事板。
- 支持镜头参数编辑和积分成本估算。
- 支持故事板即时评估，计算一致性、覆盖度、提示清晰度和节奏。
- 支持服务端统一授权的 Pippit CLI。
- 支持 Pippit 文本生成视频、任务查询和积分余额读取。
- 支持可选 Celery 后台轮询，未启用时由前端轮询任务状态。
- 保证 Pippit Access Key、CLI 登录文件和服务端路径不暴露给浏览器。

以下能力属于目标范围，当前代码尚未实现：

- 图片、视频和参考素材上传。
- Redis Pub/Sub、SSE 实时事件与断线恢复。
- 镜头排序、重新生成审批和 FFmpeg 合成。
- MP4 导出、公开分享与撤销。
- Alembic 正式迁移、对象存储和 OpenAPI 客户端自动生成。
- 持久化社区发布、点赞与跨用户社区 API。

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

### 5.1 当前实现

```text
┌─────────────────────────────────────────────────────────┐
│ Next.js App / Static Project Homepage                   │
│ 共享 Landing UI / 项目工作区 / 内嵌文档                  │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS / JSON / polling
┌─────────────────────────▼───────────────────────────────┐
│ FastAPI /api/v1                                         │
│ Auth / Projects / Storyboards / Agent / Jobs / Eval     │
└──────────┬──────────────────┬───────────────────────────┘
           │                  │
┌──────────▼─────────┐  ┌─────▼────────────────────────────┐
│ LangGraph          │  │ SQLAlchemy Async                 │
│ 单节点故事板规划   │  │ SQLite（本地）/ PostgreSQL（目标）│
└──────────┬─────────┘  └──────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────┐
│ Celery（可选） + Redis + Pippit CLI                      │
│ 任务轮询 / 状态更新                                      │
└──────────────────────────────────────────────────────────┘
```

正式产品使用 Next.js Route Handler 将浏览器 `/api/account/*` 请求代理到
FastAPI，避免浏览器直接依赖后端域名。当前主要状态同步方式为前端轮询：

```text
GET /jobs/{job_id} → FastAPI 查询 Provider → 更新数据库 → 返回最新状态
```

### 5.2 目标架构

生产目标通过 Nginx 或 Caddy 使用统一域名：

- `/` 路由到 Next.js。
- `/api/*` 路由到 FastAPI。
- `/api/projects/{id}/events` 使用 SSE。
- API 代理必须关闭响应缓冲。
- 使用同域 HttpOnly Cookie 管理会话。
- PostgreSQL 保存业务数据和 LangGraph Checkpoint。
- Redis Pub/Sub 将 Worker 事件转发到 SSE。
- S3/MinIO 保存上传素材与生成结果。
- FFmpeg Worker 负责合成、导出和缩略图。

## 6. 技术栈

| 模块 | 技术 |
| --- | --- |
| Web 前端 | Next.js 16 App Router、React 19、TypeScript 5.9 |
| 项目主页 | Vite、React、GitHub Pages |
| UI | Tailwind CSS 4、Lucide、共享 Landing CSS |
| 国际化 | next-intl 路由脚手架；公开产品当前仅开放英文 |
| 前端状态 | 当前主要使用 React 页面状态；TanStack Query、Zustand 已预留但未接入核心页面 |
| 表单校验 | 浏览器原生表单、Zod、Pydantic |
| API | FastAPI、Uvicorn |
| Agent | LangGraph |
| 模型调用 | LangChain OpenAI-compatible Provider |
| 数据校验 | Pydantic v2 |
| 视频服务 | Pippit CLI 1.x（默认）、Mock Provider |
| 服务端授权 | CLI 浏览器登录或 `XYQ_ACCESS_KEY` |
| MCP | Python MCP SDK（非当前默认视频链路） |
| 数据库 | SQLite（当前开发默认）；PostgreSQL（目标） |
| ORM | SQLAlchemy 2 Async、asyncpg |
| 迁移 | 当前启动时 `create_all`；Alembic 为目标 |
| 任务队列 | Celery（可选） |
| Broker | Redis |
| 实时事件 | 当前轮询；SSE + Redis Pub/Sub 为目标 |
| 对象存储 | 目标能力，尚未接入 |
| 视频处理 | 目标能力，尚未接入 |
| 用户认证 | 自研 Session、Argon2、HttpOnly Cookie |
| 凭据加密 | cryptography AES-256-GCM |
| 日志 | structlog |
| 单元测试 | pytest、pytest-asyncio |
| 前端测试 | Vitest、Testing Library、jsdom |
| E2E 测试 | Playwright（目标，当前 CI 未执行） |
| Python 环境 | uv、pyproject.toml |
| 代码质量 | Ruff、mypy |
| 本地环境 | PowerShell 脚本；Docker Compose 为可选基础设施 |

依赖版本以 `pnpm-lock.yaml`、`uv.lock` 和 `pyproject.toml` 为准。

## 7. 项目结构

```text
VideoAgent/
├── apps/
│   ├── web/                        # Next.js 正式产品
│   │   ├── messages/               # 中英文资源脚手架
│   │   ├── public/docs/            # 内嵌文档静态产物
│   │   ├── src/app/                # 路由、认证、项目页面
│   │   ├── src/components/         # 首页适配、项目列表和工作区
│   │   ├── src/i18n/               # next-intl 路由配置
│   │   └── tests/
│   └── landing/                    # GitHub Pages 项目主页入口
├── packages/
│   └── landing/                    # 正式站与项目主页共享 UI
├── services/
│   └── api/
│       ├── pyproject.toml
│       ├── src/videoagent/
│       │   ├── api/
│       │   ├── agent/
│       │   ├── providers/
│       │   ├── services/
│       │   ├── workers/
│       │   ├── db.py
│       │   ├── models.py
│       │   ├── schemas.py
│       │   └── main.py
│       └── tests/
├── site/                           # 项目主页公共静态资源
├── scripts/                        # Windows 启动、检查、Pages 构建
├── docs/
├── .github/workflows/              # CI、Pages、安全扫描
├── deploy/docker-compose.yml
├── README.md
└── .env.example
```

前后端契约以 FastAPI 生成的 OpenAPI 文档为准。当前前端仍使用手写局部类型，OpenAPI 自动生成客户端属于后续目标。

## 8. 模块划分

| 模块 | 职责 |
| --- | --- |
| `api.auth` | 注册、登录、会话和用户信息 |
| `api.projects` | 项目生命周期和权限 |
| `api.storyboards` | 故事板读取和整体替换 |
| `api.agent` | 消息读取、消息发送和故事板规划 |
| `api.generation` | 积分估算、生成提交和任务状态刷新 |
| `api.evaluation` | 故事板即时评估 |
| `api.providers` | Pippit 服务端状态和积分余额 |
| `api.health` | API 与数据库健康检查 |
| `agent.graph` | 当前单节点 LangGraph：`plan_storyboard` |
| `agent.planner` | 本地确定性规划器和 OpenAI-compatible 规划器 |
| `providers.base` | Provider 抽象接口 |
| `providers.pippit` | Pippit CLI 适配器 |
| `providers.mock` | 无外部依赖的测试 Provider |
| `providers.kling`、`providers.mcp_client`、`providers.oauth` | 历史 Kling Provider 能力，当前默认链路未启用 |
| `services.storyboards` | 故事板领域操作 |
| `services.generation_jobs` | Provider 状态与 Shot 状态联动 |
| `services.evaluation` | 一致性、覆盖度、清晰度和节奏计算 |
| `workers.tasks` | 可选 Celery 轮询任务 |

素材、导出、分享和媒体处理模块属于目标架构，当前目录中尚不存在对应 API 或服务。

## 9. Agent 设计

### 9.1 基本策略

当前代码使用一个主 Agent 和一个确定性节点，不采用无限制 ReAct 循环，也不把首版拆成多个自由对话 Agent。

- LangGraph 当前只负责故事板规划，不保存审批和长期工作流状态。
- 配置 LLM 时由 LangChain OpenAI-compatible Provider 执行模型调用；未配置时使用本地确定性规划器。
- Pydantic 校验模型输出和工具参数。
- Celery 可选执行 Provider 任务轮询。
- 项目、对话、故事板和生成任务保存到关系数据库。

当前 Agent 图：

```text
START
  → plan_storyboard
  → END
```

`plan_storyboard` 接收项目标题、Brief、用户消息和 Locale，输出
`assistant_message` 与三镜头故事板，并同步持久化消息和故事板。

### 9.2 目标主流程

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

目标流程中的审批、任务提交、结果审核、合成和导出尚未加入 LangGraph；
当前这些边界由 FastAPI、Celery 和前端状态共同承担。

目标失败状态：

```text
auth_required
insufficient_credits
provider_unavailable
generation_failed
cancelled
```

### 9.3 工作流状态

以下状态结构是目标 LangGraph 工作流的数据模型，不是当前 `AgentState` 的
完整实现。当前代码仅包含 `locale`、`project_title`、`project_brief`、
`user_message` 和 `plan`。

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

以下是后续工作流扩展时的白名单目标，尚未全部实现：

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

当前已经强制要求生成请求包含 `approved: true`。以下完整审批策略属于目标：

- 提交任何可能计费的视频或图片生成。
- 重新生成已完成镜头。
- 把 Provider 积分用于批量任务。
- 发布公开分享链接。
- 删除项目或素材。

目标审批记录包含用户、项目、操作、参数摘要、预计费用和时间。

## 10. LangGraph 与 Celery

当前 LangGraph 与 Celery 职责：

- LangGraph 只生成故事板计划。
- Celery 在启用时轮询 Provider 任务。
- 数据库保存项目、故事板、镜头和生成任务的最终状态。
- 当前没有 Redis Pub/Sub 与 SSE 实时事件。

当前生成流程：

1. LangGraph 或用户操作创建镜头和故事板。
2. 用户批准生成。
3. FastAPI 创建数据库任务和本地幂等键。
4. API 调用 `pippit-tool-cli generate-video` 提交任务。
5. 保存 thread ID 与 run ID 组成的标准化任务引用。
6. Celery 调用 `pippit-tool-cli query-result` 轮询。
7. 未启用 Celery 时，前端每 5 秒请求 `GET /jobs/{job_id}` 触发状态刷新。
8. 更新 Job、Shot 和 Provider 原始响应。

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
    name: str
    async def estimate(self, request: GenerationRequest) -> CostEstimate: ...
    async def submit(self, request: GenerationRequest) -> ProviderJob: ...
    async def status(self, job_id: str) -> ProviderJob: ...
```

当前接口不包含能力发现和取消方法；任务取消与 Provider Capability 属于后续扩展。

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
| `messages` | `id`, `role`, `content`, `metadata` | 对话消息 |
| `storyboards` | `id`, `project_id`, `version` | 每个项目唯一的当前故事板 |
| `shots` | `id`, `storyboard_id`, `index`, `prompt_en`, `prompt_zh`, `status` | 镜头定义 |
| `provider_connections` | `id`, `user_id`, `provider`, `encrypted_tokens` | 历史 OAuth 表，当前 Pippit 链路不写入 |
| `oauth_flows` | `id`, `state_hash`, `provider`, `expires_at` | 历史 OAuth 流程表，当前 Pippit 链路不写入 |
| `generation_jobs` | `id`, `shot_id`, `idempotency_key`, `provider_task_id`, `status` | 生成任务与 Provider 原始响应 |

统一使用 UUID 主键、UTC 时间戳和数据库外键。当前数据库使用通用
`JSON` 字段保存 Provider 原始响应；PostgreSQL `JSONB` 属于目标优化。
`assets`、`tool_runs`、`usage_ledger`、`exports` 和 `public_shares`
尚未实现。

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
- 成功响应使用 JSON；当前尚未提供文件上传接口。
- 错误统一返回稳定错误码。
- 项目列表当前一次性返回，不使用游标分页。
- 生成写操作要求 `Idempotency-Key` 请求头。
- OpenAPI 是前后端接口契约。

统一错误响应：

```json
{
  "error": {
    "code": "GENERATION_APPROVAL_REQUIRED",
    "message": "Generation requires explicit approval.",
    "details": {},
    "requestId": "req_..."
  }
}
```

### 14.2 主要接口

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/health` | API 与数据库健康检查 |
| POST | `/auth/register` | 注册 |
| POST | `/auth/login` | 登录 |
| POST | `/auth/logout` | 退出 |
| GET | `/auth/me` | 当前用户 |
| PATCH | `/auth/me` | 更新语言偏好 |
| GET/POST | `/projects` | 项目列表和创建 |
| GET/PATCH/DELETE | `/projects/{id}` | 读取、重命名和归档项目 |
| GET/POST | `/projects/{id}/messages` | 读取历史或发送 Agent 消息 |
| GET | `/projects/{id}/storyboard` | 获取故事板 |
| PUT | `/projects/{id}/storyboard` | 整体替换故事板 |
| POST | `/projects/{id}/evaluate` | 故事板即时评估 |
| POST | `/shots/{id}/estimate` | 积分估算 |
| POST | `/shots/{id}/generate` | 创建生成任务 |
| GET | `/jobs/{id}` | 查询任务 |
| GET | `/providers/pippit` | 服务端 Pippit 状态 |
| GET | `/providers/pippit/credits` | Pippit 积分余额 |

以下接口属于目标能力，当前未实现：

```text
GET  /projects/{id}/events
POST /jobs/{id}/cancel
POST /assets/presign
POST /assets/complete
POST /projects/{id}/export
POST /projects/{id}/share
```

### 14.3 目标 SSE 事件

当前 Agent 消息接口返回普通 JSON，不支持流式输出；前端通过本地分段动画
呈现消息。以下 SSE 契约是后续目标：

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

本节为目标设计。当前代码尚未实现素材表、上传接口、对象存储、缩略图、
FFmpeg 合成或导出 API。

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

- 公共入口：左侧导航、连续视频背景、居中创作框、灵感快捷项和八项生成设置。
- `Agents`：首页创作入口和 VideoAgent 对话。
- `Skills`：统一可搜索 Skill 目录，卡片显示 `user_id/skill_id`，用户可发布 Skill。
- `Hots`：可搜索社区瀑布流，视频自动播放，展示标题、作者、喜欢数，并支持发布。
- `Assets`：通过 Video 与 Skill 两个内部分页切换，支持搜索；卡片只展示权限和 `yyyy-mm-dd` 编辑时间，不播放。
- `Docs`：按 PRD、Design、Interface、Impl、Test、Ops 展示中英文文档，支持全文搜索。
- 项目工作区：对话、Canvas、镜头检查器、生成和审核弹窗。
- 正式站与 GitHub Pages 项目主页复用同一套 Landing UI。
- 品牌与浏览器标签页图标统一使用蓝色播放键；激活导航图标采用填充/线框反转。

当前公开界面为英文；中文路由重定向到英文。项目主页中不可用的创建和社区
发布动作会弹出“仅预览”提示。

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
- 生成模式。
- 宽高比。
- 时长。
- Provider 模型参数。
- 积分估算。
- 生成与错误提示。

参考图、参考视频、镜头排序和重新生成审批属于后续目标。

### 16.3 前端状态

- 当前页面主要使用 React `useState`、`useEffect`、页面级 `fetch` 和定时轮询。
- TanStack Query 与 Zustand 已在依赖中预留，但当前核心页面尚未接入。
- 当前 Agent 消息使用普通 JSON 请求；流式输出使用前端分段动画模拟。
- 项目事件使用轮询；SSE 为目标能力。
- 不将 Provider 凭据、Access Key 或敏感任务内容写入 localStorage。

## 17. 国际化策略

当前公开产品 UI 固定为英文：

```text
/en/...        ✅ 当前公开入口
/zh-CN/...     ↪ 308/重定向到 /en
```

next-intl 路由、消息资源和后端 `locale` 字段仍保留 `en` 与 `zh-CN`，
用于后续恢复中文版；在明确重新开放中文前，不应把中文路由视为可用能力。

后续恢复中文化时需要覆盖：

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

后端 API 使用稳定错误码；用户可读文案由前端翻译资源提供。用户语言偏好
仍可通过 `PATCH /auth/me` 保存。

## 18. 安全与隐私

- 当前所有项目、镜头和任务接口均校验用户所有权。
- 会话 Cookie 使用 HttpOnly 与 SameSite=Lax；生产环境必须启用 Secure。
- 当前尚未实现 CSRF Token、分布式限流和上传文件校验。
- Pippit CLI 登录文件放在服务账号可访问但受严格权限保护的位置。
- `VIDEOAGENT_PIPPIT_ACCESS_KEY` 只保存在秘密管理系统或服务环境变量中。
- 上传文件校验、短期签名 URL 和 Agent 文件工具属于目标能力。
- 不使用 Agent 生成的内容拼接 Shell 命令。
- 日志不记录密码、Cookie、Token、Authorization Header。

## 19. 可靠性设计

- 数据库任务状态为业务事实来源。
- Celery 当前负责可选的 Provider 轮询，并对未结束任务按配置重试。
- 生成提交使用数据库幂等键；查询失败可以重试，计费提交禁止盲目重发。
- 未启用 Celery 时，前端轮询 `GET /jobs/{id}`，数据库仍是状态事实来源。
- Provider 子进程有超时，超时后终止且不自动重提。
- LangGraph Checkpoint、SSE 重连、下载重试和 FFmpeg 清理属于目标能力。

## 20. 可观测性

当前后端引入 structlog；完整请求链路字段和指标需在生产接入前补齐。
目标日志字段包括：

- `request_id`
- `user_id`
- `project_id`
- `job_id`
- `tool_run_id`
- `provider`
- `tool_name`
- `duration_ms`
- `error_code`

目标指标：

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

当前后端使用 `VIDEOAGENT_` 前缀的环境变量：

```text
VIDEOAGENT_DATABASE_URL
VIDEOAGENT_SESSION_SECRET
VIDEOAGENT_TOKEN_ENCRYPTION_KEY
VIDEOAGENT_VIDEO_PROVIDER
VIDEOAGENT_PIPPIT_CLI_COMMAND
VIDEOAGENT_PIPPIT_ACCESS_KEY
VIDEOAGENT_PIPPIT_VIDEO_MODEL
VIDEOAGENT_PIPPIT_VIDEO_RESOLUTION
VIDEOAGENT_CELERY_ENABLED
VIDEOAGENT_CELERY_BROKER_URL
VIDEOAGENT_CELERY_RESULT_BACKEND
VIDEOAGENT_LLM_BASE_URL
VIDEOAGENT_LLM_API_KEY
VIDEOAGENT_LLM_MODEL
NEXT_PUBLIC_API_BASE_URL
```

所有敏感值通过环境变量或密钥管理服务提供，不提交到 Git。

## 23. 部署设计

当前开发：

```text
Next.js :3000
FastAPI :8000
SQLite（默认）
Pippit CLI（可选）
Celery + Redis（可选）
```

静态项目主页通过 Vite 构建到 `.pages-build`，由 GitHub Pages 发布。
Markdown 文档在构建时生成 HTML，并复制到正式站 `public/docs`。

目标生产架构：

- Next.js 镜像。
- FastAPI 镜像。
- Celery Worker 镜像。
- Nginx/Caddy 反向代理。
- 外部 PostgreSQL。
- Redis。
- S3 兼容对象存储。
- FFmpeg Worker。

部署流程：

1. 安装锁定依赖。
2. 执行 Ruff、mypy 和测试。
3. 构建前后端镜像。
4. 执行版本化数据库迁移（Alembic 目标）。
5. 滚动更新 API。
6. 更新 Worker。
7. 检查健康和 Provider 状态。

## 24. 实施阶段

### 阶段 1：基础工程

- ✅ 初始化目录、依赖和 PowerShell 开发脚本。
- ✅ 完成英文公开界面、共享 Landing UI 和 GitHub Pages 项目主页。
- ✅ 建立 CI 与文档构建。
- ⏳ 恢复中文公开界面。
- ⏳ 建立 OpenAPI 前端客户端。

### 阶段 2：用户、项目和素材

- ✅ 登录、会话和用户隔离。
- ✅ 项目列表、重命名、删除和项目工作区。
- ✅ 故事板数据模型与整体替换。
- ⏳ S3/MinIO 素材上传。

### 阶段 3：Agent 与 Mock Provider

- ✅ LangGraph 单节点故事板规划。
- ✅ 对话和结构化故事板输出。
- ✅ 无积分消耗的 Mock Provider。
- ⏳ 审批、审核、重做等完整工作流节点。
- ⏳ SSE 实时事件。

### 阶段 4：Pippit 集成

- ✅ CLI 安装、服务端授权和凭据隔离。
- ✅ 文本生成视频参数适配。
- ✅ 身份和积分查询。
- ✅ 生成提交、状态轮询与幂等保护。
- ⏳ 结果媒体持久化下载与恢复。

### 阶段 5：合成与发布

- ✅ 故事板即时评估。
- ⏳ 镜头排序与重新生成审批。
- ⏳ FFmpeg 合成。
- ⏳ 导出和公开分享。

### 阶段 6：测试和部署

- ✅ pytest、Vitest 和 CI。
- ✅ 权限、Provider、故事板和即时评估测试。
- ✅ GitHub Pages 发布。
- ⏳ Playwright E2E。
- ⏳ 生产 Docker 编排、数据库迁移和运维文档。

## 25. 验收标准

### 25.1 当前基线验收

1. 正式站与项目主页使用同一套 Landing UI，项目主页不可用动作显示预览提示。
2. 公开产品入口可用英文，`/zh-CN` 重定向到 `/en`。
3. 用户能够创建、修改、归档和删除自己的项目。
4. Agent 能生成符合 Pydantic Schema 的多镜头故事板。
5. 用户可以在生成前查看并批准预计积分费用。
6. 刷新页面或重启服务后故事板和任务状态不会丢失。
7. Pippit Access Key 和 CLI 登录文件不出现在浏览器、日志或公开接口中。
8. 生成任务不会因自动重试造成重复扣费。
9. 即时评估返回一致性、覆盖度、清晰度和节奏得分。
10. Hots 的作者、喜欢数、发布入口和预览限制可用。
11. Mock Provider 与 Pippit Fake CLI 自动化测试全部通过。

### 25.2 目标 MVP 验收

1. 中文和英文界面均可完整使用。
2. 素材上传、镜头排序、FFmpeg 合成、MP4 下载和公开分享全部可用。
3. SSE 能可靠推送任务状态并支持断线重连。
4. Pippit 状态和积分只读 Smoke Test 通过。
5. 在账户有积分且用户授权的情况下，完成一次真实视频生成和导出。

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
| v1.2 | 2026-11-03 | 当前基线 | 对齐共享 Landing UI、单节点 Agent、Pippit CLI、Hots 本地发布、文档目录与当前 API |

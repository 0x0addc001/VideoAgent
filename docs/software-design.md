# VideoAgent 软件设计说明书

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v2.0 |
| 更新日期 | 2026-11-04 |
| 后端框架 | Python + FastAPI |
| 前端框架 | Next.js + TypeScript |
| 模型 | Pippit/Seedance 2.5 Draft、Pippit/Seedance 2.5、Pippit/Seedance 2.0 Fast VIP、Pippit/Seedance 2.0 VIP、Pippit/Seedance 2.0 Mini 体验版、Pippit/Seedance 2.0 Mini、Pippit/Wan 3.0、Pippit/HappyHorse 1.1、Kling/Kling Video 2.5、Kling/Kling Video 2.6、Kling/Kling Video O1、Kling/Kling Video 3.0、Kling/Kling Video 3.0 Omni、Kling/Kling Video 3.0 Turbo、Kling/Kling Video 4.0、Kling/Kling 2.6 Motion Control、Kling/Kling 3.0 Motion Control、Kling/Kling Image 3.0 Omni、Kling/Kling Image O1、Kling/Kling Image 3.0、Kling/Kling Image 2.1 |

VideoAgent 通过统一 Provider 边界集成 Pippit CLI 与 Kling 国内版 CLI。Pippit 提供视频提交、任务查询和积分能力，Kling CLI 通过国内站 MCP 提供文本生成视频、任务查询、动作控制和多模态参考能力。

## 1. 文档目的

本文档描述 VideoAgent 的产品目标、系统架构、核心模块、Agent 编排、数据模型、接口规范、Pippit CLI 与 Kling 国内版 CLI 集成、安全策略、测试策略及部署方式，供产品、前端、后端、测试和运维研发人员共同参考。

## 2. 产品概述

VideoAgent 是一个面向内容创作者、营销人员和普通用户的 AI 视频创作平台。产品以“用户是导演”为核心，通过统一的左侧工作台进入 Agents、Skills、Hots、Assets 和 Docs；用户从首页创作框描述创意后创建项目，进入项目工作区与 VideoAgent 协作生成故事板并发起镜头生成。

系统同时提供：

- **Agents：** 首页创作入口和项目内 VideoAgent 对话。
- **Skills：** 单一可搜索 Skill 目录，使用 `user_id/skill_id` 标识，并支持用户发布。
- **Hots：** 可搜索社区作品流，展示作者、喜欢数并支持发布。
- **Assets：** 用户成品与半成品作品库，按 Video/Skill 分页；视频悬浮预览，Skill 不显示封面。
- **Docs：** 九份中英文文档、全文搜索、统一深色阅读主题和左侧可折叠目录。

创作范式结合对话式生成、模板化制作和多模型工作台组织方式。生成能力通过统一 Provider 契约接入，使项目、故事板、镜头和任务状态不依赖单一模型服务。

## 3. 产品目标与范围

### 3.1 MVP 目标

- 首页采用左侧导航、连续视频背景、居中创作框、场景 Playbook、Hook 控制和自定义透明下拉控件。
- 创作输入框随内容行数自动向下增高；示例灵感仅在输入为空时显示，Playbook 保持可切换。
- 模型选择器使用实时核验目录：Kling 7 个视频模型、Pippit 8 个视频模型，另有 Auto；选项统一使用 `服务商/模型` 格式。
- 搜索、语言、通知、积分和头像使用半透明表面，相关菜单向下展开；创作框选项菜单根据视口空间自动向上或向下展开并限制高度；头像支持登录、注册和退出。
- Hots 展示作者与喜欢数，并支持发布。
- 支持项目创建、编辑、恢复和删除。
- 支持 Agent 生成创意方案和多镜头故事板。
- 支持镜头参数编辑和积分成本估算。
- 支持故事板即时评估，计算一致性、覆盖度、提示清晰度和节奏。
- 支持项目级图片、视频和音频素材上传，并校验 MIME、文件头和大小。
- 支持 FFmpeg 合成、16:9/9:16/1:1 交付版本、封面、字幕和音轨。
- 支持限时分享链接、公开/私有权限、过期和撤销。
- 支持用户独立积分账户与预扣、退款流水，隔离共享 Provider 账户的计费风险。
- 支持管理员控制台、用户状态、积分调整、邀请码、生成开关和审计日志。
- 支持服务端统一授权的 Pippit CLI。
- 支持 Pippit 文本生成视频、任务查询和积分余额读取。
- 支持 Kling 国内版 CLI 的文本生成视频、任务查询、动作控制和多模态参考能力。
- 支持 Celery 后台轮询与前端任务状态轮询。
- 保证 Provider Access Key、CLI 登录文件和 MCP 凭据不暴露给浏览器。

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
  → 继续编辑或准备下一轮生成
```

## 5. 总体架构

### 5.1 实现架构

```text
┌─────────────────────────────────────────────────────────┐
│ Next.js App                                             │
│ 共享 Landing UI / 项目工作区 / 内嵌文档                  │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS / JSON / polling
┌─────────────────────────▼───────────────────────────────┐
│ FastAPI /api/v1                                         │
│ Auth / Projects / Agent / Jobs / Assets / Delivery      │
│ Credits / Evaluation / Provider                         │
└──────────┬──────────────────┬───────────────────────────┘
           │                  │
┌──────────▼─────────┐  ┌─────▼────────────────────────────┐
│ LangGraph          │  │ SQLAlchemy Async                 │
│ 单节点故事板规划   │  │ SQLite / PostgreSQL              │
└──────────┬─────────┘  └──────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────┐
│ Celery + Redis + Pippit CLI / Kling CLI / FFmpeg        │
│ 任务提交 / 轮询 / 状态更新 / 媒体合成                    │
└──────────────────────────────────────────────────────────┘
```

正式产品使用 Next.js Route Handler 将浏览器 `/api/account/*` 请求代理到
FastAPI，避免浏览器直接依赖后端域名。任务状态同步采用前端轮询：

```text
GET /jobs/{job_id} → FastAPI 查询 Provider → 更新数据库 → 返回最新状态
```

## 6. 技术栈

| 模块 | 技术 |
| --- | --- |
| Web 前端 | Next.js 16 App Router、React 19、TypeScript 5.9 |
| UI | Tailwind CSS 4、Lucide、共享 Landing CSS |
| 国际化 | next-intl 路由与翻译资源 |
| 前端状态 | React 页面状态 |
| 表单校验 | 浏览器原生表单、Zod、Pydantic |
| API | FastAPI、Uvicorn |
| Agent | LangGraph |
| 模型调用 | LangChain OpenAI-compatible Provider |
| 数据校验 | Pydantic v2 |
| 视频服务 | Pippit CLI、Kling 国内版 CLI、Mock Provider |
| 服务端授权 | Pippit CLI 凭据与 Kling 国内版 CLI OAuth |
| MCP | Python MCP SDK |
| 数据库 | SQLite |
| ORM | SQLAlchemy 2 Async、asyncpg |
| 迁移 | 启动时 `create_all` |
| 任务队列 | Celery |
| Broker | Redis |
| 媒体处理 | FFmpeg / FFprobe |
| 媒体存储 | 本地文件系统（开发基线） |
| 实时事件 | 任务状态轮询 |
| 用户认证 | 自研 Session、Argon2、HttpOnly Cookie |
| 凭据加密 | cryptography AES-256-GCM |
| 日志 | structlog |
| 单元测试 | pytest、pytest-asyncio |
| 前端测试 | Vitest、Testing Library、jsdom |
| 端到端测试 | Playwright + Mock Provider |
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
├── packages/
│   └── landing/                    # 共享 Landing UI
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
├── scripts/                        # 启动、检查与文档构建
├── docs/
├── .github/workflows/              # CI、Pages、安全扫描
├── deploy/docker-compose.yml
├── README.md
└── .env.example
```

前后端契约以 FastAPI 生成的 OpenAPI 文档为准。

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
| `api.assets` | 上传、下载、导出与分享 |
| `api.credits` | 用户独立积分余额 |
| `api.admin` | 管理总览、用户、积分、任务、邀请码、设置与审计 |
| `api.health` | API 与数据库健康检查 |
| `middleware` | 同源写请求校验与认证/生成/上传限流 |
| `agent.graph` | 单节点 LangGraph：`plan_storyboard` |
| `agent.planner` | 本地确定性规划器和 OpenAI-compatible 规划器 |
| `providers.base` | Provider 抽象接口 |
| `providers.pippit` | Pippit CLI 适配器 |
| `providers.mock` | 无外部依赖的测试 Provider |
| `providers.kling_cli` | Kling 国内版 CLI Provider |
| `providers.kling`、`providers.mcp_client`、`providers.oauth` | 兼容的 Kling MCP Provider、工具客户端与 OAuth |
| `services.storyboards` | 故事板领域操作 |
| `services.generation_jobs` | Provider 状态与 Shot 状态联动 |
| `services.evaluation` | 一致性、覆盖度、清晰度和节奏计算 |
| `services.media` | 媒体校验、结果落地、FFmpeg 合成、封面与分享 Token |
| `services.credits` | 用户积分账户、预扣与幂等退款 |
| `workers.tasks` | Celery 任务轮询 |

## 9. Agent 设计

### 9.1 基本策略

Agent 使用一个主 Agent 和一个确定性节点，不采用无限制 ReAct 循环，也不将相互耦合的创作职责拆成多个自由对话 Agent。

- LangGraph 负责故事板规划。
- 配置 LLM 时由 LangChain OpenAI-compatible Provider 执行模型调用；未配置时使用本地确定性规划器。
- Pydantic 校验模型输出和工具参数。
- Celery 执行 Provider 任务轮询。
- 项目、对话、故事板和生成任务保存到关系数据库。

Agent 图：

```text
START
  → plan_storyboard
  → END
```

`plan_storyboard` 接收项目标题、Brief、用户消息和 Locale，输出
`assistant_message` 与三镜头故事板，并同步持久化消息和故事板。

## 10. LangGraph 与 Celery

职责边界：

- LangGraph 只生成故事板计划。
- Celery 轮询 Provider 任务。
- 数据库保存项目、故事板、镜头和生成任务的最终状态。

生成流程：

1. LangGraph 或用户操作创建镜头和故事板。
2. 用户批准生成。
3. FastAPI 创建数据库任务和本地幂等键。
4. Provider 适配器提交任务。
5. 保存标准化任务引用。
6. Celery 轮询任务状态。
7. 前端每 5 秒请求 `GET /jobs/{job_id}` 触发状态刷新。
8. 更新 Job、Shot 和 Provider 原始响应。

具备不确定性的提交不能自动重发。提交超时但未获得 Provider Task ID 时，任务进入 `submission_uncertain`，通过查询账户近期任务进行人工或自动对账。

## 11. Provider 集成

### 11.1 Pippit CLI

```text
运维在 API 主机安装 Pippit CLI
  → 运维执行 pippit-tool-cli login
  → CLI 将设备凭据保存到操作系统安全存储
  → 或 CI 注入 VIDEOAGENT_PIPPIT_ACCESS_KEY
  → FastAPI 通过受限子进程调用 CLI
  → 读取 Pippit 账户状态和积分
```

Pippit 授权由服务端统一持有。Provider 层负责积分读取、生成提交、任务查询和结果标准化。

### 11.2 Provider 接口

```python
class VideoProvider(Protocol):
    name: str
    async def estimate(self, request: GenerationRequest) -> CostEstimate: ...
    async def submit(self, request: GenerationRequest) -> ProviderJob: ...
    async def status(self, job_id: str) -> ProviderJob: ...
```

### 11.3 Pippit 能力

```text
pippit-tool-cli status
pippit-tool-cli get-credit-balance
pippit-tool-cli generate-video
pippit-tool-cli query-result
```

Provider 使用参数数组启动 CLI，不经过 Shell
字符串拼接；stdout 仅接受 JSON，stderr 和完整命令参数不返回到浏览器。
模型与分辨率由服务端环境变量可选配置，留空时使用 CLI 服务的默认值。

### 11.4 Kling 国内版 CLI

Kling 通过 `@klingai/cli-cn` 的国内站内置 MCP 端点暴露视频能力：

- 文本生成视频。
- 图生视频与首尾帧。
- 动作控制。
- Omni-Ref 多模态参考。
- 任务查询和结果 URL 解析。

CLI 负责国内站 OAuth、MCP 传输和工具参数。Provider 适配器将 Kling 的
`generationId`、任务状态、错误和结果 URL 映射到与 Pippit 相同的
`VideoProvider` 契约。`VIDEOAGENT_KLING_EXPECTED_USER_ID` 用于校验登录账号。

### 11.5 凭据与进程安全

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
| `workspace_folders` | `id`, `owner_id`, `name` | 历史对话的项目目录 |
| `workspace_folder_items` | `folder_id`, `project_id` | 对话与项目目录的收纳关系 |
| `project_workflows` | `project_id`, `stage`, `status` | 整体设定、大纲、剧本与生成审批状态 |
| `user_skills` | `owner_id`, `skill_id`, `instructions`, `input_schema`, `output_schema` | 用户发布的结构化 Skill |
| `hots_posts` | `owner_id`, `asset_id`, `title`, `prompt`, `skill_id`, `like_count` | 社区视频发布及详情 |
| `storyboards` | `id`, `project_id`, `version` | 每个项目唯一的当前故事板 |
| `characters` | `id`, `storyboard_id`, `index`, `name`, prompts | 持续角色的描述与可复用图片提示词 |
| `shots` | `id`, `storyboard_id`, `index`, `prompt_en`, `prompt_zh`, `status` | 镜头定义 |
| `provider_connections` | `id`, `user_id`, `provider`, `encrypted_tokens` | Provider 授权信息 |
| `oauth_flows` | `id`, `state_hash`, `provider`, `expires_at` | OAuth 事务状态 |
| `generation_jobs` | `id`, `shot_id`, `idempotency_key`, `provider_task_id`, `status` | 生成任务与 Provider 原始响应 |
| `credit_accounts` | `user_id`, `balance` | 用户独立积分余额 |
| `credit_entries` | `user_id`, `amount`, `reason`, `reference_id` | 可审计的预扣与退款流水 |
| `assets` | `owner_id`, `project_id`, `shot_id`, `kind`, `storage_key`, `permission` | 上传、生成、交付与封面资产 |
| `share_links` | `asset_id`, `token_hash`, `expires_at`, `revoked_at`, `access_count` | 限时分享与访问计数 |
| `platform_settings` | `key`, `value`, `updated_by` | 生成开关与注册模式 |
| `invite_codes` | `code_hash`, `max_uses`, `use_count`, `expires_at` | 邀请制注册 |
| `admin_audit_logs` | `admin_id`, `action`, `target_type`, `target_id` | 管理操作审计 |

统一使用 UUID 主键、UTC 时间戳和数据库外键。数据库使用通用 `JSON`
字段保存 Provider 原始响应。

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
- 成功响应使用 JSON。
- 错误统一返回稳定错误码。
- 项目列表一次性返回。
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
| GET | `/workspace` | 项目目录和最近对话 |
| POST/PATCH/DELETE | `/workspace/folders` | 创建、重命名和删除项目目录 |
| PUT | `/workspace/threads/{id}/folder` | 收纳或移出历史对话 |
| GET | `/projects/{id}/workflow` | 读取逐层审批状态 |
| POST | `/projects/{id}/workflow/decision` | 批准、调整或自定义修改当前阶段 |
| GET/POST | `/skills` | 读取和保存用户 Skill |
| POST | `/skills/optimize` | 使用 AI 将粗略想法整理为结构化 Skill |
| GET/POST | `/hots` | 社区列表与视频发布 |
| GET | `/hots/{id}/video` | 播放公开社区视频 |
| GET | `/projects/{id}/storyboard` | 获取故事板 |
| PUT | `/projects/{id}/storyboard` | 整体替换故事板 |
| PATCH | `/projects/{id}/storyboard/order` | 调整镜头顺序并保留 Shot ID |
| POST | `/characters/{id}/estimate`、`/assets`、`/generate` | 角色图片估算、上传与生成 |
| POST | `/projects/{id}/evaluate` | 故事板即时评估 |
| POST | `/shots/{id}/estimate` | 积分估算 |
| POST | `/shots/{id}/generate` | 创建生成任务 |
| GET | `/jobs/{id}` | 查询任务 |
| GET | `/providers/pippit` | 服务端 Pippit 状态 |
| GET | `/providers/pippit/credits` | Pippit 积分余额 |
| GET | `/credits` | 当前用户积分余额 |
| GET/POST | `/projects/{id}/assets` | 项目资产列表与上传 |
| GET | `/assets/{id}/content` | 读取私有资产 |
| POST | `/projects/{id}/exports` | 合成并导出成片 |
| POST | `/assets/{id}/share` | 创建限时分享 |
| DELETE | `/shares/{id}` | 撤销分享 |
| GET | `/shares/{token}/content` | 读取分享资产 |
| GET/PATCH | `/admin/settings` | 读取和更新生成、注册策略 |
| GET | `/admin/overview` | 管理总览 |
| GET/PATCH | `/admin/users`、`/admin/users/{id}` | 用户列表与状态 |
| POST | `/admin/users/{id}/credits` | 管理员调整积分 |
| GET | `/admin/jobs` | 生成任务列表 |
| POST | `/admin/jobs/{id}/refund` | 人工退款 |
| GET/POST | `/admin/invites` | 邀请码列表与创建 |
| DELETE | `/admin/invites/{id}` | 撤销邀请码 |
| GET | `/admin/audit` | 管理审计日志 |

## 15. 前端设计

### 15.1 信息架构

- 公共入口：左侧导航、连续视频背景、居中创作框、灵感快捷项和八项生成设置。
- App 左侧导航在 VideoAgent 品牌右侧提供折叠控制，可收起为仅图标模式，右侧内容始终填满剩余空间；Docs 下方固定为 Projects 分组和 Recents 时序历史，两个分组在未登录和空数据时也显示，默认展开且可折叠。
- 对话只使用 `/en#conversation/{project_id}` 哈希视图，不开放独立项目详情页；对话切换保持应用外壳挂载，只高亮当前对话记录。
- 视频轮播作为 Agents、Skills、Hots、Assets、Docs 和会话页共用的持久半透明背景。
- Projects 行提供新建项目表单入口；Recents 行提供新建对话入口并返回 Agents。两行均带展开/收起图标。
- `Agents`：首页创作入口和 VideoAgent 对话。
- `Skills`：统一可搜索 Skill 目录，卡片显示 `user_id/skill_id`；Kling 原生能力使用 `kling`，跨 Provider 工作流使用 `video_agent`，用户可发布 Skill。
- Skill Studio 将用户 Skill 持久化到数据库；发布前包含用途、执行规范、质量门禁、启动提示词和输入/输出契约，并提供 AI 优化。
- 内置 `video_agent/skill_synthesis` 用于帮助用户编写和合成新的 Skill，点击后直接打开 Skill Studio。
- `Agents`：首页提供产品广告、创作者 Vlog、微短剧、音乐 MV、视频本地化和批量测款六类 Playbook；选择后统一设置提示词、Skill、Hook、风格、画幅、时长和审核模式，再次点击当前项会恢复应用前草稿。
- Skills 目录还覆盖视频本地化、批量变体、剧本助手、智能预演、运镜设计、音乐 MV、参考复刻和外部 Agent 接力。
- `Hots`：可搜索社区瀑布流，视频自动播放，展示标题、作者、喜欢数，并支持发布。
- Hots 发布必须上传 MP4，可填写标题、描述和 Skill；发布视频持久化并出现在作者 Assets。
- `Assets`：通过 Video 与 Skill 两个内部分页切换，支持搜索；Video 卡片悬浮静音播放，Skill 卡片不显示封面；卡片只展示权限和 `yyyy-mm-dd` 编辑时间。
- Assets 展示当前用户真实发布的 Hots 视频和 Skill；点击卡片打开详情，视频详情可直接播放。
- `Docs`：按 PRD、Playbook、Arch、API、Dev、Test、Ops、FAQ、TODO 展示中英文文档，支持全文搜索。
- 项目工作区采用 IDE 式布局：可压缩历史导航、`Direction` / `Vision` 资源树、中央编辑画布和右侧审批式 Agents。
- Assets 与 Agents 侧栏可折叠为带标签的窄轨；展开宽度使用响应式比例，适配不同桌面尺寸。
- `Direction` 包含 `Settings`、`Outlines`、`Scripts`；`Vision` 包含 `Characters`、`Shots`、`Final Cut`。每个持久化角色与镜头都包含描述页和生成页；空目录不显示等待文案。
- 项目目录将展开按钮放在蓝色目录图标左侧；被收纳的对话从 Recents 移入对应目录，并以缩进子项显示。
- 品牌与浏览器标签页图标统一使用蓝色播放键；激活导航图标采用填充/线框反转。
- 管理后台使用独立控制台布局，与用户创作界面隔离。

### 15.2 项目工作区

桌面端采用四级工作区：

```text
历史导航（Projects / Recents）
  → 当前对话资产树
  → 选中的文档、图片、视频或镜头画布
  → 带审批选项的 Agent 对话
```

移动端采用标签页：

```text
History | Assets | Canvas | Agent
```

历史导航支持压缩，Recent 对话可拖入项目目录，也可拖回全部对话列表。Agent
按“整体设定 → 分集/分镜大纲 → 逐场剧本 → 可生成”推进；每一步都必须由用户
批准，调整与自定义意见不会跳过当前阶段。

镜头生成在“可生成”审批完成前保持禁用，镜头检查器会直接提示需要先在 Agents 中批准。

中央编辑区使用自己的紧凑面板栏，不设置页面级项目标题栏；Review 与 Share
固定在编辑区面板栏最右侧。

故事板变化时自动执行 Review，综合分始终显示在编辑区面板栏；Review 与刷新按钮共用一个边框容器，刷新不会重复打开详情弹窗。

只有本次新返回的 Agent 回复执行一次流式显示；历史消息和已完成回复直接静态展示，折叠再展开不会重新播放。

Assets、中央编辑区和 Agents 的滚动条与 Projects、Recents 使用同一套细蓝色样式。

Docs 使用导航栏右侧的完整内容区域，不与固定导航重叠；内嵌文档沿用全局视频背景。

Review 按钮在完成评估后直接显示综合分，不再展示四段进度条。工作区所有文本的最小字号不低于按钮字号。
导航与 Assets 图标的激活态采用描边/填充反转：未激活为透明填充加蓝色描边，激活后为蓝色填充加透明描边。

导航、Projects、Recents、目录和对话 item 使用统一字号。Projects、Recents
及其对话 item 不显示图标；日期、数量和空状态提示不显示。
- 首页与对话页历史列表使用细蓝色滚动条，轨道透明。

镜头画布包含：

- Prompt 中英文版本。
- 生成模式。
- 宽高比。
- 时长。
- Provider 模型参数。
- 积分估算。
- 生成与错误提示。
- 图片、视频和音频引用素材上传。
- 成片导出、交付版本下载、封面与分享链接。

### 15.3 前端状态

- 页面使用 React `useState`、`useEffect`、页面级 `fetch` 和定时轮询。
- Agent 消息使用普通 JSON 请求；流式输出使用前端分段动画呈现。
- 项目事件使用轮询。
- 不将 Provider 凭据、Access Key 或敏感任务内容写入 localStorage。
- 私有媒体通过受鉴权的内容路由读取，分享内容通过随机 Token 读取。

## 16. 国际化策略

产品使用 next-intl 路由、消息资源和后端 `locale` 字段管理 `en` 与
`zh-CN`。文档提供两套同构内容。

Agent 输出支持三种 Prompt 模式：

- 中文说明 + 英文模型 Prompt。
- 全中文。
- 中英双语对照。

后端 API 使用稳定错误码；用户可读文案由前端翻译资源提供。用户语言偏好
仍可通过 `PATCH /auth/me` 保存。

## 17. 安全与隐私

- 所有项目、镜头和任务接口均校验用户所有权。
- 会话 Cookie 使用 HttpOnly 与 SameSite=Lax；生产环境必须启用 Secure。
- Pippit CLI 登录文件放在服务账号可访问但受严格权限保护的位置。
- `VIDEOAGENT_PIPPIT_ACCESS_KEY` 只保存在秘密管理系统或服务环境变量中。
- 不使用 Agent 生成的内容拼接 Shell 命令。
- 日志不记录密码、Cookie、Token、Authorization Header。
- Cookie 写接口校验 `Origin` 与 `Sec-Fetch-Site`，拒绝跨站提交。
- 认证、生成和上传分别执行分钟级限流；分布式部署需将计数迁移到 Redis。
- 上传同时校验声明的 MIME、文件签名和大小。
- 分享链接只保存 Token 哈希，并支持过期、撤销和访问计数。
- 管理接口使用环境变量邮箱白名单授权，普通用户访问返回 `403`。
- 停用账号会立即删除其全部 Session。
- 生成开关在 Provider 估算和提交前检查，暂停时不产生外部费用。

## 18. 可靠性设计

- 数据库任务状态为业务事实来源。
- Celery 负责 Provider 轮询，并对未结束任务按配置重试。
- 生成提交使用数据库幂等键；查询失败可以重试，计费提交禁止盲目重发。
- 前端轮询 `GET /jobs/{id}`，数据库是状态事实来源。
- Provider 子进程有超时，超时后终止且不自动重提。
## 19. 可观测性

后端使用 structlog 记录请求与任务日志。核心字段包括 `request_id`、
`user_id`、`project_id`、`job_id`、`provider`、`duration_ms` 和
`error_code`。

## 20. 测试策略

测试以测试驱动开发为主要工作方式。详细测试范围、测试用例、覆盖目标和质量门禁见 `docs/software-test-plan.md`。

整体原则：

- 每个业务能力先编写失败测试，再实现最小代码，最后重构。
- CI 仅使用 Mock Provider，不执行真实付费生成。
- 单元测试不依赖 PostgreSQL、Redis、MinIO 或 Pippit 网络。
- 集成测试使用可重复、可清理的真实基础设施。
- Pippit 状态和余额只读 Smoke Test 使用受控服务账户。
- 真实生成测试必须人工触发并显式限制次数和积分预算。

## 21. 配置项

后端使用 `VIDEOAGENT_` 前缀的环境变量：

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
VIDEOAGENT_MEDIA_DIR
VIDEOAGENT_MAX_UPLOAD_BYTES
VIDEOAGENT_FFMPEG_COMMAND
VIDEOAGENT_FFPROBE_COMMAND
VIDEOAGENT_STARTING_USER_CREDITS
VIDEOAGENT_AUTH_RATE_LIMIT_PER_MINUTE
VIDEOAGENT_GENERATION_RATE_LIMIT_PER_MINUTE
VIDEOAGENT_UPLOAD_RATE_LIMIT_PER_MINUTE
NEXT_PUBLIC_API_BASE_URL
```

所有敏感值通过环境变量或密钥管理服务提供，不提交到 Git。

## 22. 部署设计

本地开发：

```text
Next.js :3000
FastAPI :8000
SQLite（默认）
Pippit CLI 或 Kling 国内版 CLI
Celery + Redis
```

Markdown 文档在构建时生成 HTML，并复制到 `public/docs`。

部署流程：

1. 安装锁定依赖。
2. 执行 Ruff、mypy 和测试。
3. 构建前后端镜像。
4. 执行版本化数据库迁移。
5. 滚动更新 API。
6. 更新 Worker。
7. 检查健康和 Provider 状态。

## 23. 验收标准

1. 用户能够创建、修改、归档和删除自己的项目。
2. Agent 能生成符合 Pydantic Schema 的多镜头故事板。
3. 用户可以在生成前查看并批准预计积分费用。
4. 刷新页面或重启服务后故事板和任务状态不会丢失。
5. Pippit Access Key、CLI 登录文件和 Kling 凭据不出现在浏览器、日志或公开接口中。
6. 生成任务不会因自动重试造成重复扣费。
7. 即时评估返回一致性、覆盖度、清晰度和节奏得分。
8. Hots 的作者、喜欢数、发布入口和预览可用。
9. Mock Provider、Pippit Fake CLI 和 Kling Provider 契约测试全部通过。
10. Playwright 使用 Mock Provider 完成注册、创作、上传、生成、导出、下载和分享。
11. 生成预扣积分，失败或取消时幂等退款。
12. 分享链接可撤销，私有资产不能由其他用户通过内容路由读取。
13. 管理员可管理账号、积分、邀请码和生成状态，所有变更写入审计日志。

## 24. 主要风险

| 风险 | 应对措施 |
| --- | --- |
| Pippit CLI 参数或输出变化 | 命令契约测试、Provider 隔离、版本锁定 |
| 生成提交超时导致不确定状态 | 本地幂等键、任务对账、禁止盲目重试 |
| 视频生成耗时长 | Celery、持久任务、超时与状态查询 |
| 费用误用 | 审批门、预算上限、积分流水 |
| Token 泄露 | 服务端加密、日志脱敏、Cookie 安全 |
| 前后端类型不一致 | OpenAPI 契约测试 |
| Celery 与 LangGraph 状态重复 | 明确数据库事实来源和单向事件流 |
| 中英文内容不同步 | 统一翻译键、双语测试、Agent Locale 状态 |

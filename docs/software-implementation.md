# VideoAgent 软件实现说明

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v2.0 |
| 更新日期 | 2026-11-04 |
| 后端框架 | Python + FastAPI |
| 前端框架 | Next.js + TypeScript |
| 模型 | Pippit/Seedance 2.5 Draft、Pippit/Seedance 2.5、Pippit/Seedance 2.0 Fast VIP、Pippit/Seedance 2.0 VIP、Pippit/Seedance 2.0 Mini 体验版、Pippit/Seedance 2.0 Mini、Pippit/Wan 3.0、Pippit/HappyHorse 1.1、Kling/Kling Video 2.5、Kling/Kling Video 2.6、Kling/Kling Video O1、Kling/Kling Video 3.0、Kling/Kling Video 3.0 Omni、Kling/Kling Video 3.0 Turbo、Kling/Kling Video 4.0、Kling/Kling 2.6 Motion Control、Kling/Kling 3.0 Motion Control、Kling/Kling Image 3.0 Omni、Kling/Kling Image O1、Kling/Kling Image 3.0、Kling/Kling Image 2.1 |

## 1. 文档目的

本文档面向参与 VideoAgent 开发的前端、后端、Agent、测试和运维人员，说明代码组织、核心流程、模块协作和工程边界。

## 2. 系统范围

- Next.js App Router Web 界面。
- 左侧 Agents、Skills、Hots、Assets、Docs 导航和独立视图切换。
- 蓝色播放键品牌、无框标签页图标和激活图标填充/线框反转。
- 首页连续视频轮播、流式主标语、Skill/Hook 选择器、场景 Playbook、自定义透明下拉和 Action 生成入口。
- 创作输入框根据 `scrollHeight` 自动增高，并在输入非空时隐藏示例灵感；Playbook 保持可用，重复点击当前项会恢复应用前草稿。
- 模型下拉框使用统一模型元数据，展示 Pippit 8 个、Kling 7 个当前可用的视频模型及 Provider。
- Skills 使用单一可搜索目录，显示 `user_id/skill_id`；原厂商能力使用厂商命名空间（如 `kling`），跨 Provider 工作流使用 `video_agent`。
- Hots 支持搜索、循环视频、作者、喜欢数、发布，以及带 Skill 的场景复用。
- Assets 使用瀑布流，并通过 Video/Skill 内部分页区分类型；Video 卡片悬浮静音播放，Skill 卡片无封面并展示 private/public 和 `yyyy-mm-dd` 编辑时间。
- 九份中英文文档、全文搜索、统一深色阅读主题、左侧可折叠目录和章节高亮。
- 注册、登录、登出和服务端会话。
- 用户级项目创建、列表、读取、重命名和归档。
- 用户数据所有权隔离。
- 多镜头故事板创建、读取和版本化替换。
- LangGraph 单节点 Agent 编排。
- 无模型密钥时的确定性本地故事板规划器。
- 配置 OpenAI-compatible 模型后的结构化故事板规划器。
- 积分估算和显式生成审批。
- 生成任务持久化及 `Idempotency-Key` 防重复提交。
- 用户级积分账户、生成预扣与幂等退款。
- 图片、视频和音频上传，MIME、文件头和大小校验。
- FFmpeg 成片合成、字幕、音轨、横竖方版本和封面。
- 私有资产下载、限时分享、撤销和访问计数。
- 同源写请求校验与认证、生成、上传分层限流。
- 管理员邮箱白名单、管理控制台、用户停用、积分调整和任务退款。
- 邀请码注册、开放/邀请/关闭注册策略和全局生成开关。
- 管理操作审计日志。
- Mock Provider。
- Pippit CLI 视频提交、任务查询和余额读取。
- Kling 国内版 CLI 文本生成视频、任务查询、动作控制和多模态参考。
- 任务状态 API 刷新。
- Celery 后台轮询。
- 故事板即时评估与前端审核弹窗。
- Docker Compose 基础设施配置。
- GitHub Actions CI 配置。
- Playwright + Mock Provider 无费用端到端验收。
- Markdown 文档构建。

## 3. 仓库结构

```text
VideoAgent/
├── apps/web/
│   ├── messages/                   # en.json、zh-CN.json
│   ├── src/app/[locale]/           # 国际化页面
│   ├── src/components/             # Auth、项目、工作区等组件
│   ├── src/i18n/                   # 路由、导航和请求配置
│   ├── src/lib/                    # 前端工具函数
│   └── tests/                      # Vitest 测试
├── packages/landing/
│   ├── src/index.tsx               # 共享首页、导航、Hots、Docs
│   ├── src/content.ts              # 英文内容与中文占位资源
│   └── src/landing.css             # 共享视觉样式
├── services/api/
│   ├── src/videoagent/
│   │   ├── agent/                  # LangGraph 和 Planner
│   │   ├── api/                    # FastAPI 路由与依赖
│   │   ├── providers/              # Mock、Pippit CLI、Kling 国内版 CLI
│   │   ├── services/               # 业务服务
│   │   ├── workers/                # Celery 配置和任务
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── main.py
│   └── tests/
├── deploy/docker-compose.yml
├── scripts/                        # 启动、检查、文档构建
├── docs/
├── .github/workflows/              # CI、Pages、安全扫描
├── package.json
└── pnpm-workspace.yaml
```

## 4. 运行时架构

```text
Browser
  │
  ├── Next.js :3000
  │     ├── Route Handler /api/account/* → FastAPI :8000/api/v1
  │     └── public/docs/*             → 内嵌文档
  │
  └── FastAPI
        ├── SQLite
        ├── PostgreSQL
        ├── LangGraph
        ├── Pippit CLI
        └── Kling 国内版 CLI

Celery Worker
  ├── Redis Broker
  ├── PostgreSQL/SQLite
  └── Provider task query
```

当前本地开发中，浏览器直接访问 FastAPI 的 `8000` 端口。FastAPI 已配置本地 CORS。
正式产品首页通过 Next.js Route Handler 代理账户与项目请求；项目工作区仍按
`NEXT_PUBLIC_API_BASE_URL` 访问 FastAPI。

生产环境规划通过反向代理保持同域：

```text
https://example.com/       → Next.js
https://example.com/api/   → FastAPI
```

## 5. 请求流程

### 5.1 注册与会话

```text
浏览器提交注册信息
  → FastAPI 规范化邮箱
  → Argon2 哈希密码
  → 创建 User
  → 生成随机不透明 Session Token
  → 数据库只保存 Token 的 SHA-256
  → HttpOnly Cookie 返回浏览器
```

受保护接口从 Cookie 读取会话 Token，通过哈希查找有效 Session，再加载 User。

### 5.2 项目与故事板

```text
创建项目
  → 校验当前 Session
  → 写入 owner_id

读取或修改项目资源
  → 同时校验 resource_id 和 owner_id
  → 其他用户统一得到 404
```

故事板使用 `PUT /projects/{project_id}/storyboard` 整体替换镜头列表。替换时：

1. 删除旧 Shot。
2. `Storyboard.version` 加一。
3. 根据请求顺序重建 Shot。
4. `index` 从 0 开始连续分配。

### 5.3 Agent 对话

```text
POST /projects/{project_id}/messages
  → 保存 user Message
  → LangGraph 调用 StoryboardPlanner
  → 输出 StoryboardPlan
  → 保存或替换 Storyboard
  → 保存 assistant Message
  → 返回两条 Message 和最新 Storyboard
```

Agent 图只有一个节点：

```text
START → plan_storyboard → END
```

### 5.4 生成任务

```text
用户点击估算
  → POST /shots/{shot_id}/estimate
  → Provider 返回 CostEstimate

用户批准生成
  → POST /shots/{shot_id}/generate
  → 校验 Idempotency-Key
  → 调用 Provider.submit
  → 保存 GenerationJob
  → 更新 Shot 状态
  → 投递 Celery 轮询任务
```

如果相同镜头和 `Idempotency-Key` 已经存在，接口返回已有 Job，HTTP 状态为 200，不会再次提交 Provider。

前端每 5 秒请求一次任务状态。`GET /jobs/{job_id}` 会在任务未结束时调用 Provider 查询最新状态。

### 5.5 Celery 轮询

启用 `VIDEOAGENT_CELERY_ENABLED=true` 后：

```text
生成接口提交 Job
  → videoagent.poll_generation_job.delay(job_id)
  → Worker 加载 Job
  → 使用服务端 Pippit CLI 配置
  → 调用 query-result
  → 更新 Job 和 Shot
  → 未结束则指数退避重试
```

Worker 对已结束的 Job 直接返回，保证重复投递不会继续调用 Provider。

## 6. 后端模块职责

| 模块 | 职责 |
| --- | --- |
| `main.py` | FastAPI 应用工厂、生命周期、路由和异常处理器 |
| `config.py` | 环境变量配置 |
| `db.py` | Async SQLAlchemy Engine、Session 和基础建表 |
| `models.py` | ORM 模型 |
| `schemas.py` | API 和 Agent 的 Pydantic 模型 |
| `errors.py` | 统一业务错误响应 |
| `security.py` | 密码哈希、Session Token、AES-GCM 加解密 |
| `api/auth.py` | 注册、登录、登出和用户设置 |
| `api/projects.py` | 项目列表、创建和读取 |
| `api/storyboards.py` | 故事板读取和替换 |
| `api/agent.py` | 对话和消息持久化 |
| `api/workspace.py` | 历史对话、项目目录、拖拽归档和逐层审批 |
| `api/generation.py` | 积分估算、生成提交和任务查询 |
| `api/evaluation.py` | 项目故事板即时评估 |
| `api/providers.py` | Pippit 服务端状态和积分余额 |
| `api/assets.py` | 上传、下载、导出、分享与撤销 |
| `api/skills.py` | Skill 读取、持久化和 AI 优化 |
| `api/hots.py` | 社区视频上传、列表和公开播放 |
| `api/credits.py` | 用户独立积分余额 |
| `api/admin.py` | 管理总览、用户、积分、任务、邀请码、设置、审计 |
| `middleware.py` | 同源写请求校验与请求限流 |
| `services/storyboards.py` | 故事板领域操作 |
| `services/workflow.py` | Concept、Outline、Script、Ready 状态迁移 |
| `services/skill_optimizer.py` | 将粗略想法整理为结构化 Skill 契约 |
| `services/generation_jobs.py` | Job 刷新和 Shot 状态联动 |
| `services/evaluation.py` | 一致性、覆盖、清晰度和节奏指标计算 |
| `services/media.py` | 文件校验、结果落地、FFmpeg 合成、封面与分享 |
| `services/credits.py` | 积分账户、预扣与幂等退款 |
| `services/admin.py` | 管理查询、账号停用、任务列表与审计 |
| `services/invites.py` | 邀请码创建、消费与撤销 |
| `services/platform_settings.py` | 生成开关与注册模式 |
| `providers/pippit.py` | Pippit CLI 子进程、JSON 契约和任务映射 |
| `providers/kling_cli.py` | Kling 国内版 CLI 提交、状态、身份和积分映射 |
| `providers/kling.py` | 兼容的 Kling MCP 工具适配 |
| `agent/graph.py` | LangGraph 编译和执行 |
| `agent/planner.py` | 本地和远程故事板规划器 |
| `workers/celery_app.py` | Celery 配置 |
| `workers/tasks.py` | 异步轮询任务 |

## 7. 前端模块职责

| 模块 | 职责 |
| --- | --- |
| `app/[locale]/page.tsx` | 加载共享首页与正式产品客户端适配层 |
| `components/app-landing-page.tsx` | 首页创作框提交、项目创建和路由跳转 |
| `app/[locale]/register/page.tsx` | 注册页 |
| `app/[locale]/login/page.tsx` | 登录页 |
| `app/[locale]/projects/[projectId]/page.tsx` | 项目编辑工作区 |
| `packages/landing` | 左侧导航、共享品牌、视频主视觉、创作框、Hots 和 Docs |
| `locale-switcher.tsx` | 中英文切换 |
| `auth-form.tsx` | 注册/登录请求 |
| `project-workspace.tsx` | 自动开始首轮 Agent 对话、故事板、镜头设置和生成 |
| `lib/api.ts` | 根据浏览器 Host 解析 API 地址，避免 localhost/127.0.0.1 跨站校验失败 |
| `scripts/build_pages.py` | 生成文档 HTML、目录与静态资源 |

前端通过 `NEXT_PUBLIC_API_BASE_URL` 访问 FastAPI，所有鉴权请求设置 `credentials: "include"`。

前端请求类型以 FastAPI OpenAPI 契约为准。

Assets 是项目和资产的统一入口；项目详情路由用于打开具体工作区。

## 8. 国际化实现

保留的语言资源：

```text
en
zh-CN
```

核心文件：

- `src/i18n/config.ts`：语言列表和显示名称。
- `src/i18n/routing.ts`：next-intl 路由。
- `src/i18n/navigation.ts`：本地化 Link 和 Router。
- `src/i18n/request.ts`：加载消息文件。
- `src/proxy.ts`：语言前缀路由。
- `messages/en.json`、`messages/zh-CN.json`：翻译资源。

开发规则：

- 两种语言的 Key 保持一致。
- 后端返回稳定错误码，不在数据库保存前端展示文案。
- 新增内部翻译 Key 时同时维护中英文资源。
- Docs 语言直接跟随当前应用语言状态，不使用独立的文档语言缓存。
- Agent 输出语言来自 `User.locale`。
- 视频模型 Prompt 使用 `prompt_en`，中文解释保存在 `prompt_zh`。

## 9. 数据模型

ORM 表：

| 表 | 主要用途 |
| --- | --- |
| `users` | 用户、密码哈希和语言偏好 |
| `sessions` | 服务端会话 Token 哈希 |
| `projects` | 项目和所有者 |
| `storyboards` | 每个项目唯一的当前故事板 |
| `shots` | 镜头 Prompt、比例、时长和状态 |
| `conversations` | 每个项目唯一的对话 |
| `messages` | User/Assistant 消息 |
| `workspace_folders` | 历史对话的项目目录 |
| `workspace_folder_items` | 对话与项目目录的收纳关系 |
| `project_workflows` | 整体设定、分集/分镜大纲、逐场剧本与生成审批状态 |
| `user_skills` | 用户 Skill 名称、说明、执行规范、提示词和输入输出契约 |
| `hots_posts` | Hots 视频、标题、描述、Skill 和喜欢数 |
| `generation_jobs` | Provider 任务、幂等键和结果 |
| `provider_connections` | Provider 授权信息 |
| `oauth_flows` | OAuth 事务状态 |
| `credit_accounts` | 用户独立积分余额 |
| `credit_entries` | 可审计且幂等的预扣、退款流水 |
| `assets` | 上传、生成、导出版本、封面和权限 |
| `share_links` | Token 哈希、过期、撤销和访问计数 |
| `platform_settings` | 生成开关与注册策略 |
| `invite_codes` | 邀请码哈希、有效期和使用次数 |
| `admin_audit_logs` | 管理员操作审计 |

关键约束：

- 业务主键使用 UUID。
- `Project.owner_id` 决定资源权限。
- `Storyboard.project_id` 唯一。
- `Conversation.project_id` 唯一。
- `WorkspaceFolderItem.project_id` 唯一，一个对话只能收纳在一个项目目录中。
- `(Shot.storyboard_id, Shot.index)` 唯一。
- `(GenerationJob.shot_id, GenerationJob.idempotency_key)` 唯一。
- `(ProviderConnection.user_id, ProviderConnection.provider)` 唯一。
- `OAuthFlow.state_hash` 具有唯一约束。
- `(CreditEntry.reason, CreditEntry.reference_id)` 唯一，防止重复预扣或退款。
- `(GenerationJob.shot_id, GenerationJob.idempotency_key)` 唯一。

## 10. Pippit CLI Provider

### 10.1 Provider 选择

`VIDEOAGENT_VIDEO_PROVIDER` 支持：

| 值 | 行为 |
| --- | --- |
| `pippit` | 使用服务端安装并授权的 Pippit CLI |
| `auto` | 当前兼容别名，与 `pippit` 行为相同 |
| `mock` | 使用本地 Mock，不执行 CLI 或外部生成 |

默认值为 `pippit`。测试环境显式使用 `mock`。

### 10.2 服务端授权

```text
安装 @pippit-dev/cli
  → pippit-tool-cli login
  → 浏览器完成 Pippit 授权
  → CLI 写入操作系统安全存储
  → FastAPI 子进程复用服务端登录状态
```

CI 可改用 `VIDEOAGENT_PIPPIT_ACCESS_KEY`，Provider 只把该值转换为子进程
环境变量 `XYQ_ACCESS_KEY`。它不是用户级凭据，不写入数据库，也不通过 API
返回。

### 10.3 CLI 调用

`PippitVideoProvider` 使用参数数组启动子进程，不拼接 Shell 字符串：

```text
status             → logged_in
get-credit-balance → total_remain_amount
generate-video     → thread_id + run_id
query-result       → completed + videos[].download_url
```

Provider 将 CLI 输出转换为稳定领域对象：

```text
GenerationRequest → generate-video → JSON task reference → ProviderJob
task reference    → query-result   → JobStatus + result URL
```

子进程标准输出必须是单个 JSON 对象；标准错误和完整参数不返回浏览器。
退出码非 0、无效 JSON、超时和缺少必要 ID 均映射为 Provider 错误。

## 11. API 清单

基础路径：`/api/v1`

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | API 与数据库健康状态 |
| POST | `/auth/register` | 注册并创建 Session |
| POST | `/auth/login` | 登录并创建 Session |
| POST | `/auth/logout` | 删除当前 Session |
| GET | `/auth/me` | 当前用户 |
| PATCH | `/auth/me` | 更新语言偏好 |
| GET | `/projects` | 当前用户项目列表 |
| POST | `/projects` | 创建项目 |
| GET | `/projects/{id}` | 读取项目 |
| PATCH | `/projects/{id}` | 重命名项目 |
| DELETE | `/projects/{id}` | 归档项目 |
| GET | `/projects/{id}/messages` | 对话历史 |
| POST | `/projects/{id}/messages` | Agent 生成故事板并保存对话 |
| GET | `/workspace` | 项目目录与全部历史对话 |
| POST/PATCH/DELETE | `/workspace/folders` | 管理项目目录 |
| PUT | `/workspace/threads/{id}/folder` | 收纳或移出历史对话 |
| GET | `/projects/{id}/workflow` | 当前逐层审批状态 |
| POST | `/projects/{id}/workflow/decision` | 批准、调整或自定义修改 |
| GET/POST | `/skills` | 读取和保存当前用户 Skill |
| POST | `/skills/optimize` | AI 优化 Skill 草稿 |
| GET/POST | `/hots` | 社区列表与 MP4 发布 |
| GET | `/hots/{id}/video` | 播放公开视频 |
| GET | `/projects/{id}/storyboard` | 获取故事板 |
| PUT | `/projects/{id}/storyboard` | 整体替换故事板 |
| PATCH | `/projects/{id}/storyboard/order` | 调整镜头顺序并保留 Shot ID 与资产 |
| POST | `/shots/{id}/estimate` | 查询积分估算 |
| POST | `/shots/{id}/generate` | 提交生成任务 |
| GET | `/jobs/{id}` | 查询并刷新任务状态 |
| POST | `/projects/{id}/evaluate` | 即时评估当前故事板 |
| GET | `/providers/pippit` | 服务端 Pippit 登录状态 |
| GET | `/providers/pippit/credits` | Pippit 积分余额 |
| GET | `/credits` | 当前用户 VideoAgent 积分余额 |
| GET | `/assets` | 当前用户资产列表 |
| GET/POST | `/projects/{id}/assets` | 项目资产列表与上传 |
| GET | `/assets/{id}/content` | 读取私有资产 |
| POST | `/projects/{id}/exports` | 合成与交付版本导出 |
| POST | `/assets/{id}/share` | 创建限时分享 |
| DELETE | `/shares/{id}` | 撤销分享 |
| GET | `/shares/{token}/content` | 读取有效分享内容 |
| GET/PATCH | `/admin/settings` | 读取或更新生成与注册策略 |
| GET | `/admin/overview` | 管理总览 |
| GET | `/admin/users` | 用户列表 |
| PATCH | `/admin/users/{id}` | 停用或恢复用户 |
| POST | `/admin/users/{id}/credits` | 调整用户积分 |
| GET | `/admin/jobs` | 生成任务列表 |
| POST | `/admin/jobs/{id}/refund` | 任务异常退款 |
| GET/POST | `/admin/invites` | 邀请码列表与创建 |
| DELETE | `/admin/invites/{id}` | 撤销邀请码 |
| GET | `/admin/audit` | 管理审计日志 |

生成接口必须携带：

```text
Idempotency-Key: <unique-client-generated-key>
```

错误响应：

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "The project was not found.",
    "details": {},
    "requestId": "..."
  }
}
```

## 12. 安全实现

- 密码使用 Argon2。
- 会话使用随机不透明 Token，数据库只保存 SHA-256。
- 会话 Cookie 为 HttpOnly 和 SameSite=Lax。
- Pippit CLI 登录文件放在服务账号可访问但权限受限的位置。
- `VIDEOAGENT_PIPPIT_ACCESS_KEY` 只来自秘密环境变量。
- CLI 子进程有超时，命令参数不经 Shell 解释。
- 跨用户资源访问统一返回 404。
- 日志和 API 响应不返回 Provider Token。
- 敏感环境变量不得提交到 Git。
- 不安全方法校验 `Origin` 与 `Sec-Fetch-Site`。
- 上传读取有字节上限，并校验声明的 MIME 与文件签名。
- 分享 Token 只保存 SHA-256 哈希，过期或撤销后返回 404。
- `VIDEOAGENT_ADMIN_EMAILS` 是管理权限的唯一引导来源。
- 普通用户访问 `/admin/*` 返回 `403`，未登录返回 `401`。
- 停用用户时删除其 Session；管理员不能停用自己。
- 生成开关关闭后，估算和提交都返回 `503 GENERATION_DISABLED`。

## 13. 本地开发

### 13.1 启动 API

```powershell
cd D:\_Science\Agent\VideoAgent
.\scripts\dev-api.ps1
```

启动脚本会将 Windows PowerShell、Python 标准输出和代码页切换为 UTF-8，避免中文日志乱码。

默认数据库：

```text
services/api/.data/videoagent.db
```

### 13.2 启动 Web

```powershell
cd D:\_Science\Agent\VideoAgent
.\scripts\dev-web.ps1
```

该脚本同样会统一控制台编码，并启动 Next.js 开发服务。

访问：

```text
http://localhost:3000/en
http://localhost:8000/docs
```

### 13.3 启动 Celery

先启动 Redis，然后：

```powershell
.\scripts\dev-worker.ps1
```

同时必须让 API 和 Worker 使用相同的：

```text
VIDEOAGENT_DATABASE_URL
VIDEOAGENT_CELERY_BROKER_URL
VIDEOAGENT_CELERY_RESULT_BACKEND
VIDEOAGENT_TOKEN_ENCRYPTION_KEY
```

### 13.4 Docker 基础设施

```powershell
docker compose -f deploy/docker-compose.yml up -d
```

启动 PostgreSQL、Redis 和 MinIO。

## 14. 配置项

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VIDEOAGENT_DATABASE_URL` | SQLite `.data/videoagent.db` | SQLAlchemy Async URL |
| `VIDEOAGENT_COOKIE_SECURE` | `false` | HTTPS 环境应设为 `true` |
| `VIDEOAGENT_SESSION_SECRET` | 开发值 | 必须替换 |
| `VIDEOAGENT_TOKEN_ENCRYPTION_KEY` | 开发值 | 必须替换 |
| `VIDEOAGENT_VIDEO_PROVIDER` | `pippit` | `pippit/auto/mock` |
| `VIDEOAGENT_PIPPIT_CLI_COMMAND` | `pippit-tool-cli` | CLI 命令或可执行路径 |
| `VIDEOAGENT_PIPPIT_ACCESS_KEY` | 空 | CI 可选服务端 Access Key |
| `VIDEOAGENT_PIPPIT_VIDEO_MODEL` | 空 | 留空使用 CLI 服务默认模型 |
| `VIDEOAGENT_PIPPIT_VIDEO_RESOLUTION` | 空 | 例如 `720p` |
| `VIDEOAGENT_PIPPIT_TIMEOUT_SECONDS` | `180` | 子进程超时 |
| `VIDEOAGENT_CELERY_ENABLED` | `false` | 是否投递轮询任务 |
| `VIDEOAGENT_CELERY_BROKER_URL` | Redis localhost | Celery Broker |
| `VIDEOAGENT_CELERY_RESULT_BACKEND` | Redis localhost | Celery Result |
| `VIDEOAGENT_LLM_BASE_URL` | 空 | OpenAI-compatible Endpoint |
| `VIDEOAGENT_LLM_API_KEY` | 空 | 模型密钥 |
| `VIDEOAGENT_LLM_MODEL` | 空 | 模型名称 |
| `VIDEOAGENT_MEDIA_DIR` | `.data/media` | 本地媒体目录 |
| `VIDEOAGENT_MAX_UPLOAD_BYTES` | `100 MiB` | 单文件大小上限 |
| `VIDEOAGENT_FFMPEG_COMMAND` | `ffmpeg` | FFmpeg 命令或路径 |
| `VIDEOAGENT_FFPROBE_COMMAND` | `ffprobe` | FFprobe 命令或路径 |
| `VIDEOAGENT_STARTING_USER_CREDITS` | `0` | 新用户初始配额，默认由管理员发放 |
| `VIDEOAGENT_AUTH_RATE_LIMIT_PER_MINUTE` | `20` | 认证写请求限流 |
| `VIDEOAGENT_GENERATION_RATE_LIMIT_PER_MINUTE` | `30` | 生成与导出限流 |
| `VIDEOAGENT_UPLOAD_RATE_LIMIT_PER_MINUTE` | `20` | 上传限流 |
| `VIDEOAGENT_ADMIN_EMAILS` | `[]` | 管理员邮箱 JSON 列表 |
| `VIDEOAGENT_REGISTRATION_MODE` | `open` | `open/invite/closed` 默认策略 |
| `VIDEOAGENT_GENERATION_ENABLED` | `true` | 生成功能初始状态 |
| `VIDEOAGENT_KLING_BACKEND` | `cli` | Kling 使用 `cli`，兼容模式可设 `mcp` |
| `VIDEOAGENT_KLING_CLI_COMMAND` | `kling` | 国内版 CLI 命令 |
| `VIDEOAGENT_KLING_EXPECTED_USER_ID` | 空 | 期望登录的国内站账号 ID |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000/api/v1` | 浏览器 API 地址 |

`VIDEOAGENT_PIPPIT_ACCESS_KEY` 只适用于服务端或 CI。本地和生产主机优先使用
`pippit-tool-cli login`，避免把长期凭据写入 `.env`。

## 15. 测试与质量门禁

后端：

```powershell
cd services\api
uv run pytest
uv run ruff format --check src tests
uv run ruff check src tests
uv run mypy src
```

前端：

```powershell
pnpm --dir apps/web test
pnpm --dir apps/web typecheck
pnpm --dir apps/web build
```

测试组成：

- 后端 64 个测试。
- 前端 27 个测试。
- Playwright 7 个端到端测试。
- 后端测试使用临时 SQLite 文件。
- Pippit 测试使用本地 Fake CLI，不访问真实生成网络。
- Kling Provider 测试使用 Fake MCP client，不触发付费生成。
- 前端测试覆盖共享首页、导航、文档加载、自定义下拉、Hots 发布、创作提交、历史目录、逐层审批、Skill AI 优化和持久化发布。
- 工作流批准使用本地即时阶段推进；显式调整和自定义修改才调用远程规划器，减少选项点击等待。
- Agent 语言由项目 Brief 和当前用户 Prompt 自动检测，不直接沿用账户语言。
- Pippit 会将低于模型下限的镜头时长提升到 4 秒并同步估算；Provider 拒绝时返回可读的 `502` 错误并幂等退款。
- Playwright 使用 Mock Provider 验证审批、生成、导出、分享、Skill 优化，以及 Hots 视频上传和 Assets 详情，不访问付费 Provider。
- 管理测试覆盖白名单权限、积分调整、账号停用、邀请码、注册关闭和生成开关。
- 普通 CI 不执行付费生成。

新增功能必须遵循：

1. 先编写失败测试。
2. 实现最小代码。
3. 重构。
4. 运行相关测试和全部质量门禁。

## 16. 开发规范

### 16.1 后端

- 路由层只处理 HTTP 转换和依赖注入。
- 领域逻辑放在 `services/`。
- Provider 细节只放在 `providers/`。
- 所有外部输入由 Pydantic 校验。
- API 错误使用稳定错误码。
- 不能把 Pippit Access Key 或 CLI 登录文件写入日志。
- 新查询必须包含用户所有权条件。

### 16.2 Agent

- LLM 输出必须使用 Pydantic 结构化模型。
- 不在 Agent 中直接执行删除、支付或账号操作。
- 外部生成操作必须经过明确的计费审批。
- Prompt 中上传内容和用户文本均视为不可信。
- 本地规划器必须保持可用，确保无模型环境可以开发。

### 16.3 Provider

- 所有 Provider 实现 `VideoProvider` 接口。
- Provider 错误必须转换为稳定的业务错误。
- 生成提交禁止无幂等保护地重试。
- 查询失败可以退避重试。
- 原始响应与标准化响应分开保存。

### 16.4 前端

- 服务端状态使用 TanStack Query 或页面级异步加载。
- 临时交互状态使用 React state/Zustand。
- 新文案必须同时进入 `en.json` 和 `zh-CN.json`。
- 优先使用语义标签和可访问控件。
- 动效必须支持 `prefers-reduced-motion`。
- Pippit 凭据不得进入 localStorage 或浏览器状态。

## 17. 扩展点

### 新增视频 Provider

1. 实现 `VideoProvider`。
2. 将 Provider 错误映射为领域错误。
3. 增加 Provider Contract 测试。
4. 在 Provider Resolver 中增加选择逻辑。
5. 增加前端能力展示和积分字段。

### 新增 Agent 节点

1. 在 `AgentState` 中增加类型化状态。
2. 为该状态迁移编写单元测试。
3. 将节点加入 `StateGraph`。
4. 保持节点幂等。
5. 涉及外部长任务时交给 Celery，不在图节点内阻塞等待。

### 新增 API

1. 在 `schemas.py` 增加输入输出模型。
2. 在 `services/` 增加业务逻辑。
3. 在 `api/` 增加薄路由。
4. 增加所有权和未授权测试。
5. 更新本文档和 OpenAPI 调用方。

## 19. 提交流程检查清单

- 功能有对应失败测试和通过测试。
- 新接口包含鉴权与资源所有权校验。
- 新文案中英文 Key 一致。
- 没有提交 `.env`、Token、上传媒体或本地数据库。
- Ruff、mypy、pytest、TypeScript、Vitest 和 Next Build 通过。
- 新增外部依赖已写入锁文件。
- 新增配置已写入 `.env.example`。
- 设计或实现边界变化已更新本文档。

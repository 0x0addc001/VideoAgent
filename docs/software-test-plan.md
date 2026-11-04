# VideoAgent 软件测试与 TDD 规范

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.1 |
| 文档状态 | 当前测试基线 + 后续目标 |
| 编写日期 | 2026-11-03 |
| 适用范围 | 共享 Landing UI、Next.js Web、FastAPI、LangGraph、Celery、Pippit CLI |
| 关联设计 | `docs/software-design.md` |
| 当前测试框架 | pytest、Vitest、Testing Library |
| 目标 E2E 框架 | Playwright（尚未接入 CI） |

## 1. 目的

本文档定义 VideoAgent 的测试策略、测试分层、TDD 工作方式、环境要求、测试用例、质量门禁、缺陷等级和验收标准。

测试不只用于验证完成后的代码，而是软件设计与实现的一部分。每项业务能力都应先通过失败测试明确行为，再实现代码使其通过，最后在不改变外部行为的前提下重构。

## 2. 测试原则

### 2.1 TDD 循环

所有核心业务能力遵循 Red–Green–Refactor：

1. **Red：** 根据验收场景编写一个最小失败测试。
2. **Green：** 编写足以通过测试的最简单实现。
3. **Refactor：** 消除重复、改善命名和结构，保持测试通过。
4. **Commit：** 测试和实现可以在绿色状态后一起提交。

禁止先完成大段实现，再事后补写只验证当前实现的测试。

### 2.2 测试行为而非实现

- 测试公开行为、业务规则和接口契约。
- 避免直接断言私有函数、内部调用顺序或数据库实现细节。
- 外部 Provider 通过接口边界 Mock，不 Mock 被测系统自身的领域逻辑。
- 时间、随机数和 UUID 使用可注入 Clock 或 ID Provider，保证测试确定性。

### 2.3 测试金字塔

```text
             E2E
         少量关键流程
        ─────────────────
          Contract / API
        前后端契约与接口
      ─────────────────────
        Integration Tests
      真实 DB / Queue / S3
    ─────────────────────────
           Unit Tests
      快速、大量、无外部依赖
```

建议比例：

- 单元测试：60%–70%。
- API、契约和集成测试：20%–30%。
- E2E 和人工探索测试：5%–10%。

比例是参考值，不应为了达到数量而编写低价值测试。

## 3. 质量目标

### 3.1 自动化覆盖目标

| 范围 | 目标 |
| --- | --- |
| 领域规则和权限逻辑 | 分支覆盖率不低于 90% |
| LangGraph 节点和状态迁移 | 分支覆盖率不低于 90% |
| Provider 参数标准化 | 分支覆盖率不低于 90% |
| FastAPI 后端整体 | 行覆盖率不低于 80% |
| 前端核心业务组件 | 行覆盖率不低于 80% |
| Pippit CLI Adapter | 契约测试覆盖状态、积分、提交和查询 |
| 公开英文界面 | 首页、导航、创作提交和项目工作区有组件/API 测试 |
| 中英文能力 | 当前仅验证中文路由重定向；双语文案与 E2E 属于后续目标 |

覆盖率只是质量指标之一。以下任一情况不能被高覆盖率抵消：

- 存在未处理的 P0/P1 缺陷。
- 计费任务存在重复提交风险。
- 用户能够访问其他用户的数据。
- Token 会出现在浏览器或日志中。
- 公开英文界面存在阻断流程的缺失文案；恢复中文后扩展到双语检查。

当前自动化基线为后端 35 项、前端 18 项；E2E、真实基础设施和付费 Provider
测试不计入普通 CI。

### 3.2 稳定性目标

- CI 测试连续运行三次结果一致。
- 非外部依赖测试的 Flaky Rate 低于 1%。
- 同一失败测试重跑通过不能作为长期修复。
- 所有 Flaky 测试必须建立跟踪记录，并在发布前修复或隔离。

## 4. 测试范围

### 4.1 当前已覆盖

- 用户注册、登录、退出和会话。
- 项目创建、读取、重命名、归档和用户所有权隔离。
- 故事板读取、整体替换、版本和镜头顺序。
- LangGraph 单节点故事板规划与本地确定性 Planner。
- Agent 对话持久化和结构化输出。
- Pippit CLI 服务端授权状态、积分读取、提交和查询映射。
- 生成任务提交、状态刷新、幂等键和显式审批。
- 可选 Celery 轮询任务。
- 故事板即时评估。
- 共享 Landing UI 导航、视频轮播、流式标题、文档加载、自定义下拉、Hots 元数据和本地发布。
- `/zh-CN` 到 `/en` 的重定向。

### 4.2 目标能力测试

以下能力尚未实现，测试用例应随功能开发分批启用：

- 图片和视频上传。
- 完整多节点 Agent 审批和恢复工作流。
- 任务取消、SSE 状态推送与断线重连。
- FFmpeg 合成、缩略图、MP4 导出。
- 公开分享链接、有效期和撤销。
- 持久化社区发布、点赞和权限控制。
- PostgreSQL、Redis、MinIO 和 Celery 生产集成。

### 4.3 暂不纳入

- 未实现的支付和计费系统。
- 多用户实时协作。
- 数字人、音乐和声音克隆。
- 原生移动 App。
- 第三方服务内部推理质量。
- Pippit 模型输出的艺术质量自动评分。

视频艺术质量采用人工验收，自动化测试只验证任务、媒体格式和业务状态。

## 5. 测试分层

### 5.1 单元测试

后端使用 pytest，前端使用 Vitest。

重点对象：

- Pydantic Schema 和字段约束。
- 项目、镜头和任务状态机。
- Agent 节点输入输出。
- Provider 请求和响应映射。
- 权限判断。
- 幂等键行为。
- 故事板即时评估指标。
- 共享 Landing 导航、文档 iframe、下拉控件和本地 Hots 发布。
- 中文路由重定向和翻译资源结构。

当前单元测试使用临时 SQLite 和 Fake CLI，不得访问真实 Pippit 网络。

### 5.2 Provider 契约测试

当前 Provider 契约覆盖：

- `MockVideoProvider`
- `PippitVideoProvider`

至少验证：

- 任务提交返回稳定的 Provider Job ID。
- 状态查询返回标准状态。
- 原始响应可以保存，但不直接进入领域模型。

Capability 发现、取消方法和完整共享契约矩阵属于后续目标。

### 5.3 API 测试

使用 FastAPI TestClient 或 ASGI Transport：

- HTTP 状态码。
- 响应 Schema。
- 错误响应格式。
- 认证和所有权。
- `Idempotency-Key`。
- 项目归档与资源隔离。
- 故事板整体替换与 Agent 消息响应。

分页、CSRF、Origin 校验和 OpenAPI 生成客户端属于后续门禁。

### 5.4 集成测试（目标）

当前仅使用临时 SQLite 和本地 Fake CLI。以下真实基础设施测试属于目标：

- 数据库约束和事务。
- LangGraph Checkpoint 恢复。
- Alembic 从空数据库升级。
- Celery 任务投递和执行。
- Redis Pub/Sub 到 SSE。
- S3 预签名和对象生命周期。
- Pippit CLI 使用本地 Fake CLI 可执行文件或受控网络 Stub。

集成测试使用 Testcontainers 或 Docker Compose，每个测试套件使用独立数据库和 Bucket。

### 5.5 E2E 测试（目标）

当前 CI 尚未运行 Playwright。目标覆盖：

- 英文公开流程和 `/zh-CN` 重定向。
- 登录或测试会话注入。
- 创建项目。
- Agent 生成故事板。
- 审批生成。
- Mock Provider 生成任务。
- 镜头编辑和重排。
- 视频导出。
- 公开分享页。
- 错误、空状态和恢复。

### 5.6 非功能测试

包括：

- 安全。
- 性能。
- 可靠性。
- 可访问性。
- 可观测性。
- 浏览器兼容性。

## 6. TDD 开发流程

### 6.1 单个功能流程

```text
确认验收场景
  → 编写场景编号
  → 写最小失败测试
  → 运行确认因预期原因失败
  → 实现最小代码
  → 测试通过
  → 重构
  → 运行受影响测试
  → 提交
```

“测试失败”必须是因为缺少目标行为，而不是导入路径、测试环境或语法错误。

### 6.2 测试先行顺序

每个功能按以下顺序编写测试：

1. 领域失败用例。
2. 领域成功用例。
3. 权限和边界条件。
4. API/Provider 契约。
5. 集成行为。
6. 前端交互。
7. E2E 验收。

### 6.3 Definition of Done

一个任务只有满足以下条件才完成：

- 验收场景有自动化测试或明确的人工测试步骤。
- 新逻辑有单元测试。
- API 或 Provider 变化有契约测试。
- 跨组件流程有必要的集成或 E2E 测试。
- 中文和英文文案同时完成。
- `Ruff`、`mypy`、pytest、前端类型检查和测试通过。
- 没有新增 P0/P1 缺陷。
- 安全日志不包含敏感信息。
- 相关文档同步更新。

## 7. 测试环境

### 7.1 本地测试

```text
PostgreSQL
Redis
MinIO
Mock Pippit CLI
Mock Video Provider
Mock LLM Provider
```

Pippit CLI 的 stdout JSON 契约通过本地 Fake CLI 模拟。真实 Pippit 网络测试默认关闭。

### 7.2 CI 测试

普通 Pull Request 只运行：

- 后端单元测试、API 测试和契约测试。
- 前端单元测试、类型检查和构建。
- OpenAPI 与生成客户端一致性检查。
- 静态安全和依赖扫描。

Nightly 任务运行：

- PostgreSQL、Redis、MinIO 和 Celery 集成测试。
- Playwright E2E。
- 迁移与恢复测试。

受保护的 Release 流程运行：

- Pippit CLI 状态和积分只读 Smoke Test。
- 经人工授权的一次付费生成测试。

### 7.3 真实 Pippit 测试开关

真实测试必须同时满足：

```text
RUN_PIPPIT_LIVE_TESTS=1
RUN_PIPPIT_PAID_TESTS=1
PIPPIT_PAID_TEST_BUDGET>0
```

付费测试还需要：

- 使用专用测试账户。
- 指定单次生成次数上限。
- 指定最大积分预算。
- 人工启动。
- 测试后核对任务和积分流水。
- 默认 CI 中强制关闭。

## 8. 测试数据

- 只使用合成用户、合成图片和公开授权测试素材。
- 不在 Fixture 中保存真实 Pippit Access Key 或 CLI 登录文件。
- 不在测试日志中输出 Access Key 或完整 CLI 环境变量。
- 测试用户邮箱使用无投递需求的合成地址，例如 `creator@example.com`。
- 每个测试使用独立 UUID 和数据库事务。
- 测试结束后删除数据库记录、对象存储文件和临时媒体。
- 数据库测试禁止连接共享生产数据库。

## 9. 测试用例

本节是目标验收用例矩阵。已经实现的能力由当前自动化测试覆盖；素材、
CSRF、SSE、FFmpeg、导出和分享等用例在对应功能落地前属于待实现契约，
不能作为当前版本已经通过的证据。

### 9.1 认证、会话与权限

| ID | 场景 | 预期结果 | 层级 | 优先级 |
| --- | --- | --- | --- | --- |
| AUTH-001 | 有效邮箱和强密码注册 | 创建用户，密码以 Argon2 哈希保存 | API | P0 |
| AUTH-002 | 重复邮箱注册 | 返回稳定错误码，不泄露额外信息 | API | P0 |
| AUTH-003 | 弱密码注册 | 返回字段级校验错误 | API | P1 |
| AUTH-004 | 正确凭据登录 | 设置 HttpOnly 会话 Cookie | API | P0 |
| AUTH-005 | 错误密码连续登录 | 限流生效，返回统一错误 | Security | P0 |
| AUTH-006 | 过期会话访问 API | 返回 401，不访问业务数据 | API | P0 |
| AUTH-007 | 登出 | 删除或失效会话，后续请求返回 401 | API | P0 |
| AUTH-008 | 用户 A 读取用户 B 项目 | 返回 404 或 403，不泄露存在性 | Security | P0 |
| AUTH-009 | 修改用户语言为英文 | 用户资料和 Cookie 均更新 | API | P1 |
| AUTH-010 | CSRF Token 缺失的写请求 | 拒绝请求 | Security | P0 |

### 9.2 项目与故事板

| ID | 场景 | 预期结果 | 层级 | 优先级 |
| --- | --- | --- | --- | --- |
| PROJ-001 | 创建项目 | 默认为 `draft`，所有者正确 | Unit/API | P0 |
| PROJ-002 | 列表只显示自己的项目 | 不返回其他用户项目 | API | P0 |
| PROJ-003 | 修改项目标题和 Brief | 更新成功并记录 UpdatedAt | API | P1 |
| PROJ-004 | 非法状态迁移 | 拒绝并返回 `INVALID_PROJECT_TRANSITION` | Unit | P0 |
| PROJ-005 | Storyboard 少于一个镜头 | Schema 校验失败 | Unit | P0 |
| PROJ-006 | 镜头顺序重复 | Schema 或数据库约束拒绝 | Unit | P0 |
| PROJ-007 | 更新单个镜头 | 只更新目标镜头及版本 | API | P1 |
| PROJ-008 | 并发更新同一镜头 | 使用版本号，后写不覆盖新版本 | Integration | P0 |
| PROJ-009 | 即时评估故事板 | 返回四项量化指标和修改建议 | API | P0 |
| PROJ-010 | 画面比例不一致 | 一致性分数下降并提示统一画幅 | API | P1 |
| PROJ-009 | 删除项目 | 校验所有权，清理或排队清理媒体 | API | P1 |
| PROJ-010 | 归档项目 | 保持数据可读，任务不可再提交 | API | P1 |

### 9.3 素材与存储

| ID | 场景 | 预期结果 | 层级 | 优先级 |
| --- | --- | --- | --- | --- |
| ASSET-001 | 合法 JPEG 上传 | 预签名成功，完成校验后创建 Asset | Integration | P0 |
| ASSET-002 | 伪造扩展名文件 | 根据文件头识别并拒绝 | Unit/API | P0 |
| ASSET-003 | 超过大小限制 | 返回文件大小错误 | API | P0 |
| ASSET-004 | 上传未完成即引用 | 拒绝引用 | Integration | P0 |
| ASSET-005 | 其他用户读取 Asset URL | 不签发有效 URL | Security | P0 |
| ASSET-006 | 上传参考视频 | 提取时长、宽高和编码 | Integration | P1 |
| ASSET-007 | 缩略图生成失败 | Asset 标记失败，不进入可用状态 | Integration | P1 |
| ASSET-008 | 临时 URL 过期 | 返回可识别的 `ASSET_URL_EXPIRED` | Frontend | P1 |

### 9.4 Agent 与工作流

| ID | 场景 | 预期结果 | 层级 | 优先级 |
| --- | --- | --- | --- | --- |
| AGENT-001 | 用户提交完整视频需求 | Agent 输出合法 Treatment 和 Storyboard | Unit | P0 |
| AGENT-002 | 缺少宽高比 | Agent 追问而不提交生成 | Unit | P0 |
| AGENT-003 | 模型返回非法 JSON | 进行有限次数修复，仍失败则返回结构化错误 | Unit | P0 |
| AGENT-004 | 镜头时长超 Provider 范围 | 校验失败，不调用 Pippit | Unit | P0 |
| AGENT-005 | 中文项目 | Agent 中文说明，模型 Prompt 支持英文 | Unit | P0 |
| AGENT-006 | 英文项目 | 对话和故事板均为英文 | Unit | P0 |
| AGENT-007 | 未审批直接进入生成 | 状态机拒绝迁移 | Unit | P0 |
| AGENT-008 | 审批后提交任务 | 进入 `submit_generation_jobs` | Integration | P0 |
| AGENT-009 | API 重启后恢复 Checkpoint | 从当前审批或任务状态继续 | Integration | P0 |
| AGENT-010 | 用户取消生成 | 不创建新任务，已有任务进入取消流程 | Integration | P0 |
| AGENT-011 | Agent 尝试删除 Element | 工具白名单拒绝 | Security | P0 |
| AGENT-012 | 上传文本包含 Prompt Injection | 被视为不可信内容，不扩大工具权限 | Security | P0 |

### 9.5 Pippit CLI Provider

| ID | 场景 | 预期结果 | 层级 | 优先级 |
| --- | --- | --- | --- | --- |
| PIPPIT-001 | 查询未登录状态 | 返回 `connected=false`，不泄露登录信息 | API | P0 |
| PIPPIT-002 | 查询已登录状态 | 返回 `scope=server` 和连接状态 | API | P0 |
| PIPPIT-003 | 查询零积分 | `0` 是合法余额，不转换为空值 | Contract | P0 |
| PIPPIT-004 | 查询非零积分 | 字符串金额转换为数值 | Contract | P0 |
| PIPPIT-005 | CLI 未安装 | 返回 `PIPPIT_CLI_UNAVAILABLE`，不尝试生成 | API | P0 |
| PIPPIT-006 | CLI 超时 | 终止子进程并返回结构化错误 | Unit | P0 |
| PIPPIT-007 | 提交文本生成视频 | 参数按数组传给 CLI，任务引用可恢复 | Contract | P0 |
| PIPPIT-008 | 提交图片生成视频 | 首版明确拒绝，不调用 CLI | Unit | P1 |
| PIPPIT-009 | 缺少 thread/run ID | 不保存不可查询的 Job | Unit | P0 |
| PIPPIT-010 | 查询未完成 | 映射为 `running` | Contract | P0 |
| PIPPIT-011 | 查询成功 | 映射为 `succeeded` 并返回视频 URL | Contract | P0 |
| PIPPIT-012 | 查询失败或结果无视频 | 映射为 `failed` | Contract | P0 |

### 9.6 生成任务

| ID | 场景 | 预期结果 | 层级 | 优先级 |
| --- | --- | --- | --- | --- |
| JOB-001 | 创建合法任务 | 返回本地 Job ID，状态为 `pending` | API | P0 |
| JOB-002 | 相同 Idempotency-Key 重复请求 | 返回同一任务，不重复提交 | Integration | P0 |
| JOB-003 | 用户积分不足 | 阻止提交并返回 `KLING_INSUFFICIENT_CREDITS` | Unit/API | P0 |
| JOB-004 | 提交成功 | 保存 Provider Task ID 并进入 `submitted` | Integration | P0 |
| JOB-005 | 提交超时且无 Task ID | 进入 `submission_uncertain`，禁止自动重提 | Integration | P0 |
| JOB-006 | `query_tasks` 暂时失败 | 按退避策略重试 | Unit | P0 |
| JOB-007 | Provider 任务运行中 | 更新进度并广播事件 | Integration | P1 |
| JOB-008 | Provider 任务成功 | 下载媒体、创建 Asset、更新 Shot | Integration | P0 |
| JOB-009 | Provider 任务失败 | 保存标准错误并允许用户重新生成 | Integration | P0 |
| JOB-010 | Celery 重复投递同一任务 | 数据库幂等保护，不重复生成 | Integration | P0 |
| JOB-011 | Worker 在轮询中被终止 | 重启后继续轮询既有 Provider Task ID | Integration | P0 |
| JOB-012 | 用户取消任务 | 调用 Provider 取消或标记不可取消状态 | Integration | P1 |
| JOB-013 | 超过任务最大时长 | 标记超时并广播告警 | Integration | P1 |

### 9.7 合成、导出与分享

| ID | 场景 | 预期结果 | 层级 | 优先级 |
| --- | --- | --- | --- | --- |
| MEDIA-001 | 对合法镜头视频探测元数据 | 返回正确时长、尺寸和编码 | Unit | P0 |
| MEDIA-002 | 宽高比不同的镜头合成 | 按配置缩放/裁切，不产生空白帧 | Integration | P1 |
| MEDIA-003 | FFmpeg 进程失败 | 返回结构化错误并保留诊断日志 | Unit | P0 |
| MEDIA-004 | 文件名包含 Shell 字符 | 作为参数传递，不执行命令注入 | Security | P0 |
| MEDIA-005 | 导出成功 | 产生可播放 MP4 和缩略图 | Integration | P0 |
| MEDIA-006 | 导出取消 | 停止进程并清理临时文件 | Integration | P1 |
| MEDIA-007 | 创建公开分享 | 只返回随机 Token，数据库仅保存哈希 | API | P0 |
| MEDIA-008 | 分享链接过期 | 返回 404 或明确的过期页面 | API | P1 |
| MEDIA-009 | 撤销分享链接 | 原链接立即失效 | API | P0 |
| MEDIA-010 | 未登录访问分享页 | 只能访问已公开项目 | Security | P0 |

### 9.8 国际化、共享 UI 与前端体验

| ID | 场景 | 预期结果 | 层级 | 优先级 |
| --- | --- | --- | --- | --- |
| I18N-001 | 访问 `/zh-CN` | 重定向到 `/en` | API/Frontend | P0 |
| I18N-002 | 访问 `/en` | 加载英文公开 UI | Frontend | P0 |
| I18N-003 | 直接调用注册/更新用户接口 | 后端接受 `en` 与 `zh-CN` 偏好 | API | P1 |
| I18N-004 | 前端翻译资源结构 | `en` 与 `zh-CN` Key 保持一致 | Unit | P1 |
| I18N-005 | 恢复中文版后切换语言 | 路由、界面和偏好同步 | E2E（目标） | P1 |
| UI-001 | 桌面端三栏布局 | 对话、Canvas、Inspector 均可用 | E2E | P1 |
| UI-002 | 移动端标签切换 | 不丢失当前项目状态 | E2E | P1 |
| UI-003 | 生成状态轮询 | 每 5 秒更新 Job 与 Shot 状态 | Integration | P0 |
| UI-004 | SSE 断线后重连 | 状态重新同步，不重复消息 | E2E（目标） | P1 |
| UI-005 | 所有核心控件键盘可操作 | 焦点顺序正确，有可见焦点 | Accessibility | P1 |
| UI-006 | 首页桌面导航 | Agents、Skills、Assets、Hots、Docs 位于左侧 | Frontend | P1 |
| UI-007 | 首页多设定创作框 | 提示词、风格、画幅、时长、模型、清晰度、音频和审核可组合提交 | Frontend | P0 |
| UI-008 | 首页提交创作 | 自动创建默认项目并进入该项目 | E2E | P0 |
| UI-009 | 新项目首次进入 | 自动发送 Brief，生成首轮对话和故事板 | E2E | P0 |
| UI-010 | 移动端首页 | 创作设定纵向排列，主操作不被遮挡 | Frontend | P1 |
| UI-011 | 社区瀑布流 | 展示作者、喜欢数、发布卡片和“做同款” | Frontend | P1 |
| UI-012 | 头像行为 | 点击头像不跳转项目页 | Frontend | P1 |
| UI-013 | 自定义下拉 | 展开层背景半透明、圆角且不被创作框裁切 | Frontend | P0 |
| UI-014 | 文档阅读器 | 文档切换、目录跳转、折叠和固定深色主题可用 | Frontend | P1 |
| UI-015 | Hots 本地发布 | 发布后当前会话显示作者、文本和 0 喜欢 | Frontend | P1 |
| UI-016 | 品牌和激活图标 | 蓝色播放键一致，激活图标采用填充/线框反转 | Frontend | P2 |
| UI-017 | Assets 作品库 | 展示状态、更新时间、时长、摘要，并可播放预览 | Frontend | P1 |
| UI-018 | 顶部搜索粘滞 | Skills、Hots、Assets、Docs 搜索框滚动时固定在顶部 | Frontend | P1 |
| UI-019 | Assets 内部分页 | Video 与 Skill 分页切换，卡片不重复类型标签 | Frontend | P1 |
| UI-020 | 顶部控件与下拉方向 | 搜索、语言、通知、积分和头像保持半透明，相关菜单向下展开 | Frontend | P1 |
| UI-021 | 头像账户菜单 | 未登录可进入登录/注册，已登录可退出 | Frontend | P0 |

### 9.9 安全与隐私

| ID | 场景 | 预期结果 | 层级 | 优先级 |
| --- | --- | --- | --- | --- |
| SEC-001 | Access Key 或会话凭据出现在响应 | 测试失败 | Contract | P0 |
| SEC-002 | 凭据出现在日志 | 脱敏检查失败 | Integration | P0 |
| SEC-003 | CLI 参数被解释为 Shell | 测试失败 | Security | P0 |
| SEC-004 | 跨用户 IDOR 访问 Job 或 Asset | 拒绝访问 | Security | P0 |
| SEC-005 | 文件名和 Prompt 包含 XSS | 前端按文本渲染 | Frontend | P0 |
| SEC-006 | 上传内容 MIME 欺骗 | 文件头校验拒绝 | Security | P0 |
| SEC-007 | 高频生成请求 | 用户、项目和 Provider 限流生效 | Security | P0 |
| SEC-008 | Agent 被要求调用任意 URL | 无通用 HTTP/Shell 工具 | Security | P0 |
| SEC-009 | 删除用户账户 | 撤销会话、凭据和访问链接 | Integration | P1 |
| SEC-010 | 依赖扫描存在高危漏洞 | Release 门禁失败 | CI | P0 |

## 10. 状态与恢复专项测试

以下专项除 Celery 轮询外，多数属于完整工作流的目标验证。当前 LangGraph
只有一个 `plan_storyboard` 节点，不使用 Checkpoint。

### 10.1 LangGraph 恢复（目标）

测试以下状态保存与恢复：

```text
awaiting_plan_approval
awaiting_generation_approval
submit_generation_jobs
wait_for_jobs
review_results
await_export_approval
```

每个状态至少验证：

- 进程重启后状态不变。
- 重复提交审批不会创建重复任务。
- 未审批状态无法跳过。
- 已完成状态不会被重复执行。

### 10.2 Celery 故障

使用受控故障注入：

- Worker 在收到任务前退出。
- Worker 在调用 Pippit 前退出。
- Worker 获得 Provider Task ID 后退出。
- Worker 下载媒体失败。
- Redis 短暂不可用。
- 同一任务被重复投递。

预期系统最终进入一致状态，不重复扣费，不丢失已成功的 Provider 任务。

### 10.3 SSE 故障（目标）

- 浏览器断网后重连。
- FastAPI 重启。
- Redis Pub/Sub 消息暂时丢失。
- 多个 API 实例订阅同一项目。
- 客户端收到重复事件。

客户端必须根据完整 REST 状态去重和校正。

## 11. 性能测试

MVP 基线：

- 普通 API 不含 Provider 调用时，P95 小于 300 ms。
- 项目列表和故事板接口在 100 个镜头内保持可接受响应。
- 单 Worker 可并发处理配置数量的查询任务。
- 同一任务的并发提交只能成功一次。

性能测试不把 Pippit 推理时间计算为 API 响应时间。Provider 排队和生成时间单独统计。
SSE 吞吐、心跳和重连性能测试随目标实时事件能力启用。

## 12. 可访问性与兼容性

### 12.1 可访问性

- 目标为 WCAG 2.1 AA。
- 所有表单具有关联 Label。
- 所有交互可以使用键盘完成。
- 焦点顺序合理，焦点样式可见。
- 错误信息通过 ARIA Live Region 通知。
- 中英文页面不能因文字长度出现遮挡。
- 视频状态不能只用颜色表达。

### 12.2 浏览器

- 最新稳定版 Chrome。
- 最新稳定版 Microsoft Edge。
- 最新稳定版 Firefox。
- Safari 以发布前目标版本为准。

## 13. CI 质量门禁

### 13.1 Pull Request 门禁

当前 CI 已执行：

- Ruff 检查和格式检查。
- mypy 严格类型检查。
- pytest 后端测试。
- Vitest 前端测试。
- TypeScript 检查。
- Next.js production build。
- 敏感信息检查。

以下任一失败阻止合并：

- Ruff 检查或格式化失败。
- mypy 类型检查失败。
- 后端单元、API 和 Provider 契约测试失败。
- 前端类型检查或组件测试失败。
- 新增高危依赖漏洞。
- 命中敏感信息扫描。

以下属于目标门禁：

- OpenAPI 与生成客户端一致性。
- 数据库迁移测试。

### 13.2 Nightly 门禁（目标）

- PostgreSQL、Redis、MinIO 集成测试。
- Celery Worker 测试。
- Playwright 英文公开流程和中文重定向 E2E。
- 数据库迁移从空库升级。
- 故障恢复测试。
- 浏览器兼容性测试。

### 13.3 Release 门禁

- 所有自动化测试通过。
- 无 P0/P1 未解决缺陷。
- Pippit 状态和积分只读 Smoke Test 通过。
- 生产配置和 Secrets 检查通过。
- 数据库备份与回滚步骤确认。
- 经授权完成付费生成验收，或有明确风险接受记录。

## 14. Pippit 真实测试流程

### 14.1 只读 Smoke Test

人工触发，不消耗积分：

1. 在 API 主机安装 `@pippit-dev/cli@1.0.48` 或更新版本。
2. 使用受控测试账户执行 `pippit-tool-cli login`。
3. 执行 `pippit-tool-cli status`。
4. 执行 `pippit-tool-cli get-credit-balance`。
5. 调用 `/providers/pippit` 和 `/providers/pippit/credits`。
6. 验证日志不包含 Access Key 或 CLI 登录状态内容。

### 14.2 付费生成测试

仅限发布前人工执行：

1. 记录起始积分。
2. 用户明确批准预算。
3. 创建 1 个最小视频生成任务。
4. 验证 Provider Task ID 只保存一次。
5. 轮询至完成。
6. 下载并校验媒体。
7. 记录任务和积分变化。
8. 验证重复请求不会再次提交。
9. 审核 UI、任务状态和数据库记录一致性。

测试报告必须记录测试时的实时 Pippit 余额，不得在代码或文档中硬编码账户数值。
余额为 0 时跳过付费测试，不自动充值。
FFmpeg 合成与导出验收在对应能力实现后再加入。

## 15. 测试报告

每次 Release 生成测试摘要，包含：

- 测试版本和 Commit。
- 测试环境和依赖版本。
- 自动化用例总数、通过、失败和跳过。
- 覆盖率报告。
- E2E 结果。
- Flaky Tests。
- 未解决缺陷及风险接受。
- Pippit 只读测试结果。
- Pippit 付费测试结果和积分使用。
- 与上一版本的性能变化。

## 16. 缺陷等级

| 等级 | 定义 | 处理要求 |
| --- | --- | --- |
| P0 | 数据泄露、跨用户访问、重复扣费、无法登录、无法生成 | 立即停止发布 |
| P1 | 核心流程受阻、任务无法恢复、中英文关键页面不可用 | 发布前必须修复 |
| P2 | 非关键功能异常、明显体验问题或有限范围错误 | 评估修复或记录 |
| P3 | 轻微视觉、文案或低概率问题 | 可进入后续迭代 |

## 17. TDD 实施顺序

当前进度：第 1–5 轮的大部分基础能力、第 7 轮的单节点 Agent、第 8 轮
Pippit/Mock Provider、第 9 轮的幂等与可选轮询已经落地；素材、SSE、
FFmpeg 和分享仍未实现。

### 第 1 轮：测试基础设施

1. 配置 pytest、Vitest、Playwright。
2. 创建测试标记和目录。
3. 实现 Fake Clock、UUID、LLM、Pippit CLI、Provider 和 Storage。
4. 建立测试数据库和迁移测试。
5. 配置 CI 报告。

### 第 2 轮：健康检查

- 先写 `/health` 失败测试。
- 实现最小 FastAPI 应用。
- 增加数据库和 Redis 健康状态。

### 第 3 轮：认证与权限

- 测试先行实现注册、登录、会话。
- 测试先行实现项目所有权。
- 测试先行实现 CSRF 和访问控制。

### 第 4 轮：国际化

- 测试先行实现 `/en` 和 `/zh-CN`。
- 测试语言切换和偏好保存。
- 建立翻译键完整性检查。

### 第 5 轮：项目与故事板

- 测试先行定义 Project、Shot 和状态迁移。
- 实现版本控制和并发更新。
- 实现故事板 API。

### 第 6 轮：资产与存储

- 测试先行实现预签名和文件校验。
- 实现素材元数据和缩略图。
- 测试跨用户隔离。

### 第 7 轮：Agent

- 测试先行定义 Pydantic 输出。
- 实现单节点 Agent。
- 逐步加入创意、故事板、审批和审核节点。
- 使用 Fake LLM 保证确定性。

### 第 8 轮：Provider 与 Pippit

- 先定义 Provider 共享契约。
- 先实现 Mock Provider。
- 再实现 Pippit CLI Adapter。
- 测试状态、余额、提交和查询 JSON 映射。
- 测试 CLI 缺失、超时、非零退出码和无效 JSON。

### 第 9 轮：任务执行

- 测试幂等键和任务状态。
- 实现 Celery 提交和轮询。
- 注入 Worker 重启和重复投递。
- 实现 SSE 和恢复。

### 第 10 轮：媒体与分享

- 测试 FFmpeg 参数构造和失败处理。
- 实现合成、导出和缩略图。
- 测试分享 Token、过期和撤销。

### 第 11 轮：E2E 与发布

- 使用 Mock Provider 完成中英文全流程。
- 执行 Pippit 状态和积分只读测试。
- 在用户批准预算后执行一次付费测试。

## 18. 需求追溯

| 设计能力 | 主要测试 |
| --- | --- |
| 英文公开界面与中文重定向 | I18N-001 至 004、UI-006 至 010 |
| 项目管理和权限 | AUTH-008、PROJ-001 至 010、SEC-004 |
| Agent 单节点故事板与评估 | AGENT-001 至 006、API 测试 |
| Pippit CLI Provider | PIPPIT-001 至 012 |
| 生成、轮询与幂等 | JOB-001 至 013 中当前已实现部分 |
| Hots、文档和自定义控件 | UI-011 至 016 |
| Token 和隐私 | SEC-001 至 010 |
| 素材、SSE、合成与分享 | 目标能力，当前未交付 |
| 发布验收 | CI、Pages 构建和 Pippit 真实测试流程 |

## 19. 风险和约束

| 风险 | 测试措施 |
| --- | --- |
| LLM 输出不确定 | Fake LLM、结构化 Schema、固定 Fixture、重试测试 |
| Pippit 真实接口不可控 | Fake CLI Contract、受控只读 Smoke Test、CLI 版本记录 |
| 付费测试成本 | 默认关闭、人工开关、单次预算、积分核对 |
| 长任务测试缓慢 | 可注入轮询间隔和 Fake Clock |
| 媒体文件体积大 | 使用小样本 Fixture、测试后清理 |
| E2E 容易 Flaky | 稳定测试选择器、事件驱动等待、禁止固定长 Sleep |
| 中英文内容不同步 | 翻译键检查、双语言 E2E |
| 并发任务重复 | Idempotency-Key、数据库锁、重复投递测试 |

## 20. 完成标准

当前基线：

1. 后端测试可使用临时 SQLite 和 Fake CLI 在无外部网络环境运行。
2. Mock Provider 可完成故事板、积分估算、生成提交和任务状态查询。
3. 前端共享 UI、项目页面、认证和创作提交流程有组件测试。
4. CI 阻止 Ruff、mypy、pytest、Vitest、TypeScript 或 Next Build 失败进入主分支。
5. 真实付费生成默认不在 CI 中运行。
6. GitHub Pages 文档和项目主页构建成功。
7. 新增功能遵循 Red–Green–Refactor。

目标 MVP 额外完成标准：

1. 素材上传、PostgreSQL/Redis/MinIO/Celery 集成测试可运行。
2. 英文完整流程和未来恢复后的中文流程有稳定 Playwright E2E。
3. SSE、FFmpeg、导出与公开分享的 P0 场景有自动化用例。
4. 每次发布生成可追溯的完整测试报告。

## 21. 变更记录

| 版本 | 日期 | 状态 | 说明 |
| --- | --- | --- | --- |
| v1.0 | 2026-11-01 | TDD 基线草案 | 建立测试分层、用例和质量门禁 |
| v1.1 | 2026-11-03 | 当前基线 | 对齐公开英文 UI、Hots、文档、单节点 Agent、当前 API 和 35/14 测试基线 |

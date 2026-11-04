# VideoAgent 待办事项

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 更新日期 | 2026-11-04 |
| 管理原则 | 未交付能力、新增需求与后续增强统一记录在本文件 |

## 1. 产品与前端

| ID | 待办 | 验收结果 |
| --- | --- | --- |
| TODO-UI-001 | 开放产品界面的中英文切换 | 导航、创作框、项目工作区与提示信息完整双语 |
| TODO-UI-002 | 创作场景扩展到更多行业模板 | 新增模板具备提示词、Skill、Hook、画幅、时长和审核预设 |
| TODO-UI-003 | 镜头排序、参考图和参考视频控件 | 用户可在工作区完成镜头重排和多模态引用 |
| TODO-UI-004 | 项目级素材与引用面板 | 角色、场景、道具和风格资产可跨镜头复用 |

## 2. Agent 与导演工作流

| ID | 待办 | 验收结果 |
| --- | --- | --- |
| TODO-AGENT-001 | 意图路由 | 新建、局部修改、只评估、重生成和本地化请求进入不同分支 |
| TODO-AGENT-002 | 局部 Shot Patch | 用户修改单个镜头时保留其他镜头、版本和审批状态 |
| TODO-AGENT-003 | Scene / Sequence / Beat 数据层 | 场景目标、冲突、进入与离开状态可持久化 |
| TODO-AGENT-004 | 电影语言 Shot Schema | 景别、机位、镜头、运镜、表演、视线、声音和转场结构化 |
| TODO-AGENT-005 | Style Bible 与连续性图谱 | 角色、服装、场景、道具和屏幕方向可校验、复用 |
| TODO-AGENT-006 | Animatic 与时间线预演 | 低成本确认节奏后再进入正式镜头生成 |
| TODO-AGENT-007 | 多节点 LangGraph 与可恢复审批 | 故事、预算、镜头与成片节点可暂停、恢复和审计 |

## 3. Provider 与生成

| ID | 待办 | 验收结果 |
| --- | --- | --- |
| TODO-PROVIDER-001 | Kling 后端生成路由 | Web 项目可按模型元数据选择 Pippit 或 Kling Provider |
| TODO-PROVIDER-002 | Provider Capability Discovery | 模型时长、比例、音频、参考输入和输出能力由服务端统一发现 |
| TODO-PROVIDER-003 | Provider 取消与统一错误模型 | 两类 Provider 均支持取消、超时、限流和可重试错误分类 |
| TODO-PROVIDER-004 | 自动模型路由与降级 | 按任务、预算和可用性选择模型，并保留用户显式选择 |
| TODO-PROVIDER-005 | Take 管理 | 一个镜头可保存多个候选版本、评分和选择记录 |

## 4. 媒体与交付

| ID | 待办 | 验收结果 |
| --- | --- | --- |
| TODO-MEDIA-001 | 素材上传与对象存储 | 图片、视频和音频支持校验、预签名与生命周期管理 |
| TODO-MEDIA-002 | FFmpeg 合成 | 时间线、转场、字幕、声音和调色可合成 MP4 |
| TODO-MEDIA-003 | 导出与交付版本 | 支持横版、竖版、方版、封面和字幕文件 |
| TODO-MEDIA-004 | 分享与权限 | 支持有效期、撤销和访问审计 |

## 5. 实时与可靠性

| ID | 待办 | 验收结果 |
| --- | --- | --- |
| TODO-REL-001 | SSE 项目事件流 | 对话、镜头状态和任务进度支持断线重连与状态校正 |
| TODO-REL-002 | Celery 生产部署 | Redis Broker、重试、死信队列、对账和 Worker 恢复 |
| TODO-REL-003 | LangGraph Checkpoint | 进程重启后从最后一个有效节点继续 |
| TODO-REL-004 | 统一可观测性 | Trace、结构化日志、Provider 延迟与成功率指标 |

## 6. 社区与运营

| ID | 待办 | 验收结果 |
| --- | --- | --- |
| TODO-COMMUNITY-001 | Hots 持久化 | 发布、作者、喜欢、权限和编辑时间进入数据库 |
| TODO-COMMUNITY-002 | 社区审核 | 举报、隐藏、恢复、申诉和审计流程 |
| TODO-COMMUNITY-003 | Skill 持久化与版本 | 用户 Skill 可公开、更新、弃用和迁移 |
| TODO-COMMUNITY-004 | 数据保留策略 | 明确软删除、恢复窗口和媒体生命周期 |

## 7. 安全与数据

| ID | 待办 | 验收结果 |
| --- | --- | --- |
| TODO-SEC-001 | CSRF 防护 | Cookie 写接口具备令牌校验或等价同源防护 |
| TODO-SEC-002 | 分层限流 | 用户、IP、Provider 和生成接口具备独立配额 |
| TODO-SEC-003 | 上传安全 | 文件头、大小、MIME、解码和恶意内容检查 |
| TODO-SEC-004 | PostgreSQL、Redis 与 MinIO 生产集成 | 数据库迁移、对象存储和队列完成集成测试 |
| TODO-SEC-005 | OpenAPI Client 生成 | 前端类型由 OpenAPI 自动生成并进入 CI |

## 8. 测试与发布

| ID | 待办 | 验收结果 |
| --- | --- | --- |
| TODO-QA-001 | Playwright E2E | 覆盖英文流程、文档切换和核心项目工作流 |
| TODO-QA-002 | Provider Contract Matrix | 覆盖 Pippit、Kling 和 Mock 的统一行为 |
| TODO-QA-003 | 付费生成验收 | 在明确预算和用户批准下完成一次端到端生成 |
| TODO-QA-004 | 故障演练 | 覆盖 Worker 中断、重复投递、SSE 重连和下载失败 |


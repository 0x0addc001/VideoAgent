# VideoAgent 产品需求文档

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.6 |
| 更新日期 | 2026-11-04 |

## 1. 产品目标

VideoAgent 帮助用户以导演身份完成视频创作：描述想法、选择 Skill 或制作设定、
生成可控镜头、评估结果，并在同一工作台中管理成品与半成品。

每个主页面围绕明确的选择、创建、搜索、发布、评估或资产管理任务组织。

## 2. 目标用户

- 独立视频创作者。
- 产品与品牌营销团队。
- 社交媒体运营人员。
- 短剧和叙事内容创作者。
- 需要跨多个模型服务进行可控视频生成的用户。

## 3. 导航

桌面端左侧导航顺序固定为：

```text
Agents
Skills
Hots
Assets
Docs
```

左侧导航底部只展示头像和用户名，语言、通知和积分收进头像下拉框，不再使用独立底栏按钮。
所有表面保持半透明，桌面端菜单向上展开。

头像在未登录时提供登录和注册入口，登录后显示账户邮箱和退出操作。

## 4. Agents

- 首页提供醒目的创作输入框。
- 创作框支持 Skill、Hook、风格、画幅、时长、模型、清晰度、音频和审核设定。
- 模型选择器展示全部当前可用的视频模型，格式为 `服务商/模型`。
- 输入框随文字行数或自动换行向下扩展。
- 示例灵感仅在输入框为空时显示，创作 Playbook 保持可用并可切换。
- 用户可以在开始创作前选择一个 Skill。
- 创作设定的菜单根据视口剩余空间自动向上或向下展开，并始终限制在可视区域内。
- 创作场景提供产品广告、创作者 Vlog、微短剧、音乐 MV、视频本地化和批量测款的一键起点。
- 选择创作场景后，自动填入提示词，并设置推荐的 Skill、Hook、风格、画幅、时长与审核方式。
- 再次点击当前已选中的 Playbook 可取消选择，并恢复应用该 Playbook 前的创作状态。
- 提交后创建项目并进入项目工作区。
- VideoAgent 主标题和播放键图标同时参与流式输出。

## 5. Skills

### 5.1 Skill 目录

Skills 使用统一目录，并以任务型卡片组织。

官方 Skill ID 格式：

```text
<provider_or_product>/<skill_id>
```

Kling 原生能力使用 `kling` 命名空间；跨 Provider 工作流和产品级 Skill 使用
`video_agent`。

示例：

```text
video_agent/search_all_resources
kling/text_to_video
kling/image_to_video
kling/reference_to_video
kling/first_last_frame
kling/motion_control
kling/video_extend
kling/video_edit
video_agent/style_transfer
video_agent/video_upscale
video_agent/product_film
video_agent/creator_vlog
video_agent/short_drama
video_agent/review
video_agent/video_localization
video_agent/batch_variants
video_agent/script_assistant
video_agent/smart_preview
video_agent/camera_movement
video_agent/music_video
video_agent/reference_remake
video_agent/agent_handoff
```

Review 使用与其他任务型 Skill 一致的卡片结构。

### 5.2 搜索与发布

- Skills 顶部提供搜索框。
- 搜索框在页面滚动时固定在顶部。
- 搜索范围包含 user_id、skill_id、标题和描述。
- 用户可以通过与 Hots 发布一致的方式发布 Skill。
- 用户发布 ID 使用 `<user_id>/<skill_id>` 格式。
## 6. Hots

- 顶部提供搜索框。
- 搜索框在页面滚动时固定在顶部。
- 卡片使用循环播放的视频。
- 标题在上，作者和喜欢数在下。
- 场景卡片可带着对应 Skill 和提示词进入 Agents。
- 用户可以从社区流发布作品；发布必须上传 MP4，并填写标题、描述和 Skill。
- 搜索范围包含标题、作者和 Prompt。

## 7. Assets

Assets 展示当前用户的成品和半成品。

- 顶部提供搜索框。
- 搜索框在页面滚动时固定在顶部。
- 卡片以瀑布流排布。
- 使用 Video 和 Skill 两个内部分页区分类型，不在每张卡片上重复类型标签。
- 必须展示权限：`private` 或 `public`。
- 编辑时间统一使用 `yyyy-mm-dd`。
- 不展示时长、进度和摘要。
- Video 卡片悬浮时静音循环播放，移开后暂停并回到开始；Skill 卡片不显示封面。
- Assets 展示当前用户真实发布的 Hots 视频和 Skill；所有卡片可点击打开详情，视频详情可播放。

### 7.1 项目工作区与交付

- 资源树在 `Direction` 下组织 `Settings`、`Outlines` 和 `Scripts`，在 `Vision`
  下组织 `Characters`、`Shots` 和 `Final Cut`。
- Settings 将制作属性与从 Agent-导演对话中提取的关键线索合并为 `属性 / 值` 表；
  Q&A 会提炼成语义要素和值，批准类消息不作为属性。
- Agent 为每个持续出现的角色和镜头建立资源目录；角色保留描述页与生成页，
  每个 Shot 直接打开一个合并了描述与生成的页面。
- Agent 规划期间，对话等待区显示真实执行步骤：Context 构建、Memory 读取、
  Skill 解析、规划、结构校验、项目状态更新和回复组织。
- 执行轨迹只展示已经发生或正在发生的行为，不得把未实际调用的 Skill 或 MCP 工具显示为已执行。
- 编辑区顶部显示依据工作流阶段和已完成 Shots 计算的实时制作进度条，每 3 秒轮询；
  该进度表示 readiness，不是视觉质量评分。
- Final Cut 提供可选的发布前视觉评估。用户选择已配置的视觉模型和指标，例如人物一致性、
  风格一致性、提示词匹配和时序稳定性。
- Settings、Outlines、Scripts、Characters、Shots 和 Final Cut 元数据均可就地编辑。
- 上传文件会获得稳定素材 ID，并自动把 `@<asset-id>` 写入当前 Prompt；
  Shot 与 Character 根据该 ID 自动选择参考生成模式。
- Shot 与 Character 的上传/生成结果排列在对应资源目录下，支持最终选用勾选、
  复制 ID、预览和删除。
- 桌面端导航、Assets、Canvas 和 Agents 默认等宽，并提供可拖拽分隔条。
- 角色与镜头的生成页支持上传图片、参考图生成或直接文字生成，具体模式取决于所选模型能力；生成内容可下载。
- 上传文件必须通过类型、文件头与大小校验。
- 用户可在生成前查看预计积分并明确批准生成。
- 用户可把已生成镜头合成为成片，选择 16:9、9:16、1:1 交付版本。
- 导出支持字幕、上传音轨、自动封面和私有/公开权限。
- 每个交付版本可下载；分享链接支持过期与撤销。
- Assets 仅展示当前用户可访问的上传、生成、导出和社区发布资产。

## 8. Docs

文档顺序：

```text
PRD
Playbook
Arch
API
Dev
Test
Ops
FAQ
TODO
```

中文缩写：

| 英文 | 中文 |
| --- | --- |
| PRD | 产品 |
| Playbook | 玩法 |
| Arch | 架构 |
| API | 接口 |
| Dev | 开发 |
| Test | 测试 |
| Ops | 运营 |
| FAQ | 客服 |
| TODO | 待办 |

文档要求：

- 顶部提供搜索框。
- 搜索框在页面滚动时固定在顶部。
- 搜索覆盖中英文文档正文。
- 语言按钮切换文档语言。
- 左侧目录支持跳转、高亮和折叠。
- 中英文版本保持相同文档顺序。
- 文档使用统一的深色阅读主题。

## 9. 认证与积分

- 用户通过邮箱和密码登录。
- 密码仅保存加密哈希。
- 会话使用 HttpOnly Cookie。
- 左侧导航积分来自当前用户独立的 VideoAgent 余额，不直接暴露共享 Provider 积分池。
- 任何可能计费的生成请求都必须先获得用户明确批准。
- 生成提交前预扣积分；提交失败、生成失败或取消时执行幂等退款。

## 10. 管理后台

- 管理入口为 `/<locale>/admin`，仅允许 `VIDEOAGENT_ADMIN_EMAILS` 中的邮箱访问。
- 总览展示用户、项目、生成任务、运行任务、失败任务和资产数量。
- 管理员可查看用户、项目数、积分、账号状态和注册时间。
- 管理员可停用或恢复账号；停用后现有 Session 立即失效。
- 管理员可发放或扣减用户积分，并记录操作原因。
- 管理员可查看生成任务；失败、取消和提交不确定任务支持幂等退款。
- 管理员可创建和撤销邀请码，并切换开放注册、邀请注册和关闭注册。
- 管理员可暂停或恢复全部视频生成，暂停后估算与提交均被阻断。
- 管理操作写入审计日志。
- 当前管理员身份由环境变量邮箱白名单配置，不在产品内动态授予管理员角色。

## 11. 非功能要求

- 桌面端和移动端不得出现控件遮挡。
- 所有核心控件应支持键盘操作。
- 动效支持 `prefers-reduced-motion`。
- 搜索和筛选在客户端完成。

## 12. 验收标准

1. 导航顺序为 Agents、Skills、Hots、Assets、Docs。
2. Agents 可以选择 Skill。
3. Skills 使用统一的可搜索目录，并显示 `user_id/skill_id`。
4. 原厂商能力使用厂商命名空间，跨 Provider 工作流使用 `video_agent`。
5. 用户可以发布 Skill。
6. Review 使用统一 Skill 卡片。
7. Hots 和 Assets 均提供顶部搜索。
8. Hots 卡片自动播放，标题位于作者与喜欢数上方。
9. Assets 通过 Video/Skill 内部分页区分类型，并展示权限和 `yyyy-mm-dd` 编辑时间。
10. Assets 使用瀑布流；Video 悬浮预览，Skill 卡片不显示封面。
11. Docs 依次包含 PRD、Playbook、Arch、API、Dev、Test、Ops、FAQ、TODO。
12. Docs 搜索和双语切换可用。
13. 头像根据登录状态提供登录、注册或退出。
14. 创作 Playbook 可填充提示词和推荐制作参数。
15. Hots 场景卡片进入 Agents 时选中对应 Skill。
16. 输入框随内容向下扩展，输入内容后空态建议隐藏。
17. 重复点击已激活的 Playbook 会取消选择，并恢复应用前的草稿。
18. 模型下拉框展示全部可用视频模型。
19. 用户可上传引用素材，完成成片合成、交付下载和分享。
20. 用户积分预扣、退款与 Provider 账户对账一致。
21. Agent 会持久化每个持续出现的 Character 和 Shot；角色提供描述页与生成页，
    每个 Shot 打开一个合并页面。
22. 调整镜头顺序不会删除或重建已有 Shot。
23. 非管理员无法访问管理接口或管理页面。
24. 管理员可管理积分、账号、邀请码和生成开关，且操作进入审计日志。

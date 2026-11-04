# VideoAgent 产品需求文档

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.0 |
| 更新日期 | 2026-11-04 |

## 1. 产品目标

VideoAgent 帮助用户以导演身份完成视频创作：描述想法、选择 Skill 或制作设定、
生成可控镜头、评估结果，并在同一工作台中管理成品与半成品。

所有主页面都必须提供明确的选择、创建、搜索、发布、评估或资产管理能力，
不展示没有实际功能的宣传内容。

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

账户操作固定在右上角，视觉顺序为：

```text
语言
通知
积分
头像
```

账户操作组不显示外边框。
搜索框、语言、通知、积分和头像使用半透明表面；点击后的菜单向下展开，
并保持半透明。

头像在未登录时提供登录和注册入口，登录后显示账户邮箱和退出操作。

## 4. Agents

- 首页提供醒目的创作输入框。
- 创作框支持风格、画幅、时长、模型、清晰度、音频和审核设定。
- 用户可以在开始创作前选择一个 Skill。
- 创作设定的菜单根据视口剩余空间自动向上或向下展开，并始终限制在可视区域内。
- 提交后创建项目并进入项目工作区。
- VideoAgent 主标题和播放键图标同时参与流式输出。

## 5. Skills

### 5.1 Skill 目录

Skills 使用一个统一目录，不再区分 Atomic 和 Workflow。

官方 Skill ID 格式：

```text
video_agent/<skill_id>
```

示例：

```text
video_agent/search_all_resources
video_agent/text_to_video
video_agent/image_to_video
video_agent/reference_to_video
video_agent/first_last_frame
video_agent/motion_control
video_agent/video_extend
video_agent/video_edit
video_agent/style_transfer
video_agent/video_upscale
video_agent/product_film
video_agent/creator_vlog
video_agent/short_drama
video_agent/review
```

Workflow Skill 不展示内部执行流程。

Review 作为一个普通 Skill 卡片呈现，不再提供单独的 Open projects 操作。

### 5.2 搜索与发布

- Skills 顶部提供搜索框。
- 搜索框在页面滚动时固定在顶部。
- 搜索范围包含 user_id、skill_id、标题和描述。
- 用户可以通过与 Hots 发布一致的方式发布 Skill。
- 用户发布 ID 使用 `<user_id>/<skill_id>` 格式。
- 当前发布内容仅保存在前端会话，尚未提供持久化社区 API。

## 6. Hots

- Hots 位于 Assets 上方。
- 顶部提供搜索框。
- 搜索框在页面滚动时固定在顶部。
- 卡片使用循环播放的视频。
- 标题在上，作者和喜欢数在下。
- 用户可以从社区流发布作品。
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

## 8. Docs

文档顺序：

```text
PRD
Design
Interface
Impl
Test
Ops
```

中文缩写：

| 英文 | 中文 |
| --- | --- |
| PRD | 产品 |
| Design | 设计 |
| Interface | 接口 |
| Impl | 实现 |
| Test | 测试 |
| Ops | 运营 |

文档要求：

- 顶部提供搜索框。
- 搜索框在页面滚动时固定在顶部。
- 搜索覆盖中英文文档正文。
- 语言按钮只影响文档，不影响其他英文产品界面。
- 左侧目录支持跳转、高亮和折叠。
- 中英文版本保持相同文档顺序。
- 文档使用固定深色主题，不提供亮暗切换。

## 9. 认证与积分

- 用户通过邮箱和密码登录。
- 密码仅保存加密哈希。
- 会话使用 HttpOnly Cookie。
- 右上角积分来自当前服务端 Provider。
- 任何可能计费的生成请求都必须先获得用户明确批准。

## 10. 非功能要求

- 桌面端和移动端不得出现控件遮挡。
- 所有核心控件应支持键盘操作。
- 动效支持 `prefers-reduced-motion`。
- 当前静态页面的搜索和筛选在前端完成。
- 用户发布的 Skill 和 Hots 内容暂不跨设备持久化。
- 公开产品界面使用英文，当前中文仅用于 Docs。

## 11. 验收标准

1. 导航顺序为 Agents、Skills、Hots、Assets、Docs。
2. Hots 位于 Assets 上方。
3. Agents 可以选择 Skill。
4. Skills 使用统一的可搜索目录，并显示 `user_id/skill_id`。
5. 官方 Skill 使用 `video_agent` 命名空间。
6. 用户可以发布 Skill。
7. Review 以普通 Skill 卡片呈现。
8. Hots 和 Assets 均提供顶部搜索。
9. Hots 卡片自动播放，标题位于作者与喜欢数上方。
10. Assets 通过 Video/Skill 内部分页区分类型，并展示权限和 `yyyy-mm-dd` 编辑时间。
11. Assets 使用瀑布流且不播放。
12. Docs 依次包含 PRD、Design、Interface、Impl、Test、Ops。
13. Docs 搜索和双语切换可用。
14. 头像根据登录状态提供登录、注册或退出。

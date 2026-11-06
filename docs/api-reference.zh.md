# VideoAgent API 接口文档

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.6 |
| 更新日期 | 2026-11-06 |
| 基础路径 | `/api/v1` |
| 认证方式 | HttpOnly Session Cookie |
| 请求格式 | JSON，并设置 `credentials: "include"` |
| API 风格 | REST + 任务轮询 |
| 计费生成 | 显式审批 + `Idempotency-Key` |
| 写接口保护 | 同源 `Origin` / `Sec-Fetch-Site` 校验 |
| 用户积分 | 用户独立配额与可审计流水 |
| 管理权限 | `VIDEOAGENT_ADMIN_EMAILS` 邮箱白名单 |
| OpenAPI | `/docs` 与 `/openapi.json` |

本地 OpenAPI 文档：

```text
http://localhost:8000/docs
http://localhost:8000/openapi.json
```

除 `/health`、注册、登录、注册策略和公开分享内容外，所有接口都要求登录，
由需要鉴权的浏览器请求设置 `credentials: "include"`。

## 健康检查

`GET /health`

返回 API 状态和数据库依赖状态。数据库异常时返回 `503`，并标记为
`degraded`。

## 认证

### 注册

`POST /auth/register`

```json
{
  "email": "creator@example.com",
  "password": "at-least-eight-characters",
  "locale": "zh-CN",
  "invite_code": "可选的邀请码"
}
```

### 注册策略

`GET /auth/registration-policy`

返回 `open`、`invite` 或 `closed`。邀请制下注册请求必须携带 `invite_code`。

### 登录

`POST /auth/login`

```json
{
  "email": "creator@example.com",
  "password": "at-least-eight-characters"
}
```

### 当前用户

`GET /auth/me`

返回用户 ID、邮箱、语言偏好和创建时间。

### 更新语言偏好

`PATCH /auth/me`

```json
{
  "locale": "en"
}
```

### 退出

`POST /auth/logout`

撤销当前 Session 并清除 Cookie。

## 项目

所有项目接口均校验当前用户所有权。访问其他用户的项目统一返回 `404`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/projects` | 当前用户项目列表 |
| `POST` | `/projects` | 创建项目 |
| `GET` | `/projects/{project_id}` | 读取项目 |
| `PATCH` | `/projects/{project_id}` | 重命名项目 |
| `DELETE` | `/projects/{project_id}` | 归档项目 |
| `GET` | `/workspace` | 项目目录与全部历史对话 |
| `POST` | `/workspace/folders` | 创建项目目录 |
| `PATCH` | `/workspace/folders/{folder_id}` | 重命名项目目录 |
| `DELETE` | `/workspace/folders/{folder_id}` | 删除目录但保留对话 |
| `PUT` | `/workspace/threads/{project_id}/folder` | 将对话收纳到目录或移出目录 |

创建项目：

```json
{
  "title": "产品发布片",
  "brief": "十秒电影感产品发布视频"
}
```

重命名：

```json
{
  "title": "产品发布片 · 终版"
}
```

## 故事板

### 读取

`GET /projects/{project_id}/storyboard`

### 整体替换

`PUT /projects/{project_id}/storyboard`

```json
{
  "characters": [
    {
      "name": "Mara",
      "description": "一位克制、敏锐的摄影师。",
      "prompt_en": "Editorial portrait with stable identity and natural skin texture",
      "prompt_zh": "稳定身份与自然肤质的角色定妆照"
    }
  ],
  "scenes": [
    {
      "name": "Studio",
      "location": "Downtown loft",
      "description": "带落地窗和暖色日光的制作空间。",
      "prompt_en": "Cinematic production loft with warm daylight",
      "prompt_zh": "暖日光下的电影感制作空间"
    }
  ],
  "shots": [
    {
      "description": "开场产品亮相",
      "prompt_en": "Cinematic product reveal with warm rim light",
      "prompt_zh": "暖色轮廓光下的电影感产品亮相",
      "duration_seconds": 5,
      "aspect_ratio": "16:9",
      "generation_mode": "text_to_video"
    }
  ]
}
```

### 镜头排序

`PATCH /projects/{project_id}/storyboard/order`

请求必须且只能包含当前全部 Shot 一次。排序会保留 Shot ID、生成资产、生成历史和项目
连续性。

```json
{
  "shot_ids": [
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000001"
  ]
}
```

### 保存故事板版本

`POST /projects/{project_id}/versions`

```json
{
  "label": "导演确认"
}
```

`GET /projects/{project_id}/versions` 返回不可变快照的元数据；
`POST /projects/{project_id}/versions/{version_id}/restore` 回滚指定快照并返回
更新后的 Storyboard。快照包含全部 Characters、Scenes 和 Shots，不会修改已经导出的
FinalCuts。

## Agent 对话

### 消息历史

`GET /projects/{project_id}/messages`

### 发送消息

`POST /projects/{project_id}/messages`

```json
{
  "content": "把需求整理成三个镜头的发布视频",
  "run_id": "00000000-0000-0000-0000-000000000020"
}
```

响应包含用户消息、Assistant 回复、最新故事板和当前审批阶段。

### 观测 Agent 执行

`GET /projects/{project_id}/agent-activity/{run_id}`

返回该 run 的有序步骤：

```json
{
  "items": [
    {
      "id": "00000000-0000-0000-0000-000000000021",
      "run_id": "00000000-0000-0000-0000-000000000020",
      "sequence": 1,
      "kind": "context",
      "label": "Assembled working context",
      "detail": "locale=zh-CN · workflow=concept/awaiting_approval",
      "status": "completed",
      "created_at": "2026-11-05T08:00:00Z"
    }
  ]
}
```

活动类型为 `context`、`memory`、`skill`、`planning`、`validation`、
`state` 和 `reply`。工作区在等待回复时轮询该接口，展示真实执行步骤。

### 读取工作流

`GET /projects/{project_id}/workflow`

工作流依次经过 `concept`、`outline`、`script` 和 `ready`。`concept` 确认整体
设定，`outline` 确认分集与分镜大纲，`script` 确认逐场剧本。只有剧本获批且状态
进入 `ready` 后才允许生成。

### 提交审批

`POST /projects/{project_id}/workflow/decision`

```json
{
  "choice": "approve",
  "instruction": null,
  "run_id": "00000000-0000-0000-0000-000000000020"
}
```

`choice` 为 `approve`、`refine` 或 `custom`。调整和自定义意见保持当前阶段；
批准会进入下一层细化。

## 制作进度

`GET /projects/{project_id}/progress`

返回用于工作区进度条的实时制作百分比，依据工作流阶段和已完成 Shots 计算。
该值表示 readiness，不是视觉质量评分。

## Final Cut 视觉评估

`GET /projects/{project_id}/visual-review/models`

返回已配置的视觉评估模型。

`POST /projects/{project_id}/visual-review`

```json
{
  "asset_id": "00000000-0000-0000-0000-000000000030",
  "model": "vision-model",
  "metrics": [
    "character_consistency",
    "style_consistency",
    "prompt_alignment",
    "temporal_stability"
  ]
}
```

接口只接受导出的 Final Cut，提取代表性帧并调用所选视觉模型，返回带证据的
论文型或训练模型评估指标。未配置评估模型时返回 `503 VISUAL_REVIEW_UNAVAILABLE`，
不会生成伪造分数。

## 视频生成

### 积分估算

`POST /shots/{shot_id}/estimate`

### 提交生成

`POST /shots/{shot_id}/generate`

必须携带：

```text
Idempotency-Key: unique-request-id
```

请求：

```json
{
  "approved": true,
  "generation_mode": "image_to_video",
  "reference_asset_id": "00000000-0000-0000-0000-000000000010",
  "reference_asset_ids": [
    "00000000-0000-0000-0000-000000000010",
    "00000000-0000-0000-0000-000000000011"
  ],
  "provider": "kling",
  "model": "kling-video-v4_0",
  "resolution": "1080p",
  "audio_enabled": true,
  "task_type": "reference"
}
```

未显式批准时返回 `403`。相同镜头和幂等键重复请求会返回已有任务，不会再次提交 Provider。
`generation_mode` 为 `text_to_video` 或 `image_to_video`；图生视频必须引用当前用户、
当前项目中的有效图片资产。
故事板至少包含一个 Character 和一个 Scene 后，才允许镜头估算与生成；否则返回
`409 VISION_OBJECTS_REQUIRED`。
`provider` 与 `model` 是可选的任务级覆盖；同时省略时继承项目默认模型。切换模型会
使旧积分估算失效。
`reference_asset_ids` 最多接收 15 个有顺序的项目图片、视频或音频素材；图生视频仍兼容
旧的单素材字段 `reference_asset_id`。支持多模态参考的 Provider 会按顺序接收素材；
`task_type` 可取 `auto`、`reference`、`edit`、`extend`。

## 角色图片生成

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `POST` | `/characters/{character_id}/estimate` | 估算角色图片生成积分 |
| `POST` | `/characters/{character_id}/assets` | 上传角色图片 |
| `POST` | `/characters/{character_id}/generate` | 生成或编辑角色图片 |

生成请求：

```json
{
  "approved": true,
  "generation_mode": "image_to_image",
  "reference_asset_id": "00000000-0000-0000-0000-000000000010",
  "provider": "kling",
  "model": "kling-image-v3_0"
}
```

`generation_mode` 为 `text_to_image` 或 `image_to_image`。成功响应为 `AssetRead`，
客户端可通过 `content_url` 预览和下载生成图片。

### 场景编辑与参考图

`PATCH /projects/{project_id}/storyboard/scenes/{scene_id}` 可更新名称、地点、
描述和 Prompt。`POST /scenes/{scene_id}/assets` 上传场景参考图，返回素材名会绑定
Scene ID，工作区据此把图片放在对应 Scene 目录下。

`POST /scenes/{scene_id}/estimate` 和 `POST /scenes/{scene_id}/generate` 用于执行
场景文生图或图生图；请求接受与 Character 生成相同的 `provider`、`model` 覆盖。

### 查询任务

`GET /jobs/{job_id}`

常见状态：

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

前端每 5 秒轮询任务状态。Celery Worker 同时轮询任务状态。

每次成功提交生成时，系统按估算值预留当前用户的 VideoAgent 积分。提交立即失败，
或任务后续进入失败、取消状态时，系统通过幂等退款流水返还预留积分。

## 用户积分

`GET /credits`

返回当前用户独立的 VideoAgent 配额。该余额与服务端 Provider 账户积分池分离。

```json
{
  "provider": "video_agent",
  "connected": true,
  "credits": 95
}
```

## Skill

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/skills` | 获取公开 Skill 和当前用户拥有的 Skill |
| `POST` | `/skills` | 保存结构化 Skill |
| `POST` | `/skills/optimize` | 将粗略能力想法整理成结构化草稿 |
| `POST` | `/skills/engagement/query` | 批量读取最多 100 个稳定 Skill 标识的互动数据 |
| `POST` | `/skills/engagement/like` | 切换稳定 Skill 标识的点赞状态 |
| `POST` | `/skills/engagement/use` | 记录一次去重使用信号 |

优化接口返回稳定的 `skill_id`、名称、描述、详细执行规范、启动提示词以及输入和
输出 JSON Schema。列表响应增加 `is_mine`、`likes`、`uses` 和 `is_liked`。
互动接口接收 `{"skill_key":"<user_id>/<skill_id>"}`，让内置 Skill 与用户发布
Skill 使用同一套持久统计。作者不能给自己的 Skill 点赞；同一账户重复请求不会重复
增加点赞数或使用数。

```json
{
  "skill_key": "video_agent/creator_vlog"
}
```

`POST /skills/engagement/query` 接收 `{"skill_keys":["<user_id>/<skill_id>"]}`，
并以 `items` 对象返回对应标识的互动数据，用于加载不在用户 Skill 表中的内置 Skill。

```json
{
  "idea": "把产品静帧制作成高级广告视频",
  "title": "电影感产品广告",
  "locale": "zh-CN"
}
```

## Videos

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/hots` | 获取社区视频；`mine=true` 仅返回当前用户发布 |
| `POST` | `/hots` | 上传 MP4 并发布社区作品 |
| `POST` | `/hots/{post_id}/like` | 切换当前用户点赞状态 |
| `GET` | `/hots/{post_id}/video` | 播放公开视频 |

`POST /hots` 使用 `multipart/form-data`，字段为 `file`、`title`、`prompt` 和
`skill`。上传视频作为公开资产保存，并自动出现在作者的 Assets 中。Videos
响应包含 `is_liked`；同一账户最多贡献一次点赞，作者不能给自己的作品点赞。

## 资产与媒体

媒体接口均校验当前用户所有权。不支持的类型、文件头不匹配或超过大小限制的文件
会在创建 Asset 记录前被拒绝。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/assets` | 当前用户资产列表 |
| `GET` | `/projects/{project_id}/assets` | 项目资产列表 |
| `POST` | `/projects/{project_id}/assets` | 上传图片、视频或音频素材 |
| `PATCH` | `/assets/{asset_id}` | 重命名当前用户素材 |
| `DELETE` | `/assets/{asset_id}` | 软删除当前用户素材 |
| `GET/PUT` | `/projects/{project_id}/asset-selections` | 读取或更新最终选用素材 |
| `GET` | `/assets/{asset_id}/content` | 读取私有资产内容 |
| `POST` | `/projects/{project_id}/exports` | 合成并导出当前成片 |
| `POST` | `/assets/{asset_id}/share` | 创建限时分享链接 |
| `POST` | `/hots/from-asset/{asset_id}` | 直接发布已导出的成片 |
| `POST` | `/projects/{project_id}/collaborations` | 创建项目协作链接 |
| `POST` | `/collaborations/{token}/accept` | 接受邀请并加入项目 |
| `DELETE` | `/shares/{share_id}` | 撤销分享链接 |
| `GET` | `/shares/{token}/content` | 通过有效分享链接读取资产 |

上传请求：

```text
POST /projects/{project_id}/assets
Content-Type: multipart/form-data
file=<图片、视频或音频>
```

项目上传可附带 `shot_id` 表单字段，把参考图归入镜头。返回的素材 UUID 就是
Prompt 中使用的稳定 ID，格式为 `@<asset-id>`。

导出请求：

```json
{
  "aspect_ratios": ["21:9", "16:9", "9:16", "1:1"],
  "soundtrack_asset_id": null,
  "captions": "一段产品故事",
  "permission": "private"
}
```

导出响应包含交付版本 Asset 与自动生成的封面。只有全部故事板 Shot 均已生成结果时才可导出。
当前实现使用 FFmpeg 合成这些镜头，
统一交付比例，在镜头间添加短交叉淡化，并可加入字幕和上传的音轨。单次请求最多返回
四个交付版本；字幕按非空行均匀分配到成片时长。

分享请求：

```json
{
  "expires_in_hours": 24
}
```

分享 Token 随机生成且只保存哈希；链接支持过期与撤销，访问时累计审计计数。

协作请求：

```json
{
  "permission": "edit",
  "collaborator_email": "editor@example.com",
  "expires_in_hours": 168
}
```

协作链接与素材分享链接分离。登录用户接受邀请后才会建立项目成员关系，服务端继续按
`view` 或 `edit` 权限校验项目接口。

## 管理后台

管理接口要求当前登录邮箱位于 `VIDEOAGENT_ADMIN_EMAILS`。其他用户返回
`403 ADMIN_ACCESS_REQUIRED`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/admin/me` | 确认管理权限 |
| `GET` | `/admin/overview` | 用户、项目、任务、资产与运行状态 |
| `GET` | `/admin/users` | 搜索用户并查看积分 |
| `PATCH` | `/admin/users/{id}` | 停用或恢复账号 |
| `POST` | `/admin/users/{id}/credits` | 增减用户积分 |
| `GET` | `/admin/jobs` | 查看生成任务 |
| `POST` | `/admin/jobs/{id}/refund` | 异常任务退款 |
| `GET/PATCH` | `/admin/settings` | 读取或更新生成与注册策略 |
| `GET/POST` | `/admin/invites` | 查看或创建邀请码 |
| `DELETE` | `/admin/invites/{id}` | 撤销邀请码 |
| `GET` | `/admin/audit` | 查看管理审计日志 |
| `GET` | `/admin/provider` | 查看当前 Provider 连接状态 |

设置请求：

```json
{
  "generation_enabled": false,
  "registration_mode": "invite"
}
```

关闭生成后，估算与提交接口返回 `503 GENERATION_DISABLED`。停用用户会立即撤销
其全部 Session。

## Pippit Provider

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/providers/pippit` | 查询服务端 Pippit 登录状态 |
| `GET` | `/providers/pippit/credits` | 查询 Pippit 积分余额 |

Pippit 授权由服务端统一持有。浏览器不会收到 Access Key 或 CLI 登录文件。
Provider 计费使用服务端配置的账户，产品用户通过 `/credits` 消费各自独立的 VideoAgent 配额。

状态响应：

```json
{
  "provider": "pippit",
  "connected": true,
  "scope": "server"
}
```

积分响应：

```json
{
  "provider": "pippit",
  "connected": true,
  "credits": 42
}
```

## Kling Provider

VideoAgent 使用服务端 `@klingai/cli-cn` 连接国内站 `https://klingai.com/mcp`。
浏览器不会接收到 Kling Token。管理员可通过 `VIDEOAGENT_KLING_EXPECTED_USER_ID`
锁定允许使用的国内账号。当前 CLI 用户可通过 `kling who_am_i` 与 `kling account`
只读核验身份和余额。

## 错误格式

```json
{
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "The project was not found.",
    "details": {},
    "requestId": "request-id"
  }
}
```

常见状态码：

| 状态码 | 含义 |
| --- | --- |
| `401` | 未登录或 Session 过期 |
| `402` | 当前用户 VideoAgent 积分不足 |
| `403` | 生成审批、管理权限、注册或邀请策略拒绝 |
| `404` | 资源不存在或不属于当前用户 |
| `409` | Provider 未就绪 |
| `413` | 上传文件超过配置限制 |
| `422` | 请求校验失败 |
| `429` | 触发认证、生成或上传限流 |
| `502` | 上游 Provider 请求失败 |
| `503` | Provider CLI 不可用或生成已暂停 |

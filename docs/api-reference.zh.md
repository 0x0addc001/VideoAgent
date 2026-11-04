# VideoAgent API 接口文档

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.5 |
| 更新日期 | 2026-11-04 |
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

## Agent 对话

### 消息历史

`GET /projects/{project_id}/messages`

### 发送消息

`POST /projects/{project_id}/messages`

```json
{
  "content": "把需求整理成三个镜头的发布视频"
}
```

响应包含用户消息、Assistant 回复、最新故事板和当前审批阶段。

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
  "instruction": null
}
```

`choice` 为 `approve`、`refine` 或 `custom`。调整和自定义意见保持当前阶段；
批准会进入下一层细化。

## 故事板即时评估

`POST /projects/{project_id}/evaluate`

返回：

- 一致性
- 覆盖度
- 提示清晰度
- 节奏
- 综合分和修改建议

示例：

```json
{
  "overall_score": 88,
  "metrics": [
    { "key": "consistency", "score": 92 },
    { "key": "coverage", "score": 100 },
    { "key": "clarity", "score": 84 },
    { "key": "pacing", "score": 80 }
  ],
  "suggestions": [
    { "code": "IMPROVE_PROMPTS", "severity": "medium" }
  ]
}
```

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
  "approved": true
}
```

未显式批准时返回 `403`。相同镜头和幂等键重复请求会返回已有任务，不会再次提交 Provider。

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
| `GET` | `/skills` | 当前用户已保存的 Skill |
| `POST` | `/skills` | 保存结构化 Skill |
| `POST` | `/skills/optimize` | 将粗略能力想法整理成结构化草稿 |

优化接口返回稳定的 `skill_id`、名称、描述、详细执行规范、启动提示词以及输入和
输出 JSON Schema。保存后的 Skill 属于当前登录账户，并会在 Skills 页面自动恢复。

```json
{
  "idea": "把产品静帧制作成高级广告视频",
  "title": "电影感产品广告",
  "locale": "zh-CN"
}
```

## 资产与媒体

媒体接口均校验当前用户所有权。不支持的类型、文件头不匹配或超过大小限制的文件
会在创建 Asset 记录前被拒绝。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/assets` | 当前用户资产列表 |
| `GET` | `/projects/{project_id}/assets` | 项目资产列表 |
| `POST` | `/projects/{project_id}/assets` | 上传图片、视频或音频素材 |
| `GET` | `/assets/{asset_id}/content` | 读取私有资产内容 |
| `POST` | `/projects/{project_id}/exports` | 合成并导出当前成片 |
| `POST` | `/assets/{asset_id}/share` | 创建限时分享链接 |
| `DELETE` | `/shares/{share_id}` | 撤销分享链接 |
| `GET` | `/shares/{token}/content` | 通过有效分享链接读取资产 |

上传请求：

```text
POST /projects/{project_id}/assets
Content-Type: multipart/form-data
file=<图片、视频或音频>
```

导出请求：

```json
{
  "aspect_ratios": ["16:9", "9:16", "1:1"],
  "soundtrack_asset_id": null,
  "captions": "一段产品故事",
  "permission": "private"
}
```

导出响应包含交付版本 Asset 与自动生成的封面。当前实现使用 FFmpeg 合成可用镜头，
统一交付比例，在镜头间添加短交叉淡化，并可加入字幕和上传的音轨。

分享请求：

```json
{
  "expires_in_hours": 24
}
```

分享 Token 随机生成且只保存哈希；链接支持过期与撤销，访问时累计审计计数。

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
Provider 计费使用服务端配置的账户，产品用户通过 `/credits` 消费各自独立的
VideoAgent 配额。

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

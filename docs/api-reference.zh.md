# VideoAgent API 接口文档

| 属性 | 内容 |
| --- | --- |
| 文档版本 | v1.1 |
| 更新日期 | 2026-11-03 |
| 基础路径 | `/api/v1` |
| 认证方式 | HttpOnly Session Cookie |

本地 OpenAPI 文档：

```text
http://localhost:8000/docs
http://localhost:8000/openapi.json
```

除 `/health`、注册和登录外，所有接口都要求登录，并设置
`credentials: "include"`。

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
  "locale": "zh-CN"
}
```

后端仍接受 `en` 和 `zh-CN` 用户偏好；当前公开产品 UI 仅开放英文。

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

响应包含用户消息、Assistant 回复和最新故事板。

当前接口返回普通 JSON，不提供 SSE 或 Token 流式响应。

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

当前前端每 5 秒轮询任务状态。Celery 启用时可由 Worker 轮询。

## Pippit Provider

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/providers/pippit` | 查询服务端 Pippit 登录状态 |
| `GET` | `/providers/pippit/credits` | 查询 Pippit 积分余额 |

Pippit 授权由服务端统一持有。浏览器不会收到 Access Key 或 CLI 登录文件。
当前所有 VideoAgent 用户共享同一个配置的 Pippit 账户和积分池。

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

## Hots 发布

Hots 发布目前仅为前端当前会话交互，不调用后端 API。帖子、作者和 0 喜欢
不会持久化到数据库，也没有点赞接口。

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
| `403` | 缺少显式生成审批 |
| `404` | 资源不存在或不属于当前用户 |
| `409` | Provider 未就绪 |
| `422` | 请求校验失败 |
| `502` | 上游 Provider 请求失败 |
| `503` | Provider CLI 不可用 |

## 变更记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v1.1 | 2026-11-03 | 增加中文版本，补充健康检查、项目重命名、评估与 Hots 当前边界 |

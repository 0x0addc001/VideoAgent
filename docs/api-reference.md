# VideoAgent API Reference

Base URL:

```text
http://localhost:8000/api/v1
```

Interactive OpenAPI documentation is available at:

```text
http://localhost:8000/docs
http://localhost:8000/openapi.json
```

## Authentication

The API uses an HttpOnly session cookie named `videoagent_session`.
Browser clients must send requests with credentials enabled.

### Register

`POST /auth/register`

```json
{
  "email": "creator@example.com",
  "password": "at-least-eight-characters",
  "locale": "zh-CN"
}
```

### Login

`POST /auth/login`

```json
{
  "email": "creator@example.com",
  "password": "at-least-eight-characters"
}
```

### Current User

`GET /auth/me`

Returns the authenticated user's ID, email, locale, and creation time.

### Update Locale

`PATCH /auth/me`

```json
{
  "locale": "en"
}
```

### Logout

`POST /auth/logout`

Revokes the current session and removes the session cookie.

## Projects

All project endpoints require authentication and are scoped to the current
user. Another user's project returns `404`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/projects` | List active projects |
| `POST` | `/projects` | Create a project |
| `GET` | `/projects/{project_id}` | Read a project |
| `DELETE` | `/projects/{project_id}` | Archive a project |

Create request:

```json
{
  "title": "Launch film",
  "brief": "A ten-second cinematic product launch"
}
```

## Storyboards

### Read Storyboard

`GET /projects/{project_id}/storyboard`

### Replace Storyboard

`PUT /projects/{project_id}/storyboard`

```json
{
  "shots": [
    {
      "description": "Opening product reveal",
      "prompt_en": "Cinematic product reveal with warm rim light",
      "prompt_zh": "暖色轮廓光下的电影感产品亮相",
      "duration_seconds": 5,
      "aspect_ratio": "16:9",
      "generation_mode": "text_to_video"
    }
  ]
}
```

## VideoAgent Conversation

### List Messages

`GET /projects/{project_id}/messages`

### Send Message

`POST /projects/{project_id}/messages`

```json
{
  "content": "Turn the brief into a three-shot launch film"
}
```

The response includes the user message, VideoAgent reply, and updated
storyboard.

## Generation

### Estimate Cost

`POST /shots/{shot_id}/estimate`

### Generate Shot

`POST /shots/{shot_id}/generate`

Required header:

```text
Idempotency-Key: unique-request-id
```

Request:

```json
{
  "approved": true
}
```

### Job Status

`GET /jobs/{job_id}`

Possible statuses include `submitted`, `queued`, `running`, `succeeded`,
`failed`, and `cancelled`.

## Kling Provider

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/providers/kling/connect` | Start Kling OAuth |
| `GET` | `/providers/kling/callback` | OAuth callback |
| `GET` | `/providers/kling` | Read connection status |
| `GET` | `/providers/kling/credits` | Read current Kling credit balance |
| `DELETE` | `/providers/kling` | Disconnect Kling |

Kling authorization is scoped to the currently authenticated VideoAgent user.
It is not linked by matching email addresses.

## Errors

Errors use the following shape:

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

Important status codes:

| Status | Meaning |
| --- | --- |
| `401` | Authentication required or session expired |
| `403` | Explicit approval required |
| `404` | Resource not found or not owned by the current user |
| `409` | Provider is not connected |
| `422` | Request validation failed |
| `502` | Upstream provider request failed |

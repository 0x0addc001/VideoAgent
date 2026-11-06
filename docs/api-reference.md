# VideoAgent API Reference

| Attribute | Value |
| --- | --- |
| Document version | v1.6 |
| Updated | 2026-11-06 |
| Base path | `/api/v1` |
| Authentication | HttpOnly Session Cookie |
| Request format | JSON with `credentials: "include"` |
| API style | REST with job polling |
| Billable generation | Explicit approval plus `Idempotency-Key` |
| Write protection | Same-origin `Origin` / `Sec-Fetch-Site` validation |
| User credits | Internal per-user quota with an auditable ledger |
| Administration | `VIDEOAGENT_ADMIN_EMAILS` allowlist |
| OpenAPI | `/docs` and `/openapi.json` |

Base URL:

```text
http://localhost:8000/api/v1
```

Interactive OpenAPI documentation is available at:

```text
http://localhost:8000/docs
http://localhost:8000/openapi.json
```

All endpoints require authentication except `/health`, `/auth/register`,
`/auth/login`, `/auth/registration-policy`, and
`/shares/{token}/content`. Browser clients must send the session cookie for
authenticated endpoints.

## Authentication

The API uses an HttpOnly session cookie named `videoagent_session`.
Browser clients must send requests with credentials enabled.

### Register

`POST /auth/register`

```json
{
  "email": "creator@example.com",
  "password": "at-least-eight-characters",
  "locale": "zh-CN",
  "invite_code": "optional-invite-code"
}
```

### Registration Policy

`GET /auth/registration-policy`

Returns `open`, `invite`, or `closed`. Invite mode requires `invite_code`.

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

## Health

`GET /health`

Returns API status and database dependency health. A database failure returns
`503` with `status: "degraded"`.

## Projects

All project endpoints require authentication and are scoped to the current
user. Another user's project returns `404`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/projects` | List active projects |
| `POST` | `/projects` | Create a project |
| `GET` | `/projects/{project_id}` | Read a project |
| `PATCH` | `/projects/{project_id}` | Rename a project |
| `DELETE` | `/projects/{project_id}` | Archive a project |
| `GET` | `/workspace` | List project folders and all recent conversations |
| `POST` | `/workspace/folders` | Create a project folder |
| `PATCH` | `/workspace/folders/{folder_id}` | Rename a project folder |
| `DELETE` | `/workspace/folders/{folder_id}` | Delete a folder without deleting conversations |
| `PUT` | `/workspace/threads/{project_id}/folder` | File or unfile a conversation |

Create request:

```json
{
  "title": "Launch film",
  "brief": "A ten-second cinematic product launch"
}
```

Rename request:

```json
{
  "title": "Launch film — final"
}
```

## Storyboards

### Read Storyboard

`GET /projects/{project_id}/storyboard`

### Replace Storyboard

`PUT /projects/{project_id}/storyboard`

```json
{
  "characters": [
    {
      "name": "Mara",
      "description": "A reserved photographer in her early thirties.",
      "prompt_en": "Editorial portrait with stable identity and natural skin texture",
      "prompt_zh": "稳定身份与自然肤质的角色定妆照"
    }
  ],
  "scenes": [
    {
      "name": "Studio",
      "location": "Downtown loft",
      "description": "A warm production loft with large windows.",
      "prompt_en": "Cinematic production loft with warm daylight",
      "prompt_zh": "暖日光下的电影感制作空间"
    }
  ],
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

### Reorder Storyboard

`PATCH /projects/{project_id}/storyboard/order`

The request must contain every current Shot exactly once. Reordering preserves
Shot IDs, generated assets, generation history, and project continuity.

```json
{
  "shot_ids": [
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000001"
  ]
}
```

### Save Storyboard Version

`POST /projects/{project_id}/versions`

```json
{
  "label": "Director approved"
}
```

`GET /projects/{project_id}/versions` lists immutable snapshot metadata.
`POST /projects/{project_id}/versions/{version_id}/restore` restores the
snapshot and returns the updated Storyboard. Snapshots include all Characters,
Scenes, and Shots; they do not modify exported FinalCuts.

## VideoAgent Conversation

### List Messages

`GET /projects/{project_id}/messages`

### Send Message

`POST /projects/{project_id}/messages`

```json
{
  "content": "Turn the brief into a three-shot launch film",
  "run_id": "00000000-0000-0000-0000-000000000020"
}
```

The response includes the user message, VideoAgent reply, and updated
storyboard as JSON. The response also includes the current approval stage.

### Observe Agent Activity

`GET /projects/{project_id}/agent-activity/{run_id}`

Returns ordered activity events for the run:

```json
{
  "items": [
    {
      "id": "00000000-0000-0000-0000-000000000021",
      "run_id": "00000000-0000-0000-0000-000000000020",
      "sequence": 1,
      "kind": "context",
      "label": "Assembled working context",
      "detail": "locale=en · workflow=concept/awaiting_approval",
      "status": "completed",
      "created_at": "2026-11-05T08:00:00Z"
    }
  ]
}
```

Activity kinds are `context`, `memory`, `skill`, `planning`, `validation`,
`state`, and `reply`. The workspace polls this endpoint while waiting so the
trace reflects actual execution rather than decorative animation.

### Read Workflow

`GET /projects/{project_id}/workflow`

The workflow progresses through `concept`, `outline`, `script`, and `ready`.
`concept` establishes the creative direction, `outline` defines episodes and
shots, and `script` develops the scene-level production text. Generation is
only enabled after the script is approved and the state becomes `ready`.

### Submit Workflow Decision

`POST /projects/{project_id}/workflow/decision`

```json
{
  "choice": "approve",
  "instruction": null,
  "run_id": "00000000-0000-0000-0000-000000000020"
}
```

`choice` is `approve`, `refine`, or `custom`. Refinements preserve the current
stage. An approval advances one stage and creates the next refinement level.

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

`generation_mode` is `text_to_video` or `image_to_video`. Image-to-video
requires a project-owned image asset that belongs to the current user.
Estimation and generation return `409 VISION_OBJECTS_REQUIRED` until the
storyboard contains at least one Character and one Scene.
`provider` and `model` are optional per-task overrides. Omit both to use the
project default. Changing the override invalidates the previous estimate.
`reference_asset_ids` accepts up to 15 ordered project image, video, or audio
assets. Image-to-video also accepts the legacy `reference_asset_id` field.
Providers that support multimodal references receive the ordered media set;
`task_type` is `auto`, `reference`, `edit`, or `extend`.

### Character Image Generation

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/characters/{character_id}/estimate` | Estimate character image credits |
| `POST` | `/characters/{character_id}/assets` | Upload a character image |
| `POST` | `/characters/{character_id}/generate` | Generate or edit a character image |

Generation request:

```json
{
  "approved": true,
  "generation_mode": "image_to_image",
  "reference_asset_id": "00000000-0000-0000-0000-000000000010",
  "provider": "kling",
  "model": "kling-image-v3_0"
}
```

`generation_mode` is `text_to_image` or `image_to_image`. A successful request
returns an `AssetRead` whose content can be previewed and downloaded through
`content_url`.

### Scene Editing and References

`PATCH /projects/{project_id}/storyboard/scenes/{scene_id}` updates name,
location, description, or prompts. `POST /scenes/{scene_id}/assets` uploads a
scene reference image. The returned asset filename is namespaced to the scene so
the workspace can keep it under that Scene directory.

`POST /scenes/{scene_id}/estimate` and
`POST /scenes/{scene_id}/generate` run scene text-to-image or image-to-image
generation. The request accepts the same `provider` and `model` overrides as
Character generation.

### Job Status

`GET /jobs/{job_id}`

Possible statuses include `submitted`, `queued`, `running`, `succeeded`,
`failed`, and `cancelled`.

Each successful generation reserves the estimated credits from the current
user's VideoAgent balance. An immediate submission failure or a later failed or
cancelled job returns the reservation through an idempotent refund entry.

## Credits

`GET /credits`

Returns the authenticated user's internal VideoAgent quota. This balance is
separate from the server-owned Provider account pool.

```json
{
  "provider": "video_agent",
  "connected": true,
  "credits": 95
}
```

## Skills

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/skills` | List public Skills and Skills owned by the current user |
| `POST` | `/skills` | Persist a structured Skill |
| `POST` | `/skills/optimize` | Convert a rough capability idea into a structured draft |
| `POST` | `/skills/engagement/query` | Read signals for up to 100 stable Skill keys |
| `POST` | `/skills/engagement/like` | Toggle a like for a stable Skill key |
| `POST` | `/skills/engagement/use` | Record one de-duplicated use signal |

The optimizer returns a stable `skill_id`, title, description, detailed
instructions, starter prompt, and input/output JSON schemas. List responses add
`is_mine`, `likes`, `uses`, and `is_liked`. Engagement endpoints accept
`{"skill_key":"<user_id>/<skill_id>"}`, which allows bundled and published
Skills to share one persistent signal store. Authors cannot like their own
Skill; repeated requests from the same account do not inflate either counter.

```json
{
  "skill_key": "video_agent/creator_vlog"
}
```

`POST /skills/engagement/query` accepts `{"skill_keys":["<user_id>/<skill_id>"]}`
and returns a keyed `items` object. This lets the client hydrate engagement for
built-in Skills that are not rows in the user Skill table.

```json
{
  "idea": "Turn product stills into premium campaign videos",
  "title": "Editorial product film",
  "locale": "en"
}
```

## Videos

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/hots` | List published community videos; `mine=true` filters to the current user |
| `POST` | `/hots` | Upload an MP4 and publish a community post |
| `POST` | `/hots/{post_id}/like` | Toggle the current user's like |
| `GET` | `/hots/{post_id}/video` | Stream the public video |

`POST /hots` uses `multipart/form-data` with `file`, `title`, `prompt`, and
`skill`. The uploaded video asset is public and appears in the authenticated
author's Assets view. Videos responses include `is_liked`; one account contributes
at most one like, and authors cannot like their own post.

### Production Progress

`GET /projects/{project_id}/progress`

Returns the live production percentage used by the workspace progress bar. It
tracks the workflow stage and completed Shots; it is readiness, not a visual
quality score.

### Final Cut Visual Review

`GET /projects/{project_id}/visual-review/models`

Returns the configured visual evaluator models.

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

The endpoint accepts only an exported Final Cut asset, extracts representative
frames, and sends them to the selected configured vision model. It returns
paper-style or trained-model consistency metrics with evidence. When no
evaluator is configured, the API returns `503 VISUAL_REVIEW_UNAVAILABLE`
instead of fabricating scores.

## Assets and Media

Media endpoints are scoped to the authenticated user. Unsupported content
types, invalid file signatures, and files above the configured size limit are
rejected before an Asset record is created.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/assets` | List the current user's assets |
| `GET` | `/projects/{project_id}/assets` | List assets for one owned project |
| `POST` | `/projects/{project_id}/assets` | Upload image, video, or audio media |
| `PATCH` | `/assets/{asset_id}` | Rename an owned asset |
| `DELETE` | `/assets/{asset_id}` | Soft-delete an owned asset |
| `GET/PUT` | `/projects/{project_id}/asset-selections` | Read or update final asset choices |
| `GET` | `/assets/{asset_id}/content` | Download or preview a private asset |
| `POST` | `/projects/{project_id}/exports` | Compose and export the current film |
| `POST` | `/assets/{asset_id}/share` | Create a time-limited share link |
| `POST` | `/hots/from-asset/{asset_id}` | Publish an existing exported final cut |
| `POST` | `/projects/{project_id}/collaborations` | Create a project collaboration link |
| `POST` | `/collaborations/{token}/accept` | Accept an invite and join the project |
| `DELETE` | `/shares/{share_id}` | Revoke a share link |
| `GET` | `/shares/{token}/content` | Read a valid shared asset without a session |

Upload request:

```text
POST /projects/{project_id}/assets
Content-Type: multipart/form-data
file=<image, video, or audio>
```

Project uploads accept an optional `shot_id` form field. The returned asset UUID
is the stable ID used in prompts as `@<asset-id>`.

Export request:

```json
{
  "aspect_ratios": ["21:9", "16:9", "9:16", "1:1"],
  "soundtrack_asset_id": null,
  "captions": "A generated product story",
  "permission": "private"
}
```

The export response contains delivery Assets and a generated cover. Export
requires every storyboard Shot to have a generated result. The current
implementation composes those generated shots with FFmpeg,
normalizes each delivery ratio, applies a short crossfade between shots, and
optionally includes captions and an uploaded soundtrack. One request may return
up to four delivery variants; each non-empty caption line is timed evenly across
the assembled cut.

Share request:

```json
{
  "expires_in_hours": 24
}
```

Share tokens are random, stored as hashes, expire after the requested period,
and can be revoked. Access increments an audit counter.

Collaboration request:

```json
{
  "permission": "edit",
  "collaborator_email": "editor@example.com",
  "expires_in_hours": 168
}
```

Collaboration links are distinct from asset-share links. They grant project
membership after authenticated acceptance and enforce `view` or `edit`
permission on project endpoints.

## Administration

Administration endpoints require an authenticated account whose email appears
in `VIDEOAGENT_ADMIN_EMAILS`. Other users receive `403 ADMIN_ACCESS_REQUIRED`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/admin/me` | Confirm administration access |
| `GET` | `/admin/overview` | Counts and launch-state summary |
| `GET` | `/admin/users` | Search users and read credits |
| `PATCH` | `/admin/users/{id}` | Enable or disable an account |
| `POST` | `/admin/users/{id}/credits` | Add or remove credits |
| `GET` | `/admin/jobs` | Inspect generation jobs |
| `POST` | `/admin/jobs/{id}/refund` | Refund a failed or uncertain hold |
| `GET/PATCH` | `/admin/settings` | Read or update generation and registration |
| `GET/POST` | `/admin/invites` | List or create invite codes |
| `DELETE` | `/admin/invites/{id}` | Revoke an invite code |
| `GET` | `/admin/audit` | Read administrative audit entries |
| `GET` | `/admin/provider` | Read the active Provider connection state |

Settings update:

```json
{
  "generation_enabled": false,
  "registration_mode": "invite"
}
```

When generation is disabled, estimate and submit endpoints return
`503 GENERATION_DISABLED`. Disabling an account revokes its Sessions
immediately.

## Pippit Provider

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/providers/pippit` | Read server-owned Pippit account status |
| `GET` | `/providers/pippit/credits` | Read the active Pippit credit balance |

Pippit authorization is server-owned. The API invokes the installed
`pippit-tool-cli` binary; browser clients never receive access keys or CLI
session files. Provider billing draws from the configured server account, while
product users consume independent VideoAgent balances through `/credits`.
Operators authorize the CLI on the API host before enabling live generation.

`GET /providers/pippit` response:

```json
{
  "provider": "pippit",
  "connected": true,
  "scope": "server"
}
```

`GET /providers/pippit/credits` response:

```json
{
  "provider": "pippit",
  "connected": true,
  "credits": 42
}
```

If the server CLI is not logged in, the credits endpoint returns `connected:
false` and `credits: null`. A missing binary returns `503`; an upstream CLI
failure returns `502`.

## Kling Provider

VideoAgent uses the server-owned China-region `@klingai/cli-cn` package and the
`https://klingai.com/mcp` endpoint. Kling tokens never reach the browser.
`VIDEOAGENT_KLING_EXPECTED_USER_ID` pins the authorized domestic account.
Operators can use `kling who_am_i` and `kling account` for read-only identity
and credit checks.

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
| `402` | The user's VideoAgent credit balance is insufficient |
| `403` | Approval, administrator, registration, or invite policy denied |
| `404` | Resource not found or not owned by the current user |
| `409` | Configured provider is not active |
| `413` | Uploaded media exceeds the configured limit |
| `422` | Request validation failed |
| `429` | An auth, generation, or upload rate limit was exceeded |
| `502` | Upstream provider request failed |
| `503` | Provider CLI is unavailable or generation is paused |

# VideoAgent Implementation Guide

| Attribute | Value |
| --- | --- |
| Document version | v2.0 |
| Updated | 2026-11-04 |
| Backend framework | Python + FastAPI |
| Frontend framework | Next.js + TypeScript |
| Model | Pippit/Seedance 2.5 Draft, Pippit/Seedance 2.5, Pippit/Seedance 2.0 Fast VIP, Pippit/Seedance 2.0 VIP, Pippit/Seedance 2.0 Mini Preview, Pippit/Seedance 2.0 Mini, Pippit/Wan 3.0, Pippit/HappyHorse 1.1, Kling/Kling Video 2.5, Kling/Kling Video 2.6, Kling/Kling Video O1, Kling/Kling Video 3.0, Kling/Kling Video 3.0 Omni, Kling/Kling Video 3.0 Turbo, Kling/Kling Video 4.0, Kling/Kling 2.6 Motion Control, Kling/Kling 3.0 Motion Control, Kling/Kling Image 3.0 Omni, Kling/Kling Image O1, Kling/Kling Image 3.0, Kling/Kling Image 2.1 |

## 1. Purpose

This guide describes the VideoAgent implementation architecture, module
boundaries, runtime flow, provider adapters, and engineering conventions.

## 2. System Scope

- Next.js App Router product UI.
- Left navigation: Agents, Skills, Hots, Assets, Docs.
- Home composer with Skill and Hook selectors, six production playbooks, and
  transparent custom dropdowns.
- Auto-growing prompt textarea with idea suggestions rendered only in the empty state.
- Complete live video-model catalogue with provider-labelled Pippit and Kling options.
- Flat searchable Skills catalogue using `user_id/skill_id`, plus user publishing.
- Searchable Hots feed with looping video playback, Skill-backed scenario
  reuse, and publishing.
- Searchable Assets waterfall with internal Video/Skill tabs, permission, and
  `yyyy-mm-dd` edit date; videos preview on hover, Skill cards have no cover,
  and cards do not repeat type labels.
- Searchable bilingual Docs with nine documents, a collapsible table of contents,
  and full-text lookup across languages.
- Registration, login, logout, server-side sessions, and user isolation.
- Project create, list, read, rename, and archive.
- Storyboard read and whole-document replacement.
- LangGraph single-node storyboard planning.
- OpenAI-compatible and deterministic local planners.
- Cost estimate and explicit generation approval.
- Pippit CLI, China-region Kling CLI, and Mock Provider adapters.
- Celery polling with Redis.
- Per-user credit reservations and idempotent refunds.
- Image, video, and audio uploads with MIME, signature, and size validation.
- FFmpeg composition with landscape, vertical, and square deliveries, captions,
  soundtrack, and cover generation.
- Private asset downloads plus time-limited, revocable share links.
- Same-origin write validation and separate auth, generation, and upload limits.
- An environment-allowlisted administration console for accounts, credits,
  jobs, invites, runtime switches, and audit logs.
- Instant storyboard review.
- CI, security scanning, documentation generation, and release builds.
- Playwright and Mock Provider end-to-end acceptance without paid generation.

## 3. Repository Layout

```text
VideoAgent/
├── apps/
│   ├── web/
│   │   ├── messages/               # EN/ZH translation resources
│   │   ├── public/docs/            # generated English and Chinese Docs
│   │   ├── src/app/                # Next.js routes and API proxy
│   │   ├── src/components/         # product UI and project workspace
│   │   ├── src/i18n/               # next-intl routing
│   │   └── tests/
├── packages/landing/
│   ├── src/index.tsx               # shared product UI
│   ├── src/content.ts              # English and Chinese content
│   └── src/landing.css             # shared visual system
├── services/api/src/videoagent/
│   ├── agent/                      # graph and planner
│   ├── api/                        # FastAPI routes
│   ├── providers/                  # Pippit, Kling China CLI, Mock
│   ├── services/                   # storyboard, jobs, evaluation
│   └── workers/
├── docs/                           # paired Markdown sources
├── scripts/build_pages.py          # Markdown and static Docs builder
└── .github/workflows/
```

## 4. Runtime

```text
Browser
  ├── Next.js :3000
  │     ├── /api/account/* → FastAPI :8000/api/v1
  │     └── /docs/*        → generated HTML
FastAPI
  ├── SQLite by default
  ├── LangGraph
  ├── Pippit CLI
  └── Kling China CLI

Celery Worker
  ├── Redis broker
  └── Pippit query-result
```

The browser account and home creation requests use the Next.js Route Handler.
The project workspace uses `NEXT_PUBLIC_API_BASE_URL`.

## 5. Request Flows

### 5.1 Authentication

```text
register/login
  → normalize email
  → hash password with Argon2
  → create opaque session token
  → store SHA-256 token hash
  → set HttpOnly SameSite cookie
```

### 5.2 Storyboards

`PUT /projects/{project_id}/storyboard` replaces the complete shot list,
increments `Storyboard.version`, and assigns contiguous shot indexes starting
at zero.

### 5.3 Agent

```text
POST /projects/{project_id}/messages
  → persist user message
  → execute LangGraph plan_storyboard
  → validate StoryboardPlan
  → replace storyboard
  → persist assistant message
  → return both messages and current storyboard
```

### 5.4 Generation

```text
estimate
  → POST /shots/{id}/estimate

generate
  → require approved=true
  → require Idempotency-Key
  → provider.submit
  → persist GenerationJob
  → update Shot
  → enqueue Celery polling

status
  → GET /jobs/{id}
  → refresh from Provider when non-terminal
```

## 6. Backend Modules

| Module | Responsibility |
| --- | --- |
| `main.py` | FastAPI app, lifespan, routers, errors |
| `config.py` | `VIDEOAGENT_*` settings |
| `models.py` | SQLAlchemy ORM models |
| `schemas.py` | API and Agent schemas |
| `api.auth` | Account and session flows |
| `api.projects` | Project lifecycle and ownership |
| `api.storyboards` | Storyboard read/replace |
| `api.agent` | Message history and planning |
| `api.generation` | Estimate, submit, job status |
| `api.evaluation` | Storyboard review |
| `api.providers` | Pippit status and credits |
| `api.assets` | Uploads, downloads, exports, sharing, and revocation |
| `api.credits` | Per-user VideoAgent balance |
| `api.admin` | Overview, users, credits, jobs, invites, settings, audit |
| `middleware` | Same-origin write checks and request limits |
| `services.media` | Validation, result materialization, FFmpeg, covers, and sharing |
| `services.credits` | Credit accounts, reservations, and refunds |
| `providers.pippit` | CLI process and JSON adaptation |
| `providers.kling` | Kling MCP tool adapter and task mapping |
| `providers.kling_cli` | China-region Kling CLI submission, status, identity, and credits |
| `providers.mock` | Deterministic local generation |
| `agent.graph` | One-node LangGraph |
| `agent.planner` | Local/OpenAI-compatible planners |

## 7. Frontend Modules

| Module | Responsibility |
| --- | --- |
| `packages/landing/src/index.tsx` | Shared nav, composer, Skills, Hots, Docs |
| `packages/landing/src/content.ts` | English UI and Chinese resources |
| `app-landing-page.tsx` | Product home project creation |
| `project-workspace.tsx` | Conversation, canvas, inspector, generation, review |
| `projects-dashboard.tsx` | Project list, rename, archive |
| `scripts/build_pages.py` | bilingual Docs build |

## 8. Skills Implementation

Skills is one flat searchable catalogue. Cards show `user_id/skill_id` and
preload actionable prompts into the Agents composer. Provider-native
capabilities use the provider namespace, while cross-provider workflows use
`video_agent`:

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

Review uses the same card form as other task-oriented Skills. Signed-in users
can publish a skill under their own namespace.

Production playbooks are defined in `packages/landing/src/content.ts` with a
prompt, Skill, Hook, style, frame, duration, and review mode. Applying one
updates the full composer draft; clicking the active playbook again restores
the saved pre-playbook composer state. Hots cards carry a Skill ID so scenario
reuse enters Agents with the matching Skill selected.

## 9. Documentation Localization

The globe control switches documentation language.

```text
English: product-requirements.html
Chinese: product-requirements.zh.html
```

The same pattern applies to all nine documents in this order: PRD, Playbook,
Arch, API, Dev, Test, Ops, FAQ, and TODO. Docs search uses
`docs-search.json` across both languages. Docs language follows application
locale state.

## 10. Data Model

| Table | Purpose |
| --- | --- |
| `users` | User, password hash, locale |
| `sessions` | Token hashes and expiry |
| `projects` | Owner, title, brief, state |
| `storyboards` | Current board and version |
| `shots` | Prompt, frame, duration, status |
| `conversations` | One per project |
| `messages` | User/assistant content |
| `generation_jobs` | Provider task and idempotency |
| `provider_connections` | Legacy OAuth storage |
| `oauth_flows` | Legacy OAuth state |
| `credit_accounts` | Per-user VideoAgent balance |
| `credit_entries` | Idempotent reservation and refund ledger |
| `assets` | Uploads, generated clips, deliveries, covers, and permissions |
| `share_links` | Hashed tokens, expiry, revocation, and access count |
| `platform_settings` | Generation switch and registration policy |
| `invite_codes` | Hashed codes, expiry, and use limits |
| `admin_audit_logs` | Administrative mutation trail |

## 11. API List

| Method | Path |
| --- | --- |
| `GET` | `/health` |
| `POST` | `/auth/register` |
| `POST` | `/auth/login` |
| `POST` | `/auth/logout` |
| `GET/PATCH` | `/auth/me` |
| `GET/POST` | `/projects` |
| `GET/PATCH/DELETE` | `/projects/{id}` |
| `GET/POST` | `/projects/{id}/messages` |
| `GET/PUT` | `/projects/{id}/storyboard` |
| `PATCH` | `/projects/{id}/storyboard/order` |
| `POST` | `/projects/{id}/evaluate` |
| `POST` | `/shots/{id}/estimate` |
| `POST` | `/shots/{id}/generate` |
| `GET` | `/jobs/{id}` |
| `GET` | `/providers/pippit` |
| `GET` | `/providers/pippit/credits` |
| `GET` | `/credits` |
| `GET` | `/assets` |
| `GET/POST` | `/projects/{id}/assets` |
| `GET` | `/assets/{id}/content` |
| `POST` | `/projects/{id}/exports` |
| `POST` | `/assets/{id}/share` |
| `DELETE` | `/shares/{id}` |
| `GET` | `/shares/{token}/content` |
| `GET/PATCH` | `/admin/settings` |
| `GET` | `/admin/overview` |
| `GET` | `/admin/users` |
| `PATCH` | `/admin/users/{id}` |
| `POST` | `/admin/users/{id}/credits` |
| `GET` | `/admin/jobs` |
| `POST` | `/admin/jobs/{id}/refund` |
| `GET/POST` | `/admin/invites` |
| `DELETE` | `/admin/invites/{id}` |
| `GET` | `/admin/audit` |

## 12. Security

- Argon2 password hashing.
- Opaque session tokens with SHA-256 storage.
- HttpOnly and SameSite=Lax cookies.
- Ownership checks on projects, shots, and jobs.
- Pippit credentials remain server-side.
- Kling OAuth state remains inside the MCP connector boundary.
- CLI calls use argument arrays and timeouts.
- Secret and dependency scanning run in CI.
- Unsafe methods validate `Origin` and `Sec-Fetch-Site`.
- Uploads enforce byte limits and validate declared MIME plus file signatures.
- Share tokens are stored as hashes and become unavailable after expiry or
  revocation.
- Administration access is restricted by `VIDEOAGENT_ADMIN_EMAILS`.
- Disabling a user immediately revokes existing sessions.
- The generation kill switch blocks both estimation and Provider submission.

## 13. Local Development

```powershell
cd D:\_Science\Agent\VideoAgent
.\scripts\dev-api.ps1
.\scripts\dev-web.ps1
```

Worker:

```powershell
.\scripts\dev-worker.ps1
```

Local URLs:

```text
http://localhost:3000/en
http://localhost:8000/docs
```

## 14. Testing

```powershell
cd services\api
uv run pytest
uv run ruff check src tests
uv run ruff format --check src tests
uv run mypy src

cd ..\..
pnpm --dir apps/web test
pnpm --dir apps/web typecheck
pnpm --dir apps/web build
pnpm test:e2e
python scripts\build_pages.py
```

Backend coverage currently consists of 51 tests, frontend coverage consists of
26 Vitest tests, and Playwright contains four no-fee browser flows. Playwright
uses the Mock Provider for generation and therefore never consumes real
Provider credits.

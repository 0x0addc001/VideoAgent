# VideoAgent Implementation Guide

| Attribute | Value |
| --- | --- |
| Document version | v1.2 |
| Status | Current implementation baseline |
| Updated | 2026-11-03 |
| Design reference | `software-design.en.md` |
| Test reference | `software-test-plan.en.md` |

## 1. Purpose

This guide describes how the repository is implemented today. Planned
capabilities are identified as target work and are not presented as delivered
features.

## 2. Implemented Scope

- Next.js App Router product UI with English public routes.
- `/zh-CN` redirects to `/en`.
- Shared Landing UI used by the product and GitHub Pages homepage.
- Left navigation: Agents, Skills, Assets, Hots, Docs.
- Home composer with a transparent custom dropdown system.
- Skills catalogue with atomic tasks, composed workflows, and review.
- Hots masonry feed with looping video playback and session-local publishing.
- Assets cards with status, updated time, duration, summary, and video controls.
- Embedded bilingual Docs with a collapsible table of contents.
- Registration, login, logout, server-side sessions, and user isolation.
- Project create, list, read, rename, and archive.
- Storyboard read and whole-document replacement.
- LangGraph single-node storyboard planning.
- OpenAI-compatible and deterministic local planners.
- Cost estimate and explicit generation approval.
- Pippit CLI and Mock Provider adapters.
- Optional Celery polling with Redis.
- Instant storyboard review.
- CI, security scanning, documentation generation, and Pages deployment.

Not implemented:

- Asset upload and object storage.
- SSE events.
- FFmpeg assembly and export.
- Public sharing.
- Persistent community posts and likes.
- Alembic migrations.
- Generated OpenAPI clients.
- Full production observability and rate limiting.

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
│   └── landing/
│       └── src/main.tsx            # GitHub Pages entry
├── packages/landing/
│   ├── src/index.tsx               # shared product/homepage UI
│   ├── src/content.ts              # English and Chinese content
│   └── src/landing.css             # shared visual system
├── services/api/src/videoagent/
│   ├── agent/                      # graph and planner
│   ├── api/                        # FastAPI routes
│   ├── providers/                  # Pippit, Mock, legacy Kling
│   ├── services/                   # storyboard, jobs, evaluation
│   └── workers/
├── docs/                           # paired Markdown sources
├── scripts/build_pages.py          # Docs and GitHub Pages builder
└── .github/workflows/
```

## 4. Runtime

```text
Browser
  ├── Next.js :3000
  │     ├── /api/account/* → FastAPI :8000/api/v1
  │     └── /docs/*        → generated HTML
  └── GitHub Pages project homepage

FastAPI
  ├── SQLite by default
  ├── LangGraph
  └── Pippit CLI

Optional Celery Worker
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
  → optionally enqueue Celery polling

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
| `providers.pippit` | CLI process and JSON adaptation |
| `providers.mock` | Deterministic local generation |
| `agent.graph` | One-node LangGraph |
| `agent.planner` | Local/OpenAI-compatible planners |

## 7. Frontend Modules

| Module | Responsibility |
| --- | --- |
| `packages/landing/src/index.tsx` | Shared nav, composer, Skills, Hots, Docs |
| `packages/landing/src/content.ts` | English UI and Chinese resources |
| `app-landing-page.tsx` | Product home project creation |
| `apps/landing/src/main.tsx` | Preview-mode project homepage |
| `project-workspace.tsx` | Conversation, canvas, inspector, generation, review |
| `projects-dashboard.tsx` | Project list, rename, archive |
| `scripts/build_pages.py` | bilingual Docs and Pages build |

## 8. Skills Implementation

Atomic skill cards expose concrete task codes and preload actionable prompts
into the Agents composer:

```text
text_to_video
image_to_video
reference_to_video
first_last_frame
motion_control
video_extend
video_edit
video_upscale
```

Workflow cards compose those capabilities:

```text
Product film
Creator vlog
Short drama
```

Review remains a separate wide panel because it evaluates a project storyboard
rather than invoking a generation model.

## 9. Documentation Localization

The product UI remains English. The globe control changes only Docs language.

```text
English: software-design.html
Chinese: software-design.zh.html
```

This pattern applies to Design, Impl, Test, and API documents. The language
selection is saved in `localStorage` under `videoagent-docs-locale`.

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
| `POST` | `/projects/{id}/evaluate` |
| `POST` | `/shots/{id}/estimate` |
| `POST` | `/shots/{id}/generate` |
| `GET` | `/jobs/{id}` |
| `GET` | `/providers/pippit` |
| `GET` | `/providers/pippit/credits` |

## 12. Security

- Argon2 password hashing.
- Opaque session tokens with SHA-256 storage.
- HttpOnly and SameSite=Lax cookies.
- Ownership checks on projects, shots, and jobs.
- Pippit credentials remain server-side.
- CLI calls use argument arrays and timeouts.
- Secret and dependency scanning run in CI.

Current gaps include CSRF, distributed rate limits, and production upload
validation.

## 13. Local Development

```powershell
cd D:\_Science\Agent\VideoAgent
.\scripts\dev-api.ps1
.\scripts\dev-web.ps1
```

Optional worker:

```powershell
.\scripts\dev-worker.ps1
```

Local URLs:

```text
http://localhost:3000/en
http://localhost:3000/zh-CN  → /en
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
python scripts\build_pages.py
```

Current baseline: 35 backend tests and 14 frontend tests. Playwright and paid
provider tests are not part of normal CI.

## 15. Known Gaps

| Area | Current state | Next step |
| --- | --- | --- |
| Uploads | Not implemented | Asset + object storage adapter |
| Realtime | Polling | SSE + Redis Pub/Sub |
| Composition | Not implemented | FFmpeg worker |
| Export/share | Not implemented | Export assets and public share API |
| Community | Session-local | Persist posts, likes, and ownership |
| Docs language | Only Docs are bilingual | Decide whether to extend localization to product UI |
| Migrations | `create_all` | Add Alembic |
| API types | Handwritten | Generate client from OpenAPI |

## 16. Change Log

| Version | Date | Description |
| --- | --- | --- |
| v1.2 | 2026-11-03 | Align Skills catalogue, Hots playback/publish, bilingual Docs, icon behavior, APIs, and tests |

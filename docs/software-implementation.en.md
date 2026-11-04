# VideoAgent Implementation Guide

| Attribute | Value |
| --- | --- |
| Document version | v1.5 |
| Updated | 2026-11-04 |
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
- Left navigation: Agents, Skills, Hots, Assets, Docs.
- Home composer with Skill and Hook selectors, six production playbooks, and
  transparent custom dropdowns.
- Auto-growing prompt textarea with idea suggestions rendered only in the empty state.
- Complete live video-model catalogue with provider-labelled Pippit and Kling options.
- Flat searchable Skills catalogue using `user_id/skill_id`, plus user publishing.
- Searchable Hots feed with looping video playback, Skill-backed scenario
  reuse, and session-local publishing.
- Searchable Assets waterfall with internal Video/Skill tabs, permission, and
  `yyyy-mm-dd` edit date; videos preview on hover, Skill cards have no cover,
  and cards do not repeat type labels.
- Searchable bilingual Docs with six documents, a collapsible table of contents,
  and full-text lookup across languages.
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

Skills is one flat searchable catalogue. Cards show `user_id/skill_id` and
preload actionable prompts into the Agents composer:

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
video_agent/video_localization
video_agent/batch_variants
video_agent/script_assistant
video_agent/smart_preview
video_agent/camera_movement
video_agent/music_video
video_agent/reference_remake
video_agent/agent_handoff
```

Workflow skills do not display a flow label. Review uses the same card form and
has no separate project action. Signed-in users can publish a skill under their
own namespace; current storage is frontend-session-local.

Production playbooks are defined in `packages/landing/src/content.ts` with a
prompt, Skill, Hook, style, frame, duration, and review mode. Applying one
updates the full composer draft; clicking the active playbook again restores
the saved pre-playbook composer state. Hots cards carry a Skill ID so scenario
reuse enters Agents with the matching Skill selected.

## 9. Documentation Localization

The product UI remains English. The globe control changes only Docs language.

```text
English: product-requirements.html
Chinese: product-requirements.zh.html
```

The same pattern applies to all six documents in this order: PRD, Design,
Interface, Impl, Test, and Ops. Docs search uses `docs-search.json` across both
languages. Docs language is derived from the current application language
state and does not use an independent Docs-only cache.

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

Current baseline: 35 backend tests and 19 frontend tests. Playwright and paid
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
| v1.5 | 2026-11-04 | Synchronize the Model selector with all live Pippit and Kling video models |
| v1.4 | 2026-11-04 | Add auto-growing prompt sizing and empty-state-only idea suggestions |
| v1.3 | 2026-11-04 | Add production playbooks, Hook selector, scenario Skills, and Skill-backed Hots reuse |
| v1.2 | 2026-11-03 | Align Skills catalogue, Hots playback/publish, bilingual Docs, icon behavior, APIs, and tests |

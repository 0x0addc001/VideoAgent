# VideoAgent Software Design

| Attribute | Value |
| --- | --- |
| Document version | v1.4 |
| Updated | 2026-11-04 |
| Backend | Python + FastAPI |
| Frontend | Next.js + TypeScript |
| Model technology | Seedance 2.5 Draft (Pippit), Seedance 2.5 (Pippit), Seedance 2.0 Fast VIP (Pippit), Seedance 2.0 VIP (Pippit), Seedance 2.0 Mini Preview (Pippit), Seedance 2.0 Mini (Pippit), Wan 3.0 (Pippit), HappyHorse 1.1 (Pippit), Kling Video 2.5 (Kling), Kling Video 2.6 (Kling), Kling Video O1 (Kling), Kling Video 3.0 (Kling), Kling Video 3.0 Omni (Kling), Kling Video 3.0 Turbo (Kling), Kling Video 4.0 (Kling), Kling 2.6 Motion Control (Kling), Kling 3.0 Motion Control (Kling), Kling Image 3.0 Omni (Kling), Kling Image O1 (Kling), Kling Image 3.0 (Kling), Kling Image 2.1 (Kling) |

Pippit is the default server generation route. Kling models are available
through the connected Kling MCP and are listed for capability parity; they are
not yet routed through the web application backend by default.

## 1. Purpose

This document describes the current VideoAgent implementation and the target
architecture for unfinished capabilities. Features marked as target are not
part of the current delivery baseline.

## 2. Product Overview

VideoAgent is a director-oriented AI video workspace. The public navigation
contains five isolated views:

- **Agents:** home creation composer and VideoAgent conversations.
- **Skills:** one searchable catalogue of generation, workflow, and review skills.
- **Assets:** a waterfall library of the user's videos and skills with
  permission and edit time; videos preview on hover and skills have no cover.
- **Hots:** community feed with author, likes, playback, and local publishing.
- **Docs:** embedded bilingual documentation with a collapsible table of contents.

The formal product and the GitHub Pages project homepage share
`packages/landing`. The project homepage uses a preview mode for actions that
require the signed-in product.

## 3. Scope

### 3.1 Implemented

- English public UI; `/zh-CN` redirects to `/en`.
- Left navigation with shared visual and icon behavior.
- Home composer with a Skill selector, seven production settings, and custom
  translucent dropdowns.
- Project creation, listing, reading, renaming, and archival.
- User ownership isolation.
- LangGraph single-node storyboard planning.
- Configurable OpenAI-compatible planner with deterministic local fallback.
- Storyboard replacement and versioning.
- Cost estimation and explicit generation approval.
- Pippit CLI text-to-video submission, task polling, and credit query.
- Mock Provider and optional Celery polling.
- Instant storyboard review for consistency, coverage, clarity, and pacing.
- Hots feed playback, author, likes, and session-local publishing.
- English and Chinese documentation generated from paired Markdown sources.

### 3.2 Target capabilities

- Image, video, and reference asset upload.
- Full multi-node Agent approval and recovery workflow.
- SSE events with reconnection support.
- Video editing, extension, and FFmpeg composition.
- MP4 export and public sharing.
- Persistent community posts and likes.
- Alembic migrations and generated OpenAPI clients.

## 4. Core User Flow

```text
Sign in
  → describe an idea in the home composer
  → choose style, frame, length, model, quality, audio, and review mode
  → create a default project
  → enter the project workspace
  → plan a storyboard with VideoAgent
  → estimate cost and approve generation
  → poll the generation job
  → review the storyboard
  → continue editing or prepare the next generation
```

## 5. Current Architecture

```text
Browser
  ├── Next.js product UI
  │     ├── shared Landing UI
  │     ├── embedded Docs
  │     └── project workspace
  └── GitHub Pages project homepage

Next.js Route Handler /api/account/*
  → FastAPI /api/v1
      ├── Auth / Projects / Storyboards
      ├── Agent / Generation / Evaluation / Providers
      ├── SQLAlchemy Async
      ├── LangGraph
      └── Pippit CLI

Optional Celery Worker + Redis
  → Pippit query-result
```

SQLite is the current local default. PostgreSQL is the production target.

## 6. Technology Stack

| Area | Current technology |
| --- | --- |
| Web | Next.js 16 App Router, React 19, TypeScript 5.9 |
| Project homepage | Vite, React, GitHub Pages |
| UI | Tailwind CSS 4, Lucide, shared Landing CSS |
| Localization | next-intl routing scaffold; public product UI is English-only |
| Client state | React page state |
| API | FastAPI, Uvicorn, Pydantic v2 |
| Agent | LangGraph, LangChain OpenAI-compatible provider |
| Database | SQLAlchemy 2 Async, SQLite now, PostgreSQL target |
| Jobs | Optional Celery with Redis |
| Video provider | Pippit CLI by default; Mock Provider |
| Testing | pytest, Vitest, Testing Library |
| Quality | Ruff, mypy, TypeScript |

TanStack Query, Zustand, Playwright, object storage, and FFmpeg are planned
rather than active core dependencies.

## 7. Agent Design

The current graph is intentionally minimal:

```text
START → plan_storyboard → END
```

`plan_storyboard` receives locale, project title, project brief, and the latest
user message. It returns an assistant message and a validated three-shot
storyboard.

The planner is:

- OpenAI-compatible when `VIDEOAGENT_LLM_API_KEY` and
  `VIDEOAGENT_LLM_MODEL` are configured.
- Deterministic and local otherwise.

The current graph does not store checkpoints or own the complete approval,
generation, review, and export lifecycle. Those boundaries currently live in
FastAPI, Celery, and frontend state. A multi-node LangGraph workflow remains a
target design.

## 8. Generation and Provider Boundary

```text
POST /shots/{id}/estimate
  → VideoProvider.estimate

POST /shots/{id}/generate
  → require approved=true
  → require Idempotency-Key
  → VideoProvider.submit
  → persist GenerationJob
  → update Shot
  → optional Celery polling

GET /jobs/{id}
  → VideoProvider.status when not terminal
  → update GenerationJob and Shot
```

The current `VideoProvider` protocol exposes `estimate`, `submit`, and
`status`. Cancellation and capability discovery are future extensions.

### 8.1 Pippit CLI

The service runs `pippit-tool-cli` through argument arrays and does not use
shell string interpolation. Current commands include:

```text
status
get-credit-balance
generate-video
query-result
```

The server owns CLI authorization. All product users share the configured
Pippit account and credit pool. Access keys and CLI session files never reach
the browser.

### 8.2 Kling MCP and provider discovery

Kling MCP exposes broader atomic capabilities including text-to-video,
image-to-video, motion control, and Omni-Ref. These capabilities inform the
Skills catalogue and the target provider model, but Pippit CLI remains the
active server generation path in the current baseline.

## 9. Skills Catalogue

Skills use one flat, searchable catalogue. Every card shows its
`user_id/skill_id` identifier at the upper left. Official skills use the
`video_agent` namespace.

| Skill ID | Input and result |
| --- | --- |
| `video_agent/search_all_resources` | Search projects, videos, skills, Hots, and Docs |
| `video_agent/text_to_video` | Text prompt to one video clip |
| `video_agent/image_to_video` | Still image to controlled motion |
| `video_agent/reference_to_video` | Image, video, or audio references to a generated clip |
| `video_agent/first_last_frame` | Opening and closing frames to a continuous transition |
| `video_agent/motion_control` | Driving-video motion applied to a subject image |
| `video_agent/video_extend` | Continue an existing clip |
| `video_agent/video_edit` | Prompt-directed modification of existing footage |
| `video_agent/style_transfer` | Apply a reference style while preserving structure and motion |
| `video_agent/video_upscale` | Raise video resolution up to 4K |
| `video_agent/product_film` | A composed product-video workflow |
| `video_agent/creator_vlog` | A composed creator-vlog workflow |
| `video_agent/short_drama` | A composed short-drama workflow |
| `video_agent/review` | Score consistency, coverage, clarity, and pacing |
| `video_agent/video_localization` | Adapt edit, copy, voice, and presenter details for a target market |
| `video_agent/batch_variants` | Generate a controlled matrix of hooks, scenes, and messaging variants |
| `video_agent/script_assistant` | Develop premises into editable scripts with characters, beats, and hooks |
| `video_agent/smart_preview` | Prepare keyframes and an animatic before final shot generation |
| `video_agent/camera_movement` | Select and combine purposeful camera moves |
| `video_agent/music_video` | Plan performance, visual motifs, and beat-synced editing |
| `video_agent/reference_remake` | Deconstruct a reference and rebuild its structure with new footage |
| `video_agent/agent_handoff` | Package project context and assets for an external Agent via MCP or CLI |

Workflow skills do not display an internal flow label. Review uses the same
card form as every other skill and has no separate action button.

Selecting a skill preloads a concrete prompt in the Agents composer. The
Agents composer also includes a Skill selector. Signed-in users can publish a
skill under their own `<user_id>/<skill_id>` namespace; current publication is
session-local.

The Agents composer includes production playbooks for product ads, creator
vlogs, micro drama, music videos, localization, and batch variants. Selecting a
playbook sets the prompt, Skill, Hook, style, frame, duration, and review mode
as one coherent starting point. Playbooks use toggle behavior: selecting the
active playbook again restores the pre-playbook draft. Hook controls the
first-three-second strategy: visual impact, narrative twist, spoken hook,
sound cue, or proof first.

Frame-level visual-language-model review is a target extension.

## 10. Data Model

| Table | Purpose |
| --- | --- |
| `users` | Account, password hash, and locale preference |
| `sessions` | Hashed server-side session tokens |
| `projects` | Project metadata and owner |
| `storyboards` | One current storyboard per project |
| `shots` | Ordered prompts, duration, frame, mode, and status |
| `conversations` | One conversation per project |
| `messages` | User and assistant messages |
| `generation_jobs` | Provider task, idempotency key, status, result |
| `provider_connections` | Legacy OAuth storage; unused by Pippit |
| `oauth_flows` | Legacy OAuth state; unused by Pippit |

Asset, export, public-share, usage-ledger, and tool-run tables are not
implemented.

## 11. API Surface

Base path: `/api/v1`

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | Register, login, logout, current user |
| Projects | List, create, read, rename, archive |
| Storyboards | `GET` and `PUT /projects/{id}/storyboard` |
| Agent | Get messages, send a message |
| Evaluation | `POST /projects/{id}/evaluate` |
| Generation | Estimate, submit, job status |
| Providers | Pippit status and credits |

Agent responses and job status currently use regular JSON and polling. SSE,
cancel, upload, export, and share endpoints are target capabilities.

## 12. Frontend Design

The shared Landing UI owns:

- Left navigation and responsive layout.
- Continuous background carousel with no inter-frame gap.
- Streaming hero title and blue play brand mark.
- Custom transparent composer dropdowns.
- Flat searchable Skills catalogue with user publishing.
- Hots masonry feed with looping muted video playback.
- Searchable Assets waterfall with internal Video/Skill tabs; videos preview on
  hover and Skill cards omit cover images.
- Searchable embedded Docs with a collapsible table of contents.
- Semi-transparent search, language, notification, credit, and avatar controls.
- Viewport-aware composer menus that flip above the trigger when needed, plus
  downward-opening language, notification, account, and search menus.
- Avatar account actions for login, registration, and sign-out.

The formal product uses `mode="app"` and creates projects. The project
homepage uses `mode="project"` and displays a preview dialog for actions that
need the product runtime.

## 13. Documentation Language

- The product UI remains English-only.
- The globe button beside notifications controls documentation language only.
- English documents are generated as `*.html`.
- Chinese documents are generated as `*.zh.html`.
- Document tabs are fixed as `PRD`, `Design`, `Interface`, `Impl`, `Test`, and
  `Ops`.

## 14. Security and Reliability

- Session cookies are HttpOnly and SameSite=Lax.
- Cross-user resources return `404`.
- Provider commands use argument arrays and timeouts.
- Generation submissions use database idempotency keys.
- The database is the source of truth for project, shot, and job state.
- CSRF, distributed rate limiting, upload validation, and full observability
  remain production hardening tasks.

## 15. Deployment

Current development:

```text
Next.js :3000
FastAPI :8000
SQLite
optional Pippit CLI
optional Celery + Redis
```

The static homepage and documentation are built by `scripts/build_pages.py`
and deployed to GitHub Pages.

Target production adds PostgreSQL, object storage, Redis Pub/Sub, SSE,
FFmpeg workers, Alembic migrations, and a reverse proxy.

## 16. Current Acceptance Baseline

1. Product and project homepage share the same Landing UI.
2. English product routes work; `/zh-CN` redirects to `/en`.
3. Users can create, rename, and archive their own projects.
4. VideoAgent creates a validated multi-shot storyboard.
5. Cost and approval are visible before generation.
6. Jobs and storyboards survive a page refresh or API restart.
7. Provider credentials never reach the browser.
8. Review returns consistency, coverage, clarity, and pacing.
9. Skills is a flat searchable catalogue using `user_id/skill_id`, with
   workflows and Review presented as normal skill cards.
10. Documentation can switch between English and Chinese without changing the
    product UI and follows the complete six-document order.
11. Production playbooks and Skill-backed Hots scenarios provide editable,
    reusable starting points.
12. The prompt editor grows with stacked or wrapped content, and empty-state
    suggestions hide as soon as non-whitespace input exists.

## 17. Change Log

| Version | Date | Description |
| --- | --- | --- |
| v1.4 | 2026-11-04 | Add auto-growing prompt input and empty-state-only suggestions |
| v1.3 | 2026-11-04 | Add production playbooks, Hook control, scenario Skills, and reusable Hots scenarios |
| v1.2 | 2026-11-03 | Align architecture, Skills catalogue, provider limits, UI behavior, bilingual Docs, APIs, and current test baseline |

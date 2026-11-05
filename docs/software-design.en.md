# VideoAgent Software Design

| Attribute | Value |
| --- | --- |
| Document version | v2.0 |
| Updated | 2026-11-04 |
| Backend framework | Python + FastAPI |
| Frontend framework | Next.js + TypeScript |
| Model | Pippit/Seedance 2.5 Draft, Pippit/Seedance 2.5, Pippit/Seedance 2.0 Fast VIP, Pippit/Seedance 2.0 VIP, Pippit/Seedance 2.0 Mini Preview, Pippit/Seedance 2.0 Mini, Pippit/Wan 3.0, Pippit/HappyHorse 1.1, Kling/Kling Video 2.5, Kling/Kling Video 2.6, Kling/Kling Video O1, Kling/Kling Video 3.0, Kling/Kling Video 3.0 Omni, Kling/Kling Video 3.0 Turbo, Kling/Kling Video 4.0, Kling/Kling 2.6 Motion Control, Kling/Kling 3.0 Motion Control, Kling/Kling Image 3.0 Omni, Kling/Kling Image O1, Kling/Kling Image 3.0, Kling/Kling Image 2.1 |

VideoAgent integrates Pippit CLI and the China-region Kling CLI behind one
provider boundary. Pippit provides video submission, task queries, and credits.
Kling CLI provides
text-to-video, image-to-video, motion control, and multimodal reference tools.

## 1. Purpose

This document describes VideoAgent's product architecture, core modules,
directing workflow, data model, API contracts, provider integrations, security,
testing, and deployment.

## 2. Product Overview

VideoAgent is a director-oriented AI video workspace. The public navigation
contains five isolated views:

- **Agents:** home creation composer and VideoAgent conversations.
- **Skills:** one searchable catalogue of generation, workflow, and review skills.
- **Assets:** a waterfall library of the user's videos and skills with
  permission and edit time; videos preview on hover and skills have no cover.
- **Hots:** community feed with author, likes, playback, and publishing.
- **Docs:** embedded bilingual documentation with a collapsible table of contents.

## 3. Scope

### 3.1 Product Baseline

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
- Kling China-region CLI text-to-video, motion control, and multimodal
  reference capabilities.
- Mock Provider and Celery polling.
- Instant storyboard review for consistency, coverage, clarity, and pacing.
- Hots feed playback, author, likes, and publishing.
- English and Chinese documentation generated from paired Markdown sources.
- Project-level image, video, and audio uploads with MIME, signature, and size validation.
- FFmpeg composition with 16:9, 9:16, and 1:1 deliveries, covers, captions, and soundtracks.
- Time-limited share links with private/public permissions, expiry, revocation, and access counts.
- Per-user VideoAgent credit accounts with reservation and idempotent refunds.
- An administration console for users, credits, jobs, invites, launch controls,
  Provider state, and audit logs.

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
Next.js Route Handler /api/account/*
  → FastAPI /api/v1
      ├── Auth / Projects / Storyboards
      ├── Agent / Generation / Evaluation / Providers
      ├── Assets / Delivery / Credits
      ├── SQLAlchemy Async
      ├── LangGraph
      ├── FFmpeg
      ├── Pippit CLI
      └── Kling China CLI

Celery Worker + Redis
  → Pippit / Kling task status
```

## 6. Technology Stack

| Area | Current technology |
| --- | --- |
| Web | Next.js 16 App Router, React 19, TypeScript 5.9 |
| UI | Tailwind CSS 4, Lucide, shared Landing CSS |
| Localization | next-intl routing and translation resources |
| Client state | React page state |
| API | FastAPI, Uvicorn, Pydantic v2 |
| Agent | LangGraph, LangChain OpenAI-compatible provider |
| Database | SQLAlchemy 2 Async, SQLite |
| Jobs | Celery with Redis |
| Video providers | Pippit CLI, Kling China CLI, Mock Provider |
| Media | FFmpeg, local filesystem storage |
| Testing | pytest, Vitest, Testing Library, Playwright |
| Quality | Ruff, mypy, TypeScript |

## 7. Agent Design

The directing workflow uses an explicit LangGraph state machine:

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

Project, conversation, storyboard, Character, Shot, and GenerationJob state live in the
database. Approval, generation, review, and polling boundaries are coordinated
through FastAPI, Celery, and the workspace client.

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
  → Celery polling

GET /jobs/{id}
  → VideoProvider.status when not terminal
  → update GenerationJob and Shot
```

The `VideoProvider` protocol exposes `estimate`, `submit`, and `status`.

### 8.1 Pippit CLI

The service runs `pippit-tool-cli` through argument arrays and does not use
shell string interpolation. Current commands include:

```text
status
get-credit-balance
generate-video
query-result
```

The server owns CLI authorization. Provider billing uses the configured server
account, while each product user consumes an independent VideoAgent credit
balance through `/credits`. Access keys and CLI session files never reach the
browser.

### 8.2 Kling China CLI

Kling uses the server-owned `@klingai/cli-cn` package and its China-region
endpoints. The CLI owns OAuth, MCP transport, and tool validation. The provider
adapter maps `generationId`, task state, errors, and result URLs into the shared
`VideoProvider` contract. `VIDEOAGENT_KLING_EXPECTED_USER_ID` verifies the
authorized account.

## 9. Skills Catalogue

Skills use one flat, searchable catalogue. Every card shows its
`user_id/skill_id` identifier at the upper left. Provider-native capabilities
use the provider namespace, such as `kling`; cross-provider workflows and
product-level Skills use `video_agent`.

| Skill ID | Input and result |
| --- | --- |
| `video_agent/search_all_resources` | Search projects, videos, skills, Hots, and Docs |
| `kling/text_to_video` | Text prompt to one video clip |
| `kling/image_to_video` | Still image to controlled motion |
| `kling/reference_to_video` | Image, video, or audio references to a generated clip |
| `kling/first_last_frame` | Opening and closing frames to a continuous transition |
| `kling/motion_control` | Driving-video motion applied to a subject image |
| `kling/video_extend` | Continue an existing clip |
| `kling/video_edit` | Prompt-directed modification of existing footage |
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

Review uses the same task-oriented card structure as other Skills.

Selecting a skill preloads a concrete prompt in the Agents composer. The
Agents composer also includes a Skill selector. Signed-in users can publish a
skill under their own `<user_id>/<skill_id>` namespace.

The Model selector uses the verified live catalogue: seven Kling video models
and eight Pippit video models, plus Auto. Options use `Provider/Model` naming
so users can distinguish model families.

The Agents composer includes production playbooks for product ads, creator
vlogs, micro drama, music videos, localization, and batch variants. Selecting a
playbook sets the prompt, Skill, Hook, style, frame, duration, and review mode
as one coherent starting point. Playbooks use toggle behavior: selecting the
active playbook again restores the pre-playbook draft. Hook controls the
first-three-second strategy: visual impact, narrative twist, spoken hook,
sound cue, or proof first.

## 10. Data Model

| Table | Purpose |
| --- | --- |
| `users` | Account, password hash, and locale preference |
| `sessions` | Hashed server-side session tokens |
| `projects` | Project metadata and owner |
| `storyboards` | One current storyboard per project |
| `characters` | Ordered recurring roles, descriptions, and reusable image prompts |
| `shots` | Ordered prompts, duration, frame, mode, and status |
| `conversations` | One conversation per project |
| `messages` | User and assistant messages |
| `workspace_folders` | Project folders for conversation organization |
| `workspace_folder_items` | Conversation-to-folder filing |
| `project_workflows` | Concept, outline, script, and generation approval state |
| `user_skills` | Published Skill instructions, prompt template, and I/O contracts |
| `hots_posts` | Community video publication and metadata |
| `generation_jobs` | Provider task, idempotency key, status, result |
| `provider_connections` | Provider authorization metadata |
| `oauth_flows` | OAuth transaction state |
| `credit_accounts` | Per-user VideoAgent balance |
| `credit_entries` | Idempotent reservation and refund ledger |
| `assets` | Uploads, generated clips, deliveries, covers, and ownership |
| `share_links` | Hashed tokens, expiry, revocation, and access count |
| `platform_settings` | Generation switch and registration policy |
| `invite_codes` | Hashed invite codes, expiry, and usage limits |
| `admin_audit_logs` | Administrative action trail |

## 11. API Surface

Base path: `/api/v1`

| Area | Endpoints |
| --- | --- |
| Health | `GET /health` |
| Auth | Register, login, logout, current user |
| Projects | List, create, read, rename, archive |
| Storyboards | `GET` and `PUT /projects/{id}/storyboard` |
| Storyboard order | `PATCH /projects/{id}/storyboard/order` |
| Character image | `POST /characters/{id}/estimate`, `/assets`, and `/generate` |
| Agent | Get messages, send a message |
| Workspace | Folders, recent conversations, and drag-to-file conversation organization |
| Workflow | Read and decide concept, outline, and script approval stages |
| Skills | List and persist user Skills; optimize rough ideas into structured drafts |
| Hots | Upload MP4 posts, list community videos, and stream public content |
| Evaluation | `POST /projects/{id}/evaluate` |
| Generation | Estimate, submit, job status |
| Providers | Pippit status and credits |
| Credits | `GET /credits` |
| Assets | List, upload, and content download |
| Delivery | Export, share, revoke, and public share content |
| Administration | Overview, users, credits, jobs, refunds, invites, settings, and audit |

Agent responses and job status use regular JSON with polling.

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
- The muted video carousel is a persistent, translucent backdrop across Agents,
  Skills, Hots, Assets, Docs, and conversation views.
- Viewport-aware composer menus that flip above the trigger when needed, plus
  downward-opening language, notification, account, and search menus.
- Avatar account actions for login, registration, and sign-out.
- An isolated `/admin` control room for internal operations.
- Reference uploads, delivery downloads, cover preview, and share-link creation
  in the project workspace.
- Video-shot generation stays disabled until the staged story workflow is
  approved, and the shot inspector shows that requirement inline.
- A collapsible conversation history with Projects and Recents, plus drag-to-file
  organization. Both groups are visible before sign-in and when empty.
- Project folders expose the disclosure control before a blue folder icon.
  Filed conversations move out of Recents and render as indented children of
  their project folder.
- An IDE-style three-part canvas: `Direction` and `Vision` resources, the selected
  editor document or asset, and the approval-driven Agents panel.
- The Assets and Agents side panels can collapse to labeled rails. Their widths
  use responsive clamped proportions so they remain usable across desktop sizes.
- `Direction` contains `Settings`, `Outlines`, and `Scripts`. `Vision` contains
  `Characters`, `Shots`, and `Final Cut`. Every persisted Character and Shot owns
  a Description page and a Generation page; empty directories render no waiting
  copy.
- Skill Studio persists reusable Skills with a stable namespace, instructions,
  quality gates, prompt template, and input/output contracts. `AI optimize`
  turns an early idea into that structure.
- The built-in `video_agent/skill_synthesis` Skill opens Skill Studio directly
  to help authors compose new Skills.
- The app navigation collapses from a control beside the VideoAgent brand into an
  icon-only left rail while the remaining content fills the space. Projects and
  chronological Recents live below the Docs divider, are expanded by default,
  and remain collapsible.
- Conversations use only the `/en#conversation/{project_id}` hash view, preserve
  the mounted application shell, and highlight the matching history item.
- The Projects row opens the project creation form, while the Recents row
  starts a new Agents conversation. Both rows provide disclosure controls.
- Hots publishing requires an MP4 upload and persists the video as a public
  asset. The author's Assets view lists real Hots videos and Skills, and every
  card opens a detail dialog.
- The editor pane uses its own compact header. Review and Share are aligned at
  its far right; no page-level project title bar is rendered. Review shows the
  overall score directly after evaluation.
- Review is evaluated automatically when the storyboard changes. The current
  score remains visible, with a separate refresh control that re-runs evaluation
  without opening the detail dialog. Review and refresh share one framed control.
- Only a newly returned Agent reply uses type-on presentation. Persisted history
  and completed replies render as static text, including after a panel is
  collapsed and reopened.
- Docs occupies the full content area beside the navigation rail without
  overlapping it; its embedded document uses the same persistent backdrop.
- Workspace text never renders smaller than button text, and authentication
  pages use the same dark visual system as the product.
- Active navigation and asset icons invert outline and fill: inactive icons are
  transparent inside with a blue stroke; active icons are blue-filled with a
  transparent stroke.
- Navigation, project folders, and conversation items share one type scale.
  Projects, Recents, and conversation items are text-only; dates, counts, and
  empty-state copy are not rendered.
- History lists use a thin blue scrollbar with a transparent track.
- Assets, editor, and Agents scrolling surfaces use the same thin blue scrollbar
  treatment as Projects and Recents.

The project workspace progresses through overall direction, episode and shot
outline, scene script, and generation-ready states. Each transition requires an
explicit user decision. Refinement and custom instructions remain on the current
stage.

## 13. Documentation Language

- The globe button beside notifications controls documentation language.
- English documents are generated as `*.html`.
- Chinese documents are generated as `*.zh.html`.
- Document tabs are `PRD`, `Playbook`, `Arch`, `API`, `Dev`, `Test`, `Ops`, `FAQ`,
  and `TODO`.

## 14. Security and Reliability

- Session cookies are HttpOnly and SameSite=Lax.
- Cross-user resources return `404`.
- Provider commands use argument arrays and timeouts.
- Generation submissions use database idempotency keys.
- The database is the source of truth for project, shot, and job state.
- Same-origin validation protects cookie-authenticated writes.
- Auth, generation, and upload requests use separate rate-limit buckets.
- Uploaded media is validated by declared MIME, signature, and size.
- Share tokens are stored as hashes and support expiry, revocation, and access
  accounting.
- Administrative APIs require an email in `VIDEOAGENT_ADMIN_EMAILS`.
- Disabling an account revokes its existing sessions.
- Generation checks the runtime kill switch before estimation and submission.

## 15. Deployment

Local development:

```text
Next.js :3000
FastAPI :8000
SQLite
Pippit CLI or Kling China CLI
Celery + Redis
```

## 16. Acceptance Baseline

1. Users can create, rename, and archive their own projects.
2. VideoAgent creates a validated multi-shot storyboard.
3. Cost and approval are visible before generation.
4. Jobs and storyboards survive a page refresh or API restart.
5. Provider credentials never reach the browser.
6. Review returns consistency, coverage, clarity, and pacing.
7. Skills is a flat searchable catalogue using `user_id/skill_id`, with
   workflows and Review presented as normal skill cards.
8. Documentation switches between English and Chinese and follows the complete
   nine-document order.
9. Production playbooks and Skill-backed Hots scenarios provide editable,
    reusable starting points.
10. The prompt editor grows with stacked or wrapped content, and empty-state
    suggestions hide as soon as non-whitespace input exists.
11. Playwright uses the Mock Provider to complete registration, creation,
    upload, generation, export, download, and sharing without paid credits.
12. User credits are reserved before submission and refunded idempotently when
    submission, generation, or cancellation ends without a usable result.
13. Administrators can manage accounts, credits, invites, and generation state,
    with every mutation recorded in the audit log.

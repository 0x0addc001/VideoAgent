# VideoAgent Testing and TDD

| Attribute | Value |
| --- | --- |
| Document version | v2.4 |
| Updated | 2026-11-04 |
| Frameworks | pytest, Vitest, Testing Library, Playwright |

## 1. Purpose

This document defines the automated test strategy, contracts, quality gates,
and acceptance checks for the VideoAgent system.

## 2. TDD Rules

1. Add one failing behavior test.
2. Implement the smallest change that passes.
3. Refactor without changing public behavior.
4. Run all relevant quality gates before commit.

Tests assert public behavior, API contracts, ownership, state transitions, and
user-visible outcomes rather than private implementation details.

## 3. Test Layers

```text
Unit and component tests
  → Provider and API contract tests
  → SQLite integration tests
  → Playwright and Mock Provider browser E2E
```

External paid generation is never part of normal CI.

## 4. Coverage

Backend:

- Password hashing and session behavior.
- Project ownership, rename, and archive.
- Storyboard replacement and versioning.
- Agent planning with deterministic and fake LLM behavior.
- Mock, Pippit, and Kling Provider contracts.
- Estimate, approval, idempotency, and job status.
- Provider status and credits.
- Health endpoint.
- Instant storyboard evaluation.
- Media MIME, signature, size, and ownership validation.
- FFmpeg composition, delivery, cover generation, sharing, expiry, and revocation.
- User credit reservation, failure refunds, and idempotent ledger entries.
- Same-origin write validation and authentication rate limiting.
- Administrator email allowlists and non-admin denial.
- User disablement, session revocation, and credit adjustment.
- Invite creation, consumption, revocation, and registration modes.
- Generation kill switch, job refunds, and audit logs.
- China-region Kling CLI submission, status mapping, identity, and credits.

Frontend:

- Shared landing structure and navigation.
- Sequenced and looping hero headline.
- Search composer and custom settings dropdowns.
- Project creation flow.
- Assets, Hots, and Docs view switching.
- Assets permission, date, hover preview, and cover behavior.
- Hots author, likes, playback, and publishing.
- English-to-Chinese Docs switching.
- Project list, authentication form, and project workspace.
- Project uploads, film export, MP4 download, and share-link creation.
- Administration console loading, settings changes, and denied access.

## 5. Provider Contract Tests

Every `VideoProvider` verifies:

- Provider name is stable.
- Estimate returns normalized credits and duration.
- Submit returns a stable task reference.
- Status maps to `pending`, `submitted`, `queued`, `running`, `succeeded`,
  `failed`, or `cancelled`.
- Errors do not expose credentials or full sensitive command arguments.
- The same idempotency key does not submit twice.

Pippit tests use a local fake CLI and cover status, credits, submit, query,
timeout, missing binary, invalid JSON, and missing task IDs. Kling tests use a
fake MCP client and cover text-to-video, image-to-video, motion control,
task-state mapping, and result extraction.

## 6. API Tests

Required assertions:

- Authentication and ownership.
- Response status and schema.
- Stable error codes.
- Explicit generation approval.
- Idempotency behavior.
- Storyboard replacement ordering.
- Shot IDs, generated assets, and history remain intact after reordering.
- Agent message persistence.
- Evaluation result shape.
- No provider credentials in responses.

## 7. Frontend Tests

Component tests cover:

- Left navigation with isolated views.
- Custom dropdown rendering and selection.
- Action button enabled and disabled states.
- Hots metadata order: title above author and likes.
- Every Hots card contains an autoplaying muted looping video.
- Publish entry uses the blue play icon.
- Skills is one searchable catalogue with `user_id/skill_id` labels;
  provider-native capabilities use the provider namespace.
- Production playbooks fill the prompt and recommended Skill, Hook, style,
  frame, duration, and review settings.
- Re-clicking the active playbook restores the prior composer state.
- Hots scenario cards open Agents with the corresponding Skill and prompt.
- The textarea grows with multiline content, and idea suggestions disappear
  while the prompt contains non-whitespace text.
- The Model selector includes every available Kling and Pippit video model in
  `Provider/Model` format.
- Docs labels are `PRD`, `Playbook`, `Arch`, `API`, `Dev`, `Test`, `Ops`, `FAQ`,
  and `TODO`.
- Globe control changes Docs source and language.
- Skills, Hots, Assets, and Docs search controls stay pinned while content
  scrolls.
- Assets switches between Video and Skill tabs without repeating type labels.
- Video assets preview on hover; Skill assets have no cover.
- Composer menus stay inside the viewport.
- Conversation history shows Projects and Recents; folders support creation,
  rename, deletion, and drag-to-file organization.
- Stage approval options cover overall direction, episode and shot outline, and
  scene script; custom instructions keep the current stage.
- Shot estimation and generation remain disabled until the script is approved.
- Skill Studio captures purpose, instructions, quality gates, starter prompt,
  and input/output contracts.
- AI optimization converts a rough idea into a structured draft, and saved
  Skills reload from the server.
- `video_agent/skill_synthesis` opens Skill Studio directly.
- The app navigation collapses to an icon-only rail, and signed-in Agents views
  list recent conversations.
- Hots publishing requires an MP4 and the post appears in the author's Assets.
- Assets video and Skill cards open detail dialogs, with video playback.
- Workflow approvals advance immediately, and Agent language follows the
  project brief and user prompt.
- Login and registration use the same dark visual language as the product.
- Projects opens the project form from its plus action; Recents starts a new
  Agents conversation; both groups remain collapsible.
- Pippit normalizes sub-four-second requests and surfaces provider failures
  while refunding reserved credits.
- Search, language, notifications, credits, and avatar controls use
  translucent surfaces.
- Avatar opens login and registration when signed out and sign-out when signed in.
- API starts with its metadata table.
- FAQ and TODO have paired English and Chinese documents.

Playwright uses the real Next.js UI, FastAPI service, SQLite, and Mock Provider
to verify:

```text
register → home prompt → create project → three approvals → select shot → upload
→ estimate → generate → poll/materialize → export → download → share
```

An additional no-fee Skill flow verifies:

```text
register → Skills → rough idea → AI optimize → publish → reload
```

The no-fee Hots and Assets flow is:

```text
register → Hots → upload MP4 → publish → Assets → open details and play
```

This flow never calls a paid Provider and is a required Pull Request gate.

The administration E2E covers administrator sign-in, console loading, and
generation pause. Backend integration tests cover non-admin `403` responses,
credit adjustments, account disablement, invite registration, and audit logs.

## 8. Responsive and Accessibility Checks

- Keyboard access for navigation, dropdowns, Docs, and dialogs.
- Visible focus states.
- Sufficient text size and contrast.
- Reduced-motion support.
- Desktop sidebar and mobile navigation remain usable.
- Long English and Chinese text do not overlap.

## 9. CI Gates

Pull requests must pass:

```text
Ruff check and formatting
mypy strict checks
pytest
Vitest
TypeScript check
Next.js production build
Docs and static artifact build
Playwright with Mock Provider E2E
secret and dependency scans
```

## 10. Provider Verification

### Read-only

1. Install and authenticate `pippit-tool-cli`.
2. Run `status` and `get-credit-balance`.
3. Query `/providers/pippit` and `/providers/pippit/credits`.
4. Verify logs omit access keys.
5. Verify China-region Kling CLI `who_am_i` confirms authorization, account
   region, and model discovery.

### Authorized paid generation

Only with explicit user approval and budget:

1. Record starting credits.
2. Submit one minimal task.
3. Verify the idempotency key and Provider task reference.
4. Poll to completion.
5. Record result, credits, and UI/API consistency.
6. Do not automatically retry an uncertain submission.

## 11. Definition of Done

- Tests were written before implementation or alongside a documented
  regression case.
- Relevant local tests pass.
- Ruff, mypy, TypeScript, Next build, and Docs build pass.
- No secrets, local databases, or generated media are committed.
- API and UI documentation are updated when behavior changes.
- Paid Provider tests remain opt-in.

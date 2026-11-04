# VideoAgent Testing and TDD

| Attribute | Value |
| --- | --- |
| Document version | v2.0 |
| Updated | 2026-11-04 |
| Frameworks | pytest, Vitest, Testing Library |
| Related design | `software-design.en.md` |

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
  → browser component tests
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
- Skills is one searchable catalogue with `user_id/skill_id` labels.
- Production playbooks fill the prompt and recommended Skill, Hook, style,
  frame, duration, and review settings.
- Re-clicking the active playbook restores the prior composer state.
- Hots scenario cards open Agents with the corresponding Skill and prompt.
- The textarea grows with multiline content, and idea suggestions disappear
  while the prompt contains non-whitespace text.
- The Model selector includes every available Kling and Pippit video model.
- Docs labels are `PRD`, `Design`, `Interface`, `Impl`, `Test`, `Ops`, `FAQ`,
  and `TODO`.
- Globe control changes Docs source and language.
- Skills, Hots, Assets, and Docs search controls stay pinned while content
  scrolls.
- Assets switches between Video and Skill tabs without repeating type labels.
- Video assets preview on hover; Skill assets have no cover.
- Composer menus stay inside the viewport.
- Search, language, notifications, credits, and avatar controls use
  translucent surfaces.
- Avatar opens login and registration when signed out and sign-out when signed in.
- Interface starts with its metadata table.
- FAQ and TODO have paired English and Chinese documents.

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
secret and dependency scans
```

## 10. Provider Verification

### Read-only

1. Install and authenticate `pippit-tool-cli`.
2. Run `status` and `get-credit-balance`.
3. Query `/providers/pippit` and `/providers/pippit/credits`.
4. Verify logs omit access keys.
5. Verify Kling MCP `who_am_i` confirms authorization and model discovery.

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

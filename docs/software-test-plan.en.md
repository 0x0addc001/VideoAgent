# VideoAgent Testing and TDD

| Attribute | Value |
| --- | --- |
| Document version | v1.1 |
| Updated | 2026-11-04 |
| Current frameworks | pytest, Vitest, Testing Library |
| Target E2E framework | Playwright |

## 1. Purpose

This plan defines how VideoAgent tests current behavior and how planned
capabilities will be validated. A target test is not evidence that the feature
is already implemented.

## 2. TDD Rules

1. Add one failing behavior test.
2. Implement the smallest change that passes.
3. Refactor without changing public behavior.
4. Run all relevant quality gates before commit.

Tests assert public behavior, API contracts, ownership, state transitions, and
user-visible outcomes rather than private implementation details.

## 3. Test Pyramid

```text
Unit and component tests
  → Provider and API contract tests
  → SQLite integration tests
  → target infrastructure tests
  → target Playwright E2E
```

External paid generation is never part of normal CI.

## 4. Current Coverage

Backend:

- Password hashing and session behavior.
- Project ownership, rename, and archive.
- Storyboard replacement and versioning.
- Agent planning with deterministic and fake LLM behavior.
- Mock and Pippit Provider contracts.
- Estimate, approval, idempotency, and job status.
- Provider status and credits.
- Health endpoint.
- Instant storyboard evaluation.

Frontend:

- Shared landing structure and navigation.
- Sequenced and looping hero headline.
- Search composer and custom settings dropdown.
- Project creation flow.
- Assets, Hots, and Docs view switching.
- Assets status, updated time, duration, summary, and playable preview.
- Hots author, likes, playback, and session-local publish.
- English-to-Chinese Docs switching.
- Project list, authentication form, and project workspace.

Current baseline: 35 backend tests and 19 frontend tests.

## 5. Target Coverage

- Asset upload validation and ownership.
- Streaming Agent responses and SSE recovery.
- Local, PostgreSQL, Redis, MinIO, and Celery integration.
- FFmpeg composition and export.
- Public share creation, expiry, and revocation.
- Persistent Hots posts and likes.
- Playwright flows for the English product.
- Future full Chinese product UI, if it is re-enabled.

## 6. Provider Contract Tests

Every `VideoProvider` must verify:

- Provider name is stable.
- Estimate returns normalized credits and duration.
- Submit returns a stable task reference.
- Status maps to `pending`, `submitted`, `queued`, `running`, `succeeded`,
  `failed`, or `cancelled`.
- Errors do not expose credentials or full sensitive command arguments.
- The same idempotency key does not submit twice.

Pippit-specific tests use a local fake CLI and cover status, credits, submit,
query, timeout, missing binary, invalid JSON, and missing task IDs.

## 7. API Tests

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

## 8. Frontend Tests

Current component tests should continue to cover:

- One shared Landing component for product and project homepage.
- Left navigation with isolated views.
- No duplicate navigation icons.
- Custom dropdown rendering and selection.
- Action button enabled and disabled states.
- Hots metadata order: title above author and likes.
- Every Hots card contains an autoplaying muted looping video.
- Publish entry uses the blue play icon.
- Skills is one searchable catalogue with `user_id/skill_id` labels and a
  normal Review card.
- Docs labels are `PRD`, `Design`, `Interface`, `Impl`, `Test`, and `Ops`.
- Globe control changes only Docs source and language.
- Skills, Hots, Assets, and Docs search controls stay pinned while content
  scrolls.
- Assets switches between Video and Skill tabs without repeating type labels.
- Video assets preview on hover and pause on leave; Skill assets have no cover.
- Search, language, notifications, credits, and avatar controls use translucent
  surfaces and open their menus downward.
- Avatar opens login and registration when signed out and sign-out when signed in.

## 9. Responsive and Accessibility Checks

- Keyboard access for navigation, dropdowns, Docs, and dialogs.
- Visible focus states.
- Sufficient text size and contrast.
- Reduced-motion support.
- Desktop sidebar and mobile navigation remain usable.
- Long English and Chinese text do not overlap.

## 10. CI Gates

Pull requests must pass:

```text
Ruff check and formatting
mypy strict checks
pytest
Vitest
TypeScript check
Next.js production build
GitHub Pages and Docs build
secret and dependency scans
```

Target gates:

- Playwright E2E.
- PostgreSQL/Redis/MinIO integration.
- Alembic migration tests.
- OpenAPI client consistency.

## 11. Real Pippit Testing

### Read-only

1. Install and authenticate `pippit-tool-cli`.
2. Run `status` and `get-credit-balance`.
3. Query `/providers/pippit` and `/providers/pippit/credits`.
4. Verify logs omit access keys.

### Authorized paid generation

Only with explicit user approval and budget:

1. Record starting credits.
2. Submit one minimal task.
3. Verify the idempotency key and Provider task reference.
4. Poll to completion.
5. Record result, credits, and UI/API consistency.
6. Do not automatically retry an uncertain submission.

## 12. Definition of Done

- Tests were written before implementation or alongside a documented
  regression case.
- Relevant local tests pass.
- Ruff, mypy, TypeScript, Next build, and Pages build pass.
- No secrets, local databases, or generated media are committed.
- API and UI documentation are updated when behavior changes.
- Paid Provider tests remain opt-in.

## 13. Change Log

| Version | Date | Description |
| --- | --- | --- |
| v1.1 | 2026-11-04 | Align current 35/19 baseline, Skills, Hots, Assets, bilingual Docs, and target tests |

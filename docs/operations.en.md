# VideoAgent Operations Strategy

| Attribute | Value |
| --- | --- |
| Document version | v2.3 |
| Updated | 2026-11-05 |
| Scope | Skills, Videos, Assets, providers, support, metrics |

## 1. Operating Model

VideoAgent operates three content layers:

1. Provider-native Skills and cross-provider workflows under their respective
   `kling`, `pippit`, or `video_agent` namespaces.
2. User-published Skills and Videos entries.
3. Project outputs stored in Assets.

## 2. Release Readiness

- Complete authentication and credit-usage acceptance.
- Verify Pippit CLI authorization and Kling China-region CLI OAuth.
- Publish PRD, Playbook, Arch, API, Dev, Test, Ops, FAQ, and TODO.
- Verify English and Chinese Docs switching.
- Verify project creation, storyboard planning, generation approval, and job
  polling with the configured provider.
- Verify upload, generated-result materialization, FFmpeg delivery, download,
  and share revocation.
- Verify per-user credit reservation, failure refunds, and Provider-account
  reconciliation.
- Run Playwright with the Mock Provider as a no-fee end-to-end release gate.
- Confirm provider credentials never appear in browser bundles, logs, or API
  responses.
- Configure `VIDEOAGENT_ADMIN_EMAILS` and verify at least one administrator can
  sign in.

## 3. Official Skill Operations

- Provider-native capabilities use their provider namespace, such as `kling`;
  cross-provider workflows use `video_agent`.
- Skill IDs are stable, lowercase, and underscore-separated.
- Every Skill states its input, output, provider dependency, and credit impact.
- Skill changes update PRD, Playbook, Arch, and Test.
- Deprecated Skills remain listed for one release with a migration note.
- Scenario playbooks reference current Skills and stay aligned with composer
  fields.
- External Agent handoff uses an explicit MCP or CLI contract.

### 3.1 Skill and Videos Leaderboards

- Skills use six categories: Generation, Story, Workflow, Post, Review, and
  Utility. Videos uses Vlog, Product, Drama, Music, Localization, and Campaign.
- Category filters change the visible subset without changing overall rank.
  Skills can sort by combined signal, uses, likes, or recency; Videos can sort by
  likes or recency.
- Skill score is `unique account uses × 2 + unique account likes × 3`. Videos
  ranks by unique account likes. Ties compare likes, uses, then update time.
- One account contributes at most one like or use signal per item. Authors
  cannot like their own content.
- The Skills top three display 500, 300, and 150 credit rewards. The Videos top
  three display 300, 180, and 100. Campaign duration, budget, and final
  eligibility are configured per operating cycle.
- Rewards are issued through audited administrator credit adjustments. The
  client leaderboard is a projection and is not an authorization to pay.
- For suspected manipulation, pause settlement, review accounts, timestamps,
  devices, and publication history, remove confirmed invalid interactions, and
  retain the operating audit trail.

## 4. Asset Operations

- Assets contains only the current user's work.
- Public and private permissions are explicit.
- Edit dates use `yyyy-mm-dd`.
- Video assets preview on hover; Skill assets have no cover.
- Video and Skill use internal tabs rather than repeated type labels.
- Uploaded and delivered assets are user-scoped. Share links are time-limited
  by default and can be revoked.
- Check Asset, share-link, and project references before deleting media.

## 5. Provider and Cost Operations

- Pippit CLI and Kling China-region CLI are available through the provider boundary.
- Billable generation requires explicit user approval.
- Provider submission uses database idempotency keys.
- Credits and provider status are read server-side.
- The product displays each user's VideoAgent quota instead of the shared
  Provider account pool.
- Generation reserves user credits before submission and refunds them
  idempotently after submit failure, job failure, or cancellation.
- Monitor provider errors, timeout rate, uncertain submissions, and duplicate
  protection.
- Preserve provider task references for reconciliation.

### 5.1 Administration Console

- Administration URL: `/en/admin`.
- Keep new-user credits at zero for launch and grant them through user
  administration.
- Use invite mode before opening registration; switch to closed mode during an
  incident.
- Pause generation before investigating Provider, billing, or security issues.
- Failed, cancelled, and uncertain jobs can be refunded idempotently by Job ID.
- Account, credit, invite, and settings mutations are recorded in the audit log.
- The administrator allowlist is environment-owned and requires an API restart
  after changes.

## 6. Release Procedure

1. Run backend tests, frontend tests, Playwright E2E, type checks, builds, and
   Docs generation.
2. Check secret scanning and dependency security results.
3. Confirm provider status and credit balance without spending credits.
4. Validate English and Chinese Docs, search, navigation, and responsive layout.
5. Record the release commit.

## 7. Monitoring

- Registration and login success rate.
- Project creation success rate.
- Storyboard generation success and latency.
- Generation approval-to-submit conversion.
- Provider success, failure, timeout, and uncertain-submit rate.
- Duplicate generation prevented by idempotency.
- Credit consumption per project.
- Reservations, refunds, and unresolved credit holds.
- Upload rejection rate, export latency, and share access or revocation counts.
- Docs search usage and broken document links.

## 8. Support

Support triage order:

1. Authentication and session failures.
2. Provider unavailable or authorization failures.
3. Credit and billing anomalies.
4. Job state or duplicate submission concerns.
5. Search, Docs, and navigation defects.
6. Visual and copy issues.

Support never asks users for access keys, cookies, or CLI session files.

## 9. Incident Response

- Disable billable generation before retrying an uncertain provider incident.
- Preserve job records and provider task references.
- Roll back the web release independently from provider credentials.
- Publish a status note with affected areas and mitigation.
- Review billing, duplicate jobs, cross-user access, and audit evidence.
- Revoke exposed share tokens immediately and inspect anomalous access counts.
- For suspicious registration or credit use: pause generation, close
  registration, disable accounts, and inspect jobs plus audit logs.

## 10. Success Metrics

- Activation: first project created within the first session.
- Creation: successful storyboard within five minutes.
- Final Cut review: percentage of exported films with a completed visual evaluation.
- Reliability: generation jobs reaching a terminal state.
- Cost: credit usage per completed project.
- Content: Skill category distribution, unique likes, unique uses,
  leaderboard conversion, Videos unique likes, and campaign reward cost.
- Documentation: search success and zero broken bilingual links.

# VideoAgent Operations Strategy

| Attribute | Value |
| --- | --- |
| Document version | v2.0 |
| Updated | 2026-11-04 |
| Scope | Skills, Hots, Assets, providers, support, metrics |

## 1. Operating Model

VideoAgent operates three content layers:

1. Official Skills under the `video_agent` namespace.
2. User-published Skills and Hots entries.
3. Project outputs stored in Assets.

## 2. Release Readiness

- Complete authentication and credit-usage acceptance.
- Verify Pippit CLI authorization and Kling MCP OAuth.
- Publish PRD, Design, Interface, Impl, Test, Ops, FAQ, and TODO.
- Verify English and Chinese Docs switching.
- Verify project creation, storyboard planning, generation approval, and job
  polling with the configured provider.
- Confirm provider credentials never appear in browser bundles, logs, or API
  responses.

## 3. Official Skill Operations

- Official user namespace: `video_agent`.
- Skill IDs are stable, lowercase, and underscore-separated.
- Every Skill states its input, output, provider dependency, and credit impact.
- Skill changes update PRD, Design, and Test.
- Deprecated Skills remain listed for one release with a migration note.
- Scenario playbooks reference current Skills and stay aligned with composer
  fields.
- External Agent handoff uses an explicit MCP or CLI contract.

## 4. Asset Operations

- Assets contains only the current user's work.
- Public and private permissions are explicit.
- Edit dates use `yyyy-mm-dd`.
- Video assets preview on hover; Skill assets have no cover.
- Video and Skill use internal tabs rather than repeated type labels.

## 5. Provider and Cost Operations

- Pippit CLI and Kling MCP are available through the provider boundary.
- Billable generation requires explicit user approval.
- Provider submission uses database idempotency keys.
- Credits and provider status are read server-side.
- Monitor provider errors, timeout rate, uncertain submissions, and duplicate
  protection.
- Preserve provider task references for reconciliation.

## 6. Release Procedure

1. Run backend tests, frontend tests, type checks, builds, and Docs generation.
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

## 10. Success Metrics

- Activation: first project created within the first session.
- Creation: successful storyboard within five minutes.
- Review: percentage of storyboards with at least one evaluation.
- Reliability: generation jobs reaching a terminal state.
- Cost: credit usage per completed project.
- Content: official Skill reuse and community publication rate.
- Documentation: search success and zero broken bilingual links.

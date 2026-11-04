# VideoAgent Operations Strategy

| Attribute | Value |
| --- | --- |
| Document version | v1.1 |
| Updated | 2026-11-04 |
| Scope | Product launch, community, providers, support, metrics |

## 1. Operating Model

VideoAgent is operated as a creator workspace with three content layers:

1. Official Skills maintained under the `video_agent` namespace.
2. User-published Skills and Hots posts.
3. Project-level outputs stored in Assets.

The current public build is a product and documentation preview. Community
publication is session-local until backend persistence and moderation are
implemented.

## 2. Launch Readiness

Before public launch:

- Complete authentication and credit-usage acceptance.
- Verify Pippit CLI authorization on the deployment host.
- Publish the six Docs: PRD, Design, Interface, Impl, Test, Ops.
- Verify English and Chinese Docs switching.
- Verify that project creation, storyboard planning, generation approval, and
  job polling work with the configured provider.
- Confirm no provider credential appears in browser bundles, logs, or API
  responses.

## 3. Official Skill Operations

- Official user namespace: `video_agent`.
- Skill IDs must be stable, lowercase, and underscore-separated.
- Each Skill must state the input, output, provider dependency, and whether it
  consumes credits.
- Review changes require updating the PRD, Design, and Test documents.
- Deprecated Skills remain listed for one release with a migration note before
  removal.
- Scenario playbooks are curated entry points, not separate billing products.
  They must reference current Skills and stay aligned with the composer fields.
- External Agent handoff requires an explicit MCP or CLI integration contract;
  the Skill entry must not imply that credentials or remote execution are
  already active.

## 4. Community Operations

When persistent community support is enabled:

- Require authenticated publication.
- Store `user_id`, `skill_id`, permission, title, description, media reference,
  created time, and edited time.
- Default user content to private until explicitly published.
- Support search by user ID, skill ID, title, description, and author.
- Provide report, hide, restore, and appeal workflows.
- Separate completed videos from reusable Skills in search facets.
- Scenario cards must retain their Skill binding so reuse opens Agents with the
  expected workflow selected.
- Preserve local preview behavior while the API is unavailable.

## 5. Assets Operations

- Assets contains only the current user's work.
- Public and private permissions must be explicit.
- Edit dates use `yyyy-mm-dd`.
- Video assets preview only on hover; Skill assets have no cover.
- Video and Skill assets use distinct internal tabs instead of repeated type labels.
- A future retention policy must define soft-delete, recovery, and storage
  lifecycle rules.

## 6. Provider and Cost Operations

- Pippit is the current default provider.
- Every billable generation requires explicit user approval.
- Provider task submission uses idempotency keys.
- Credits and provider status are read server-side.
- Monitor provider errors, timeout rate, uncertain submissions, and duplicate
  protection.
- Kling MCP capabilities are catalogued in Skills but must not be promoted to
  live execution until credentials, billing, and provider routing are enabled.

## 7. Release Operations

For every release:

1. Run backend tests, frontend tests, type checks, builds, and Docs generation.
2. Verify GitHub Pages and the formal product build.
3. Check secret scanning and dependency security results.
4. Confirm provider status and credit balance without spending credits.
5. Validate English and Chinese Docs, search, navigation, and responsive layout.
6. Record the release commit and known issues.

## 8. Monitoring

Minimum operating metrics:

- Registration and login success rate.
- Project creation success rate.
- Storyboard generation success and latency.
- Generation approval-to-submit conversion.
- Provider success, failure, timeout, and uncertain-submit rate.
- Duplicate generation prevented by idempotency.
- Credit consumption per project.
- Docs search usage and broken document links.
- Community report rate after persistent publishing is enabled.

## 9. Support

Support triage order:

1. Authentication and session failures.
2. Provider unavailable or authorization failures.
3. Credit and billing anomalies.
4. Job state or duplicate submission concerns.
5. Search, Docs, and navigation defects.
6. Visual and copy issues.

Never ask users to provide access keys, cookies, or CLI session files.

## 10. Incident Response

- Disable billable generation before retrying an uncertain provider incident.
- Preserve job records and provider task references.
- Roll back the web release independently from provider credentials.
- Publish a status note with affected product areas and mitigation.
- Perform a post-incident review focused on incorrect billing, duplicate jobs,
  cross-user access, and missing audit evidence.

## 11. Success Metrics

- Activation: first project created within the first session.
- Creation: successful storyboard within five minutes.
- Review: percentage of storyboards with at least one evaluation.
- Reliability: generation jobs reaching a terminal state.
- Cost: credit usage per completed project.
- Content: official Skill reuse and community publication rate.
- Documentation: search success and zero broken bilingual links.

## 12. Change Log

| Version | Date | Description |
| --- | --- | --- |
| v1.1 | 2026-11-04 | Add scenario playbook curation, Skill-backed community reuse, and external Agent handoff boundaries |
| v1.0 | 2026-11-04 | Initial operations strategy for Skills, Hots, Assets, Docs, providers, and releases |

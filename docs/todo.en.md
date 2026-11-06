# VideoAgent TODO

| Attribute | Value |
| --- | --- |
| Document version | v1.1 |
| Updated | 2026-11-04 |
| Policy | Track undelivered capabilities, new requirements, and follow-up enhancements; remove completed items |

## 1. Product and Frontend

| ID | TODO | Acceptance | Priority |
| --- | --- | --- | --- |
| TODO-UI-001 | Add bilingual controls to the product UI | Navigation, composer, workspace, and feedback are fully localized | P1 |
| TODO-UI-002 | Expand production playbooks by industry | Each template defines prompt, Skill, Hook, frame, duration, and review | P1 |
| TODO-UI-003 | Video and audio reference wiring | Pass uploaded video and audio references into the matching Provider generation request | P0 |

## 2. Agent and Directing Workflow

| ID | TODO | Acceptance | Priority |
| --- | --- | --- | --- |
| TODO-AGENT-001 | Intent routing | Create, revise, review, regenerate, and localize requests use distinct paths | P0 |
| TODO-AGENT-002 | Partial shot patches | Editing one shot preserves other shots, versions, and approval state | P0 |
| TODO-AGENT-003 | Scene / sequence / beat data | Scene goals, conflict, and entry/exit state are persisted | P0 |
| TODO-AGENT-004 | Cinematic shot schema | Shot size, angle, lens, movement, performance, gaze, sound, and transitions are structured | P0 |
| TODO-AGENT-005 | Continuity graph | Costume, locations, props, and screen direction are linked and checked across Characters and Shots | P1 |
| TODO-AGENT-006 | Animatic and timeline previz | Users approve rhythm before final shot generation | P1 |
| TODO-AGENT-007 | Multi-node LangGraph with recovery | Story, budget, shot, and cut gates can pause, resume, and remain auditable | P0 |

## 3. Providers and Generation

| ID | TODO | Acceptance | Priority |
| --- | --- | --- | --- |
| TODO-PROVIDER-001 | China-region Kling acceptance | Complete an approved text-to-video, poll, download, and credit reconciliation through the domestic CLI | P0 |
| TODO-PROVIDER-002 | Provider capability discovery | Duration, aspect, audio, reference inputs, and output capabilities are server-discovered | P0 |
| TODO-PROVIDER-003 | Provider cancellation and unified errors | Both providers support cancel, timeout, throttling, and retry classification | P0 |
| TODO-PROVIDER-004 | Automatic routing and fallback | Tasks select models by task, budget, and availability while respecting explicit choice | P1 |
| TODO-PROVIDER-005 | Take management | Each shot stores alternate takes, scores, and selection history | P1 |

## 4. Media and Delivery

| ID | TODO | Acceptance | Priority |
| --- | --- | --- | --- |
| TODO-MEDIA-001 | MinIO/S3 object storage | Move media storage to object storage with lifecycle and signed-access policies | P0 |

## 5. Realtime and Reliability

| ID | TODO | Acceptance | Priority |
| --- | --- | --- | --- |
| TODO-REL-001 | SSE project events | Conversation, shot, and job updates reconnect and reconcile state | P1 |
| TODO-REL-002 | Production Celery deployment | Redis broker, retries, dead-letter queue, reconciliation, and worker recovery | P0 |
| TODO-REL-003 | LangGraph checkpoints | A process restart resumes from the last valid node | P1 |
| TODO-REL-004 | Unified observability | Traces, structured logs, provider latency, and success metrics | P0 |

## 6. Community and Operations

| ID | TODO | Acceptance | Priority |
| --- | --- | --- | --- |
| TODO-COMMUNITY-001 | Persist Videos | Publish, author, likes, permissions, and edit time live in the database | P1 |
| TODO-COMMUNITY-002 | Community moderation | Report, hide, restore, appeal, and audit flows | P1 |
| TODO-COMMUNITY-003 | Persist and version Skills | User Skills can be published, updated, deprecated, and migrated | P1 |
| TODO-COMMUNITY-004 | Data retention | Define soft delete, recovery window, and media lifecycle | P2 |

## 7. Security and Data

| ID | TODO | Acceptance | Priority |
| --- | --- | --- | --- |
| TODO-SEC-002 | Layered rate limits | User, IP, provider, and generation quotas are independent | P0 |
| TODO-SEC-003 | Media decoding and malware checks | Add decode validation and malware scanning on top of file signature, size, and MIME checks | P0 |
| TODO-SEC-004 | Production data services | PostgreSQL, Redis, MinIO, migrations, and integration tests are complete | P0 |
| TODO-SEC-005 | Generated OpenAPI client | Frontend types are generated from OpenAPI and checked in CI | P1 |
| TODO-SEC-006 | Database-backed administrator roles | Role grants, revocations, and least-privilege policy replace the static environment allowlist | P1 |

## 8. Testing and Release

| ID | TODO | Acceptance | Priority |
| --- | --- | --- | --- |
| TODO-QA-002 | Provider contract matrix | Cover unified behavior across Pippit, Kling, and Mock | P0 |
| TODO-QA-003 | Paid generation acceptance | Complete one end-to-end generation with an explicit budget and approval | P0 |
| TODO-QA-004 | Failure exercises | Cover worker interruption, duplicate delivery, SSE reconnect, and download failure | P1 |


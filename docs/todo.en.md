# VideoAgent TODO

| Attribute | Value |
| --- | --- |
| Document version | v1.0 |
| Updated | 2026-11-04 |
| Policy | Undelivered capabilities, new requirements, and follow-up enhancements are tracked here |

## 1. Product and Frontend

| ID | TODO | Acceptance |
| --- | --- | --- |
| TODO-UI-001 | Add bilingual controls to the product UI | Navigation, composer, workspace, and feedback are fully localized |
| TODO-UI-002 | Expand production playbooks by industry | Each template defines prompt, Skill, Hook, frame, duration, and review |
| TODO-UI-003 | Shot ordering and multimodal references | Users can reorder shots and attach reference images or videos |
| TODO-UI-004 | Project asset and reference panel | Characters, scenes, props, and styles are reusable across shots |

## 2. Agent and Directing Workflow

| ID | TODO | Acceptance |
| --- | --- | --- |
| TODO-AGENT-001 | Intent routing | Create, revise, review, regenerate, and localize requests use distinct paths |
| TODO-AGENT-002 | Partial shot patches | Editing one shot preserves other shots, versions, and approval state |
| TODO-AGENT-003 | Scene / sequence / beat data | Scene goals, conflict, and entry/exit state are persisted |
| TODO-AGENT-004 | Cinematic shot schema | Shot size, angle, lens, movement, performance, gaze, sound, and transitions are structured |
| TODO-AGENT-005 | Style bible and continuity graph | Characters, costume, locations, props, and screen direction are checked and reused |
| TODO-AGENT-006 | Animatic and timeline previz | Users approve rhythm before final shot generation |
| TODO-AGENT-007 | Multi-node LangGraph with recovery | Story, budget, shot, and cut gates can pause, resume, and remain auditable |

## 3. Providers and Generation

| ID | TODO | Acceptance |
| --- | --- | --- |
| TODO-PROVIDER-001 | Route Kling generation through the backend | A web project can select Pippit or Kling from model metadata |
| TODO-PROVIDER-002 | Provider capability discovery | Duration, aspect, audio, reference inputs, and output capabilities are server-discovered |
| TODO-PROVIDER-003 | Provider cancellation and unified errors | Both providers support cancel, timeout, throttling, and retry classification |
| TODO-PROVIDER-004 | Automatic routing and fallback | Tasks select models by task, budget, and availability while respecting explicit choice |
| TODO-PROVIDER-005 | Take management | Each shot stores alternate takes, scores, and selection history |

## 4. Media and Delivery

| ID | TODO | Acceptance |
| --- | --- | --- |
| TODO-MEDIA-001 | Asset upload and object storage | Images, video, and audio receive validation, signed access, and lifecycle rules |
| TODO-MEDIA-002 | FFmpeg composition | Timeline, transitions, captions, sound, and grade produce a final MP4 |
| TODO-MEDIA-003 | Delivery variants | Landscape, vertical, square, cover, and subtitle files are exported |
| TODO-MEDIA-004 | Sharing and permissions | Expiry, revocation, and access auditing are supported |

## 5. Realtime and Reliability

| ID | TODO | Acceptance |
| --- | --- | --- |
| TODO-REL-001 | SSE project events | Conversation, shot, and job updates reconnect and reconcile state |
| TODO-REL-002 | Production Celery deployment | Redis broker, retries, dead-letter queue, reconciliation, and worker recovery |
| TODO-REL-003 | LangGraph checkpoints | A process restart resumes from the last valid node |
| TODO-REL-004 | Unified observability | Traces, structured logs, provider latency, and success metrics |

## 6. Community and Operations

| ID | TODO | Acceptance |
| --- | --- | --- |
| TODO-COMMUNITY-001 | Persist Hots | Publish, author, likes, permissions, and edit time live in the database |
| TODO-COMMUNITY-002 | Community moderation | Report, hide, restore, appeal, and audit flows |
| TODO-COMMUNITY-003 | Persist and version Skills | User Skills can be published, updated, deprecated, and migrated |
| TODO-COMMUNITY-004 | Data retention | Define soft delete, recovery window, and media lifecycle |

## 7. Security and Data

| ID | TODO | Acceptance |
| --- | --- | --- |
| TODO-SEC-001 | CSRF protection | Cookie-writing endpoints use a token or equivalent same-origin defense |
| TODO-SEC-002 | Layered rate limits | User, IP, provider, and generation quotas are independent |
| TODO-SEC-003 | Upload security | File header, size, MIME, decode, and malicious-content checks |
| TODO-SEC-004 | Production data services | PostgreSQL, Redis, MinIO, migrations, and integration tests are complete |
| TODO-SEC-005 | Generated OpenAPI client | Frontend types are generated from OpenAPI and checked in CI |

## 8. Testing and Release

| ID | TODO | Acceptance |
| --- | --- | --- |
| TODO-QA-001 | Playwright E2E | Cover English product flow, Docs switching, and the core workspace |
| TODO-QA-002 | Provider contract matrix | Cover unified behavior across Pippit, Kling, and Mock |
| TODO-QA-003 | Paid generation acceptance | Complete one end-to-end generation with an explicit budget and approval |
| TODO-QA-004 | Failure exercises | Cover worker interruption, duplicate delivery, SSE reconnect, and download failure |


# VideoAgent DevOps Document

| Attribute | Value |
| --- | --- |
| Document version | v1.0 |
| Updated | 2026-11-21 |
| Scope | Environments, deployment, release, monitoring, backup, incidents, scaling, security |
| Audience | DevOps, SRE, on-call engineers |

This runbook covers **system reliability**: how to deploy, release and debug. Product
activities, content and credit policy live in [Operations strategy](../product/operations.en.md).

## 1. Environments

| Environment | Purpose | Data | Access |
| --- | --- | --- | --- |
| local | Developer machine, SQLite + local media | Disposable | Local |
| staging | Pre-release validation, production-like | Synthetic | Internal |
| production | Live service | Real user data | Public + bastion |

Production runs with `VIDEOAGENT_ENVIRONMENT=production`, debug output disabled, and secure
cookies.

## 2. Deployment topology

```text
Users → SLB/CDN → Next.js (3000) ──/api/account──→ FastAPI (8000)
                                                    ├─ PostgreSQL / SQLite
                                                    ├─ Redis (Celery broker)
                                                    ├─ Celery worker (provider polling)
                                                    ├─ OSS (durable media)
                                                    └─ FFmpeg (exports and covers)
```

- Next.js and FastAPI are stateless and scale horizontally.
- Celery workers share the API image but scale independently with queue depth.
- Locally, [deploy/docker-compose.yml](../../deploy/docker-compose.yml) provides PostgreSQL, Redis and MinIO.

## 3. Release procedure

1. CI must pass: backend `pytest / ruff / mypy`, frontend `vitest / tsc / build`.
2. Build an immutable image tag; never deploy `latest`.
3. Migrate the database after a backup; abort the release on migration failure.
4. Deploy workers first, then roll the API, then the web tier.
5. Smoke test: `GET /api/v1/health`, `GET /api/v1/providers/models`, sign-in, upload, estimate.
6. Watch error rate and latency for 15 minutes before continuing.
7. Roll back by image tag; if migrations already ran, use the migration rollback or fix forward.

## 4. Configuration and secrets

- Configuration comes from environment variables or `services/api/.env` locally; template in
  [`.env.example`](../../.env.example).
- Use a RAM sub-account with least privilege for cloud credentials; never the root AccessKey.
- Rotate secrets on leak or staff change, then roll the API and workers.
- Fail fast: `VIDEOAGENT_VIDEO_PROVIDER=wanx` without a key aborts startup instead of running degraded.

## 5. Health checks and monitoring

| Signal | Suggested alert | Notes |
| --- | --- | --- |
| `/api/v1/health` | 2 consecutive failures | Database and process liveness |
| HTTP 5xx ratio | > 1% for 5 minutes | Track API and web separately |
| P95 latency | > 2s for 10 minutes | Generation and agent routes individually |
| Celery queue depth | > 100 for 10 minutes | Backlog usually means a slow provider |
| Provider timeout rate | > 10% | Vendor throttling or outage |
| OSS 4xx/5xx | Any sustained growth | 403 usually means RAM policy or expired AK |
| Disk usage | > 80% | Local cache and logs |

Logs are structured JSON with `request_id`; API keys, cookies and full command lines are
never logged.

## 6. Backup and recovery

- PostgreSQL: daily full backup plus continuous WAL, retained 7–30 days; restore drill monthly.
- OSS: versioning enabled; cross-region replication where compliance requires it.
- Targets: RPO ≤ 24h (database), RTO ≤ 2h (core path).
- Restore order: database → OSS verification → API → workers → web.

## 7. Incident playbook

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Jobs stuck in `running` | Slow or throttled provider | Check provider status, cancel and refund |
| `submission_uncertain` | Timeout before a task id | Never auto-resubmit; reconcile vendor tasks |
| OSS 403 | Missing RAM action or expired AK | Re-run `scripts/check-oss.py`, fix and restart |
| Export failures | Missing FFmpeg filter or full disk | Verify `ffmpeg -filters`, clear `.data` cache |
| Redis unavailable | Memory or network | Fall back to synchronous polling, replay later |
| Widespread 401 | Session secret changed | Confirm `SESSION_SECRET`, force re-login |

## 8. Scaling and capacity

- API: scale on CPU and P95; keep it stateless and size the DB pool per instance.
- Workers: scale on queue depth while respecting provider RPM limits.
- Media: cap and prune the local cache; durability belongs to OSS.
- Web: serve static assets via CDN; never cache `/api/account`.

## 9. Security

- Vulnerabilities: `pnpm audit` and `uv` lock review; patch high severity within 24 hours.
- Pre-commit scanning: `python scripts/check_secrets.py`; CI runs the security workflow.
- Least privilege: OSS grants only `PutObject/GetObject/DeleteObject` on the business prefix.
- Audit: administrative actions persist to `admin_audit_logs` for at least 180 days.

## 10. On-call checklist

**Daily**: health, error rate, queue depth, OSS errors, disk.

**Before release**: green CI, backup done, rollback tag ready, change announcement.

**During an incident**: stop the bleeding (rollback/limit/pause generation) → diagnose →
communicate → postmortem.

Pause generation through the admin runtime switch; estimation and submission are both blocked.

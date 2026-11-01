# VideoAgent

VideoAgent is a bilingual AI video creation workspace. It turns a creative brief
into a structured storyboard, estimates generation cost, and submits approved
shots to a video provider.

The static GitHub Pages project homepage is deployed from [`site/`](site/) by
`.github/workflows/pages.yml`. The full application remains a separate
Python/Next.js service because GitHub Pages cannot run FastAPI, OAuth callbacks,
Celery, or media processing.

## Current milestone

Implemented:

- English and Simplified Chinese interfaces.
- Registration, login, logout, and server-side sessions.
- User-scoped project CRUD foundation.
- Multi-shot storyboards with versioned replacement.
- LangGraph agent orchestration.
- Deterministic local planner and configurable OpenAI-compatible planner.
- Credit estimation and explicit generation approval.
- Persisted generation jobs with idempotency protection.
- Mock video provider for development and CI.
- Kling MCP provider contract and Python Streamable HTTP client.
- Per-user Kling OAuth with PKCE, one-time state validation, encrypted tokens,
  token refresh, connection status, and disconnect.
- Automatic provider selection: a connected Kling account uses Kling; otherwise
  development falls back to the mock provider.
- Durable generation-job records with idempotency and API-driven status refresh.
- Celery polling worker for long-running Kling jobs.
- Responsive landing page, authentication pages, project dashboard, and workspace.

In progress:

- MinIO/S3 upload flow and media persistence.
- FFmpeg composition and public share pages.

The default provider mode is `auto`: connected users use Kling, while users
without a Kling connection fall back to the mock provider in development. Live
generation requires a Kling OAuth connection and a non-zero account balance.

## Prerequisites

- Python 3.12+
- `uv`
- Node.js 24+
- pnpm 11+
- FFmpeg and ffprobe

Docker is optional for the current automated tests. The provided Compose file
starts PostgreSQL, Redis, and MinIO for production-like development.

## Quick start

Install backend dependencies:

```powershell
cd D:\_Science\Agent\VideoAgent\services\api
uv sync --dev
```

Start the API:

```powershell
uv run uvicorn videoagent.main:app --reload --port 8000
```

In a second terminal, install and start the web application:

```powershell
cd D:\_Science\Agent\VideoAgent
pnpm install
pnpm --dir apps/web dev
```

For persistent background polling, start Redis and set
`VIDEOAGENT_CELERY_ENABLED=true`, then run the Worker:

```powershell
.\scripts\dev-worker.ps1
```

On Windows the script uses Celery's `solo` worker pool. Without Celery, the
frontend still refreshes active jobs through the authenticated job endpoint.

Open:

- English: http://localhost:3000/en
- Chinese: http://localhost:3000/zh-CN
- API documentation: http://localhost:8000/docs
- API health: http://localhost:8000/api/v1/health

The no-Docker path uses SQLite at `services/api/.data/videoagent.db`.

## TDD and quality gates

Backend:

```powershell
cd services\api
uv run pytest
uv run ruff check src tests
uv run mypy src
```

Frontend:

```powershell
pnpm --dir apps/web test
pnpm --dir apps/web typecheck
pnpm --dir apps/web build
```

Tests are the executable specification. New behavior should begin with a failing
test and end with all quality gates passing.

## Configuration

Copy `.env.example` values into your environment or a private `.env` file.
Never commit real API keys, OAuth tokens, or session secrets.

Important variables:

```text
VIDEOAGENT_DATABASE_URL
VIDEOAGENT_SESSION_SECRET
VIDEOAGENT_TOKEN_ENCRYPTION_KEY
VIDEOAGENT_VIDEO_PROVIDER
VIDEOAGENT_KLING_MCP_URL
VIDEOAGENT_KLING_ACCESS_TOKEN
VIDEOAGENT_CELERY_ENABLED
VIDEOAGENT_CELERY_BROKER_URL
VIDEOAGENT_CELERY_RESULT_BACKEND
VIDEOAGENT_LLM_BASE_URL
VIDEOAGENT_LLM_API_KEY
VIDEOAGENT_LLM_MODEL
NEXT_PUBLIC_API_BASE_URL
```

If LLM variables are absent, the Agent uses its deterministic local planner.
If `VIDEOAGENT_VIDEO_PROVIDER=mock`, generation uses the mock provider.

## Repository structure

```text
apps/web                 Next.js bilingual application
services/api             FastAPI, LangGraph, provider adapters, and tests
docs                     Design and test specifications
deploy                   Infrastructure and container configuration
```

See:

- [GitHub Pages project homepage](https://0x0addc001.github.io/VideoAgent/)
- [Software design](docs/software-design.md)
- [Software implementation](docs/software-implementation.md)
- [Software test and TDD specification](docs/software-test-plan.md)


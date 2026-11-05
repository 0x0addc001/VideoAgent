# VideoAgent

VideoAgent is a bilingual AI video creation workspace. It turns a creative brief
into a structured storyboard, estimates generation cost, and submits approved
shots to a video provider.

The static GitHub Pages project homepage is deployed from [`site/`](site/) by
`.github/workflows/pages.yml`. The full application remains a separate
Python/Next.js service because GitHub Pages cannot run FastAPI, the Pippit CLI,
Celery, or media processing.

## Product scope

- English-first public interface; Chinese routes redirect to English while the
  Chinese codebase remains available for later re-enablement.
- Registration, login, logout, and server-side sessions.
- User-scoped project CRUD foundation.
- Multi-shot storyboards with versioned replacement.
- A collapsible Projects/Recents history with drag-to-file conversation
  organization.
- Staged VideoAgent approvals for overall direction, episode and shot outline,
  scene script, and generation readiness.
- Persisted Skill Studio with AI-assisted structuring, quality gates, prompt
  templates, and input/output contracts.
- Collapsible app navigation with recent conversations below Agents.
- Persistent Hots MP4 publishing and clickable videos and Skills in Assets.
- LangGraph agent orchestration.
- Deterministic local planner and configurable OpenAI-compatible planner.
- Credit estimation and explicit generation approval.
- Persisted generation jobs with idempotency protection.
- Mock video provider for development and CI.
- Pippit CLI provider for video submission, status polling, and credit balance.
- Kling China-region CLI provider through `@klingai/cli-cn`.
- Server-owned Pippit authorization; credentials remain outside browser code,
  API responses, and the repository.
- Durable generation-job records with idempotency and API-driven status refresh.
- Celery polling worker for long-running Pippit jobs.
- Responsive landing page, authentication pages, and a history-first project
  workspace with an asset tree, canvas, and approval-driven Agent chat.
- Environment-allowlisted administration console for users, credits, jobs,
  invites, runtime switches, Provider state, and audit logs.

The default provider mode is `pippit`. Kling uses the server-owned China-region
CLI and `https://klingai.com/mcp`; individual users do not provide Kling tokens
to the browser. The `mock` mode is available for tests and offline UI
development.

## Prerequisites

- Python 3.12+
- `uv`
- Node.js 24+
- pnpm 11+
- FFmpeg and ffprobe
- Pippit CLI 1.0.48+ for live video generation
- `@klingai/cli-cn` 0.2.3+ for China-region Kling generation

Docker is optional for the current automated tests. The provided Compose file
starts PostgreSQL, Redis, and MinIO for production-like development.

## Quick start

Install backend dependencies:

```powershell
cd D:\_Science\Agent\VideoAgent\services\api
uv sync --dev
```

Install and authorize Pippit on the machine that runs the API:

```powershell
npx @pippit-dev/cli@latest install
pippit-tool-cli login
pippit-tool-cli status
```

Install and authorize Kling China-region:

```powershell
npm uninstall -g @klingai/cli-global
npm install -g @klingai/cli-cn@latest --registry=https://registry.npmjs.org
kling login
kling who_am_i
```

The Windows installer can report a `curl` failure even when the package itself
was downloaded. In that case, reinstall the npm package with `--ignore-scripts`
and place the checksum-verified release binary in the package's `bin` directory.
For CI, set the private `VIDEOAGENT_PIPPIT_ACCESS_KEY` environment variable
instead of an interactive login.

Start the API with the Windows UTF-8 startup script:

```powershell
.\scripts\dev-api.ps1
```

In a second terminal, install and start the web application:

```powershell
.\scripts\dev-web.ps1
```

These scripts switch the PowerShell console and Python processes to UTF-8 so
Chinese log output is not garbled on Windows.

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
- Administration: http://localhost:3000/en/admin

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
pnpm test:e2e
```

Tests are the executable specification. New behavior should begin with a failing
test and end with all quality gates passing.

Playwright runs the full registration, composer, upload, Mock Provider
generation, FFmpeg export, download, and share flow without consuming paid
Provider credits.

## Configuration

Copy `.env.example` values into your environment or a private `.env` file.
Never commit real API keys, OAuth tokens, or session secrets.

Important variables:

```text
VIDEOAGENT_DATABASE_URL
VIDEOAGENT_SESSION_SECRET
VIDEOAGENT_TOKEN_ENCRYPTION_KEY
VIDEOAGENT_ADMIN_EMAILS
VIDEOAGENT_REGISTRATION_MODE
VIDEOAGENT_GENERATION_ENABLED
VIDEOAGENT_VIDEO_PROVIDER
VIDEOAGENT_PIPPIT_CLI_COMMAND
VIDEOAGENT_PIPPIT_ACCESS_KEY
VIDEOAGENT_PIPPIT_VIDEO_MODEL
VIDEOAGENT_PIPPIT_VIDEO_RESOLUTION
VIDEOAGENT_PIPPIT_TIMEOUT_SECONDS
VIDEOAGENT_KLING_BACKEND=cli
VIDEOAGENT_KLING_CLI_COMMAND=kling
VIDEOAGENT_KLING_EXPECTED_USER_ID
VIDEOAGENT_CELERY_ENABLED
VIDEOAGENT_CELERY_BROKER_URL
VIDEOAGENT_CELERY_RESULT_BACKEND
VIDEOAGENT_LLM_BASE_URL
VIDEOAGENT_LLM_API_KEY
VIDEOAGENT_LLM_MODEL
VIDEOAGENT_MEDIA_DIR
VIDEOAGENT_MAX_UPLOAD_BYTES
VIDEOAGENT_FFMPEG_COMMAND
VIDEOAGENT_FFPROBE_COMMAND
VIDEOAGENT_STARTING_USER_CREDITS
NEXT_PUBLIC_API_BASE_URL
```

If LLM variables are absent, the Agent uses its deterministic local planner.
If `VIDEOAGENT_VIDEO_PROVIDER=mock`, generation uses the mock provider. Use
`pippit` for the server-owned CLI integration. Provider credentials and Pippit
login files are never committed.

### DeepSeek Agent planner

DeepSeek uses the existing OpenAI-compatible planner. Add the private API key
to `services/api/.env`:

```env
VIDEOAGENT_LLM_BASE_URL=https://api.deepseek.com/v1
VIDEOAGENT_LLM_API_KEY=sk-your-private-key
VIDEOAGENT_LLM_MODEL=deepseek-flash
```

Restart the API after changing the file. Model IDs must match the configured
endpoint's `/models` response; the current endpoint exposes `deepseek-flash`
and `deepseek-v4-pro`. VideoAgent automatically falls back to a plain chat
completion plus strict JSON validation when an endpoint does not support
OpenAI JSON Schema structured output.

## Repository structure

```text
apps/web                 Next.js bilingual application
services/api             FastAPI, LangGraph, provider adapters, and tests
docs                     Product, architecture, API, delivery, and test specifications
deploy                   Infrastructure and container configuration
```

See:

- [GitHub Pages project homepage](https://0x0addc001.github.io/VideoAgent/)
- [Product requirements](docs/product-requirements.md)
- [Playbooks](docs/playbooks.md)
- [Software design](docs/software-design.md)
- [API reference](docs/api-reference.zh.md)
- [Software implementation](docs/software-implementation.md)
- [Software test and TDD specification](docs/software-test-plan.md)
- [Operations](docs/operations.md)
- [FAQ](docs/faq.md)
- [TODO](docs/todo.md)


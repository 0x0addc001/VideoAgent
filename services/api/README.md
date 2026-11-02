# VideoAgent API

FastAPI service for VideoAgent projects, agent workflows, Pippit CLI integration,
generation jobs, and media exports.

Run from the repository root with `make api-test` or from this directory:

```powershell
uv sync
uv run pytest
uv run uvicorn videoagent.main:app --reload --port 8000
```


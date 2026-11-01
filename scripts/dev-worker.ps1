$ErrorActionPreference = "Stop"
$apiRoot = Join-Path $PSScriptRoot "..\services\api"
Set-Location $apiRoot
$env:VIDEOAGENT_CELERY_ENABLED = "true"
uv sync --dev
uv run celery -A videoagent.workers.celery_app.celery_app worker --loglevel=info --pool=solo


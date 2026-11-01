$ErrorActionPreference = "Stop"
$apiRoot = Join-Path $PSScriptRoot "..\services\api"
Set-Location $apiRoot
uv sync --dev
uv run uvicorn videoagent.main:app --reload --port 8000


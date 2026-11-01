$ErrorActionPreference = "Stop"
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
chcp.com 65001 > $null

$apiRoot = Join-Path $PSScriptRoot "..\services\api"
Set-Location $apiRoot
uv sync --dev
uv run uvicorn videoagent.main:app --reload --port 8000


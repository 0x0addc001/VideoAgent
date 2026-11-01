$ErrorActionPreference = "Stop"
$projectRoot = Join-Path $PSScriptRoot ".."
Set-Location $projectRoot
pnpm install
pnpm --dir apps/web dev


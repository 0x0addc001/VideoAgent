$ErrorActionPreference = "Stop"
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
chcp.com 65001 > $null

$projectRoot = Join-Path $PSScriptRoot ".."
Set-Location $projectRoot
pnpm install
pnpm --dir apps/web dev


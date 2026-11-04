$ErrorActionPreference = "Stop"
$utf8 = [System.Text.UTF8Encoding]::new($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
chcp.com 65001 > $null

$projectRoot = Join-Path $PSScriptRoot ".."
Set-Location $projectRoot

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  pnpm install
  pnpm --dir apps/web dev
} elseif (Get-Command corepack -ErrorAction SilentlyContinue) {
  corepack pnpm install
  corepack pnpm --dir apps/web dev
} else {
  throw "pnpm is not available. Install Node.js with Corepack and run 'corepack enable'."
}


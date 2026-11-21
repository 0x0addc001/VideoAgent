#!/usr/bin/env bash
# Start the Next.js product shell on macOS/Linux (counterpart of dev-web.ps1).
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

if command -v pnpm >/dev/null 2>&1; then
  pnpm install
  exec pnpm --dir apps/web dev
elif command -v corepack >/dev/null 2>&1; then
  corepack pnpm install
  exec corepack pnpm --dir apps/web dev
else
  echo "pnpm is not available. Install Node.js with Corepack and run 'corepack enable'." >&2
  exit 1
fi

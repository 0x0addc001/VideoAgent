#!/usr/bin/env bash
# Start the Celery worker on macOS/Linux (counterpart of dev-worker.ps1).
# Requires a reachable Redis instance (VIDEOAGENT_CELERY_BROKER_URL).
set -euo pipefail

# Pick up a user-level Homebrew prefix when the caller's shell has not already
# loaded it (FFmpeg/ffprobe live there on machines without a system install).
if ! command -v ffmpeg >/dev/null 2>&1 && [ -x "$HOME/homebrew/bin/brew" ]; then
  eval "$("$HOME/homebrew/bin/brew" shellenv)"
fi

api_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../services/api" && pwd)"
cd "$api_root"

export VIDEOAGENT_CELERY_ENABLED=true
uv sync --dev
exec uv run celery -A videoagent.workers.celery_app.celery_app worker --loglevel=info --pool=solo

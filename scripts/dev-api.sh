#!/usr/bin/env bash
# Start the FastAPI control plane on macOS/Linux (counterpart of dev-api.ps1).
set -euo pipefail

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is not installed. Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
fi

# Pick up a user-level Homebrew prefix when the caller's shell has not already
# loaded it (FFmpeg/ffprobe live there on machines without a system install).
if ! command -v ffmpeg >/dev/null 2>&1 && [ -x "$HOME/homebrew/bin/brew" ]; then
  eval "$("$HOME/homebrew/bin/brew" shellenv)"
fi

api_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../services/api" && pwd)"
cd "$api_root"

# Settings are read from .env in this directory; create one from .env.example
# on a fresh clone.
if [ ! -f .env ]; then
  echo "warning: $api_root/.env is missing; copy .env.example and fill in secrets" >&2
fi

extra=()
if grep -qE '^VIDEOAGENT_MEDIA_STORAGE=oss' .env 2>/dev/null; then
  extra=(--extra oss)
fi

uv sync --dev "${extra[@]}"
exec uv run "${extra[@]}" uvicorn videoagent.main:app --port 8000

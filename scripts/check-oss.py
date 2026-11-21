#!/usr/bin/env python3
"""Round-trip check for the configured OSS bucket (put -> get -> delete).

Run after filling group 4 of services/api/.env and installing the extra:

    cd services/api && uv sync --extra oss
    uv run --project services/api python scripts/check-oss.py

The script never prints the AccessKey. It rewrites nothing.
"""

from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
API_ROOT = REPO_ROOT / "services" / "api"
sys.path.insert(0, str(API_ROOT / "src"))
# Settings resolves ".env" against the process working directory, which is the
# API root when the app runs. Mirror that so the script sees the same config.
os.chdir(API_ROOT)

from videoagent.config import Settings  # noqa: E402
from videoagent.services.storage import StorageError, build_storage  # noqa: E402


def main() -> int:
    settings = Settings()
    if settings.media_storage != "oss":
        print(
            "VIDEOAGENT_MEDIA_STORAGE is "
            f"{settings.media_storage!r}; set it to 'oss' to check the bucket."
        )
        return 1

    try:
        backend = build_storage(settings)
    except StorageError as exc:
        print(f"storage configuration error: {exc}")
        return 1

    key = f"healthcheck-{uuid.uuid4().hex}.txt"
    payload = b"videoagent storage check"
    probe = Path("/tmp") / f"videoagent-oss-{uuid.uuid4().hex}.txt"
    restored = probe.with_suffix(".restored.txt")
    probe.write_bytes(payload)

    try:
        import asyncio

        asyncio.run(backend.put(key, probe))
        ok = asyncio.run(backend.fetch(key, restored))
        if not ok or not restored.exists() or restored.read_bytes() != payload:
            print("round trip failed: restored bytes do not match")
            return 1
        print(f"OSS OK  bucket={settings.oss_bucket} endpoint={settings.oss_endpoint}")
        print(f"object={key} bytes={len(payload)}")
    except Exception as exc:  # noqa: BLE001 - surface provider SDK errors verbatim
        print(f"OSS round trip failed: {exc}")
        return 1
    finally:
        try:
            import asyncio

            asyncio.run(backend.remove(key))
        except Exception:  # noqa: BLE001 - best-effort cleanup
            pass
        probe.unlink(missing_ok=True)
        restored.unlink(missing_ok=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

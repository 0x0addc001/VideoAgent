"""Asset storage backends.

The media service always works on local files because FFmpeg needs a real path.
``media_storage`` decides where those files are also persisted: stays on disk
(``local``) or is mirrored to Alibaba Cloud OSS (``oss``) and restored on demand.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Protocol

from videoagent.config import Settings


class StorageError(RuntimeError):
    """Raised when a storage backend is misconfigured or cannot be imported."""


class StorageBackend(Protocol):
    name: str

    async def put(self, storage_key: str, source: Path) -> None:
        """Persist a local file under ``storage_key``."""

    async def fetch(self, storage_key: str, destination: Path) -> bool:
        """Restore ``storage_key`` to ``destination``; return True when available."""

    async def remove(self, storage_key: str) -> None:
        """Delete ``storage_key`` from the backend."""


class LocalStorage:
    """Default backend: the media directory already is the durable copy."""

    name = "local"

    def __init__(self, media_dir: Path) -> None:
        self._media_dir = media_dir

    def _path(self, storage_key: str) -> Path:
        return self._media_dir / storage_key

    async def put(self, storage_key: str, source: Path) -> None:
        return None

    async def fetch(self, storage_key: str, destination: Path) -> bool:
        return self._path(storage_key).exists()

    async def remove(self, storage_key: str) -> None:
        self._path(storage_key).unlink(missing_ok=True)


class OssStorage:
    """Mirror assets into an OSS bucket using the official ``oss2`` SDK."""

    name = "oss"

    def __init__(
        self,
        *,
        endpoint: str,
        bucket: str,
        access_key_id: str,
        access_key_secret: str,
        prefix: str = "",
    ) -> None:
        try:
            import oss2
        except ModuleNotFoundError as exc:  # pragma: no cover - depends on install
            raise StorageError(
                "OSS storage requires the optional dependency: uv sync --extra oss"
            ) from exc
        self._bucket = oss2.Bucket(
            oss2.Auth(access_key_id, access_key_secret),
            endpoint,
            bucket,
        )
        self._prefix = prefix.strip("/")

    def _key(self, storage_key: str) -> str:
        return f"{self._prefix}/{storage_key}" if self._prefix else storage_key

    async def put(self, storage_key: str, source: Path) -> None:
        await asyncio.to_thread(
            self._bucket.put_object_from_file,
            self._key(storage_key),
            str(source),
        )

    async def fetch(self, storage_key: str, destination: Path) -> bool:
        destination.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(
            self._bucket.get_object_to_file,
            self._key(storage_key),
            str(destination),
        )
        return destination.exists()  # noqa: ASYNC240 - one stat call after the download

    async def remove(self, storage_key: str) -> None:
        await asyncio.to_thread(self._bucket.delete_object, self._key(storage_key))


_CACHE: dict[tuple[str, ...], StorageBackend] = {}


def build_storage(settings: Settings) -> StorageBackend:
    """Return a cached storage backend for the current settings."""
    mode = settings.media_storage.strip().lower()
    cache_key: tuple[str, ...]
    if mode == "local":
        media_dir = Path(settings.media_dir).expanduser().resolve()
        cache_key = ("local", str(media_dir))
        backend = _CACHE.get(cache_key)
        if backend is None:
            backend = LocalStorage(media_dir)
            _CACHE[cache_key] = backend
        return backend

    if mode != "oss":
        raise StorageError(f"Unknown VIDEOAGENT_MEDIA_STORAGE value: {mode!r}")

    missing = [
        name
        for name, value in (
            ("VIDEOAGENT_OSS_ENDPOINT", settings.oss_endpoint),
            ("VIDEOAGENT_OSS_BUCKET", settings.oss_bucket),
            ("VIDEOAGENT_OSS_ACCESS_KEY_ID", settings.oss_access_key_id),
            ("VIDEOAGENT_OSS_ACCESS_KEY_SECRET", settings.oss_access_key_secret),
        )
        if not value
    ]
    if missing:
        raise StorageError(f"OSS storage is missing: {', '.join(missing)}")

    assert settings.oss_endpoint and settings.oss_bucket  # narrowed by the check above
    assert settings.oss_access_key_id and settings.oss_access_key_secret
    cache_key = (
        "oss",
        settings.oss_endpoint,
        settings.oss_bucket,
        settings.oss_access_key_id,
        settings.oss_prefix,
    )
    backend = _CACHE.get(cache_key)
    if backend is None:
        backend = OssStorage(
            endpoint=settings.oss_endpoint,
            bucket=settings.oss_bucket,
            access_key_id=settings.oss_access_key_id,
            access_key_secret=settings.oss_access_key_secret,
            prefix=settings.oss_prefix,
        )
        _CACHE[cache_key] = backend
    return backend

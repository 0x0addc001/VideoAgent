import sys
import types
from pathlib import Path
from types import SimpleNamespace

import pytest

from videoagent.config import Settings
from videoagent.services import media
from videoagent.services.storage import (
    _CACHE,
    LocalStorage,
    OssStorage,
    StorageError,
    build_storage,
)


@pytest.fixture(autouse=True)
def clear_backend_cache():
    _CACHE.clear()
    yield
    _CACHE.clear()


class FakeBucket:
    def __init__(self, auth, endpoint, bucket):
        self.auth = auth
        self.endpoint = endpoint
        self.bucket = bucket
        self.calls: list[tuple[str, str, str | None]] = []

    def put_object_from_file(self, key, path):
        self.calls.append(("put", key, path))

    def get_object_to_file(self, key, destination):
        Path(destination).write_bytes(b"restored")
        self.calls.append(("get", key, destination))

    def delete_object(self, key):
        self.calls.append(("delete", key, None))


def install_fake_oss2(monkeypatch) -> types.ModuleType:
    module = types.ModuleType("oss2")
    module.Auth = lambda key_id, secret: (key_id, secret)
    module.Bucket = FakeBucket
    monkeypatch.setitem(sys.modules, "oss2", module)
    return module


@pytest.mark.unit
def test_local_backend_is_the_default(tmp_path):
    backend = build_storage(Settings(media_dir=str(tmp_path)))

    assert isinstance(backend, LocalStorage)
    assert build_storage(Settings(media_dir=str(tmp_path))) is backend


@pytest.mark.unit
async def test_local_backend_fetches_existing_files(tmp_path):
    backend = LocalStorage(tmp_path)
    (tmp_path / "a.mp4").write_bytes(b"x")

    assert await backend.fetch("a.mp4", tmp_path / "a.mp4") is True
    assert await backend.fetch("missing.mp4", tmp_path / "missing.mp4") is False


@pytest.mark.unit
def test_oss_backend_requires_credentials(tmp_path):
    settings = Settings(media_dir=str(tmp_path), media_storage="oss")

    with pytest.raises(StorageError, match="VIDEOAGENT_OSS_ENDPOINT"):
        build_storage(settings)


@pytest.mark.unit
def test_unknown_storage_mode_is_rejected(tmp_path):
    settings = Settings(media_dir=str(tmp_path))
    settings.media_storage = "s3"  # type: ignore[assignment]

    with pytest.raises(StorageError, match="s3"):
        build_storage(settings)


@pytest.mark.unit
async def test_oss_backend_round_trips_with_prefix(tmp_path, monkeypatch):
    install_fake_oss2(monkeypatch)
    settings = Settings(
        media_dir=str(tmp_path),
        media_storage="oss",
        oss_endpoint="https://oss-cn-beijing.aliyuncs.com",
        oss_bucket="videoagent-test",
        oss_access_key_id="key",
        oss_access_key_secret="secret",
        oss_prefix="tenant-a",
    )

    backend = build_storage(settings)
    assert isinstance(backend, OssStorage)

    source = tmp_path / "source.mp4"
    source.write_bytes(b"video")
    await backend.put("generated-1.mp4", source)
    assert await backend.fetch("generated-1.mp4", tmp_path / "cache" / "generated-1.mp4") is True
    await backend.remove("generated-1.mp4")

    assert backend._bucket.calls == [
        ("put", "tenant-a/generated-1.mp4", str(source)),
        ("get", "tenant-a/generated-1.mp4", str(tmp_path / "cache" / "generated-1.mp4")),
        ("delete", "tenant-a/generated-1.mp4", None),
    ]


@pytest.mark.unit
async def test_asset_file_restores_missing_files_from_storage(tmp_path, monkeypatch):
    fetched: list[tuple[str, Path]] = []

    class RecordingBackend:
        async def put(self, storage_key, source):
            raise AssertionError("put is not expected")

        async def fetch(self, storage_key, destination):
            fetched.append((storage_key, destination))
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(b"restored")
            return True

        async def remove(self, storage_key):
            raise AssertionError("remove is not expected")

    monkeypatch.setattr(media, "build_storage", lambda settings: RecordingBackend())
    settings = Settings(media_dir=str(tmp_path))
    asset = SimpleNamespace(storage_key="generated-7.mp4")

    path = await media.asset_file(asset, settings)

    assert path == tmp_path.resolve() / "generated-7.mp4"
    assert path.exists()
    assert fetched == [("generated-7.mp4", path)]

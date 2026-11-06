import asyncio
import hashlib
import secrets
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Literal
from uuid import UUID, uuid4

import httpx
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Asset, GenerationJob, Project, ShareLink, Shot, Storyboard
from videoagent.schemas import AssetRead, ExportRequest, ExportResponse

ALLOWED_UPLOADS = {
    "image/jpeg": (b"\xff\xd8\xff", ".jpg"),
    "image/png": (b"\x89PNG\r\n\x1a\n", ".png"),
    "image/webp": (b"RIFF", ".webp"),
    "video/mp4": (b"\x00\x00\x00", ".mp4"),
    "video/webm": (b"\x1aE\xdf\xa3", ".webm"),
    "audio/mpeg": (b"ID3", ".mp3"),
    "audio/wav": (b"RIFF", ".wav"),
}
ASPECT_SIZES = {
    "21:9": (1680, 720),
    "16:9": (1280, 720),
    "9:16": (720, 1280),
    "1:1": (720, 720),
}


def _now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value


def _checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _asset_url(asset_id: UUID) -> str:
    return f"/api/v1/assets/{asset_id}/content"


def asset_read(asset: Asset) -> AssetRead:
    return AssetRead(
        id=asset.id,
        project_id=asset.project_id,
        shot_id=asset.shot_id,
        kind=asset.kind,
        filename=asset.filename,
        content_type=asset.content_type,
        byte_size=asset.byte_size,
        checksum=asset.checksum,
        permission=asset.permission,
        content_url=_asset_url(asset.id),
        created_at=asset.created_at,
        updated_at=asset.updated_at,
    )


def asset_path(asset: Asset, settings: Settings) -> Path:
    return Path(settings.media_dir).expanduser().resolve() / asset.storage_key


def _validate_signature(content_type: str, header: bytes) -> None:
    signature = ALLOWED_UPLOADS.get(content_type)
    if signature is None or not header.startswith(signature[0]):
        raise AppError(
            status_code=422,
            code="UNSUPPORTED_MEDIA_TYPE",
            message="The uploaded media type is not supported.",
        )
    if content_type == "video/mp4" and b"ftyp" not in header[:32]:
        raise AppError(
            status_code=422,
            code="INVALID_MEDIA",
            message="The uploaded file is not a valid MP4.",
        )


async def save_upload(
    session: AsyncSession,
    *,
    owner_id: UUID,
    project_id: UUID | None,
    shot_id: UUID | None = None,
    upload: UploadFile,
    settings: Settings,
) -> Asset:
    content_type = upload.content_type or "application/octet-stream"
    extension = ALLOWED_UPLOADS.get(content_type, (b"", ""))[1]
    media_dir = Path(settings.media_dir).expanduser().resolve()  # noqa: ASYNC240
    media_dir.mkdir(parents=True, exist_ok=True)
    filename = Path(upload.filename or f"upload{extension}").name
    temp_path = media_dir / f".{uuid4().hex}.upload"
    digest = hashlib.sha256()
    size = 0
    header = b""

    try:
        with temp_path.open("wb") as file:
            while chunk := await upload.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_upload_bytes:
                    raise AppError(
                        status_code=413,
                        code="UPLOAD_TOO_LARGE",
                        message="The uploaded file is too large.",
                    )
                if len(header) < 64:
                    header = (header + chunk)[:64]
                digest.update(chunk)
                file.write(chunk)
        _validate_signature(content_type, header)
        storage_key = f"{uuid4().hex}{extension}"
        final_path = media_dir / storage_key
        temp_path.replace(final_path)
    except Exception:
        temp_path.unlink(missing_ok=True)
        raise
    finally:
        await upload.close()

    asset = Asset(
        owner_id=owner_id,
        project_id=project_id,
        shot_id=shot_id,
        kind="upload",
        filename=filename,
        content_type=content_type,
        storage_key=storage_key,
        byte_size=size,
        checksum=digest.hexdigest(),
    )
    session.add(asset)
    await session.commit()
    await session.refresh(asset)
    return asset


def _mock_source() -> Path:
    repository = Path(__file__).resolve().parents[5]
    return repository / "apps" / "web" / "public" / "media" / "vlog-hero.mp4"


def _mock_image_source() -> Path:
    repository = Path(__file__).resolve().parents[5]
    return repository / "apps" / "web" / "public" / "media" / "vlog-hero-poster.jpg"


async def _download(url: str, destination: Path, settings: Settings) -> bool:
    try:
        async with (
            httpx.AsyncClient(follow_redirects=True, timeout=60) as client,
            client.stream("GET", url) as response,
        ):
            response.raise_for_status()
            size = 0
            with destination.open("wb") as file:
                async for chunk in response.aiter_bytes():
                    size += len(chunk)
                    if size > settings.max_upload_bytes:
                        raise ValueError("provider result too large")
                    file.write(chunk)
        return True
    except Exception:
        await asyncio.to_thread(destination.unlink, missing_ok=True)
        return False


def _image_media(path: Path) -> tuple[str, str]:
    header = path.read_bytes()[:16]
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg", ".jpg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png", ".png"
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp", ".webp"
    raise AppError(
        status_code=502,
        code="INVALID_PROVIDER_IMAGE",
        message="The image provider returned an unsupported file.",
    )


async def materialize_visual_image(
    session: AsyncSession,
    *,
    owner_id: UUID,
    project_id: UUID,
    resource_type: Literal["character", "scene"],
    resource_id: UUID,
    result_url: str,
    settings: Settings,
) -> Asset:
    media_dir = Path(settings.media_dir).expanduser().resolve()  # noqa: ASYNC240
    media_dir.mkdir(parents=True, exist_ok=True)
    raw_path = media_dir / f".{resource_type}-{uuid4().hex}.download"
    try:
        if result_url.startswith("mock://"):
            source = _mock_image_source()
            if not source.exists():
                raise AppError(
                    status_code=502,
                    code="PROVIDER_RESULT_UNAVAILABLE",
                    message="The mock image source is unavailable.",
                )
            shutil.copyfile(source, raw_path)
        elif result_url.startswith(("http://", "https://")):
            if not await _download(result_url, raw_path, settings):
                raise AppError(
                    status_code=502,
                    code="PROVIDER_RESULT_UNAVAILABLE",
                    message="The generated image could not be downloaded.",
                )
        else:
            raise AppError(
                status_code=502,
                code="PROVIDER_RESULT_UNAVAILABLE",
                message="The image provider returned no usable result URL.",
            )
        content_type, extension = _image_media(raw_path)
        storage_key = f"{resource_type}-{resource_id}-{uuid4().hex}{extension}"
        destination = media_dir / storage_key
        raw_path.replace(destination)
    except Exception:
        raw_path.unlink(missing_ok=True)
        raise

    asset = Asset(
        owner_id=owner_id,
        project_id=project_id,
        kind="generated",
        filename=storage_key,
        content_type=content_type,
        storage_key=storage_key,
        byte_size=destination.stat().st_size,
        checksum=_checksum(destination),
    )
    session.add(asset)
    await session.flush()
    return asset


async def materialize_character_image(
    session: AsyncSession,
    *,
    owner_id: UUID,
    project_id: UUID,
    character_id: UUID,
    result_url: str,
    settings: Settings,
) -> Asset:
    return await materialize_visual_image(
        session,
        owner_id=owner_id,
        project_id=project_id,
        resource_type="character",
        resource_id=character_id,
        result_url=result_url,
        settings=settings,
    )


async def materialize_generation_result(
    session: AsyncSession,
    job: GenerationJob,
    settings: Settings,
) -> Asset | None:
    existing = await session.scalar(select(Asset).where(Asset.generation_job_id == job.id))
    if existing is not None:
        job.result_url = _asset_url(existing.id)
        return existing
    if not job.result_url:
        return None

    project = await session.get(Project, job.project_id)
    if project is None:
        return None
    media_dir = Path(settings.media_dir).expanduser().resolve()  # noqa: ASYNC240
    media_dir.mkdir(parents=True, exist_ok=True)
    storage_key = f"generated-{job.id}.mp4"
    destination = media_dir / storage_key

    if job.result_url.startswith("mock://"):
        source = _mock_source()
        if not source.exists():
            return None
        shutil.copyfile(source, destination)
    elif job.result_url.startswith(("http://", "https://")):
        if not await _download(job.result_url, destination, settings):
            return None
    else:
        return None

    asset = Asset(
        owner_id=project.owner_id,
        project_id=project.id,
        shot_id=job.shot_id,
        generation_job_id=job.id,
        kind="generated",
        filename=f"shot-{job.shot_id}.mp4",
        content_type="video/mp4",
        storage_key=storage_key,
        byte_size=destination.stat().st_size,
        checksum=_checksum(destination),
    )
    session.add(asset)
    await session.flush()
    job.result_url = _asset_url(asset.id)
    return asset


async def _run_ffmpeg(command: list[str], timeout_seconds: float = 180) -> None:
    process = await asyncio.create_subprocess_exec(
        *command,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        _, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout_seconds)
    except TimeoutError:
        process.kill()
        await process.communicate()
        raise RuntimeError("ffmpeg timed out") from None
    if process.returncode != 0:
        raise RuntimeError(stderr.decode("utf-8", errors="replace")[-2000:])


async def _duration(path: Path, settings: Settings) -> float:
    process = await asyncio.create_subprocess_exec(
        settings.ffprobe_command,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await process.communicate()
    try:
        return max(0.5, float(stdout.decode().strip()))
    except ValueError:
        return 5.0


def _subtitle_filter(path: Path) -> str:
    value = path.as_posix().replace(":", r"\:")
    return f"subtitles='{value}'"


async def export_project(
    session: AsyncSession,
    *,
    project: Project,
    request: ExportRequest,
    settings: Settings,
) -> ExportResponse:
    rows = (
        await session.execute(
            select(Shot, Asset)
            .join(Storyboard, Storyboard.id == Shot.storyboard_id)
            .join(Asset, Asset.shot_id == Shot.id)
            .where(
                Storyboard.project_id == project.id,
                Asset.kind == "generated",
                Asset.deleted_at.is_(None),
            )
            .order_by(Shot.index, Asset.created_at.desc())
        )
    ).all()
    by_shot: dict[UUID, Asset] = {}
    shot_order: dict[UUID, int] = {}
    for shot, asset in rows:
        by_shot.setdefault(shot.id, asset)
        shot_order[shot.id] = shot.index
    if not by_shot:
        raise AppError(
            status_code=409,
            code="NO_GENERATED_SHOTS",
            message="Generate at least one shot before exporting.",
        )
    project_shot_ids = list(
        (
            await session.scalars(
                select(Shot.id)
                .join(Storyboard, Storyboard.id == Shot.storyboard_id)
                .where(Storyboard.project_id == project.id)
            )
        ).all()
    )
    if set(project_shot_ids) - set(by_shot):
        raise AppError(
            status_code=409,
            code="SHOTS_NOT_READY",
            message="Generate every shot before assembling the final cut.",
        )
    assets = [by_shot[shot_id] for shot_id in sorted(by_shot, key=lambda item: shot_order[item])]
    inputs = [asset_path(asset, settings) for asset in assets]
    if soundtrack := request.soundtrack_asset_id:
        soundtrack_asset = await session.get(Asset, soundtrack)
        if (
            soundtrack_asset is None
            or soundtrack_asset.owner_id != project.owner_id
            or soundtrack_asset.deleted_at is not None
        ):
            raise AppError(
                status_code=404,
                code="ASSET_NOT_FOUND",
                message="The soundtrack asset was not found.",
            )
    else:
        soundtrack_asset = None

    durations = [await _duration(path, settings) for path in inputs]
    transition = 0.35 if len(inputs) > 1 else 0.0
    total_duration = max(1.0, sum(durations) - transition * (len(inputs) - 1))
    media_dir = Path(settings.media_dir).expanduser().resolve()  # noqa: ASYNC240
    created: list[Asset] = []
    cover_asset: Asset | None = None

    for ratio in dict.fromkeys(request.aspect_ratios):
        width, height = ASPECT_SIZES[ratio]
        output = media_dir / f"export-{uuid4().hex}.mp4"
        filter_parts = [
            (
                f"[{index}:v]scale={width}:{height}:force_original_aspect_ratio=decrease,"
                f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30,"
                f"format=yuv420p,eq=contrast=1.02:saturation=1.04,"
                f"setpts=PTS-STARTPTS[v{index}]"
            )
            for index in range(len(inputs))
        ]
        if len(inputs) == 1:
            video_label = "v0"
        else:
            running = durations[0]
            previous = "v0"
            for index in range(1, len(inputs)):
                offset = max(0.05, running - transition)
                label = f"x{index}"
                filter_parts.append(
                    f"[{previous}][v{index}]xfade=transition=fade:duration={transition}:"
                    f"offset={offset:.3f}[{label}]"
                )
                running += durations[index] - transition
                previous = label
            video_label = previous
        if request.captions and request.captions.strip():
            subtitle_path = media_dir / f"captions-{uuid4().hex}.srt"
            await asyncio.to_thread(
                subtitle_path.write_text,
                _captions_to_srt(request.captions, total_duration),
                encoding="utf-8",
            )
            filter_parts.append(f"[{video_label}]{_subtitle_filter(subtitle_path)}[video]")
            video_label = "video"

        command = [settings.ffmpeg_command, "-y"]
        for path in inputs:
            command.extend(["-i", str(path)])
        if soundtrack_asset is not None:
            command.extend(
                ["-stream_loop", "-1", "-i", str(asset_path(soundtrack_asset, settings))]
            )
        else:
            command.extend(
                ["-f", "lavfi", "-t", f"{total_duration:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
            )
        audio_index = len(inputs)
        command.extend(
            [
                "-filter_complex",
                ";".join(filter_parts),
                "-map",
                f"[{video_label}]",
                "-map",
                f"{audio_index}:a:0",
                "-t",
                f"{total_duration:.3f}",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "20",
                "-c:a",
                "aac",
                "-movflags",
                "+faststart",
                str(output),
            ]
        )
        await _run_ffmpeg(command)
        asset = Asset(
            owner_id=project.owner_id,
            project_id=project.id,
            kind="export",
            filename=f"{project.title}-{ratio.replace(':', 'x')}.mp4",
            content_type="video/mp4",
            storage_key=output.name,
            byte_size=output.stat().st_size,
            checksum=_checksum(output),
            permission=request.permission,
        )
        session.add(asset)
        await session.flush()
        created.append(asset)

    if created:
        cover_path = media_dir / f"cover-{uuid4().hex}.jpg"
        await _run_ffmpeg(
            [
                settings.ffmpeg_command,
                "-y",
                "-ss",
                "0.2",
                "-i",
                str(asset_path(created[0], settings)),
                "-frames:v",
                "1",
                str(cover_path),
            ]
        )
        cover_asset = Asset(
            owner_id=project.owner_id,
            project_id=project.id,
            kind="cover",
            filename=f"{project.title}-cover.jpg",
            content_type="image/jpeg",
            storage_key=cover_path.name,
            byte_size=cover_path.stat().st_size,
            checksum=_checksum(cover_path),
            permission=request.permission,
        )
        session.add(cover_asset)
    await session.commit()
    for asset in created:
        await session.refresh(asset)
    if cover_asset is not None:
        await session.refresh(cover_asset)
    return ExportResponse(
        items=[asset_read(asset) for asset in created],
        cover=asset_read(cover_asset) if cover_asset else None,
    )


def _captions_to_srt(text: str, total_duration: float) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return ""
    segment = total_duration / len(lines)
    blocks = []
    for index, line in enumerate(lines):
        start = index * segment
        end = min(total_duration, (index + 1) * segment)
        blocks.append(f"{index + 1}\n{_srt_time(start)} --> {_srt_time(end)}\n{line}\n")
    return "\n".join(blocks)


def _srt_time(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


async def create_share(
    session: AsyncSession,
    *,
    asset: Asset,
    owner_id: UUID,
    expires_in_hours: int,
) -> tuple[ShareLink, str]:
    token = secrets.token_urlsafe(32)
    share = ShareLink(
        asset_id=asset.id,
        owner_id=owner_id,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        expires_at=_now() + timedelta(hours=expires_in_hours),
    )
    session.add(share)
    await session.commit()
    await session.refresh(share)
    return share, token


async def resolve_share(session: AsyncSession, token: str) -> tuple[ShareLink, Asset]:
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    share = await session.scalar(select(ShareLink).where(ShareLink.token_hash == token_hash))
    if share is None or share.revoked_at is not None or _as_utc(share.expires_at) <= _now():
        raise AppError(
            status_code=404,
            code="SHARE_NOT_FOUND",
            message="The shared asset was not found.",
        )
    asset = await session.get(Asset, share.asset_id)
    if asset is None or asset.deleted_at is not None:
        raise AppError(
            status_code=404,
            code="ASSET_NOT_FOUND",
            message="The shared asset was not found.",
        )
    share.access_count += 1
    await session.commit()
    return share, asset

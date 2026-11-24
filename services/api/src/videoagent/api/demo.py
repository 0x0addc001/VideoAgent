"""Public read-only showcase of a demo project."""

from __future__ import annotations

import asyncio
import shutil
from pathlib import Path
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Asset, Project, StoryboardVersion
from videoagent.schemas import ProjectRead, StoryboardRead
from videoagent.services.media import asset_file, asset_read
from videoagent.services.storyboards import load_storyboard

router = APIRouter(prefix="/demo", tags=["demo"])


def _demo_project_id(settings: Settings) -> UUID:
    if not settings.demo_project_id:
        raise AppError(
            status_code=404,
            code="DEMO_UNAVAILABLE",
            message="No demo project is configured.",
        )
    try:
        return UUID(settings.demo_project_id)
    except ValueError as exc:
        raise AppError(
            status_code=500,
            code="DEMO_CONFIG_INVALID",
            message="VIDEOAGENT_DEMO_PROJECT_ID is not a UUID.",
        ) from exc


async def _demo_asset(
    session: AsyncSession,
    settings: Settings,
    asset_id: UUID,
) -> Asset:
    asset = await session.scalar(
        select(Asset).where(
            Asset.id == asset_id,
            Asset.project_id == _demo_project_id(settings),
            Asset.deleted_at.is_(None),
        )
    )
    if asset is None:
        raise AppError(
            status_code=404,
            code="ASSET_NOT_FOUND",
            message="The demo asset was not found.",
        )
    return asset


@router.get("/project")
async def demo_project(
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, object]:
    project = await session.get(Project, _demo_project_id(settings))
    if project is None:
        raise AppError(
            status_code=404,
            code="DEMO_UNAVAILABLE",
            message="The demo project does not exist.",
        )
    storyboard = await load_storyboard(session, project.id)
    assets = list(
        (
            await session.scalars(
                select(Asset)
                .where(Asset.project_id == project.id, Asset.deleted_at.is_(None))
                .order_by(Asset.created_at)
            )
        ).all()
    )
    versions = list(
        (
            await session.scalars(
                select(StoryboardVersion)
                .where(StoryboardVersion.project_id == project.id)
                .order_by(StoryboardVersion.revision.desc())
            )
        ).all()
    )
    project_payload = ProjectRead.model_validate(project).model_dump(mode="json")
    project_payload["access_permission"] = "view"
    return {
        "project": project_payload,
        "storyboard": (
            StoryboardRead.model_validate(storyboard).model_dump(mode="json")
            if storyboard is not None
            else None
        ),
        "versions": [
            {
                "id": str(version.id),
                "revision": version.revision,
                "label": version.label,
                "created_at": version.created_at.isoformat(),
            }
            for version in versions
        ],
        "assets": [
            {
                **asset_read(asset).model_dump(mode="json"),
                "content_url": f"/api/v1/demo/assets/{asset.id}/content",
            }
            for asset in assets
        ],
    }


@router.get("/assets/{asset_id}/content")
async def demo_asset_content(
    asset_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    asset = await _demo_asset(session, settings, asset_id)
    path = await asset_file(asset, settings)
    if not path.exists():
        raise AppError(
            status_code=404,
            code="ASSET_FILE_NOT_FOUND",
            message="The demo asset file was not found.",
        )
    return FileResponse(path, media_type=asset.content_type, filename=asset.filename)


@router.get("/assets/{asset_id}/thumbnail")
async def demo_asset_thumbnail(
    asset_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    asset = await _demo_asset(session, settings, asset_id)
    path = await asset_file(asset, settings)
    if not path.exists():
        raise AppError(
            status_code=404,
            code="ASSET_FILE_NOT_FOUND",
            message="The demo asset file was not found.",
        )
    if asset.content_type.startswith("image/"):
        return FileResponse(path, media_type=asset.content_type)
    thumbnails = Path(settings.media_dir).expanduser().resolve() / "thumbnails"  # noqa: ASYNC240
    thumbnails.mkdir(parents=True, exist_ok=True)
    thumbnail = thumbnails / f"{asset.id}.jpg"
    if not thumbnail.exists() or thumbnail.stat().st_mtime < path.stat().st_mtime:
        ffmpeg = shutil.which("ffmpeg") or "ffmpeg"
        process = await asyncio.create_subprocess_exec(
            ffmpeg,
            "-y",
            "-ss",
            "0.1",
            "-i",
            str(path),
            "-frames:v",
            "1",
            "-vf",
            "scale=320:-2",
            "-q:v",
            "5",
            str(thumbnail),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.PIPE,
        )
        await process.communicate()
        if process.returncode != 0 or not thumbnail.exists():
            raise AppError(
                status_code=500,
                code="THUMBNAIL_FAILED",
                message="The demo cover could not be generated.",
            )
    return FileResponse(thumbnail, media_type="image/jpeg")

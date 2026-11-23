"""Resolve project image assets into local paths for reference-conditioned rendering."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Asset
from videoagent.services.media import asset_file


async def resolve_reference_paths(
    session: AsyncSession,
    *,
    project_id: UUID,
    asset_ids: list[UUID],
    settings: Settings,
) -> list[str]:
    paths: list[str] = []
    for asset_id in dict.fromkeys(asset_ids):
        asset = await session.scalar(
            select(Asset).where(
                Asset.id == asset_id,
                Asset.project_id == project_id,
                Asset.deleted_at.is_(None),
            )
        )
        if asset is None or not asset.content_type.startswith("image/"):
            raise AppError(
                status_code=422,
                code="REFERENCE_INVALID",
                message="A selected reference is not an image in this project.",
            )
        path = await asset_file(asset, settings)
        if not path.exists():
            raise AppError(
                status_code=404,
                code="REFERENCE_FILE_NOT_FOUND",
                message="A selected reference image file is unavailable.",
            )
        paths.append(str(path))
    if not paths:
        raise AppError(
            status_code=422,
            code="REFERENCE_REQUIRED",
            message="Reference-image generation requires at least one image.",
        )
    return paths

from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import Asset, ShareLink, User
from videoagent.schemas import (
    AssetList,
    AssetRead,
    ExportRequest,
    ExportResponse,
    ShareLinkCreate,
    ShareLinkRead,
)
from videoagent.services.media import (
    asset_path,
    asset_read,
    create_share,
    export_project,
    resolve_share,
    save_upload,
)
from videoagent.services.storyboards import owned_project_or_404

router = APIRouter(tags=["assets"])


async def owned_asset_or_404(
    session: AsyncSession,
    asset_id: UUID,
    user_id: UUID,
) -> Asset:
    asset = await session.get(Asset, asset_id)
    if asset is None or asset.owner_id != user_id or asset.deleted_at is not None:
        raise AppError(
            status_code=404,
            code="ASSET_NOT_FOUND",
            message="The asset was not found.",
        )
    return asset


@router.get("/assets", response_model=AssetList)
async def list_assets(
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AssetList:
    assets = (
        await session.scalars(
            select(Asset)
            .where(Asset.owner_id == user.id, Asset.deleted_at.is_(None))
            .order_by(Asset.created_at.desc())
        )
    ).all()
    return AssetList(items=[asset_read(asset) for asset in assets])


@router.get("/projects/{project_id}/assets", response_model=AssetList)
async def list_project_assets(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AssetList:
    await owned_project_or_404(session, project_id, user.id)
    assets = (
        await session.scalars(
            select(Asset)
            .where(
                Asset.project_id == project_id,
                Asset.owner_id == user.id,
                Asset.deleted_at.is_(None),
            )
            .order_by(Asset.created_at.desc())
        )
    ).all()
    return AssetList(items=[asset_read(asset) for asset in assets])


@router.post("/projects/{project_id}/assets", response_model=AssetRead, status_code=201)
async def upload_project_asset(
    project_id: UUID,
    file: Annotated[UploadFile, File()],
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AssetRead:
    await owned_project_or_404(session, project_id, user.id)
    asset = await save_upload(
        session,
        owner_id=user.id,
        project_id=project_id,
        upload=file,
        settings=settings,
    )
    return asset_read(asset)


@router.get("/assets/{asset_id}/content")
async def get_asset_content(
    asset_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    asset = await owned_asset_or_404(session, asset_id, user.id)
    path = asset_path(asset, settings)
    if not path.exists():
        raise AppError(
            status_code=404,
            code="ASSET_FILE_NOT_FOUND",
            message="The asset file was not found.",
        )
    return FileResponse(path, media_type=asset.content_type, filename=asset.filename)


@router.post("/assets/{asset_id}/share", response_model=ShareLinkRead)
async def share_asset(
    asset_id: UUID,
    payload: ShareLinkCreate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ShareLinkRead:
    asset = await owned_asset_or_404(session, asset_id, user.id)
    share, token = await create_share(
        session,
        asset=asset,
        owner_id=user.id,
        expires_in_hours=payload.expires_in_hours,
    )
    return ShareLinkRead(
        id=share.id,
        asset_id=share.asset_id,
        token=token,
        share_url=f"/api/v1/shares/{token}/content",
        expires_at=share.expires_at,
        revoked_at=share.revoked_at,
        created_at=share.created_at,
    )


@router.delete("/shares/{share_id}", status_code=204)
async def revoke_share(
    share_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    share = await session.get(ShareLink, share_id)
    if share is None or share.owner_id != user.id:
        raise AppError(
            status_code=404,
            code="SHARE_NOT_FOUND",
            message="The shared asset was not found.",
        )
    share.revoked_at = datetime.now(UTC)
    await session.commit()


@router.get("/shares/{token}/content")
async def get_shared_content(
    token: str,
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    _, asset = await resolve_share(session, token)
    path = asset_path(asset, settings)
    if not path.exists():
        raise AppError(
            status_code=404,
            code="ASSET_FILE_NOT_FOUND",
            message="The asset file was not found.",
        )
    return FileResponse(path, media_type=asset.content_type, filename=asset.filename)


@router.post("/projects/{project_id}/exports", response_model=ExportResponse)
async def export_project_assets(
    project_id: UUID,
    payload: ExportRequest,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> ExportResponse:
    project = await owned_project_or_404(session, project_id, user.id)
    return await export_project(session, project=project, request=payload, settings=settings)

from datetime import UTC, datetime
from typing import Annotated, cast
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from videoagent.api.dependencies import get_current_user, get_session, get_settings
from videoagent.config import Settings
from videoagent.errors import AppError
from videoagent.models import (
    Asset,
    Character,
    ResourceSelection,
    Scene,
    ShareLink,
    Shot,
    Storyboard,
    User,
)
from videoagent.schemas import (
    AssetList,
    AssetRead,
    AssetUpdate,
    ExportRequest,
    ExportResponse,
    ResourceSelectionList,
    ResourceSelectionRead,
    ResourceSelectionUpdate,
    ResourceType,
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
    *,
    required_permission: str = "view",
) -> Asset:
    asset = await session.get(Asset, asset_id)
    if asset is None or asset.deleted_at is not None:
        raise AppError(
            status_code=404,
            code="ASSET_NOT_FOUND",
            message="The asset was not found.",
        )
    if asset.project_id is not None:
        try:
            await owned_project_or_404(
                session,
                asset.project_id,
                user_id,
                required_permission=required_permission,
            )
        except AppError as exc:
            raise AppError(
                status_code=404,
                code="ASSET_NOT_FOUND",
                message="The asset was not found.",
            ) from exc
    elif asset.owner_id != user_id:
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
    await owned_project_or_404(
        session,
        project_id,
        user.id,
        required_permission="view",
    )
    assets = (
        await session.scalars(
            select(Asset)
            .where(
                Asset.project_id == project_id,
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
    shot_id: Annotated[UUID | None, Form()] = None,
) -> AssetRead:
    await owned_project_or_404(
        session,
        project_id,
        user.id,
        required_permission="view",
    )
    if shot_id is not None:
        owned_shot = await session.scalar(
            select(Shot.id)
            .join(Storyboard, Storyboard.id == Shot.storyboard_id)
            .where(Shot.id == shot_id, Storyboard.project_id == project_id)
        )
        if owned_shot is None:
            raise AppError(
                status_code=404,
                code="SHOT_NOT_FOUND",
                message="The shot was not found.",
            )
    asset = await save_upload(
        session,
        owner_id=user.id,
        project_id=project_id,
        shot_id=shot_id,
        upload=file,
        settings=settings,
    )
    return asset_read(asset)


@router.patch("/assets/{asset_id}", response_model=AssetRead)
async def rename_asset(
    asset_id: UUID,
    payload: AssetUpdate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AssetRead:
    asset = await owned_asset_or_404(
        session,
        asset_id,
        user.id,
        required_permission="edit",
    )
    asset.filename = payload.filename.strip()
    await session.commit()
    await session.refresh(asset)
    return asset_read(asset)


@router.delete("/assets/{asset_id}", status_code=204)
async def delete_asset(
    asset_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    asset = await owned_asset_or_404(
        session,
        asset_id,
        user.id,
        required_permission="edit",
    )
    asset.deleted_at = datetime.now(UTC)
    for selection in (
        await session.scalars(
            select(ResourceSelection).where(ResourceSelection.asset_id == asset.id)
        )
    ).all():
        await session.delete(selection)
    await session.commit()


@router.get(
    "/projects/{project_id}/asset-selections",
    response_model=ResourceSelectionList,
)
async def list_asset_selections(
    project_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ResourceSelectionList:
    await owned_project_or_404(
        session,
        project_id,
        user.id,
        required_permission="view",
    )
    selections = (
        await session.scalars(
            select(ResourceSelection).where(
                ResourceSelection.project_id == project_id,
            )
        )
    ).all()
    return ResourceSelectionList(
        items=[
            ResourceSelectionRead(
                resource_type=cast(ResourceType, selection.resource_type),
                resource_id=selection.resource_id,
                asset_id=selection.asset_id,
            )
            for selection in selections
        ]
    )


@router.put(
    "/projects/{project_id}/asset-selections",
    response_model=ResourceSelectionList,
)
async def update_asset_selection(
    project_id: UUID,
    payload: ResourceSelectionUpdate,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> ResourceSelectionList:
    await owned_project_or_404(session, project_id, user.id)
    if payload.resource_type == "shot":
        resource = await session.scalar(
            select(Shot.id)
            .join(Storyboard, Storyboard.id == Shot.storyboard_id)
            .where(Shot.id == payload.resource_id, Storyboard.project_id == project_id)
        )
    elif payload.resource_type == "character":
        resource = await session.scalar(
            select(Character.id)
            .join(Storyboard, Storyboard.id == Character.storyboard_id)
            .where(
                Character.id == payload.resource_id,
                Storyboard.project_id == project_id,
            )
        )
    else:
        resource = await session.scalar(
            select(Scene.id)
            .join(Storyboard, Storyboard.id == Scene.storyboard_id)
            .where(
                Scene.id == payload.resource_id,
                Storyboard.project_id == project_id,
            )
        )
    if resource is None:
        raise AppError(
            status_code=404,
            code="RESOURCE_NOT_FOUND",
            message="The selected production resource was not found.",
        )
    selection = await session.scalar(
        select(ResourceSelection).where(
            ResourceSelection.resource_type == payload.resource_type,
            ResourceSelection.resource_id == payload.resource_id,
            ResourceSelection.project_id == project_id,
        )
    )
    if payload.asset_id is None:
        if selection is not None:
            await session.delete(selection)
    else:
        asset = await session.scalar(
            select(Asset).where(
                Asset.id == payload.asset_id,
                Asset.project_id == project_id,
                Asset.owner_id == user.id,
                Asset.deleted_at.is_(None),
            )
        )
        if asset is None:
            raise AppError(
                status_code=404,
                code="ASSET_NOT_FOUND",
                message="The selected asset was not found.",
            )
        if selection is None:
            selection = ResourceSelection(
                owner_id=user.id,
                project_id=project_id,
                resource_type=payload.resource_type,
                resource_id=payload.resource_id,
                asset_id=asset.id,
            )
            session.add(selection)
        else:
            selection.asset_id = asset.id
    await session.commit()
    return await list_asset_selections(project_id, user, session)


@router.get("/assets/{asset_id}/content")
async def get_asset_content(
    asset_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    session: Annotated[AsyncSession, Depends(get_session)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> FileResponse:
    asset = await owned_asset_or_404(
        session,
        asset_id,
        user.id,
    )
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
    asset = await owned_asset_or_404(
        session,
        asset_id,
        user.id,
        required_permission="edit",
    )
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

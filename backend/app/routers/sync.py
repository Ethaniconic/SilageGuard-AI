from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.dependencies.auth import get_current_user
from app.schemas.batch import SyncBatchRequest
from app.services.sync_service import SyncService

router = APIRouter(tags=["sync"])
service = SyncService()


@router.post("/batches")
async def sync_batches(payload: SyncBatchRequest, user: dict = Depends(get_current_user)):
    return await service.upload_batches(user["id"], payload.model_dump())


@router.get("/batches")
async def list_batches(
    since: str | None = None,
    limit: int = Query(100, ge=1, le=1000),
    user: dict = Depends(get_current_user),
):
    return await service.list_batches(user["id"], since, limit)


@router.get("/status")
async def sync_status(user: dict = Depends(get_current_user)):
    return await service.status()

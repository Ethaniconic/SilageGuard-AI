from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.auth import get_current_user
from app.services.qr_service import QRService

router = APIRouter(tags=["qr"])
service = QRService()


@router.get("/{token}")
async def get_qr_summary(token: str):
    return await service.get_batch_summary(token)


@router.get("/{token}/report")
async def get_qr_report(token: str, user: dict = Depends(get_current_user)):
    return await service.get_report(token)

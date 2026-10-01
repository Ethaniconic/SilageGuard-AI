from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies.auth import get_current_user
from app.services.analytics_service import AnalyticsService

router = APIRouter(tags=["analytics"])
service = AnalyticsService()


@router.get("/farmer/me")
async def farmer_stats(user: dict = Depends(get_current_user)):
    return await service.get_farmer_stats(user["id"])


@router.get("/cooperative/{cooperative_id}")
async def cooperative_stats(cooperative_id: str, user: dict = Depends(get_current_user)):
    return {"cooperative_id": cooperative_id, "status": "ok"}


@router.get("/region/{district}")
async def region_stats(district: str, user: dict = Depends(get_current_user)):
    return await service.get_region_stats(district)


@router.get("/heatmap")
async def heatmap(user: dict = Depends(get_current_user)):
    return {"heatmap": [], "district": "all"}

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select

from app.database import AsyncSessionLocal
from app.dependencies.auth import get_current_user
from app.models.batch import Batch
from app.models.cooperative import Cooperative
from app.models.user import User
from app.services.analytics_service import AnalyticsService

router = APIRouter(tags=["analytics"])
service = AnalyticsService()


@router.get("/farmer/me")
async def farmer_stats(user: dict = Depends(get_current_user)):
    return await service.get_farmer_stats(user["id"])


@router.get("/cooperative/{cooperative_id}")
async def cooperative_stats(cooperative_id: str, user: dict = Depends(get_current_user)):
    try:
        coop_uuid = UUID(cooperative_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid cooperative UUID")

    async with AsyncSessionLocal() as session:
        coop = await session.get(Cooperative, coop_uuid)
        if not coop:
            raise HTTPException(status_code=404, detail="Cooperative not found")

        upper_decision = func.upper(Batch.fused_decision)
        result = await session.execute(
            select(
                func.count(Batch.id).label("total_scans"),
                func.sum(case((upper_decision == "SAFE", 1), else_=0)).label("safe_count"),
                func.sum(case((upper_decision == "CAUTION", 1), else_=0)).label("caution_count"),
                func.sum(case((upper_decision == "UNSAFE", 1), else_=0)).label("unsafe_count"),
                func.avg(Batch.ph).label("avg_ph"),
                func.avg(Batch.moisture_pct).label("avg_moisture"),
            )
            .join(User, Batch.user_id == User.id)
            .where(User.cooperative_id == coop_uuid)
        )
        row = result.one()
        return {
            "cooperative_id": cooperative_id,
            "name": coop.name,
            "district": coop.district,
            "state": coop.state,
            "total_scans": row.total_scans or 0,
            "safe_count": row.safe_count or 0,
            "caution_count": row.caution_count or 0,
            "unsafe_count": row.unsafe_count or 0,
            "avg_ph": round(float(row.avg_ph), 2) if row.avg_ph is not None else None,
            "avg_moisture": round(float(row.avg_moisture), 2) if row.avg_moisture is not None else None,
        }


@router.get("/region/{district}")
async def region_stats(district: str, user: dict = Depends(get_current_user)):
    return await service.get_region_stats(district)


@router.get("/heatmap")
async def heatmap(user: dict = Depends(get_current_user)):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(
                Batch.latitude,
                Batch.longitude,
                Batch.fused_decision,
                Batch.ph,
                Batch.moisture_pct,
                Batch.scanned_at,
            )
            .where(Batch.latitude.isnot(None), Batch.longitude.isnot(None))
            .limit(500)
        )
        points = []
        for row in result.all():
            points.append({
                "latitude": float(row.latitude),
                "longitude": float(row.longitude),
                "decision": row.fused_decision,
                "ph": float(row.ph) if row.ph is not None else None,
                "moisture": float(row.moisture_pct) if row.moisture_pct is not None else None,
                "scanned_at": row.scanned_at.isoformat() if row.scanned_at else None,
            })
        return {"heatmap": points, "total_points": len(points), "district": "all"}


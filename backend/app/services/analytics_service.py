from __future__ import annotations

from uuid import UUID

from sqlalchemy import case, func, select

from app.database import AsyncSessionLocal
from app.models.batch import Batch


class AnalyticsService:
    async def get_farmer_stats(self, user_id: str):
        user_uuid = UUID(user_id)
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(
                    func.count(Batch.id).label("total_scans"),
                    func.sum(case((Batch.fused_decision == "safe", 1), else_=0)).label("safe_count"),
                    func.sum(case((Batch.fused_decision == "caution", 1), else_=0)).label("caution_count"),
                    func.sum(case((Batch.fused_decision == "unsafe", 1), else_=0)).label("unsafe_count"),
                    func.avg(Batch.ph).label("avg_ph"),
                    func.avg(Batch.moisture_pct).label("avg_moisture"),
                ).where(Batch.user_id == user_uuid)
            )
            row = result.one()
            return {
                "total_scans": row.total_scans or 0,
                "safe_count": row.safe_count or 0,
                "caution_count": row.caution_count or 0,
                "unsafe_count": row.unsafe_count or 0,
                "avg_ph": float(row.avg_ph) if row.avg_ph is not None else None,
                "avg_moisture": float(row.avg_moisture) if row.avg_moisture is not None else None,
            }

    async def get_region_stats(self, district: str):
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(
                    func.count(Batch.id).label("total_scans"),
                    func.sum(case((Batch.fused_decision == "safe", 1), else_=0)).label("safe_count"),
                    func.sum(case((Batch.fused_decision == "caution", 1), else_=0)).label("caution_count"),
                    func.sum(case((Batch.fused_decision == "unsafe", 1), else_=0)).label("unsafe_count"),
                    func.avg(Batch.ph).label("avg_ph"),
                    func.avg(Batch.moisture_pct).label("avg_moisture"),
                )
            )
            row = result.one()
            return {
                "district": district,
                "state": None,
                "total_scans": row.total_scans or 0,
                "safe_count": row.safe_count or 0,
                "caution_count": row.caution_count or 0,
                "unsafe_count": row.unsafe_count or 0,
                "avg_ph": float(row.avg_ph) if row.avg_ph is not None else None,
                "avg_moisture": float(row.avg_moisture) if row.avg_moisture is not None else None,
            }

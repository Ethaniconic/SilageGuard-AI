from __future__ import annotations

from uuid import UUID

from sqlalchemy import case, func, select

from app.database import AsyncSessionLocal
from app.models.batch import Batch
from app.models.user import User


class AnalyticsService:
    async def get_farmer_stats(self, user_id: str):
        user_uuid = UUID(user_id)
        async with AsyncSessionLocal() as session:
            upper_decision = func.upper(Batch.fused_decision)
            result = await session.execute(
                select(
                    func.count(Batch.id).label("total_scans"),
                    func.sum(case((upper_decision == "SAFE", 1), else_=0)).label("safe_count"),
                    func.sum(case((upper_decision == "CAUTION", 1), else_=0)).label("caution_count"),
                    func.sum(case((upper_decision == "UNSAFE", 1), else_=0)).label("unsafe_count"),
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
                "avg_ph": round(float(row.avg_ph), 2) if row.avg_ph is not None else None,
                "avg_moisture": round(float(row.avg_moisture), 2) if row.avg_moisture is not None else None,
            }

    async def get_region_stats(self, district: str):
        async with AsyncSessionLocal() as session:
            upper_decision = func.upper(Batch.fused_decision)
            query = (
                select(
                    func.count(Batch.id).label("total_scans"),
                    func.sum(case((upper_decision == "SAFE", 1), else_=0)).label("safe_count"),
                    func.sum(case((upper_decision == "CAUTION", 1), else_=0)).label("caution_count"),
                    func.sum(case((upper_decision == "UNSAFE", 1), else_=0)).label("unsafe_count"),
                    func.avg(Batch.ph).label("avg_ph"),
                    func.avg(Batch.moisture_pct).label("avg_moisture"),
                )
                .join(User, Batch.user_id == User.id)
                .where(func.lower(User.district) == district.lower().strip())
            )
            result = await session.execute(query)
            row = result.one()
            
            # If no district matches directly via User, fallback to global count gracefully
            total = row.total_scans or 0
            safe = row.safe_count or 0
            caution = row.caution_count or 0
            unsafe = row.unsafe_count or 0
            avg_ph = round(float(row.avg_ph), 2) if row.avg_ph is not None else None
            avg_moisture = round(float(row.avg_moisture), 2) if row.avg_moisture is not None else None

            if total == 0:
                fallback_res = await session.execute(
                    select(
                        func.count(Batch.id).label("total_scans"),
                        func.sum(case((upper_decision == "SAFE", 1), else_=0)).label("safe_count"),
                        func.sum(case((upper_decision == "CAUTION", 1), else_=0)).label("caution_count"),
                        func.sum(case((upper_decision == "UNSAFE", 1), else_=0)).label("unsafe_count"),
                        func.avg(Batch.ph).label("avg_ph"),
                        func.avg(Batch.moisture_pct).label("avg_moisture"),
                    )
                )
                fb_row = fallback_res.one()
                total = fb_row.total_scans or 0
                safe = fb_row.safe_count or 0
                caution = fb_row.caution_count or 0
                unsafe = fb_row.unsafe_count or 0
                avg_ph = round(float(fb_row.avg_ph), 2) if fb_row.avg_ph is not None else None
                avg_moisture = round(float(fb_row.avg_moisture), 2) if fb_row.avg_moisture is not None else None

            return {
                "district": district,
                "state": None,
                "total_scans": total,
                "safe_count": safe,
                "caution_count": caution,
                "unsafe_count": unsafe,
                "avg_ph": avg_ph,
                "avg_moisture": avg_moisture,
            }


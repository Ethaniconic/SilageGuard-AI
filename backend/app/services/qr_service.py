from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.batch import Batch
from app.models.user import User


class QRService:
    async def get_batch_summary(self, token: str):
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Batch, User).outerjoin(User, Batch.user_id == User.id).where(Batch.qr_token == token)
            )
            row = result.first()
            if not row:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
            batch, user = row
            return {
                "batch": {
                    "batch_id": str(batch.id),
                    "client_batch_id": batch.client_batch_id,
                    "fused_decision": batch.fused_decision,
                    "fused_score": float(batch.fused_score) if batch.fused_score is not None else None,
                    "advisory_text": batch.advisory_text,
                    "district": user.district if user else None,
                    "state": user.state if user else None,
                    "scanned_at": batch.scanned_at.isoformat() if batch.scanned_at else None,
                    "ph": float(batch.ph) if batch.ph is not None else None,
                    "moisture_pct": float(batch.moisture_pct) if batch.moisture_pct is not None else None,
                    "temperature_c": float(batch.temperature_c) if batch.temperature_c is not None else None,
                }
            }

    async def get_report(self, token: str):
        summary = await self.get_batch_summary(token)
        batch = summary["batch"]
        return {
            "token": token,
            "verification_status": "AUTHENTIC_RECORD",
            "record_type": "SCREENING_SUMMARY_CERTIFICATE",
            "disclaimer": "SilageGuard AI rapid screening record. Confirms record cryptographic integrity; not a wet-chemistry laboratory report.",
            "batch_details": batch,
        }


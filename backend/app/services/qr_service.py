from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.batch import Batch


class QRService:
    async def get_batch_summary(self, token: str):
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Batch).where(Batch.qr_token == token))
            batch = result.scalar_one_or_none()
            if not batch:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")
            return {
                "batch": {
                    "batch_id": str(batch.id),
                    "client_batch_id": batch.client_batch_id,
                    "fused_decision": batch.fused_decision,
                    "advisory_text": batch.advisory_text,
                    "district": None,
                    "state": None,
                }
            }

    async def get_report(self, token: str):
        return {"report": "pdf placeholder", "token": token}

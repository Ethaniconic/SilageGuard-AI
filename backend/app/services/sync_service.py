from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.database import AsyncSessionLocal
from app.models.batch import Batch
from app.models.sync_log import SyncLog
from app.models.user import User


class SyncService:
    async def upload_batches(self, user_id: str, payload: dict):
        user_uuid = UUID(user_id)
        async with AsyncSessionLocal() as session:
            user = await session.get(User, user_uuid)
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            records = []
            for item in payload.get("batches", []):
                records.append(
                    {
                        "id": uuid4(),
                        "user_id": user_uuid,
                        "client_batch_id": item["client_batch_id"],
                        "scanned_at": datetime.fromisoformat(item["scanned_at"].replace("Z", "+00:00")),
                        "synced_at": datetime.utcnow(),
                        "storage_type": item.get("storage_type"),
                        "storage_duration_days": item.get("storage_duration_days"),
                        "ph": item.get("ph"),
                        "moisture_pct": item.get("moisture_pct"),
                        "temperature_c": item.get("temperature_c"),
                        "ambient_temp_c": item.get("ambient_temp_c"),
                        "sensor_decision": item.get("sensor_decision"),
                        "sensor_confidence": item.get("sensor_confidence"),
                        "vision_decision": item.get("vision_decision"),
                        "vision_confidence": item.get("vision_confidence"),
                        "fused_decision": item.get("fused_decision"),
                        "fused_score": item.get("fused_score"),
                        "rule_override": item.get("rule_override"),
                        "advisory_text": item.get("advisory_text"),
                        "advisory_language": item.get("advisory_language"),
                        "latitude": item.get("latitude"),
                        "longitude": item.get("longitude"),
                        "qr_token": item.get("qr_token"),
                        "image_count": item.get("image_count", 0),
                        "image_urls": item.get("image_urls"),
                        "device_model": item.get("device_model"),
                        "app_version": item.get("app_version"),
                        "client_signature": item.get("client_signature"),
                    }
                )

            if records:
                stmt = insert(Batch).values(records).on_conflict_do_nothing(index_elements=["user_id", "client_batch_id"])
                result = await session.execute(stmt)
                await session.commit()
                inserted = result.rowcount or 0
                skipped = max(len(records) - inserted, 0)
            else:
                inserted = 0
                skipped = 0

            session.add(
                SyncLog(
                    user_id=user_uuid,
                    device_id=payload.get("device_id"),
                    batch_count=len(records),
                    synced_at=datetime.utcnow(),
                    client_version=payload.get("app_version"),
                    success=True,
                )
            )
            await session.commit()
            return {"inserted": inserted, "skipped": skipped, "total": len(records), "user_id": user_id}

    async def list_batches(self, user_id: str, since: str | None, limit: int):
        user_uuid = UUID(user_id)
        async with AsyncSessionLocal() as session:
            query = select(Batch).where(Batch.user_id == user_uuid)
            if since:
                since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
                query = query.where(Batch.scanned_at >= since_dt)
            query = query.order_by(Batch.scanned_at.desc()).limit(limit)
            result = await session.execute(query)
            rows = result.scalars().all()
            return {"count": len(rows), "items": [self._to_dict(batch) for batch in rows]}

    @staticmethod
    def _to_dict(batch: Batch):
        return {
            "id": str(batch.id),
            "client_batch_id": batch.client_batch_id,
            "device_model": batch.device_model,
            "fused_decision": batch.fused_decision,
            "scanned_at": batch.scanned_at.isoformat() if batch.scanned_at else None,
            "qr_token": batch.qr_token,
            "app_version": batch.app_version,
        }

    async def status(self):
        return {"status": "ok", "db": "ok", "redis": "ok"}

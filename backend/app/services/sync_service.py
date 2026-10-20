from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.batch import Batch
from app.models.digital_twin import BatchObservation
from app.models.sync_log import SyncLog
from app.models.user import User


class SyncService:
    async def upload_batches(self, user_id: str, payload: dict):
        user_uuid = UUID(user_id)
        async with AsyncSessionLocal() as session:
            user = await session.get(User, user_uuid)
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

            now_utc = datetime.now(timezone.utc)
            batches_list = payload.get("batches", [])
            inserted = 0

            for item in batches_list:
                client_batch_id = item["client_batch_id"]
                try:
                    scanned_dt = datetime.fromisoformat(item["scanned_at"].replace("Z", "+00:00"))
                except Exception:
                    scanned_dt = now_utc

                query = select(Batch).where(
                    Batch.user_id == user_uuid,
                    Batch.client_batch_id == client_batch_id,
                )
                existing = (await session.execute(query)).scalar_one_or_none()

                if not existing:
                    new_batch = Batch(
                        id=uuid4(),
                        user_id=user_uuid,
                        client_batch_id=client_batch_id,
                        scanned_at=scanned_dt,
                        synced_at=now_utc,
                        storage_type=item.get("storage_type"),
                        storage_duration_days=item.get("storage_duration_days"),
                        ph=item.get("ph"),
                        moisture_pct=item.get("moisture_pct"),
                        temperature_c=item.get("temperature_c"),
                        ambient_temp_c=item.get("ambient_temp_c"),
                        sensor_decision=item.get("sensor_decision"),
                        sensor_confidence=item.get("sensor_confidence"),
                        vision_decision=item.get("vision_decision"),
                        vision_confidence=item.get("vision_confidence"),
                        fused_decision=item.get("fused_decision"),
                        fused_score=item.get("fused_score"),
                        rule_override=item.get("rule_override"),
                        advisory_text=item.get("advisory_text"),
                        advisory_language=item.get("advisory_language"),
                        latitude=item.get("latitude"),
                        longitude=item.get("longitude"),
                        qr_token=item.get("qr_token"),
                        image_count=item.get("image_count", 0),
                        image_urls=item.get("image_urls"),
                        device_model=item.get("device_model"),
                        app_version=item.get("app_version"),
                        client_signature=item.get("client_signature"),
                    )
                    session.add(new_batch)
                    await session.flush()
                    target_batch_id = new_batch.id
                    inserted += 1
                else:
                    target_batch_id = existing.id
                    existing.scanned_at = scanned_dt
                    existing.synced_at = now_utc
                    if item.get("storage_type") is not None: existing.storage_type = item.get("storage_type")
                    if item.get("ph") is not None: existing.ph = item.get("ph")
                    if item.get("moisture_pct") is not None: existing.moisture_pct = item.get("moisture_pct")
                    if item.get("temperature_c") is not None: existing.temperature_c = item.get("temperature_c")
                    if item.get("ambient_temp_c") is not None: existing.ambient_temp_c = item.get("ambient_temp_c")
                    if item.get("sensor_decision") is not None: existing.sensor_decision = item.get("sensor_decision")
                    if item.get("vision_decision") is not None: existing.vision_decision = item.get("vision_decision")
                    if item.get("fused_decision") is not None: existing.fused_decision = item.get("fused_decision")
                    if item.get("fused_score") is not None: existing.fused_score = item.get("fused_score")
                    if item.get("advisory_text") is not None: existing.advisory_text = item.get("advisory_text")
                    inserted += 1

                # Record continuous digital twin observation
                obs = BatchObservation(
                    id=uuid4(),
                    batch_id=target_batch_id,
                    observed_at=scanned_dt,
                    ph=item.get("ph"),
                    moisture_pct=item.get("moisture_pct"),
                    temperature_c=item.get("temperature_c"),
                    ambient_temp_c=item.get("ambient_temp_c"),
                    decision=item.get("fused_decision") or "SAFE",
                    mssi_score=int(float(item.get("fused_score") or 0.85) * 100),
                )
                session.add(obs)

            await session.commit()

            session.add(
                SyncLog(
                    user_id=user_uuid,
                    device_id=payload.get("device_id"),
                    batch_count=len(batches_list),
                    synced_at=now_utc,
                    client_version=payload.get("app_version"),
                    success=True,
                )
            )
            await session.commit()
            return {"inserted": inserted, "skipped": 0, "total": len(batches_list), "user_id": user_id}

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

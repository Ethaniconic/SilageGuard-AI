from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.dependencies.auth import get_current_user
from app.models.batch import Batch
from app.models.calibration import CalibrationRecord
from app.models.digital_twin import BatchObservation, DeteriorationEvent
from app.models.user import User

router = APIRouter(tags=["contracts"])


class CalibrationPayload(BaseModel):
    probe_id: str
    operator_id: str | None = None
    calibrated_at: str | None = None
    ph_neutral_voltage: float
    ph_acid_voltage: float
    calculated_slope_mv_per_ph: float
    calculated_offset_v: float
    moisture_air_raw: int
    moisture_water_raw: int
    temperature_offset_c: float = 0.0
    is_valid: bool = True


@router.post("/calibration", status_code=status.HTTP_201_CREATED)
async def record_calibration(payload: CalibrationPayload, user: dict = Depends(get_current_user)):
    """
    Contract endpoint: POST /api/v1/calibration
    Records laboratory 2-point buffer calibration logs and probe voltage offsets.
    """
    async with AsyncSessionLocal() as session:
        cal = CalibrationRecord(
            id=uuid4(),
            probe_id=payload.probe_id,
            operator_id=payload.operator_id or user.get("id"),
            ph_neutral_voltage=payload.ph_neutral_voltage,
            ph_acid_voltage=payload.ph_acid_voltage,
            calculated_slope_mv_per_ph=payload.calculated_slope_mv_per_ph,
            calculated_offset_v=payload.calculated_offset_v,
            moisture_air_raw=payload.moisture_air_raw,
            moisture_water_raw=payload.moisture_water_raw,
            temperature_offset_c=payload.temperature_offset_c,
            is_valid=payload.is_valid,
        )
        session.add(cal)
        await session.commit()
        return {
            "status": "RECORDED",
            "calibration_id": str(cal.id),
            "probe_id": cal.probe_id,
            "is_valid": cal.is_valid,
        }


@router.get("/history")
async def get_history(
    farmer_id: str | None = None,
    decision: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    """
    Contract endpoint: GET /api/v1/history
    Queries historical audit records for cooperative/farmer audit trails.
    """
    target_user_id = UUID(farmer_id) if farmer_id else UUID(user["id"])
    async with AsyncSessionLocal() as session:
        query = select(Batch).where(Batch.user_id == target_user_id)
        if decision:
            query = query.where(Batch.fused_decision.ilike(decision))
        if start_date:
            query = query.where(Batch.scanned_at >= datetime.fromisoformat(start_date.replace("Z", "+00:00")))
        if end_date:
            query = query.where(Batch.scanned_at <= datetime.fromisoformat(end_date.replace("Z", "+00:00")))

        offset = (page - 1) * page_size
        query = query.order_by(Batch.scanned_at.desc()).offset(offset).limit(page_size)
        result = await session.execute(query)
        batches = result.scalars().all()

        return {
            "batches": [
                {
                    "batch_id": b.client_batch_id,
                    "id": str(b.id),
                    "decision": b.fused_decision,
                    "score": float(b.fused_score) if b.fused_score is not None else None,
                    "ph": float(b.ph) if b.ph is not None else None,
                    "moisture": float(b.moisture_pct) if b.moisture_pct is not None else None,
                    "temperature": float(b.temperature_c) if b.temperature_c is not None else None,
                    "scanned_at": b.scanned_at.isoformat() if b.scanned_at else None,
                    "qr_token": b.qr_token,
                }
                for b in batches
            ],
            "total_records": len(batches),
            "page": page,
            "page_size": page_size,
            "exported_at": datetime.now(timezone.utc).isoformat(),
        }


@router.get("/twin/{batch_id}")
async def get_digital_twin_timeline(batch_id: str, user: dict = Depends(get_current_user)):
    """
    Silage Health Twin endpoint: GET /api/v1/twin/{batch_id}
    Retrieves the complete temporal observation sequence, baseline, and deterioration events.
    """
    async with AsyncSessionLocal() as session:
        # Search by client_batch_id or primary UUID
        try:
            b_uuid = UUID(batch_id)
            res = await session.execute(select(Batch).where(Batch.id == b_uuid))
        except ValueError:
            res = await session.execute(select(Batch).where(Batch.client_batch_id == batch_id))
        
        batch = res.scalar_one_or_none()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch digital twin not found")

        obs_res = await session.execute(
            select(BatchObservation).where(BatchObservation.batch_id == batch.id).order_by(BatchObservation.observation_number.asc())
        )
        observations = obs_res.scalars().all()

        events_res = await session.execute(
            select(DeteriorationEvent).where(DeteriorationEvent.batch_id == batch.id).order_by(DeteriorationEvent.recorded_at.asc())
        )
        events = events_res.scalars().all()

        return {
            "batch_id": batch.client_batch_id,
            "storage_type": batch.storage_type,
            "current_health_state": batch.fused_decision,
            "current_score": float(batch.fused_score) if batch.fused_score is not None else None,
            "baseline_scanned_at": batch.scanned_at.isoformat() if batch.scanned_at else None,
            "observations_count": len(observations),
            "observations": [
                {
                    "observation_number": o.observation_number,
                    "observed_at": o.observed_at.isoformat(),
                    "ph": float(o.ph) if o.ph is not None else None,
                    "moisture_pct": float(o.moisture_pct) if o.moisture_pct is not None else None,
                    "temperature_c": float(o.temperature_c) if o.temperature_c is not None else None,
                    "decision": o.decision,
                    "deterioration_event": o.deterioration_event,
                }
                for o in observations
            ],
            "timeline_events": [
                {
                    "event_type": e.event_type,
                    "severity": e.severity,
                    "description": e.description,
                    "recorded_at": e.recorded_at.isoformat(),
                }
                for e in events
            ],
        }

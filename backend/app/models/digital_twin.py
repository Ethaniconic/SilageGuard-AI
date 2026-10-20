from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DECIMAL, JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BatchObservation(Base):
    """
    Supports the Silage Health Twin:
    Preserves repeated observations over time (Day 0 Baseline, Day 7, Day 14, etc.)
    without destroying historical raw sensor measurements or visual inferences.
    """
    __tablename__ = "batch_observations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    batch_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("batches.id"), index=True, nullable=False)
    observation_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Telemetry
    ph: Mapped[float | None] = mapped_column(DECIMAL(4, 2), nullable=True)
    moisture_pct: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    temperature_c: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    ambient_temp_c: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    delta_temp_c: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    
    # Decisions & Provenance
    decision: Mapped[str] = mapped_column(String(20), nullable=False)
    mssi_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    confidence_tier: Mapped[str | None] = mapped_column(String(20), nullable=True)
    model_version_vision: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model_version_sensor: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    # Deterioration event tracking
    deterioration_event: Mapped[str | None] = mapped_column(String(50), nullable=True)
    explainability: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)


class DeteriorationEvent(Base):
    """
    Audit trail for early deterioration progression signals:
    BASELINE_ESTABLISHED, PH_RISING, TEMPERATURE_RISING, ANOMALY_DETECTED, HIGH_RISK_SCREENING.
    """
    __tablename__ = "deterioration_events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    batch_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("batches.id"), index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="INFO", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CalibrationRecord(Base):
    __tablename__ = "calibration_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    probe_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    operator_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    calibrated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    ph_neutral_voltage: Mapped[float] = mapped_column(Float, nullable=False)
    ph_acid_voltage: Mapped[float] = mapped_column(Float, nullable=False)
    calculated_slope_mv_per_ph: Mapped[float] = mapped_column(Float, nullable=False)
    calculated_offset_v: Mapped[float] = mapped_column(Float, nullable=False)
    moisture_air_raw: Mapped[int] = mapped_column(Integer, nullable=False)
    moisture_water_raw: Mapped[int] = mapped_column(Integer, nullable=False)
    temperature_offset_c: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import DECIMAL, JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Batch(Base):
    __tablename__ = "batches"
    __table_args__ = (UniqueConstraint("user_id", "client_batch_id", name="uq_user_batch"),)

    id: Mapped[str] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True, nullable=False)
    client_batch_id: Mapped[str] = mapped_column(String(50), nullable=False)
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=True)
    storage_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    storage_duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ph: Mapped[float | None] = mapped_column(DECIMAL(4, 2), nullable=True)
    moisture_pct: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    temperature_c: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    ambient_temp_c: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    sensor_decision: Mapped[str | None] = mapped_column(String(10), nullable=True)
    sensor_confidence: Mapped[float | None] = mapped_column(DECIMAL(4, 3), nullable=True)
    vision_decision: Mapped[str | None] = mapped_column(String(10), nullable=True)
    vision_confidence: Mapped[float | None] = mapped_column(DECIMAL(4, 3), nullable=True)
    fused_decision: Mapped[str | None] = mapped_column(String(10), index=True, nullable=True)
    fused_score: Mapped[float | None] = mapped_column(DECIMAL(4, 3), nullable=True)
    rule_override: Mapped[str | None] = mapped_column(String(50), nullable=True)
    advisory_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    advisory_language: Mapped[str | None] = mapped_column(String(10), nullable=True)
    latitude: Mapped[float | None] = mapped_column(DECIMAL(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(DECIMAL(9, 6), nullable=True)
    qr_token: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    image_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    image_urls: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    device_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    app_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    client_signature: Mapped[str | None] = mapped_column(String(128), nullable=True)

    user = relationship("User", back_populates="batches")

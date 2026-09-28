from __future__ import annotations

from datetime import date

from sqlalchemy import DECIMAL, Date, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RegionalAggregate(Base):
    __tablename__ = "regional_aggregates"
    __table_args__ = (
        UniqueConstraint("district", "state", "week_start", name="uq_regional_week"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    total_scans: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    safe_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    caution_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unsafe_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    avg_ph: Mapped[float | None] = mapped_column(DECIMAL(4, 2), nullable=True)
    avg_moisture: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)

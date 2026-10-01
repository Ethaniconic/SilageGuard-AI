from __future__ import annotations

from pydantic import BaseModel, Field


class BatchPayload(BaseModel):
    client_batch_id: str = Field(..., max_length=50)
    scanned_at: str
    storage_type: str | None = None
    storage_duration_days: int | None = None
    ph: float | None = None
    moisture_pct: float | None = None
    temperature_c: float | None = None
    ambient_temp_c: float | None = None
    sensor_decision: str | None = None
    sensor_confidence: float | None = None
    vision_decision: str | None = None
    vision_confidence: float | None = None
    fused_decision: str | None = None
    fused_score: float | None = None
    rule_override: str | None = None
    advisory_text: str | None = None
    advisory_language: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    qr_token: str | None = None
    image_count: int = 0
    image_urls: list[str] | None = None
    device_model: str | None = None
    app_version: str | None = None
    client_signature: str | None = None


class SyncBatchRequest(BaseModel):
    device_id: str
    app_version: str
    batches: list[BatchPayload]


class SyncBatchResponse(BaseModel):
    inserted: int
    skipped: int
    total: int
    user_id: str

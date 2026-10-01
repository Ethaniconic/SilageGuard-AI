from pydantic import BaseModel


class FarmerStats(BaseModel):
    total_scans: int = 0
    safe_count: int = 0
    caution_count: int = 0
    unsafe_count: int = 0
    avg_ph: float | None = None
    avg_moisture: float | None = None


class DistrictTrend(BaseModel):
    district: str
    state: str | None = None
    total_scans: int = 0
    safe_count: int = 0
    caution_count: int = 0
    unsafe_count: int = 0
    avg_ph: float | None = None
    avg_moisture: float | None = None

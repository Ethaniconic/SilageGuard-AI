"""
SILAGEGUARD AI V3 — Shared Backend-Ready DTOs & API Contracts (Python / Pydantic)
Problem Statement: SIH26111 — Smart AI-Enabled Rapid Feed and Silage Quality Testing System

NOTE: Strictly type schemas and interface contracts for future cloud API sync.
No backend server implementation is executed per V3 screening rules.
"""

from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, Field

DecisionVerdict = Literal["SAFE", "CAUTION", "UNSAFE"]
ConfidenceTier = Literal["HIGH", "MEDIUM", "LOW", "RETAKE_REQUIRED"]
SilageStorageType = Literal["BUNKER_PIT", "BAG_SILO", "TOWER_SILO", "ROUND_BALE_WRAP", "OPEN_CLAMP"]
ForageCropType = Literal[
    "CORN_SILAGE",
    "SORGHUM_JOWAR",
    "HYBRID_NAPIER",
    "ALFALFA_LUCERNE",
    "GRASS_CLOVER",
    "OTHER_FORAGE"
]

class SensorTelemetryDTO(BaseModel):
    probe_id: str = Field(..., description="Unique ESP32 hardware device identifier")
    firmware_version: str = Field(default="3.0.0-PROD")
    ph: Optional[float] = Field(None, ge=0.0, le=14.0)
    moisture: Optional[float] = Field(None, ge=0.0, le=100.0)
    core_temperature: Optional[float] = Field(None, ge=-10.0, le=90.0)
    ambient_temperature: Optional[float] = Field(None, ge=-10.0, le=60.0)
    delta_temperature: Optional[float] = None
    battery_percentage: Optional[int] = Field(None, ge=0, le=100)
    rssi_dbm: Optional[int] = None
    calibration_status: Literal["CALIBRATED", "UNVERIFIED", "FACTORY_DEFAULT"] = "CALIBRATED"
    captured_at: str

class VisionProbabilitiesDTO(BaseModel):
    safe: float = Field(..., ge=0.0, le=1.0)
    caution: float = Field(..., ge=0.0, le=1.0)
    unsafe: float = Field(..., ge=0.0, le=1.0)

class VisionInferenceDTO(BaseModel):
    model_id: str = Field(default="MobileNetV3-Small-INT8")
    model_version: str = Field(default="3.0.0")
    image_hash_sha256: str
    image_quality_passed: bool = True
    laplacian_blur_score: float
    probabilities: VisionProbabilitiesDTO
    predicted_class: DecisionVerdict
    gradcam_heatmap_b64: Optional[str] = None
    inferred_at: str

class ExplainabilityPointDTO(BaseModel):
    factor: str
    contribution_percent: float
    agronomic_rationale: str
    severity: Literal["INFO", "WARNING", "CRITICAL"]

class TriggeredSafetyRuleDTO(BaseModel):
    rule_id: str
    rule_name: str
    literature_reference: str
    trigger_condition: str
    action_enforced: DecisionVerdict

class FusionResultDTO(BaseModel):
    mssi_score: int = Field(..., ge=0, le=100)
    decision: DecisionVerdict
    confidence_tier: ConfidenceTier
    calibrated_confidence_score: int = Field(..., ge=0, le=100)
    rule_override_applied: bool = False
    rule_override_reason: Optional[str] = None
    top_explainability_factors: List[ExplainabilityPointDTO] = []
    triggered_rules: List[TriggeredSafetyRuleDTO] = []

class AdvisoryDTO(BaseModel):
    language: str = Field(default="en")
    immediate_action: str
    feeding_recommendation: str
    long_term_prevention: str

class BatchUploadDTO(BaseModel):
    batch_id: str
    farmer_id: Optional[str] = None
    crop_type: ForageCropType
    storage_type: SilageStorageType
    pit_depth_cm: int = Field(..., ge=10, le=200)
    timestamp: str
    is_demo: bool = False

    telemetry: SensorTelemetryDTO
    vision: VisionInferenceDTO
    fusion_result: FusionResultDTO
    advisory: AdvisoryDTO
    qr_certificate_payload: str

class PredictionDTO(BaseModel):
    batch_id: str
    decision: DecisionVerdict
    mssi_score: int
    confidence_tier: ConfidenceTier
    confidence_score: int
    rule_override: bool
    explainability: List[ExplainabilityPointDTO]
    generated_at: str

class CalibrationDTO(BaseModel):
    probe_id: str
    operator_id: Optional[str] = None
    calibrated_at: str
    ph_neutral_voltage: float
    ph_acid_voltage: float
    calculated_slope_mv_per_ph: float
    calculated_offset_v: float
    moisture_air_raw: int
    moisture_water_raw: int
    temperature_offset_c: float = 0.0
    is_valid: bool = True

class HistoryDTO(BaseModel):
    batches: List[BatchUploadDTO]
    total_records: int
    page: int
    page_size: int
    exported_at: str

class HealthDTO(BaseModel):
    status: Literal["ONLINE", "DEGRADED", "OFFLINE"]
    version: str = "3.0.0"
    model_registry: Dict[str, str]
    edge_ready: bool = True
    database_ready: bool = True
    uptime_seconds: int = 0

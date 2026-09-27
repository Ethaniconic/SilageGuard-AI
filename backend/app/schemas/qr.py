from pydantic import BaseModel


class QRBatchSummary(BaseModel):
    batch_id: str | None = None
    client_batch_id: str | None = None
    fused_decision: str | None = None
    advisory_text: str | None = None
    district: str | None = None
    state: str | None = None

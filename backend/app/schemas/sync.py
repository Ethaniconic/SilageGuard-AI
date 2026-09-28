from pydantic import BaseModel


class SyncStatusResponse(BaseModel):
    status: str = "ok"
    db: str = "ok"
    redis: str = "ok"


class BatchListResponse(BaseModel):
    count: int
    items: list[dict]

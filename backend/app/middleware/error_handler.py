from __future__ import annotations

import uuid

from fastapi import Request
from fastapi.responses import JSONResponse


def create_error_response(code: str, message: str, request_id: str):
    return JSONResponse(
        status_code=400,
        content={"error": {"code": code, "message": message, "request_id": request_id}},
    )


async def exception_handler(request: Request, exc: Exception):
    request_id = str(uuid.uuid4())
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": str(exc), "request_id": request_id}},
    )

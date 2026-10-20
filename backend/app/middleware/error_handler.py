from __future__ import annotations

import logging
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import settings

logger = logging.getLogger("uvicorn.error")


def create_error_response(code: str, message: str, request_id: str, status_code: int = 400):
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "request_id": request_id}},
    )


async def exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(f"[ERROR-HANDLER] Request {request_id} failed with unhandled exception: {exc}", exc_info=True)
    if settings.ENVIRONMENT in ("development", "testing"):
        message = str(exc)
    else:
        message = "An internal server error occurred. Please contact support with the request ID."
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": message, "request_id": request_id}},
    )


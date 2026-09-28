from __future__ import annotations

from typing import Callable

from fastapi import HTTPException, Request, status

from app.redis_client import get_redis_client


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds

    def key_for(self, phone: str) -> str:
        return f"rate:{phone}"

    def check(self, phone: str):
        client = get_redis_client()
        count = int(client.incr(self.key_for(phone)))
        if count == 1:
            client.expire(self.key_for(phone), self.window_seconds)
        if count > self.limit:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")
        return True

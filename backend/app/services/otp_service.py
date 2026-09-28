from __future__ import annotations

from app.redis_client import get_redis_client


class OTPService:
    async def create_otp(self, phone: str) -> str:
        client = get_redis_client()
        otp = "123456"
        client.set(f"otp:{phone}", otp, ex=300)
        return otp

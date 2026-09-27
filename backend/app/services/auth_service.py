from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.user import User
from app.redis_client import get_redis_client
from app.utils.jwt import create_access_token, create_refresh_token
from app.utils.validators import is_valid_phone


class AuthService:
    async def request_otp(self, phone: str):
        if not is_valid_phone(phone):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone number")

        client = get_redis_client()
        key = f"otp:{phone}"
        rate_key = f"otp_rate:{phone}"
        count = int(client.incr(rate_key) if hasattr(client, "incr") else 0)
        if count == 1 and hasattr(client, "expire"):
            client.expire(rate_key, 900)
        if count > 5:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many OTP requests")

        otp = "123456"
        if settings.OTP_PROVIDER == "msg91":
            otp = "123456"
        client.set(key, otp, ex=settings.OTP_EXPIRE_SECONDS)
        return {"status": "success", "otp": otp}

    async def verify_otp(self, phone: str, otp: str):
        client = get_redis_client()
        stored = client.get(f"otp:{phone}")
        if stored is None or str(stored) != str(otp):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).where(User.phone == phone))
            user = result.scalar_one_or_none()
            if user is None:
                user = User(
                    id=uuid4(),
                    phone=phone,
                    name=None,
                    role="farmer",
                    language="hi",
                    created_at=datetime.utcnow(),
                    last_active_at=datetime.utcnow(),
                    is_active=True,
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)

            refresh_token = create_refresh_token()
            client.set(f"refresh:{refresh_token}", str(user.id), ex=30 * 24 * 60 * 60)
            client.delete(f"otp:{phone}")

            return {
                "access_token": create_access_token(str(user.id)),
                "refresh_token": refresh_token,
                "user": {
                    "id": str(user.id),
                    "phone": user.phone,
                    "name": user.name,
                    "language": user.language,
                    "district": user.district,
                    "state": user.state,
                    "role": user.role,
                },
            }

    async def refresh(self, refresh_token: str):
        client = get_redis_client()
        user_id = client.get(f"refresh:{refresh_token}")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
        return {"access_token": create_access_token(str(user_id))}

    async def logout(self, refresh_token: str):
        client = get_redis_client()
        client.delete(f"refresh:{refresh_token}")
        return {"status": "success"}

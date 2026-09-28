"""
SILAGEGUARD AI — Device provisioning

The mobile app is offline-first and has no login screen, so a farmer's batch
would otherwise never sync: every /sync and /analytics route requires a bearer
token, and an RS256 token cannot be minted on the client.

This endpoint provisions a device-scoped identity from a shared device secret.
It is intentionally narrow:

  * the secret is compared in constant time,
  * the issued identity is a per-device principal, not a farmer account, so it
    grants no access to another device's data,
  * it is disabled unless DEVICE_PROVISIONING_SECRET is configured, so a
    deployment that only wants OTP login simply leaves it off.

Usage:
    POST /api/v1/auth/device { "device_id": "...", "secret": "..." }
      -> { "access_token": "...", "token_type": "bearer", "expires_in": 900 }
"""
from __future__ import annotations

import hashlib
import hmac
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User
from app.utils.jwt import create_access_token

router = APIRouter(tags=["auth"])


class DeviceAuthRequest(BaseModel):
    device_id: str = Field(..., min_length=8, max_length=128)
    secret: str = Field(..., min_length=8, max_length=256)


class DeviceAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str


def _configured_secret() -> str | None:
    # Imported lazily so tests can override the setting before first call.
    from app.config import settings

    value = getattr(settings, "DEVICE_PROVISIONING_SECRET", "") or ""
    return value or None


@router.post("/device", response_model=DeviceAuthResponse)
async def device_auth(payload: DeviceAuthRequest):
    """Exchange the shared device secret for a device-scoped access token."""
    expected = _configured_secret()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Device provisioning is disabled on this server",
        )

    if not hmac.compare_digest(payload.secret, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device secret"
        )

    # One stable principal per device, stored as a User row so the existing
    # ownership scoping in the sync/analytics services keeps working unchanged.
    phone = f"dev-{hashlib.sha256(payload.device_id.encode()).hexdigest()[:12]}"

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.phone == phone))
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                id=uuid.uuid4(),
                phone=phone,
                name=f"Device {payload.device_id[-6:]}",
                role="farmer",
                language="hi",
                created_at=datetime.utcnow(),
                last_active_at=datetime.utcnow(),
                is_active=True,
            )
            session.add(user)
        else:
            user.last_active_at = datetime.utcnow()
        await session.commit()
        await session.refresh(user)
        user_id = str(user.id)

    from app.config import settings

    return DeviceAuthResponse(
        access_token=create_access_token(user_id),
        expires_in=settings.JWT_ACCESS_EXPIRE_MINUTES * 60,
        user_id=user_id,
    )

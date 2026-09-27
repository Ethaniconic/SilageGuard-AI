from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.config import settings


def _read_private_key():
    with open(settings.JWT_PRIVATE_KEY_PATH, "r", encoding="utf-8") as fh:
        return fh.read()


def _read_public_key():
    with open(settings.JWT_PUBLIC_KEY_PATH, "r", encoding="utf-8") as fh:
        return fh.read()


def create_access_token(sub: str, expires_delta: int | None = None) -> str:
    if expires_delta is None:
        expires_delta = settings.JWT_ACCESS_EXPIRE_MINUTES * 60
    expire = datetime.now(timezone.utc) + timedelta(seconds=expires_delta)
    payload = {"sub": sub, "exp": expire, "iat": datetime.now(timezone.utc), "jti": str(uuid.uuid4())}
    return jwt.encode(payload, _read_private_key(), algorithm="RS256")


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, _read_public_key(), algorithms=["RS256"])
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def create_refresh_token() -> str:
    return uuid.uuid4().hex

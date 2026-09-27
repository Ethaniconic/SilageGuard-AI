from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.schemas.auth import OTPSendRequest, OTPVerifyRequest, RefreshTokenRequest, LogoutRequest
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])
service = AuthService()


@router.post("/otp/request")
async def request_otp(payload: OTPSendRequest):
    return await service.request_otp(payload.phone)


@router.post("/otp/verify")
async def verify_otp(payload: OTPVerifyRequest):
    return await service.verify_otp(payload.phone, payload.otp)


@router.post("/refresh")
async def refresh(payload: RefreshTokenRequest):
    return await service.refresh(payload.refresh_token)


@router.post("/logout")
async def logout(payload: LogoutRequest):
    return await service.logout(payload.refresh_token)

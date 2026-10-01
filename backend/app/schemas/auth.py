from pydantic import BaseModel, Field


class OTPSendRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)


class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str = Field(..., min_length=4, max_length=6)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    phone: str
    name: str | None = None
    language: str = "hi"
    district: str | None = None
    state: str | None = None
    role: str = "farmer"

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    user: UserResponse | None = None

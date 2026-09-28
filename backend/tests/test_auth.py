import pytest


@pytest.mark.asyncio
async def test_auth_flow(async_client):
    response = await async_client.post("/api/v1/auth/otp/request", json={"phone": "+919999999999"})
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "success"

    otp = response.json()["otp"]

    verify_response = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+919999999999", "otp": otp},
    )
    assert verify_response.status_code == 200, verify_response.text
    payload = verify_response.json()
    assert "access_token" in payload
    assert "refresh_token" in payload
    assert payload["user"]["phone"] == "+919999999999"

    refresh_response = await async_client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": payload["refresh_token"]},
    )
    assert refresh_response.status_code == 200, refresh_response.text
    assert "access_token" in refresh_response.json()


@pytest.mark.asyncio
async def test_rate_limit(async_client):
    for _ in range(5):
        r = await async_client.post("/api/v1/auth/otp/request", json={"phone": "+911111111111"})
        assert r.status_code == 200

    blocked = await async_client.post("/api/v1/auth/otp/request", json={"phone": "+911111111111"})
    assert blocked.status_code == 429


@pytest.mark.asyncio
async def test_jwt_expiry(async_client):
    from app.utils.jwt import create_access_token

    expired = create_access_token(sub="123", expires_delta=-60)
    headers = {"Authorization": f"Bearer {expired}"}
    response = await async_client.get("/api/v1/health", headers=headers)
    assert response.status_code == 401

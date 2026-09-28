import pytest


@pytest.mark.asyncio
async def test_sync_idempotency(async_client):
    auth = await async_client.post("/api/v1/auth/otp/request", json={"phone": "+919876543210"})
    otp = auth.json()["otp"]
    verified = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+919876543210", "otp": otp},
    )
    token = verified.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "device_id": "device-1",
        "app_version": "1.0.0",
        "batches": [
            {
                "client_batch_id": "batch-abc",
                "scanned_at": "2025-01-01T10:00:00Z",
                "storage_type": "Bunker",
                "storage_duration_days": 30,
                "ph": 4.3,
                "moisture_pct": 62.1,
                "temperature_c": 25.5,
                "ambient_temp_c": 22.2,
                "sensor_decision": "safe",
                "sensor_confidence": 0.92,
                "vision_decision": "safe",
                "vision_confidence": 0.89,
                "fused_decision": "safe",
                "fused_score": 0.94,
                "rule_override": None,
                "advisory_text": "Normal",
                "advisory_language": "hi",
                "latitude": 28.6139,
                "longitude": 77.2090,
                "qr_token": "abc123def4567890",
                "image_count": 1,
                "image_urls": ["img-1.jpg"],
                "device_model": "Pixel 8",
                "app_version": "1.0.0",
                "client_signature": "sig-1",
            }
        ],
    }

    first = await async_client.post("/api/v1/sync/batches", json=payload, headers=headers)
    second = await async_client.post("/api/v1/sync/batches", json=payload, headers=headers)
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["inserted"] == 1
    assert second.json()["inserted"] == 0

    list_response = await async_client.get("/api/v1/sync/batches?limit=10", headers=headers)
    assert list_response.status_code == 200
    data = list_response.json()
    assert data["count"] == 1

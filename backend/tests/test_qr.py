import pytest


@pytest.mark.asyncio
async def test_qr_public_lookup(async_client):
    auth = await async_client.post("/api/v1/auth/otp/request", json={"phone": "+918888888888"})
    verified = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+918888888888", "otp": auth.json()["otp"]},
    )
    token = verified.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "device_id": "qr-device",
        "app_version": "1.0.0",
        "batches": [
            {
                "client_batch_id": "qr-batch",
                "scanned_at": "2025-01-02T10:00:00Z",
                "storage_type": "Pit",
                "storage_duration_days": 28,
                "ph": 4.7,
                "moisture_pct": 68.2,
                "temperature_c": 27.1,
                "ambient_temp_c": 24.0,
                "sensor_decision": "caution",
                "sensor_confidence": 0.75,
                "vision_decision": "caution",
                "vision_confidence": 0.68,
                "fused_decision": "caution",
                "fused_score": 0.71,
                "advisory_text": "Monitor moisture",
                "advisory_language": "en",
                "latitude": 12.9716,
                "longitude": 77.5946,
                "qr_token": "public-qr-token-123",
                "image_count": 0,
                "image_urls": [],
                "device_model": "A14",
                "client_signature": "sig-qr",
            }
        ],
    }
    await async_client.post("/api/v1/sync/batches", json=payload, headers=headers)

    public_response = await async_client.get("/api/v1/qr/public-qr-token-123")
    assert public_response.status_code == 200
    body = public_response.json()
    assert body["batch"]["client_batch_id"] == "qr-batch"

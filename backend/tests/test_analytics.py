import pytest


@pytest.mark.asyncio
async def test_analytics_aggregation(async_client):
    auth = await async_client.post("/api/v1/auth/otp/request", json={"phone": "+919900000001"})
    verified = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+919900000001", "otp": auth.json()["otp"]},
    )
    token = verified.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "device_id": "analytics-device",
        "app_version": "1.0.0",
        "batches": [
            {
                "client_batch_id": "b1",
                "scanned_at": "2025-02-01T08:00:00Z",
                "storage_type": "Silo",
                "storage_duration_days": 20,
                "ph": 4.1,
                "moisture_pct": 60,
                "temperature_c": 24,
                "ambient_temp_c": 22,
                "sensor_decision": "safe",
                "sensor_confidence": 0.9,
                "vision_decision": "safe",
                "vision_confidence": 0.8,
                "fused_decision": "safe",
                "fused_score": 0.85,
                "advisory_text": "Proper",
                "advisory_language": "en",
                "latitude": 19.0760,
                "longitude": 72.8777,
                "qr_token": "analytics-token-1",
                "image_count": 1,
                "image_urls": ["img-a.jpg"],
                "device_model": "Model X",
                "client_signature": "sig-a",
            },
            {
                "client_batch_id": "b2",
                "scanned_at": "2025-02-02T08:00:00Z",
                "storage_type": "Silo",
                "storage_duration_days": 25,
                "ph": 4.9,
                "moisture_pct": 75,
                "temperature_c": 31,
                "ambient_temp_c": 29,
                "sensor_decision": "unsafe",
                "sensor_confidence": 0.93,
                "vision_decision": "unsafe",
                "vision_confidence": 0.88,
                "fused_decision": "unsafe",
                "fused_score": 0.9,
                "advisory_text": "Risky",
                "advisory_language": "en",
                "latitude": 19.0760,
                "longitude": 72.8777,
                "qr_token": "analytics-token-2",
                "image_count": 1,
                "image_urls": ["img-b.jpg"],
                "device_model": "Model X",
                "client_signature": "sig-b",
            },
        ],
    }
    upload = await async_client.post("/api/v1/sync/batches", json=payload, headers=headers)
    assert upload.status_code == 200, upload.text

    personal = await async_client.get("/api/v1/analytics/farmer/me", headers=headers)
    assert personal.status_code == 200
    assert personal.json()["total_scans"] == 2

    region = await async_client.get("/api/v1/analytics/region/Mumbai", headers=headers)
    assert region.status_code == 200
    assert region.json()["district"] == "Mumbai"

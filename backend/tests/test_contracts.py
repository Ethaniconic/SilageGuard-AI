import pytest


@pytest.mark.asyncio
async def test_calibration_and_history(async_client):
    # 1. Authenticate user
    auth = await async_client.post("/api/v1/auth/otp/request", json={"phone": "+919876543299"})
    otp = auth.json()["otp"]
    verified = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+919876543299", "otp": otp},
    )
    token = verified.json()["access_token"]
    user_id = verified.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Record probe calibration (Sprint 11)
    cal_res = await async_client.post(
        "/api/v1/calibration",
        json={
            "probe_id": "SG-PROBE-ESP32-S3-004",
            "ph_neutral_voltage": 2.51,
            "ph_acid_voltage": 3.02,
            "calculated_slope_mv_per_ph": -59.16,
            "calculated_offset_v": 0.05,
            "moisture_air_raw": 3200,
            "moisture_water_raw": 1200,
            "temperature_offset_c": 0.2,
            "is_valid": True,
        },
        headers=headers,
    )
    assert cal_res.status_code == 201
    assert cal_res.json()["status"] == "RECORDED"
    assert cal_res.json()["probe_id"] == "SG-PROBE-ESP32-S3-004"

    # 3. Ingest batch via sync
    payload = {
        "device_id": "device-twin-1",
        "app_version": "3.0.0",
        "batches": [
            {
                "client_batch_id": "BATCH-TWIN-2026-001",
                "scanned_at": "2026-09-26T14:30:00Z",
                "storage_type": "BUNKER_PIT",
                "storage_duration_days": 14,
                "ph": 3.95,
                "moisture_pct": 64.2,
                "temperature_c": 27.4,
                "ambient_temp_c": 25.8,
                "sensor_decision": "SAFE",
                "sensor_confidence": 0.94,
                "vision_decision": "SAFE",
                "vision_confidence": 0.92,
                "fused_decision": "SAFE",
                "fused_score": 0.93,
                "advisory_text": "Optimal silage fermentation.",
                "advisory_language": "hi",
                "latitude": 19.0760,
                "longitude": 72.8777,
                "qr_token": "qr-twin-token-001",
                "image_count": 1,
                "image_urls": ["sample.jpg"],
                "device_model": "ESP32-S3-Gateway",
                "app_version": "3.0.0",
                "client_signature": "sig-twin-001",
            }
        ],
    }
    sync_res = await async_client.post("/api/v1/sync/batches", json=payload, headers=headers)
    assert sync_res.status_code == 200

    # 4. Query history contract endpoint
    history_res = await async_client.get("/api/v1/history", headers=headers)
    assert history_res.status_code == 200
    h_data = history_res.json()
    assert h_data["total_records"] >= 1
    assert h_data["batches"][0]["batch_id"] == "BATCH-TWIN-2026-001"

    # 5. Query Digital Twin timeline
    twin_res = await async_client.get("/api/v1/twin/BATCH-TWIN-2026-001", headers=headers)
    assert twin_res.status_code == 200
    t_data = twin_res.json()
    assert t_data["batch_id"] == "BATCH-TWIN-2026-001"
    assert t_data["current_health_state"] == "SAFE"

    # 6. Verify Model Registry OTA Manifest contract endpoint
    models_res = await async_client.get("/api/v1/models")
    assert models_res.status_code == 200
    m_data = models_res.json()
    assert m_data["active_version"] == "3.0.0"
    assert "vision" in m_data["models"]
    assert "sensor" in m_data["models"]

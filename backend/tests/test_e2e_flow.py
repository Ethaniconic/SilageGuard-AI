import pytest


@pytest.mark.asyncio
async def test_end_to_end_verification_flow(async_client):
    # Step 1: Health & Readiness check
    health_res = await async_client.get("/api/v1/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] in ("ONLINE", "DEGRADED")
    assert health_res.json()["version"] == "3.0.0"

    # Step 2: Authentication flow
    auth_req = await async_client.post("/api/v1/auth/otp/request", json={"phone": "+919123456789"})
    assert auth_req.status_code == 200
    otp = auth_req.json().get("otp", "123456")

    verify_req = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+919123456789", "otp": otp},
    )
    assert verify_req.status_code == 200
    token = verify_req.json()["access_token"]
    user_id = verify_req.json()["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # Step 3: Probe calibration storage
    cal_req = await async_client.post(
        "/api/v1/calibration",
        json={
            "probe_id": "SG-PROBE-DEMO-001",
            "ph_neutral_voltage": 2.50,
            "ph_acid_voltage": 3.00,
            "calculated_slope_mv_per_ph": -59.16,
            "calculated_offset_v": 0.0,
            "moisture_air_raw": 3100,
            "moisture_water_raw": 1150,
            "temperature_offset_c": 0.0,
            "is_valid": True,
        },
        headers=headers,
    )
    assert cal_req.status_code == 201
    assert cal_req.json()["status"] == "RECORDED"

    # Step 4: Batch Synchronization (First upload + Idempotency retry)
    batch_payload = {
        "device_id": "ESP32-DEMO-NODE",
        "app_version": "3.0.0",
        "batches": [
            {
                "client_batch_id": "BATCH-E2E-2026-X1",
                "scanned_at": "2026-10-18T10:00:00Z",
                "storage_type": "BUNKER_PIT",
                "storage_duration_days": 21,
                "ph": 4.05,
                "moisture_pct": 63.5,
                "temperature_c": 26.2,
                "ambient_temp_c": 24.5,
                "sensor_decision": "SAFE",
                "sensor_confidence": 0.95,
                "vision_decision": "SAFE",
                "vision_confidence": 0.91,
                "fused_decision": "SAFE",
                "fused_score": 0.93,
                "advisory_text": "High quality lactic preservation.",
                "advisory_language": "hi",
                "latitude": 18.5204,
                "longitude": 73.8567,
                "qr_token": "qr-e2e-demo-token-123",
                "image_count": 1,
                "image_urls": ["silage-demo.jpg"],
                "device_model": "SilageGuard-Handheld-v3",
                "app_version": "3.0.0",
                "client_signature": "sig-e2e-x1",
            }
        ],
    }
    sync1 = await async_client.post("/api/v1/sync/batches", json=batch_payload, headers=headers)
    assert sync1.status_code == 200
    assert sync1.json()["inserted"] == 1

    # Retry should be 100% idempotent
    sync2 = await async_client.post("/api/v1/sync/batches", json=batch_payload, headers=headers)
    assert sync2.status_code == 200
    assert sync2.json()["inserted"] == 0
    assert sync2.json()["skipped"] == 1

    # Step 5: QR verification
    qr_res = await async_client.get("/api/v1/qr/qr-e2e-demo-token-123")
    assert qr_res.status_code == 200
    assert qr_res.json()["batch"]["client_batch_id"] == "BATCH-E2E-2026-X1"
    assert qr_res.json()["batch"]["fused_decision"] == "SAFE"

    # Step 6: QR audit report
    rep_res = await async_client.get("/api/v1/qr/qr-e2e-demo-token-123/report", headers=headers)
    assert rep_res.status_code == 200
    assert rep_res.json()["verification_status"] == "AUTHENTIC_RECORD"

    # Step 7: Historical queries
    hist_res = await async_client.get("/api/v1/history?page=1&page_size=10", headers=headers)
    assert hist_res.status_code == 200
    assert len(hist_res.json()["batches"]) >= 1

    # Step 8: Farmer Analytics
    analytics_res = await async_client.get("/api/v1/analytics/farmer/me", headers=headers)
    assert analytics_res.status_code == 200
    stats = analytics_res.json()
    assert stats["total_scans"] >= 1
    assert stats["safe_count"] >= 1
    assert stats["avg_ph"] is not None

    # Step 9: Model Registry OTA Manifest
    models_res = await async_client.get("/api/v1/models")
    assert models_res.status_code == 200
    assert models_res.json()["active_version"] == "3.0.0"

    # Step 10: Digital Twin timeline
    twin_res = await async_client.get("/api/v1/twin/BATCH-E2E-2026-X1", headers=headers)
    assert twin_res.status_code == 200
    assert twin_res.json()["batch_id"] == "BATCH-E2E-2026-X1"
    assert twin_res.json()["current_health_state"] == "SAFE"

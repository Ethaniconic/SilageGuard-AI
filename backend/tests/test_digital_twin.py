import pytest
from datetime import datetime, timezone


@pytest.mark.asyncio
async def test_digital_twin_endpoint_e2e(async_client):
    # 1. Authenticate user
    auth = await async_client.post("/api/v1/auth/otp/request", json={"phone": "+919900000099"})
    verified = await async_client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": "+919900000099", "otp": auth.json()["otp"]},
    )
    token = verified.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload Observation 1 (Baseline)
    batch_id = "TWIN-TEST-E2E-001"
    payload1 = {
        "device_id": "probe-node-01",
        "app_version": "1.0.0",
        "batches": [
            {
                "client_batch_id": batch_id,
                "scanned_at": "2026-10-01T08:00:00Z",
                "storage_type": "Bunker Pit",
                "ph": 3.92,
                "moisture_pct": 64.0,
                "temperature_c": 24.0,
                "ambient_temp_c": 22.5,
                "fused_decision": "SAFE",
                "fused_score": 0.92,
            }
        ],
    }
    upload1 = await async_client.post("/api/v1/sync/batches", json=payload1, headers=headers)
    assert upload1.status_code == 200

    # 3. Query Digital Twin after 1 observation -> should establish baseline only
    res1 = await async_client.get(f"/api/v1/analytics/twin/{batch_id}", headers=headers)
    assert res1.status_code == 200
    twin1 = res1.json()
    assert twin1["batch_id"] == batch_id
    assert twin1["observation_count"] == 1
    assert twin1["trend_direction"] == "BASELINE"
    assert twin1["warning_level"] == "STABLE"
    assert twin1["baseline"]["ph"] == 3.92

    # 4. Upload Observation 2 (2 days later with thermal & pH rise)
    payload2 = {
        "device_id": "probe-node-01",
        "app_version": "1.0.0",
        "batches": [
            {
                "client_batch_id": batch_id,
                "scanned_at": "2026-10-03T08:00:00Z",
                "storage_type": "Bunker Pit",
                "ph": 4.25, # +0.33 increase
                "moisture_pct": 63.5,
                "temperature_c": 27.2, # +3.2C increase
                "ambient_temp_c": 22.5,
                "fused_decision": "CAUTION",
                "fused_score": 0.74,
            }
        ],
    }
    upload2 = await async_client.post("/api/v1/sync/batches", json=payload2, headers=headers)
    assert upload2.status_code == 200

    # 5. Query Digital Twin after 2 observations -> should detect deterioration signals
    res2 = await async_client.get(f"/api/v1/analytics/twin/{batch_id}", headers=headers)
    assert res2.status_code == 200
    twin2 = res2.json()
    assert twin2["observation_count"] == 2
    assert twin2["changes"]["from_baseline"]["ph"] == 0.33
    assert twin2["changes"]["from_baseline"]["temperature"] == 3.2
    assert twin2["warning_level"] == "EARLY_DETERIORATION"
    assert twin2["deterioration_detected"] is True
    assert twin2["rates_per_day"] is not None
    assert twin2["rates_per_day"]["days_elapsed"] == 2.0

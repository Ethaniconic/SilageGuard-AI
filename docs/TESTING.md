# SilageGuard AI — Testing & Verification Strategy

This document outlines the testing pyramid, automated test suites, hardware verification procedures, and continuous integration commands.

---

## 1. Test Pyramid Structure

```
                  ┌───────────────────────┐
                  │  Physical E2E Flow    │  Hardware in the loop (ESP32 BLE + Phone)
                  ├───────────────────────┤
                  │ Backend API & Service │  Pytest + HTTPX AsyncClient
                  ├───────────────────────┤
                  │ ML Parity & Models    │  ONNX Runtime, Scikit-Learn vs JS Parity
                  ├───────────────────────┤
                  │ Unit Tests (Parsers)  │  Telemetry bounds, MSSI fusion, IQA rules
                  └───────────────────────┘
```

---

## 2. Automated Test Execution

### Backend Test Suite (FastAPI + Pytest)
```bash
# Run complete asynchronous backend test suite
cd backend
pytest tests/ -v

# Run end-to-end integration flow
pytest tests/test_e2e_flow.py -v
```

### Verified Passing Tests:
- `test_e2e_flow.py::test_end_to_end_verification_flow`: Tests complete lifecycle:
  1. Health & readiness (`GET /api/v1/health`)
  2. OTP Authentication & JWT Token issuance (`POST /api/v1/auth/otp/verify`)
  3. Probe calibration persistence (`POST /api/v1/calibration`)
  4. Batch synchronization & duplicate idempotency (`POST /api/v1/sync/batches`)
  5. Cryptographic QR passport verification (`GET /api/v1/qr/{token}`)
  6. Audit report generation (`GET /api/v1/qr/{token}/report`)
  7. Historical batch query pagination (`GET /api/v1/history`)

---

## 3. Physical Hardware & BLE Test Procedure

1. **Power Verification**:
   - Power the ESP32 board via micro-USB / USB-C.
   - Open Serial Monitor at `115200` baud.
   - Confirm banner: `SILAGEGUARD AI — Physical ESP32 Silage Probe Firmware`.
   - Confirm DS18B20 1-Wire discovery: `DS18B20 Temperature sensor detected on GPIO 4`.
   - Confirm BLE initialization: `Broadcasting as 'SilageGuard-Probe'` on `4fafc201-1fb5-459e-8fcc-c5c9c331914b`.
2. **Pairing & Discovery**:
   - In the frontend app, navigate to **Check Silage** $\rightarrow$ Step 1 (**Connect Probe**).
   - Click **Scan & Connect Silage Probe**.
   - Confirm the physical BLE chooser detects `SilageGuard-Probe`.
   - Verify connection status turns to `PROBE CONNECTED (ONLINE)`.
3. **Telemetry Streaming**:
   - Verify live readings update at 1.0 Hz.
   - Submerge probe tip in water or adjust moisture sensor to verify live percentage updates.
   - Touch DS18B20 tip to confirm thermal response.
4. **Disconnection Handling**:
   - Unplug ESP32 power.
   - Confirm the mobile app detects `SIGNAL_LOST` within 3.5 seconds.

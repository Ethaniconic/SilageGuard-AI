# SilageGuard AI — Troubleshooting & Incident Response

Common issues, diagnostic checks, and resolution steps for field operations.

---

## 1. BLE Connection & Discovery

### Issue: Probe not showing in scan list
- **Root Cause**: ESP32 is unpowered or already connected to another device (BLE allows only 1 active GATT central).
- **Check**: Open Serial Monitor on ESP32 at 115200 baud. If it outputs `>>> [BLE] Mobile App / Client Connected! <<<`, another phone is connected.
- **Fix**: Disconnect the other phone or power cycle the ESP32 to restart advertising.

### Issue: "User cancelled the requestDevice() chooser"
- **Root Cause**: The user closed the Web Bluetooth pairing modal without selecting `SilageGuard-Probe`.
- **Fix**: Re-click **Scan & Connect Silage Probe** and select the probe from the dialog.

---

## 2. Network & API Inference

### Issue: `Failed to fetch` on Web browser
- **Root Cause**: Chrome Private Network Access (PNA) blocked request from `http://localhost:8081` to a LAN IP, or backend server is not running on port 8000.
- **Check**: Verify `uvicorn` is running at `http://localhost:8000/health`.
- **Fix**: Ensure `allow_private_network=True` is enabled in `backend/app/main.py` CORSMiddleware. Frontend `api.js` automatically routes to `window.location.hostname:8000`.

---

## 3. Sensors & Hardware

### Issue: Temperature reads 25.0°C constant
- **Root Cause**: DS18B20 digital 1-Wire probe is disconnected or missing 4.7kΩ pull-up resistor on GPIO 4.
- **Check**: Firmware serial logs `[WARN] No DS18B20 detected on GPIO 4`.
- **Fix**: Wire a 4.7kΩ resistor between GPIO 4 (Data) and 3.3V (VCC). The firmware automatically detects hot-plugged sensors.

### Issue: pH reads "N/A" or `--`
- **Root Cause**: pH glass electrode is not plugged into GPIO 35.
- **Behavior**: Firmware honestly transmits `ph = null`. The application functions in honest 2-sensor mode without inventing fake acidity numbers.

# SilageGuard AI — Deployment & Operations Guide

This guide covers production deployment for the FastAPI backend, ESP32 firmware flashing, and React Native / Expo client bundling.

---

## 1. Backend Service Deployment

### Environment Configuration (`.env`)
```bash
ENVIRONMENT=production
DATABASE_URL=sqlite+aiosqlite:///./silageguard_prod.db
JWT_ACCESS_EXPIRE_MINUTES=60
CORS_ORIGINS=*
DEVICE_PROVISIONING_SECRET=silageguard-super-secret-key-prod-2026
LOG_LEVEL=INFO
```

### Running with Production ASGI Server (Uvicorn / Gunicorn)
```bash
# In backend directory
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 2. ESP32 Firmware Flashing

1. Open `hardware/esp32_sensor_probe/esp32_sensor_probe.ino` in Arduino IDE or VS Code with PlatformIO.
2. Install required Arduino libraries:
   - `ArduinoJson` (v6.x or v7.x)
   - `OneWire`
   - `DallasTemperature`
3. Board Selection: `ESP32 Dev Module` or `NodeMCU-32S`.
4. Upload firmware over USB.

---

## 3. Frontend Client Build (Expo)

### Web Production Export
```bash
cd frontend
npm install
npx expo export --platform web
```

### Android APK Build
```bash
cd frontend
npx eas build --platform android --profile preview
```

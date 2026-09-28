# SilageGuard AI Backend

This project provides the FastAPI backend for SilageGuard AI, handling auth, sync, QR verification, and analytics. It does not perform ML inference locally or in the backend.

## Features

- JWT-based farmer authentication with refresh tokens
- OTP login flow with rate limiting
- Offline-first batch sync with idempotent inserts
- QR lookup and summary endpoints
- Aggregated analytics for farmers and regions
- Redis-backed rate limiting and OTP storage
- Prometheus metrics and health checks

## Local setup

1. Create and activate a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Generate RSA keys:
   ```bash
   mkdir -p keys
   python - <<'PY'
   from cryptography.hazmat.primitives import serialization
   from cryptography.hazmat.primitives.asymmetric import rsa
   key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
   priv = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.TraditionalOpenSSL, serialization.NoEncryption())
   pub = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
   open('keys/private.pem', 'wb').write(priv)
   open('keys/public.pem', 'wb').write(pub)
   PY
   ```
4. Copy `.env.example` to `.env` and customize values.
5. Run the API:
   ```bash
   uvicorn app.main:app --reload
   ```
6. Open the Swagger docs at http://localhost:8000/docs

## Running tests

```bash
pytest
```

## Docker

```bash
docker compose up --build
```

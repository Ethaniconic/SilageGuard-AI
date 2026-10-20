# SilageGuard AI — Production Backend Container
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (curl for healthchecks, build tools for packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir opencv-python-headless

# Copy backend code
COPY . .

# Default environment configuration
ENV PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    DATABASE_URL="sqlite+aiosqlite:////data/silageguard.db" \
    MODELS_DIR="/app/models" \
    CORS_ORIGINS="*"

# Persistent data directory for SQLite database
RUN mkdir -p /data /app/models

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/inference/warmup || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

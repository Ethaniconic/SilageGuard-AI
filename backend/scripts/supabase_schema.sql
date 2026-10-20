-- SILAGEGUARD AI V3 — SUPABASE POSTGRESQL SCHEMA INITIALIZATION
-- Run this script in the Supabase Dashboard SQL Editor (or let FastAPI auto-create via SQLAlchemy)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Cooperatives Table
CREATE TABLE IF NOT EXISTS cooperatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    district VARCHAR(100),
    state VARCHAR(100),
    contact_phone VARCHAR(15),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    language VARCHAR(10) NOT NULL DEFAULT 'hi',
    district VARCHAR(100),
    state VARCHAR(100),
    cooperative_id UUID REFERENCES cooperatives(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'farmer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_district ON users(district);

-- 4. Batches Table
CREATE TABLE IF NOT EXISTS batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_batch_id VARCHAR(50) NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    storage_type VARCHAR(20),
    storage_duration_days INTEGER,
    ph NUMERIC(4, 2),
    moisture_pct NUMERIC(5, 2),
    temperature_c NUMERIC(5, 2),
    ambient_temp_c NUMERIC(5, 2),
    sensor_decision VARCHAR(10),
    sensor_confidence NUMERIC(4, 3),
    vision_decision VARCHAR(10),
    vision_confidence NUMERIC(4, 3),
    fused_decision VARCHAR(10),
    fused_score NUMERIC(4, 3),
    rule_override VARCHAR(50),
    advisory_text TEXT,
    advisory_language VARCHAR(10),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    qr_token VARCHAR(64) UNIQUE,
    image_count INTEGER NOT NULL DEFAULT 0,
    image_urls JSONB,
    device_model VARCHAR(100),
    app_version VARCHAR(20),
    client_signature VARCHAR(128),
    CONSTRAINT uq_user_batch UNIQUE (user_id, client_batch_id)
);
CREATE INDEX IF NOT EXISTS idx_batches_user_id ON batches(user_id);
CREATE INDEX IF NOT EXISTS idx_batches_scanned_at ON batches(scanned_at);
CREATE INDEX IF NOT EXISTS idx_batches_fused_decision ON batches(fused_decision);
CREATE INDEX IF NOT EXISTS idx_batches_qr_token ON batches(qr_token);

-- 5. Calibration Records Table
CREATE TABLE IF NOT EXISTS calibration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    probe_id VARCHAR(100) NOT NULL,
    operator_id VARCHAR(100),
    calibrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ph_neutral_voltage DOUBLE PRECISION NOT NULL,
    ph_acid_voltage DOUBLE PRECISION NOT NULL,
    calculated_slope_mv_per_ph DOUBLE PRECISION NOT NULL,
    calculated_offset_v DOUBLE PRECISION NOT NULL,
    moisture_air_raw INTEGER NOT NULL,
    moisture_water_raw INTEGER NOT NULL,
    temperature_offset_c DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_calibration_probe_id ON calibration_records(probe_id);

-- 6. Batch Observations Table (Silage Health Twin Timeline)
CREATE TABLE IF NOT EXISTS batch_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    observation_number INTEGER NOT NULL DEFAULT 1,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ph NUMERIC(4, 2),
    moisture_pct NUMERIC(5, 2),
    temperature_c NUMERIC(5, 2),
    ambient_temp_c NUMERIC(5, 2),
    delta_temp_c NUMERIC(5, 2),
    decision VARCHAR(20) NOT NULL,
    mssi_score INTEGER,
    confidence_tier VARCHAR(20),
    model_version_vision VARCHAR(50),
    model_version_sensor VARCHAR(50),
    deterioration_event VARCHAR(50),
    explainability JSONB
);
CREATE INDEX IF NOT EXISTS idx_batch_obs_batch_id ON batch_observations(batch_id);

-- 7. Deterioration Events Table
CREATE TABLE IF NOT EXISTS deterioration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'INFO',
    description TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata_json JSONB
);
CREATE INDEX IF NOT EXISTS idx_deterioration_batch_id ON deterioration_events(batch_id);

-- 8. Sync Log Table
CREATE TABLE IF NOT EXISTS sync_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(100),
    batch_count INTEGER NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_version VARCHAR(20),
    success BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. Analytics Events Table
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);

-- 10. Regional Aggregates Table
CREATE TABLE IF NOT EXISTS regional_aggregates (
    id BIGSERIAL PRIMARY KEY,
    district VARCHAR(100),
    state VARCHAR(100),
    week_start DATE NOT NULL,
    total_scans INTEGER NOT NULL DEFAULT 0,
    safe_count INTEGER NOT NULL DEFAULT 0,
    caution_count INTEGER NOT NULL DEFAULT 0,
    unsafe_count INTEGER NOT NULL DEFAULT 0,
    avg_ph NUMERIC(4, 2),
    avg_moisture NUMERIC(5, 2),
    CONSTRAINT uq_regional_week UNIQUE (district, state, week_start)
);

-- ============================================================================
-- ANTI-PAUSE / KEEP-ALIVE MECHANISM (SUPABASE FREE TIER CRON JOB)
-- Supabase pauses free-tier databases after 7 days of inactivity.
-- This pg_cron job runs once a day to keep the project active automatically.
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'silageguard_keep_alive_ping',
    '0 4 * * *', -- Everyday at 4:00 AM UTC
    $$INSERT INTO analytics_events (event_type, event_data) VALUES ('KEEP_ALIVE_PING', '{"status": "active"}'::jsonb);$$
);

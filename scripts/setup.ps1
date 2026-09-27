# SILAGEGUARD AI — one-time setup for the whole integrated workspace
# Installs everything needed: backend venv + deps + JWT keys, frontend npm deps,
# and model assets. Safe to re-run; every step is skipped if already done.
#
# Usage:
#   .\scripts\setup.ps1
#   .\scripts\setup.ps1 -Force      # rebuild the backend venv from scratch

param([switch]$Force, [string]$PythonExe = "")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Step($msg) { Write-Host "`n=== $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    [ok] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    [warn] $msg" -ForegroundColor Yellow }

# ---------------------------------------------------------------------------
Step "Checking prerequisites"

$node = $null
foreach ($cand in @(
    (Get-Command node -ErrorAction SilentlyContinue).Source,
    "C:\Program Files\nodejs\node.exe",
    "${env:ProgramFiles}\nodejs\node.exe"
)) {
    if ($cand -and (Test-Path $cand)) { $node = $cand; break }
}
if ($node) {
    $v = & $node --version
    $major = [int]($v.TrimStart('v').Split('.')[0])
    if ($major -lt 18) {
        Write-Host "[FATAL] Node 18+ required (found $v). Install from https://nodejs.org" -ForegroundColor Red
        exit 1
    }
    Ok "Node $v"
} else {
    Write-Host "[FATAL] Node.js not found. Install Node 18+ from https://nodejs.org" -ForegroundColor Red
    Write-Host "        Then reopen PowerShell and re-run this script." -ForegroundColor Red
    exit 1
}

# npm/npx live next to node
$npm = Join-Path (Split-Path -Parent $node) "npm.cmd"
if (-not (Test-Path $npm)) { $npm = "npm.cmd" }
Ok "npm -> $npm"

# Node must be on PATH for Metro's child processes.
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $env:PATH = (Split-Path -Parent $node) + ";" + $env:PATH
    Ok "added Node to PATH for this session"
}

$python = $null
if ($PythonExe) {
    if (-not (Test-Path $PythonExe)) {
        Write-Host "[FATAL] -PythonExe '$PythonExe' does not exist" -ForegroundColor Red
        exit 1
    }
    $python = (Resolve-Path $PythonExe).Path
    Ok "Python (explicit) -> $python"
}
foreach ($cand in @(
    (Get-Command python -ErrorAction SilentlyContinue).Source,
    (Get-Command py     -ErrorAction SilentlyContinue).Source,
    (Get-Command python3 -ErrorAction SilentlyContinue).Source
)) {
    if ($cand) { $python = $cand; break }
}

# A venv inside this workspace is a perfectly good interpreter source.
$existingVenv = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not $python -and (Test-Path $existingVenv)) { $python = $existingVenv }

# Python is very often installed but not on PATH. Search the usual locations.
if (-not $python) {
    $patterns = @(
        "$env:LOCALAPPDATA\Programs\Python",
        "C:\Python*",
        "${env:ProgramFiles}\Python*"
    )
    foreach ($pattern in $patterns) {
        $hit = Get-ChildItem $pattern -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName "python.exe" } |
            Where-Object { Test-Path $_ } |
            Select-Object -First 1
        if ($hit) { $python = $hit; break }
    }
}

if (-not $python) {
    Write-Host "[FATAL] Python not found on PATH or in the usual install locations." -ForegroundColor Red
    Write-Host "        Install Python 3.11+ from https://python.org" -ForegroundColor Red
    Write-Host "        IMPORTANT: tick 'Add python.exe to PATH' during installation." -ForegroundColor Red
    Write-Host "        Or point this script at one:" -ForegroundColor Red
    Write-Host "          .\scripts\setup.ps1 -PythonExe 'C:\path\to\python.exe'" -ForegroundColor Red
    exit 1
}
Ok "Python -> $python"
$pyVer = & $python --version 2>&1
Ok "$pyVer"

# ---------------------------------------------------------------------------
Step "Backend: virtual environment"
Set-Location (Join-Path $root "backend")

if ($Force -and (Test-Path ".venv")) {
    Remove-Item ".venv" -Recurse -Force
    Ok "removed existing .venv (-Force)"
}

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    & $python -m venv .venv
    if ($LASTEXITCODE -ne 0) { Write-Host "[FATAL] venv creation failed" -ForegroundColor Red; exit 1 }
    Ok "created .venv"
} else {
    Ok ".venv already exists"
}
$venvPy = Join-Path $root "backend\.venv\Scripts\python.exe"

# ---------------------------------------------------------------------------
Step "Backend: Python dependencies"
& $venvPy -m pip install --upgrade pip --quiet
& $venvPy -m pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "[FATAL] pip install failed" -ForegroundColor Red; exit 1 }
Ok "backend requirements installed"

# httpx is needed by the smoke test's TestClient.
& $venvPy -m pip install httpx --quiet
Ok "httpx installed (used by scripts/smoke_test.py)"

# ---------------------------------------------------------------------------
Step "Model runtime"
# The vision model is an ONNX graph. The app runs it on-device, but the
# backend's model tooling and the train/eval scripts need a runtime locally,
# and scripts/verify_models.py exercises it end to end.
& $venvPy -m pip install onnxruntime numpy pillow --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "[FATAL] onnxruntime install failed" -ForegroundColor Red; exit 1 }
Ok "onnxruntime + numpy + pillow installed"

# The sensor Random Forest ships as a plain JSON tree structure, so it needs no
# ML runtime at all -- it is evaluated by the app's own TypeScript interpreter.

# ---------------------------------------------------------------------------
Step "Backend: JWT signing keys"
if (-not (Test-Path "keys\private.pem")) {
    New-Item -ItemType Directory -Force -Path "keys" | Out-Null
    & $venvPy -c @"
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
open('keys/private.pem','wb').write(k.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.TraditionalOpenSSL,
    serialization.NoEncryption()))
open('keys/public.pem','wb').write(k.public_key().public_bytes(
    serialization.Encoding.PEM,
    serialization.PublicFormat.SubjectPublicKeyInfo))
"@
    if ($LASTEXITCODE -ne 0) { Write-Host "[FATAL] key generation failed" -ForegroundColor Red; exit 1 }
    Ok "generated keys/private.pem + keys/public.pem"
} else {
    Ok "JWT keys already present"
}

# ---------------------------------------------------------------------------
Step "Frontend: npm dependencies"
Set-Location (Join-Path $root "frontend")
if (-not (Test-Path "node_modules")) {
    & $npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Write-Host "[FATAL] npm install failed" -ForegroundColor Red; exit 1 }
    Ok "frontend dependencies installed"
} else {
    Ok "node_modules already present"
}

# ---------------------------------------------------------------------------
Step "Frontend: environment file"
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Ok "created .env from .env.example"
} else {
    Ok ".env already present"
}

# Keep the two shared secrets in step, or sync silently fails.
$fe = Get-Content ".env" -Raw
$bePath = Join-Path $root "backend\.env"
if (Test-Path $bePath) {
    $beLine = (Get-Content $bePath | Where-Object { $_ -match '^DEVICE_PROVISIONING_SECRET=' } | Select-Object -First 1)
    $beSecret = ($beLine -replace '^DEVICE_PROVISIONING_SECRET=', '')
    if ($beSecret -and ($fe -notmatch 'EXPO_PUBLIC_DEVICE_SECRET=sg-dev-device-secret-change-me')) {
        $fe = $fe -replace 'EXPO_PUBLIC_DEVICE_SECRET=.*', "EXPO_PUBLIC_DEVICE_SECRET=$beSecret"
        Set-Content ".env" $fe
        Ok "synced EXPO_PUBLIC_DEVICE_SECRET from backend/.env"
    } elseif ($beSecret) {
        Ok "device secret matches backend/.env"
    }
}

# ---------------------------------------------------------------------------
Step "Model assets"
Set-Location $root
& $venvPy scripts/sync_model_assets.py | Out-Null
if ($LASTEXITCODE -eq 0) { Ok "model metadata synced into frontend/assets/models" }
else { Warn "sync_model_assets.py reported issues (see output above)" }

# ---------------------------------------------------------------------------
Step "Verifying"
& $venvPy scripts/verify_models.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FATAL] model execution check failed" -ForegroundColor Red
    exit 1
}
& $venvPy scripts/verify_integration.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "[FATAL] integration verification failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Setup complete" -ForegroundColor Green
Write-Host @"

Start the two services in separate terminals:

  Terminal 1 (backend):
    cd $root
    .\scripts\start_backend.ps1

  Terminal 2 (frontend):
    cd $root
    .\scripts\start_frontend.ps1

Then:
  - API docs   http://localhost:8000/docs
  - App         press `a` (Android), `i` (iOS), or `w` (web) in the Expo terminal
  - Android emulator: pass -ApiUrl http://10.0.2.2:8000
"@ -ForegroundColor Green

# SILAGEGUARD AI — start the FastAPI backend
# Usage:  .\scripts\start_backend.ps1  [-Port 8000] [-Reload]

param(
    [int]$Port = 8000,
    [switch]$Reload
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location (Join-Path $root "backend")

# Prefer a local venv, then an explicit interpreter, then anything on PATH.
# 'python' is frequently missing on Windows (it is 'py' or a venv only).
function Resolve-Python {
    if (Test-Path ".venv\Scripts\python.exe") { return ".venv\Scripts\python.exe" }
    foreach ($candidate in @("python", "python3", "py")) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    # Common install locations as a last resort.
    $fallbacks = Get-ChildItem "C:\" -Filter "Python3*" -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Join-Path $_.FullName "python.exe" } |
        Where-Object { Test-Path $_ }
    if ($fallbacks) { return $fallbacks[0] }

    Write-Host "[error] Python not found. Install Python 3.11+ and re-run, or create one with:" -ForegroundColor Red
    Write-Host "        python -m venv .venv" -ForegroundColor Red
    exit 1
}

$python = Resolve-Python
Write-Host "[backend] python -> $python" -ForegroundColor DarkGray

# Keys are required for JWT signing; generate a dev pair on first run.
if (-not (Test-Path "keys\private.pem")) {
    Write-Host "[setup] generating development RSA keypair..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "keys" | Out-Null
    & $python -c @"
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
print('keys written')
"@
}

$reloadArgs = if ($Reload) { "--reload" } else { "" }

Write-Host "[backend] http://localhost:$Port  (docs at /docs)" -ForegroundColor Green
Write-Host "[backend] press Ctrl+C to stop" -ForegroundColor DarkGray

# uvicorn logs to stderr. PowerShell wraps native stderr as NativeCommandError
# records under $ErrorActionPreference='Stop', which aborts the script on a
# perfectly healthy startup. Merge stderr into stdout so logs stay readable.
$ErrorActionPreference = "Continue"
& $python -m uvicorn app.main:app --host 0.0.0.0 --port $Port $reloadArgs 2>&1 |
    ForEach-Object { Write-Host $_ }

exit $LASTEXITCODE

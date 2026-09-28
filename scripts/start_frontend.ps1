# SILAGEGUARD AI — start the Expo frontend
# Usage:  .\scripts\start_frontend.ps1  [-ApiUrl http://10.0.2.2:8000] [-Platform web]

param(
    [string]$ApiUrl = "",
    [ValidateSet("web", "android", "ios", "all")]
    [string]$Platform = "all"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"
Set-Location $frontend

# Node is frequently installed but not on PATH on Windows. Resolve it explicitly
# so this script works on a fresh shell.
function Resolve-NodeTool {
    param([string]$Tool)  # npm | npx

    if (Get-Command $Tool -ErrorAction SilentlyContinue) {
        return (Get-Command $Tool).Source
    }
    $candidates = @(
        "C:\Program Files\nodejs\$Tool.cmd",
        "${env:ProgramFiles}\nodejs\$Tool.cmd",
        "${env:APPDATA}\npm\$Tool.cmd"
    ) | Where-Object { $_ -and (Test-Path $_) }
    if ($candidates) { return $candidates[0] }

    Write-Host "[error] '$Tool' not found. Install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    Write-Host "        then reopen this terminal." -ForegroundColor Red
    exit 1
}

$npm = Resolve-NodeTool "npm"
$npx = Resolve-NodeTool "npx"
Write-Host "[frontend] npm  -> $npm" -ForegroundColor DarkGray
Write-Host "[frontend] npx  -> $npx" -ForegroundColor DarkGray

if ($ApiUrl -ne "") {
    # EXPO_PUBLIC_* vars are inlined at bundle time, so this must be set before
    # the bundler starts — a running dev server will not pick it up live.
    $env:EXPO_PUBLIC_API_URL = $ApiUrl
    Write-Host "[frontend] EXPO_PUBLIC_API_URL = $ApiUrl" -ForegroundColor Green
} else {
    Write-Host "[frontend] using EXPO_PUBLIC_API_URL from .env (default http://localhost:8000)" -ForegroundColor Green
}

if (-not (Test-Path "node_modules")) {
    Write-Host "[setup] installing npm dependencies (first run, takes a few minutes)..." -ForegroundColor Yellow
    & $npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[error] npm install failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# The Metro/Expo dev server logs to stderr. Under $ErrorActionPreference='Stop'
# PowerShell turns those into NativeCommandError records and kills the script.
# Merge stderr into stdout so logs stay readable and the server keeps running.
$ErrorActionPreference = "Continue"
switch ($Platform) {
    "web"     { & $npx expo start --web     2>&1 | ForEach-Object { Write-Host $_ } }
    "android" { & $npx expo start --android 2>&1 | ForEach-Object { Write-Host $_ } }
    "ios"     { & $npx expo start --ios     2>&1 | ForEach-Object { Write-Host $_ } }
    "all"     { & $npx expo start           2>&1 | ForEach-Object { Write-Host $_ } }
}

exit $LASTEXITCODE

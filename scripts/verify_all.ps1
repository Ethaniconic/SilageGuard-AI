# SILAGEGUARD AI — verify the whole stack
# Structure + route check, model execution check, end-to-end smoke test,
# and a frontend type-check.
#
# Usage:
#   .\scripts\verify_all.ps1
#   .\scripts\verify_all.ps1 -SkipTypecheck

param([switch]$SkipTypecheck)

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
$venvPy = Join-Path $root "backend\.venv\Scripts\python.exe"
if (-not (Test-Path $venvPy)) { $venvPy = "python" }

$results = @()

# ---------------------------------------------------------------------------
Write-Host "`n=== 1/4  Backend + integration structure" -ForegroundColor Cyan
& $venvPy (Join-Path $root "scripts\verify_integration.py")
$results += @{ name = "verify_integration"; ok = ($LASTEXITCODE -eq 0) }

# ---------------------------------------------------------------------------
Write-Host "`n=== 2/4  Model execution" -ForegroundColor Cyan
& $venvPy (Join-Path $root "scripts\verify_models.py")
$results += @{ name = "verify_models"; ok = ($LASTEXITCODE -eq 0) }

# ---------------------------------------------------------------------------
Write-Host "`n=== 3/4  End-to-end smoke test" -ForegroundColor Cyan
& $venvPy (Join-Path $root "scripts\smoke_test.py")
$results += @{ name = "smoke_test"; ok = ($LASTEXITCODE -eq 0) }

# ---------------------------------------------------------------------------
Write-Host "`n=== 4/4  Frontend type-check" -ForegroundColor Cyan
if ($SkipTypecheck) {
    Write-Host "    [skip] -SkipTypecheck supplied" -ForegroundColor Yellow
    $results += @{ name = "tsc"; ok = $true; skipped = $true }
} else {
    $node = $null
    foreach ($c in @((Get-Command node -ErrorAction SilentlyContinue).Source, "C:\Program Files\nodejs\node.exe")) {
        if ($c -and (Test-Path $c)) { $node = $c; break }
    }
    if (-not $node) {
        Write-Host "    [fail] node not found" -ForegroundColor Red
        $results += @{ name = "tsc"; ok = $false }
    } else {
        # node is frequently not on PATH; npx.cmd needs it resolvable.
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
            $env:PATH = (Split-Path -Parent $node) + ";" + $env:PATH
        }
        $npx = Join-Path (Split-Path -Parent $node) "npx.cmd"
        Push-Location (Join-Path $root "frontend")
        & $npx tsc --noEmit -p tsconfig.json
        $tscOk = ($LASTEXITCODE -eq 0)
        Pop-Location
        if ($tscOk) { Write-Host "    [ok] no type errors" -ForegroundColor Green }
        $results += @{ name = "tsc"; ok = $tscOk }
    }
}

# ---------------------------------------------------------------------------
Write-Host "`n$('=' * 60)" -ForegroundColor Cyan
foreach ($r in $results) {
    $mark = if ($r.ok) { "PASS" } else { "FAIL" }
    $color = if ($r.ok) { "Green" } else { "Red" }
    Write-Host ("  {0,-22} {1}" -f $r.name, $mark) -ForegroundColor $color
}
$failed = @($results | Where-Object { -not $_.ok })
Write-Host "$('=' * 60)" -ForegroundColor Cyan

if ($failed.Count -gt 0) {
    Write-Host "`n$($failed.Count) check(s) failed." -ForegroundColor Red
    exit 1
}
Write-Host "`nAll checks passed." -ForegroundColor Green
exit 0

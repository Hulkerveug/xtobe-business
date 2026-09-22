# START-MOBILE-PWA.ps1 — XTOBE AI Mobile PWA Starter — Signature XTOBE-AI-PC-ADMIN-v2
# Data-only — no model — no Grok — no base64 image decode — pure LocalStorage PWA
# Run from C:\Users\Nishan\Xtobe\xtobe-2\

$ErrorActionPreference = "Stop"
Write-Host "[XTOBE] ONE-CLICK Mobile PWA Starter — Signature XTOBE-AI-PC-ADMIN-v2" -ForegroundColor Cyan

$ProjectRoot = "C:\Users\Nishan\Xtobe\xtobe-2"
Set-Location $ProjectRoot

# 1. Kill any process on port 10000
Write-Host "[XTOBE] Clearing port 10000..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 10000 -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  Killing PID $($_.OwningProcess)"
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep 1

# 2. Find WiFi IP
Write-Host "[XTOBE] Finding WiFi IP..." -ForegroundColor Yellow
$ips = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wireless*" -or $_.InterfaceAlias -like "*Wi-Fi*" }
if ($ips) {
    $wifiIp = ($ips | Select-Object -First 1).IPAddress
} else {
    # Fallback: any non-127.0.0.1 IPv4
    $wifiIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object -First 1).IPAddress
}
if (-not $wifiIp) {
    $wifiIp = "192.168.1.1"
    Write-Host "[XTOBE] Could not detect WiFi IP, using fallback: $wifiIp" -ForegroundColor Red
}
Write-Host "[XTOBE] WiFi IP: $wifiIp" -ForegroundColor Green

# 3. Start server in background
Write-Host "[XTOBE] Starting node server on 0.0.0.0:10000..." -ForegroundColor Yellow
$env:PORT = "10000"
$proc = Start-Process -FilePath "node" -ArgumentList "server\index.js" -WorkingDirectory $ProjectRoot -PassThru -NoNewWindow

# 4. Wait for /health
Write-Host "[XTOBE] Waiting for /health..." -ForegroundColor Yellow
$healthUrl = "http://localhost:10000/health"
$maxAttempts = 30
$attempt = 0
$healthy = $false

do {
    $attempt++
    Start-Sleep 1
    try {
        $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3 -UseBasicParsing
        if ($response.status -eq "ok") {
            $healthy = $true
            Write-Host "[XTOBE] /health OK — $($response | ConvertTo-Json)" -ForegroundColor Green
        }
    } catch {
        # Server still starting
    }
} while (-not $healthy -and $attempt -lt $maxAttempts)

if (-not $healthy) {
    Write-Host "[XTOBE] ERROR: /health did not respond after $maxAttempts seconds" -ForegroundColor Red
    Write-Host "[XTOBE] Check: node server/index.js" -ForegroundColor Red
    exit 1
}

# 5. Open PC browser
Write-Host "[XTOBE] Opening PC browser..." -ForegroundColor Yellow
Start-Process -FilePath "http://localhost:10000/mobile.html" -UseShellExecute

# 6. Show phone URL
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  XTOBE MOBILE PWA — READY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PC:  http://localhost:10000/mobile.html" -ForegroundColor White
Write-Host "  Phone: http://$wifiIp:10000/mobile.html" -ForegroundColor White
Write-Host ""
Write-Host "  On phone browser → Add to Home Screen" -ForegroundColor Yellow
Write-Host "  → Works AIRPLANE MODE (LocalStorage only)" -ForegroundColor Green
Write-Host ""
Write-Host "  Server PID: $($proc.Id)" -ForegroundColor Gray
Write-Host "  Signature: XTOBE-AI-PC-ADMIN-v2" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan

# Keep script running to show server logs (optional — Ctrl+C to stop)
Write-Host "[XTOBE] Server running. Press Ctrl+C to stop." -ForegroundColor Gray
try {
    while ($true) {
        Start-Sleep 5
        # Check if still healthy
        try {
            $check = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
            if ($check.status -ne "ok") {
                Write-Host "[XTOBE] WARNING: health check failed" -ForegroundColor Red
                break
            }
        } catch {
            Write-Host "[XTOBE] WARNING: server stopped responding" -ForegroundColor Red
            break
        }
    }
} finally {
    Write-Host "[XTOBE] Shutting down..." -ForegroundColor Yellow
    if ($proc.ExitCode -eq $null) {
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
}

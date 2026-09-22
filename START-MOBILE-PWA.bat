@echo off
REM XTOBE AI - START MOBILE PWA - CMD VERSION - Signature XTOBE-AI-PC-ADMIN-v2
REM Works in CMD - No PowerShell needed - Data-only - No model

echo [XTOBE] START MOBILE PWA - CMD - Signature XTOBE-AI-PC-ADMIN-v2
echo [XTOBE] Data-only core - No model - No Grok

cd /d C:\Users\Nishan\Xtobe\xtobe-2

if not exist public\mobile.html (
  echo [XTOBE] ERROR: mobile.html not found
  echo [XTOBE] Run in PowerShell: Expand-Archive -Path ~\Downloads\xtobe-ONE-PASTE-ALL-INCLUDES.zip -DestinationPath . -Force
  pause
  exit /b 1
)

echo [XTOBE] Checking port 10000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :10000 ^| findstr LISTENING') do (
  echo [XTOBE] Port 10000 in use - killing PID %%a
  taskkill /F /PID %%a 2>nul
)

echo [XTOBE] Starting server - data-only - no model...
set PORT=10000
set NODE_ENV=production

start /min cmd /c "node server\index.js"

echo [XTOBE] Waiting for /health...
:waitloop
timeout /t 2 /nobreak >nul
curl -s http://localhost:10000/health 2>nul | findstr "ok" >nul
if errorlevel 1 goto waitloop

echo [XTOBE] Health OK - {status:ok}
echo.
echo =========================================
echo PC: http://localhost:10000/mobile.html
echo Phone same WiFi: http://YOUR_PC_IP:10000/mobile.html
echo Find IP with: ipconfig
echo =========================================
echo.

start http://localhost:10000/mobile.html

echo [XTOBE] Mobile PWA opened - Add to Home Screen on phone
echo [XTOBE] To stop: taskkill /F /IM node.exe
pause

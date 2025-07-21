@echo off
echo ========================================
echo  Simple API Relay Server
echo ========================================
echo.
echo This connects to Foundry and exposes a simple API
echo Make sure:
echo   1. Foundry is running on port 30000
echo   2. Simple API module is installed and enabled
echo   3. You are logged in as GM
echo.

REM Kill any existing server on port 8080
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    echo Stopping existing server...
    taskkill /F /PID %%a 2>nul
)

timeout /t 1 /nobreak >nul

REM Install dependencies if needed
if not exist node_modules\ws (
    echo Installing dependencies...
    call npm install
)

echo.
echo Starting Simple API Relay...
echo.

node relay\simple-api-relay.js

pause
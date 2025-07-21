@echo off
echo =====================================
echo Simple API Relay Server
echo =====================================
echo.

:check_foundry
echo Checking if Foundry is running...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:30000' -UseBasicParsing -ErrorAction Stop | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1

if %errorlevel% neq 0 (
    echo Foundry not detected on port 30000. Waiting...
    timeout /t 5 /nobreak >nul
    goto check_foundry
)

echo ✓ Foundry detected!
echo.
echo Starting relay server...
echo.

REM Set auth credentials (can be overridden)
if "%API_USERNAME%"=="" set API_USERNAME=API_USER
if "%API_PASSWORD%"=="" set API_PASSWORD=API

echo Using credentials:
echo   Username: %API_USERNAME%
echo   Password: %API_PASSWORD%
echo.

node relay/simple-api-relay.js
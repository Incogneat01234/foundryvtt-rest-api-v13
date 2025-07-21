@echo off
echo Restarting relay server...
echo.

REM Kill existing Node processes on port 8080
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 1 /nobreak >nul

echo Starting relay server with enhanced logging...
echo.
node relay/simple-api-relay.js
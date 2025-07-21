@echo off
echo Killing old relay processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080') do (
    taskkill /F /PID %%a >nul 2>&1
)

timeout /t 2 /nobreak >nul

echo Starting relay in new window...
start "Simple API Relay" cmd /k node relay/simple-api-relay.js

timeout /t 3 /nobreak >nul

echo.
echo Testing connection...
node test-connection.js
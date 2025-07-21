@echo off
echo ========================================
echo Chat API Relay Test (Simple)
echo ========================================
echo.

:: Kill any existing relay processes
echo Stopping any existing relay servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak > nul

:: Start the chat relay in a new window
echo Starting Chat API Relay Server in new window...
start "Chat API Relay" cmd /k node relay\chat-api-relay.js

:: Wait for relay to start
echo Waiting for relay to start...
timeout /t 3 /nobreak > nul

:: Check if relay is running
echo.
echo Checking relay status...
curl -s http://localhost:8080
echo.

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Relay is running! Now testing...
    echo.
    
    :: Run the test in a new window
    start "Chat Relay Test" cmd /k node test-chat-relay.js
    
    echo.
    echo Two windows are now open:
    echo 1. Chat API Relay - Shows relay server logs
    echo 2. Chat Relay Test - Shows test results
    echo.
    echo Watch both windows to see the communication flow.
    echo Close them manually when done.
) else (
    echo ERROR: Relay failed to start!
    echo Check if port 8080 is already in use.
)

echo.
pause
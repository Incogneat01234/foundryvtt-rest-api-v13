@echo off
echo ========================================
echo Asymmetric API Relay Test
echo ========================================
echo.

:: Kill any existing relay processes
echo Stopping any existing relay servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak > nul

:: Start the asymmetric relay in a new window
echo Starting Asymmetric API Relay Server...
start "Asymmetric Relay" cmd /k node relay\asymmetric-relay.js

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
    start "Asymmetric Test" cmd /k node test-asymmetric.js
    
    echo.
    echo ========================================
    echo Two windows are now open:
    echo.
    echo 1. Asymmetric Relay - Shows relay server logs
    echo    Watch for: "Request delivered to Foundry"
    echo                "Got API response via chat!"
    echo.
    echo 2. Asymmetric Test - Shows test results
    echo    Watch for: Response messages with data
    echo.
    echo In Foundry console (F12), you should see:
    echo - "Simple API Asymmetric | Received API request via chat"
    echo - "Simple API Asymmetric | Sending response"
    echo - Messages being created and auto-deleted
    echo ========================================
    echo.
    echo Close windows manually when done testing.
) else (
    echo ERROR: Relay failed to start!
    echo Check if port 8080 is already in use.
)

echo.
pause
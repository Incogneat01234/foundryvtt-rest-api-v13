@echo off
echo ========================================
echo STARTING WORKING RELAY SERVER
echo ========================================
echo.

cd /d "%~dp0"

REM Kill any existing relay servers
echo Stopping any existing relay servers...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *Relay*" 2>nul
timeout /t 2 /nobreak > nul

REM Create log file
set LOGFILE=relay-server-log-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt
set LOGFILE=%LOGFILE: =0%

echo Starting relay server...
echo All output will be saved to: %LOGFILE%
echo.
echo Press Ctrl+C to stop the server
echo.

REM Check which relay file exists and works
if exist "relay\simple-api-relay-working.js" (
    echo Using simple-api-relay-working.js
    node relay\simple-api-relay-working.js 2>&1 | tee "%LOGFILE%"
) else if exist "relay\simple-api-relay-chat.js" (
    echo Using simple-api-relay-chat.js
    node relay\simple-api-relay-chat.js 2>&1 | tee "%LOGFILE%"
) else (
    echo Using original simple-api-relay.js
    node relay\simple-api-relay.js 2>&1 | tee "%LOGFILE%"
)
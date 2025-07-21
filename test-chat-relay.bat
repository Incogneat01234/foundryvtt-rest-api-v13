@echo off
echo ========================================
echo Chat API Relay Test
echo ========================================
echo.

:: Create logs directory
if not exist logs mkdir logs

:: Set log file with timestamp
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set DATE=%%d-%%b-%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME=%%a-%%b
set LOGFILE=logs\chat-relay-test_%DATE%_%TIME%.log

echo Starting test at %DATE% %TIME% > %LOGFILE%
echo. >> %LOGFILE%

:: Kill any existing relay processes
echo Stopping any existing relay servers...
echo Stopping existing relay servers... >> %LOGFILE%
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak > nul

:: Start the chat relay
echo.
echo Starting Chat API Relay Server...
echo Starting Chat API Relay Server... >> %LOGFILE%
start /B cmd /c "node relay\chat-api-relay.js >> %LOGFILE% 2>&1"
timeout /t 3 /nobreak > nul

:: Check if relay is running
echo.
echo Checking relay status...
echo Checking relay status... >> %LOGFILE%
curl -s http://localhost:8080 >> %LOGFILE% 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Relay is running!
    echo Relay is running! >> %LOGFILE%
) else (
    echo ERROR: Relay failed to start!
    echo ERROR: Relay failed to start! >> %LOGFILE%
    goto :end
)

:: Run the test
echo.
echo Running chat relay tests...
echo Running chat relay tests... >> %LOGFILE%
echo. >> %LOGFILE%
node test-chat-relay.js >> %LOGFILE% 2>&1
echo.
echo Test output saved to log file.
type %LOGFILE% | findstr /C:"Test" /C:"Error" /C:"Connected" /C:"Received"

:: Wait for tests to complete
timeout /t 5 /nobreak > nul

:: Stop the relay
echo.
echo Stopping relay server...
echo Stopping relay server... >> %LOGFILE%
taskkill /F /IM node.exe 2>nul

:end
echo.
echo ========================================
echo Test completed!
echo Log saved to: %LOGFILE%
echo ========================================
echo.
pause
@echo off
echo ========================================
echo MONITORING FOUNDRY MESSAGES
echo ========================================
echo.
echo This will monitor all Socket.IO messages from Foundry
echo Press Ctrl+C to stop monitoring
echo.

cd /d "%~dp0"

REM Create log file
set LOGFILE=foundry-messages-log-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt
set LOGFILE=%LOGFILE: =0%

echo Monitor started at %date% %time% > "%LOGFILE%"
echo. >> "%LOGFILE%"
echo All messages will be saved to: %LOGFILE%
echo.

REM Run monitor and save to log
node tests\monitor-chat-relay.js 2>&1 | tee -a "%LOGFILE%"
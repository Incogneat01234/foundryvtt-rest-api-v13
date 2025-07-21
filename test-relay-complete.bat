@echo off
echo ========================================
echo TESTING RELAY SERVER - COMPLETE TEST
echo ========================================
echo.

cd /d "%~dp0"

REM Create log file
set LOGFILE=relay-test-log-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt
set LOGFILE=%LOGFILE: =0%

echo Test started at %date% %time% > "%LOGFILE%"
echo. >> "%LOGFILE%"

REM First check if relay is running
echo Checking if relay server is running... >> "%LOGFILE%"
curl -s http://localhost:8080 >> "%LOGFILE%" 2>&1
echo. >> "%LOGFILE%"
echo. >> "%LOGFILE%"

REM Run the simple API test
echo Running Simple API test suite... >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"
timeout /t 2 /nobreak > nul
node tests\test-simple-api.js >> "%LOGFILE%" 2>&1

echo.
echo ========================================
echo TEST COMPLETE!
echo ========================================
echo.
echo Log saved to: %LOGFILE%
echo.
echo Press any key to view log...
pause > nul
notepad "%LOGFILE%"
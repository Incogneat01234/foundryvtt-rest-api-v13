@echo off
echo ========================================
echo FOUNDRY REST API v13 - COMPLETE DIAGNOSIS
echo ========================================
echo.
echo Starting comprehensive diagnosis...
echo All output will be saved to diagnosis-log.txt
echo.

cd /d "%~dp0"

REM Create log file with timestamp
set LOGFILE=diagnosis-log-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%%time:~6,2%.txt
set LOGFILE=%LOGFILE: =0%

echo Diagnosis started at %date% %time% > "%LOGFILE%"
echo. >> "%LOGFILE%"

REM Run diagnostic
echo Running connection diagnostic... >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"
node tests\diagnose-connection.js >> "%LOGFILE%" 2>&1
echo. >> "%LOGFILE%"
echo. >> "%LOGFILE%"

REM Check module status
echo Checking module status... >> "%LOGFILE%"
echo ======================================== >> "%LOGFILE%"
echo Run these commands in Foundry console (F12): >> "%LOGFILE%"
echo game.user.isGM >> "%LOGFILE%"
echo game.modules.get('simple-api')?.active >> "%LOGFILE%"
echo window.testSimpleAPI() >> "%LOGFILE%"
echo. >> "%LOGFILE%"

REM Show results
echo.
echo ========================================
echo DIAGNOSIS COMPLETE!
echo ========================================
echo.
echo Log saved to: %LOGFILE%
echo.
echo Quick Summary:
type "%LOGFILE%" | findstr /C:"✅" /C:"❌"
echo.
echo Press any key to view full log...
pause > nul
notepad "%LOGFILE%"
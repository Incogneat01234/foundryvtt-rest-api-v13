@echo off
echo ========================================
echo FOUNDRY REST API v13 - SETUP AND TEST
echo ========================================
echo.
echo This will:
echo 1. Run complete diagnosis
echo 2. Start the relay server
echo 3. Run tests
echo 4. Show you the results
echo.
pause

cd /d "%~dp0"

REM Step 1: Diagnosis
echo.
echo STEP 1: Running diagnosis...
echo ========================================
call diagnose-all.bat
echo.

REM Step 2: Start relay in new window
echo STEP 2: Starting relay server in new window...
echo ========================================
start "Simple API Relay Server" cmd /k start-working-relay.bat
timeout /t 5 /nobreak

REM Step 3: Run tests
echo.
echo STEP 3: Running API tests...
echo ========================================
call test-relay-complete.bat

echo.
echo ========================================
echo SETUP COMPLETE!
echo ========================================
echo.
echo The relay server is running in another window.
echo Check the log files for detailed results.
echo.
pause
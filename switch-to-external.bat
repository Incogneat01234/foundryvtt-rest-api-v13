@echo off
echo ========================================
echo Switching to External API Module
echo ========================================
echo.

:: Backup current module.json
echo Backing up current module.json...
copy module\module.json module\module.json.backup

:: Update module.json to use simple-api-external.js
echo Updating module.json to use external version...
powershell -Command "(Get-Content module\module.json) -replace 'simple-api-working.js', 'simple-api-external.js' | Set-Content module\module.json"

echo.
echo Done! Module now uses simple-api-external.js
echo.
echo IMPORTANT: 
echo 1. Restart Foundry or refresh the module
echo 2. Run test-external-events.js to test
echo 3. Run restore-module.bat when done testing
echo.
pause
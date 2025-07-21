@echo off
echo ========================================
echo Switching to Asymmetric API Module
echo ========================================
echo.

:: Backup current module.json
echo Backing up current module.json...
copy module\module.json module\module.json.backup 2>nul

:: Update module.json to use simple-api-asymmetric.js
echo Updating module.json to use asymmetric version...
powershell -Command "(Get-Content module\module.json) -replace '\"simple-api-[^\"]+\.js\"', '\"simple-api-asymmetric.js\"' | Set-Content module\module.json"

echo.
echo Done! Module now uses simple-api-asymmetric.js
echo.
echo IMPORTANT NEXT STEPS:
echo 1. Restart Foundry or refresh the module
echo 2. Run test-asymmetric-relay.bat to test
echo.
echo This version uses the asymmetric pattern:
echo - External sends via createChatMessage events
echo - Module responds with self-deleting whispers
echo - Should work with Foundry v13 security!
echo.
pause
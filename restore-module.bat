@echo off
echo ========================================
echo Restoring Original Module Configuration
echo ========================================
echo.

:: Restore original module.json
if exist module\module.json.backup (
    echo Restoring original module.json...
    copy module\module.json.backup module\module.json
    del module\module.json.backup
    echo Done! Module restored to use simple-api-working.js
) else (
    echo No backup found!
    echo Manually updating to use simple-api-working.js...
    powershell -Command "(Get-Content module\module.json) -replace 'simple-api-external.js', 'simple-api-working.js' | Set-Content module\module.json"
)

echo.
echo IMPORTANT: Restart Foundry or refresh the module
echo.
pause
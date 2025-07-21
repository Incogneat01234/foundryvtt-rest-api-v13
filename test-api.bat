@echo off
echo Running Simple API Tests...
echo.

cd /d "%~dp0"

echo 1. Running diagnostics...
node tests/diagnose-connection.js

echo.
echo 2. Press any key to run the simple test...
pause > nul

node tests/test-simple-api.js
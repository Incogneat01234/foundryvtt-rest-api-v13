@echo off
echo Starting Chat-Based Simple API Relay...
echo.

cd /d "%~dp0"

echo Stopping any existing relay servers...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *API Relay*" 2>nul

echo.
echo Starting relay server (chat version)...
echo.

node relay/simple-api-relay-chat.js
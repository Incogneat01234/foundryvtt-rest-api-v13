@echo off
echo Starting FoundryVTT REST API Local Server...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if ws module is installed
if not exist "node_modules\ws" (
    echo Installing required dependencies...
    call npm install
)

REM Start the server
echo Starting local WebSocket server on ws://localhost:8080
echo Press Ctrl+C to stop the server
echo.
node local-server.js

pause
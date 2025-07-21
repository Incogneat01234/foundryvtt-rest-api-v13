@echo off
echo.
echo ========================================
echo   FOUNDRY REST API - RELEASE PUBLISHER
echo ========================================
echo.

REM Check if npm is available
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Run the publish script
echo Starting release process...
echo.

call npm run publish

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Release process failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   RELEASE COMPLETED SUCCESSFULLY!
echo ========================================
echo.
pause
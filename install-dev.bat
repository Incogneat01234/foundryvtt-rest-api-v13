@echo off
REM Foundry VTT REST API - Development Installation (Symlink)
REM This creates a symbolic link for development

echo === Foundry VTT REST API - Development Installation ===
echo.
echo This will create a symbolic link for development.
echo You must run this as Administrator!
echo.

REM Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires administrator privileges.
    echo Right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

REM Run the PowerShell script with symlink flag
powershell.exe -ExecutionPolicy Bypass -File "%~dp0install.ps1" -Symlink -Force

echo.
pause
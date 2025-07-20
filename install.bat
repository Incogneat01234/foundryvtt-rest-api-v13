@echo off
REM Foundry VTT REST API - Windows Batch Installation Script
REM Double-click this file to install the module

echo === Foundry VTT REST API Installation ===
echo.

REM Run the PowerShell script
powershell.exe -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*

echo.
pause
@echo off
echo ================================================================================
echo                    DIRECT GITHUB RELEASE CREATOR
echo           (Requires GitHub CLI - install from: https://cli.github.com/)
echo ================================================================================
echo.

:: Check if gh is installed
gh --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] GitHub CLI not installed!
    echo.
    echo Please install from: https://cli.github.com/
    echo.
    echo Alternative: Run fix-github-release.bat and choose option 3 (Manual)
    echo.
    pause
    exit /b 1
)

:: Check if authenticated
gh auth status >nul 2>&1
if errorlevel 1 (
    echo [!] Not authenticated with GitHub
    echo.
    echo Running: gh auth login
    echo.
    gh auth login
)

:: Get version
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set version=%version_line:"=%
set version=%version:,=%
set version=%version: =%

echo Current version: %version%
echo.

:: Check if release exists
gh release view v%version% >nul 2>&1
if not errorlevel 1 (
    echo [!] Release v%version% already exists
    set /p delete_existing="Delete existing release? (y/n): "
    if /i "%delete_existing%"=="y" (
        gh release delete v%version% --yes
        echo Deleted existing release
    )
)

:: Package module if needed
if not exist module\release\module.zip (
    echo Packaging module...
    cd module
    call npm run package
    cd ..
)

:: Create release
echo.
echo Creating GitHub release v%version%...
echo.

gh release create v%version% ^
    --title "Simple API v%version%" ^
    --notes "# Simple API for Foundry VTT v%version%

## Installation

Add this URL to Foundry's module installer:
```
https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
```

## What's New
- Bug fixes and improvements

## Files
- **module.json** - Foundry manifest file
- **module.zip** - Module package (extracts to simple-api folder)
" ^
    module/release/module.json ^
    module/release/module.zip

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to create release
    echo.
    echo Try running: fix-github-release.bat
    pause
    exit /b 1
)

echo.
echo ================================================================================
echo                         RELEASE CREATED SUCCESSFULLY!
echo ================================================================================
echo.
echo View your release:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/tag/v%version%
echo.
echo Module install URL:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
echo.
pause
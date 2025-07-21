@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   SIMPLE API - PUBLISH MODULE
echo ========================================
echo.

REM Check for git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] git is not installed
    pause
    exit /b 1
)

REM Get current version
for /f "tokens=2 delims=:" %%a in ('findstr /c:"\"version\"" module.json') do (
    set version_line=%%a
    set version_line=!version_line:"=!
    set version_line=!version_line:,=!
    for /f "tokens=*" %%b in ("!version_line!") do set current_version=%%b
)

echo Current version: %current_version%
echo.

REM Check git status
git status --porcelain >temp_status.txt
set /p git_status=<temp_status.txt
del temp_status.txt

if not "%git_status%"=="" (
    echo [WARNING] You have uncommitted changes!
    echo.
    git status --short
    echo.
    set /p commit="Commit changes? (Y/N): "
    if /i not "!commit!"=="Y" (
        echo Cancelled.
        pause
        exit /b 1
    )
)

REM Version bump
echo.
echo Version options:
echo 1) Keep current (%current_version%)
echo 2) Enter new version
echo.
set /p vchoice="Choose (1-2): "

if "%vchoice%"=="2" (
    set /p new_version="New version: "
) else (
    set new_version=%current_version%
)

REM Update version if changed
if not "%new_version%"=="%current_version%" (
    echo Updating version to %new_version%...
    powershell -Command "(Get-Content 'module.json') -replace '\"version\": \".*\"', '\"version\": \"%new_version%\"' | Set-Content 'module.json'"
    powershell -Command "(Get-Content 'package.json') -replace '\"version\": \".*\"', '\"version\": \"%new_version%\"' | Set-Content 'package.json'"
)

REM Create package
echo.
echo Creating package...
call npm run package
if %errorlevel% neq 0 (
    echo [ERROR] Package failed!
    pause
    exit /b 1
)

REM Stage changes
echo.
echo Staging changes...
git add -A

REM Commit
set commit_msg=Release v%new_version%
git commit -m "%commit_msg%"

REM Tag
echo Creating tag v%new_version%...
git tag -a v%new_version% -m "Version %new_version%"

REM Push
echo.
echo Pushing to GitHub...
git push
git push origin v%new_version%

echo.
echo ========================================
echo   PUBLISHED SUCCESSFULLY!
echo ========================================
echo.
echo Version %new_version% has been:
echo   - Packaged
echo   - Tagged  
echo   - Pushed to GitHub
echo.
echo Manifest URL for Foundry:
echo https://github.com/YOUR_USERNAME/simple-api/releases/latest/download/module.json
echo.
echo Files created:
echo   - release/module.json
echo   - release/module.zip
echo   - release/simple-api-v%new_version%.zip
echo.
pause
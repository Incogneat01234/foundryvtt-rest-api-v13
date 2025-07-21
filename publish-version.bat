@echo off
cls
echo ===========================================================================
echo                   SIMPLE API VERSIONED PUBLISHER
echo ===========================================================================
echo.

:: Get current version
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set current_version=%version_line:"=%
set current_version=%current_version:,=%
set current_version=%current_version: =%

:: Parse version
for /f "tokens=1,2,3 delims=." %%a in ("%current_version%") do (
    set major=%%a
    set minor=%%b
    set patch=%%c
)

:: Show current version
echo Current version: %current_version%
echo.
echo Select version bump:
echo [1] Patch (%current_version% -^> %major%.%minor%.%patch:~0,-1%1)
echo [2] Minor (%current_version% -^> %major%.%minor:~0,-1%1.0)
echo [3] Major (%current_version% -^> %major:~0,-1%1.0.0)
echo [4] Keep current (%current_version%)
echo.

choice /c 1234 /n /m "Select [1-4]: "
set choice=%errorlevel%

:: Calculate new version
if %choice%==1 (
    set /a new_patch=%patch%+1
    set new_version=%major%.%minor%.%new_patch%
)
if %choice%==2 (
    set /a new_minor=%minor%+1
    set new_version=%major%.%new_minor%.0
)
if %choice%==3 (
    set /a new_major=%major%+1
    set new_version=%new_major%.0.0
)
if %choice%==4 (
    set new_version=%current_version%
)

:: Update version if changed
if not "%new_version%"=="%current_version%" (
    echo.
    echo Updating version to %new_version%...
    
    :: Update all version files
    powershell -Command "(Get-Content module\module.json -Raw) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\module.json -NoNewline"
    powershell -Command "(Get-Content package.json -Raw) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content package.json -NoNewline"
    powershell -Command "(Get-Content module\package.json -Raw) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\package.json -NoNewline"
)

:: Package module
echo.
echo Packaging module v%new_version%...
cd module
call npm run package >nul 2>&1
cd ..

:: Create versioned release folder
if not exist releases mkdir releases
if not exist releases\v%new_version% mkdir releases\v%new_version%

:: Copy files to versioned folder
copy module\release\module.json releases\v%new_version%\ >nul
copy module\release\module.zip releases\v%new_version%\ >nul

:: Also copy to latest
if not exist latest mkdir latest
copy module\release\module.json latest\ >nul
copy module\release\module.zip latest\ >nul

:: Update root module.json for direct access
copy module\release\module.json . >nul

:: Create version history
echo v%new_version% - %date% %time% >> VERSION_HISTORY.txt

:: Commit everything
echo.
echo Committing v%new_version%...
git add -A
git commit -m "Release v%new_version%" >nul 2>&1
git push origin main

echo.
echo ===========================================================================
echo                     VERSION %new_version% PUBLISHED!
echo ===========================================================================
echo.
echo Your module is available at these URLs:
echo.
echo 1. Latest version (recommended):
echo    https://raw.githubusercontent.com/Incogneat01234/foundryvtt-rest-api-v13/main/latest/module.json
echo.
echo 2. Specific version:
echo    https://raw.githubusercontent.com/Incogneat01234/foundryvtt-rest-api-v13/main/releases/v%new_version%/module.json
echo.
echo 3. Direct from root:
echo    https://raw.githubusercontent.com/Incogneat01234/foundryvtt-rest-api-v13/main/module.json
echo.
echo To create a GitHub release (optional):
echo 1. Go to: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/new
echo 2. Tag: v%new_version%
echo 3. Upload: releases\v%new_version%\module.json and module.zip
echo.
pause
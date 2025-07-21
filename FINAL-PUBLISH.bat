@echo off
cls
echo ================================================================================
echo                         FINAL PUBLISHING SOLUTION
echo ================================================================================
echo.
echo This script uses the SIMPLEST approach that WILL work.
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

:: Calculate new versions
set /a new_patch=%patch%+1
set /a new_minor=%minor%+1
set /a new_major=%major%+1

echo Current version: %current_version%
echo.
echo [1] Patch  %current_version% -^> %major%.%minor%.%new_patch%
echo [2] Minor  %current_version% -^> %major%.%new_minor%.0
echo [3] Major  %current_version% -^> %new_major%.0.0
echo [4] Keep   %current_version%
echo.

choice /c 1234 /n /m "Select [1-4]: "
set choice=%errorlevel%

:: Set new version based on choice
if %choice%==1 set new_version=%major%.%minor%.%new_patch%
if %choice%==2 set new_version=%major%.%new_minor%.0
if %choice%==3 set new_version=%new_major%.0.0
if %choice%==4 set new_version=%current_version%

:: Update versions if changed
if not "%new_version%"=="%current_version%" (
    echo.
    echo Updating to version %new_version%...
    powershell -Command "(Get-Content module\module.json -Raw) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\module.json -NoNewline"
    powershell -Command "(Get-Content package.json -Raw) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content package.json -NoNewline"
    powershell -Command "(Get-Content module\package.json -Raw) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\package.json -NoNewline"
)

:: Package
echo.
echo Packaging module...
cd module
call npm run package >nul 2>&1
cd ..

if not exist module\release\module.zip (
    echo [ERROR] Packaging failed!
    echo Running with output to see error...
    cd module
    npm run package
    cd ..
    pause
    exit /b 1
)

:: Commit all changes
echo.
echo Committing changes...
git add -A
git commit -m "Release version %new_version%" >nul 2>&1

:: Clean up any existing tags
echo.
echo Cleaning up old tags...
git tag -d %new_version% >nul 2>&1
git tag -d v%new_version% >nul 2>&1
git push origin --delete %new_version% >nul 2>&1
git push origin --delete v%new_version% >nul 2>&1

:: Push main branch first
echo.
echo Pushing main branch...
git push origin main

:: Create and push tags
echo.
echo Creating and pushing tags...

:: Try without v prefix first
git tag %new_version% -m "Release %new_version%"
git push origin %new_version%

:: Also try with v prefix
git tag v%new_version% -m "Release %new_version%"
git push origin v%new_version%

echo.
echo ================================================================================
echo                              DONE!
echo ================================================================================
echo.
echo Created tags:
echo - %new_version%
echo - v%new_version%
echo.
echo Check GitHub Actions at:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
echo.
echo If Actions STILL don't trigger:
echo.
echo 1. Go to: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
echo 2. Look for any workflow runs
echo 3. If none, check Settings -^> Actions -^> General
echo.
echo Manual release option:
echo 1. Go to: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/new
echo 2. Tag: %new_version%
echo 3. Title: Simple API v%new_version%
echo 4. Upload files from: module\release\
echo    - module.json
echo    - module.zip
echo.
pause
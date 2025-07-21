@echo off
cls
echo ================================================================================
echo                    SIMPLE API RELEASE PUBLISHER
echo ================================================================================
echo.

:: Get current version
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set current_version=%version_line:"=%
set current_version=%current_version:,=%
set current_version=%current_version: =%

echo Current version: %current_version%

:: Parse version
for /f "tokens=1,2,3 delims=." %%a in ("%current_version%") do (
    set major=%%a
    set minor=%%b
    set patch=%%c
)

:: Show version options
echo.
echo Select version bump:
echo [1] Patch  %current_version% -^> %major%.%minor%.%patch:~0,-1%1
echo [2] Minor  %current_version% -^> %major%.%minor:~0,-1%1.0
echo [3] Major  %current_version% -^> %major:~0,-1%1.0.0  
echo [4] Custom version
echo [5] Keep current (%current_version%)
echo.

choice /c 12345 /n /m "Select [1-5]: "
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
    set /p new_version="Enter version (without v prefix): "
)
if %choice%==5 (
    set new_version=%current_version%
)

:: Ask for release notes
echo.
set /p notes="Release notes (optional): "
if "%notes%"=="" set notes=Updates and improvements

:: Update version if changed
if not "%new_version%"=="%current_version%" (
    echo.
    echo Updating to version %new_version%...
    
    powershell -Command "(Get-Content module\module.json -Raw) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\module.json -NoNewline"
    powershell -Command "(Get-Content package.json -Raw) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content package.json -NoNewline"
    powershell -Command "(Get-Content module\package.json -Raw) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\package.json -NoNewline"
)

:: Update module.json URLs to use GitHub releases
echo.
echo Updating module URLs for GitHub release...
powershell -Command "(Get-Content module\module.json -Raw) -replace '\"manifest\": \"[^\"]+\"', '\"manifest\": \"https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json\"' | Set-Content module\module.json -NoNewline"
powershell -Command "(Get-Content module\module.json -Raw) -replace '\"download\": \"[^\"]+\"', '\"download\": \"https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.zip\"' | Set-Content module\module.json -NoNewline"

:: Package module
echo.
echo Packaging module...
cd module
call npm run package >nul 2>&1
cd ..

:: Commit changes
echo.
echo Committing changes...
git add -A
git commit -m "Release %new_version%: %notes%" >nul 2>&1

:: Clean up old tags
git tag -d %new_version% >nul 2>&1
git push origin :refs/tags/%new_version% >nul 2>&1

:: Create tag WITHOUT 'v' prefix
echo Creating tag %new_version%...
git tag -a %new_version% -m "Release %new_version%: %notes%"

:: Push everything
echo.
echo Pushing to GitHub...
git push origin main
if errorlevel 1 (
    echo [ERROR] Failed to push commits
    pause
    exit /b 1
)

git push origin %new_version%
if errorlevel 1 (
    echo [ERROR] Failed to push tag
    pause
    exit /b 1
)

echo.
echo ================================================================================
echo                         RELEASE %new_version% PUBLISHED!
echo ================================================================================
echo.
echo GitHub Actions will now automatically:
echo 1. Create a GitHub release
echo 2. Upload module.json and module.zip
echo 3. Generate release notes
echo.
echo Monitor progress at:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
echo.
echo Once complete, your module will be installable via:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
echo.
pause
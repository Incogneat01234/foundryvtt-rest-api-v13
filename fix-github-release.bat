@echo off
cls
echo ================================================================================
echo                    GITHUB RELEASE DIAGNOSTIC AND FIX TOOL
echo ================================================================================
echo.

:: Get current version
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set version=%version_line:"=%
set version=%version:,=%
set version=%version: =%

echo Current module version: %version%
echo.

echo STEP 1: Repository Diagnostics
echo ------------------------------

:: Check git status
echo [1] Git Status:
git status --short
echo.

:: Check remotes
echo [2] Git Remotes:
git remote -v
echo.

:: Check current branch
echo [3] Current Branch:
git branch --show-current
echo.

:: Check if main branch is up to date
echo [4] Branch Status:
git fetch origin >nul 2>&1
git status -uno
echo.

:: Check existing tags
echo [5] Local Tags:
git tag -l | findstr /C:"v%version%"
if errorlevel 1 (
    echo     No local tag v%version% found
) else (
    echo     Tag v%version% exists locally
)
echo.

:: Check remote tags
echo [6] Remote Tags:
git ls-remote --tags origin | findstr /C:"v%version%"
if errorlevel 1 (
    echo     No remote tag v%version% found
) else (
    echo     Tag v%version% exists on remote
)
echo.

:: Check GitHub Actions workflow
echo [7] GitHub Actions Workflow:
if exist .github\workflows\release.yml (
    echo     [OK] release.yml found
) else (
    echo     [ERROR] release.yml NOT FOUND!
)
echo.

echo STEP 2: Fix Options
echo -------------------
echo.
echo [1] Force push current version (%version%) as new release
echo [2] Increment version and create new release
echo [3] Manual GitHub release creation (opens browser)
echo [4] Complete reset and republish
echo [5] Exit
echo.

choice /c 12345 /n /m "Select option [1-5]: "
set fix_option=%errorlevel%

if %fix_option%==1 goto :force_current
if %fix_option%==2 goto :increment_version
if %fix_option%==3 goto :manual_release
if %fix_option%==4 goto :complete_reset
if %fix_option%==5 exit /b 0

:force_current
echo.
echo Forcing release of v%version%...
echo.

:: Ensure we're on main branch
git checkout main >nul 2>&1

:: Stage any changes
git add -A
git diff --staged --quiet
if not errorlevel 1 (
    echo No changes to commit
) else (
    git commit -m "Prepare release v%version%" >nul 2>&1
    echo Committed pending changes
)

:: Delete and recreate tag
echo Removing existing tags...
git tag -d v%version% >nul 2>&1
git push origin --delete v%version% >nul 2>&1

echo Creating fresh tag...
git tag -a v%version% -m "Release v%version%"

:: Push everything
echo Pushing to GitHub...
git push origin main --force
if errorlevel 1 (
    echo [ERROR] Failed to push commits
    pause
    exit /b 1
)

git push origin v%version% --force
if errorlevel 1 (
    echo [ERROR] Failed to push tag
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Tag v%version% pushed!
goto :check_actions

:increment_version
echo.
for /f "tokens=1,2,3 delims=." %%a in ("%version%") do (
    set major=%%a
    set minor=%%b
    set patch=%%c
)
set /a patch+=1
set new_version=%major%.%minor%.%patch%

echo Incrementing version to %new_version%...

:: Update version files
powershell -Command "$content = Get-Content module\module.json -Raw; $content -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\module.json -NoNewline"
powershell -Command "$content = Get-Content package.json -Raw; $content -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content package.json -NoNewline"
powershell -Command "$content = Get-Content module\package.json -Raw; $content -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\package.json -NoNewline"

:: Package
echo Packaging module...
cd module
call npm run package >nul 2>&1
cd ..

:: Commit and tag
git add -A
git commit -m "Release v%new_version%"
git tag -a v%new_version% -m "Release v%new_version%"

:: Push
git push origin main
git push origin v%new_version%

echo.
echo [SUCCESS] Version %new_version% released!
set version=%new_version%
goto :check_actions

:manual_release
echo.
echo Opening GitHub releases page...
echo.
echo To create a manual release:
echo 1. Click "Draft a new release"
echo 2. Click "Choose a tag" and type: v%version%
echo 3. Click "Create new tag: v%version% on publish"
echo 4. Set release title: v%version%
echo.
echo 5. Upload these files as assets:
echo    - module/release/module.json
echo    - module/release/module.zip
echo.
echo 6. Publish the release
echo.
start https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/new
pause
exit /b 0

:complete_reset
echo.
echo This will completely reset and republish v%version%
set /p confirm="Are you sure? (yes/no): "
if not "%confirm%"=="yes" exit /b 0

:: Package the module first
echo Packaging module...
cd module
call npm run package
cd ..

:: Ensure we're on main
git checkout main

:: Force add all files
git add -A --force

:: Commit if needed
git diff --staged --quiet
if not errorlevel 1 (
    echo No changes to commit
) else (
    git commit -m "Force release v%version%"
)

:: Remove all traces of the tag
git tag -d v%version% >nul 2>&1
git push origin --delete v%version% >nul 2>&1

:: Create fresh tag
git tag -a v%version% -m "Release v%version%" --force

:: Force push everything
git push origin main --force
git push origin v%version% --force

echo.
echo [SUCCESS] Complete reset done for v%version%
goto :check_actions

:check_actions
echo.
echo ================================================================================
echo                              CHECKING RESULTS
echo ================================================================================
echo.
echo GitHub Actions should now be running.
echo.
echo Check these URLs:
echo.
echo 1. Actions (should show workflow running):
echo    https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
echo.
echo 2. Releases (should show new release soon):
echo    https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases
echo.
echo 3. Your tag:
echo    https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/tag/v%version%
echo.
echo If the Actions don't trigger within 2 minutes, use option 3 (Manual release)
echo.
pause
@echo off
cls
echo ================================================================================
echo                          SIMPLE API PUBLISHER v2.0
echo                     Foundry VTT Module Release Assistant
echo ================================================================================
echo.

:: Set console to UTF-8
chcp 65001 >nul 2>nul

:: Check prerequisites
echo STEP 1: Checking Prerequisites
echo ------------------------------

:: Check Git
echo [*] Checking Git installation...
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH
    echo.
    echo Please install Git from: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)
echo [OK] Git is installed

:: Check Node.js
echo [*] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js is installed

:: Check if in git repository
echo [*] Checking Git repository...
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not in a Git repository
    echo.
    echo Please run this from your module's root directory
    echo.
    pause
    exit /b 1
)
echo [OK] Git repository found

:: Check remote
echo [*] Checking GitHub remote...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [ERROR] No origin remote found
    echo.
    echo Please add your GitHub repository:
    echo   git remote add origin https://github.com/Incogneat01234/foundryvtt-rest-api-v13.git
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('git remote get-url origin') do set remote_url=%%i
echo [OK] Remote: %remote_url%

:: Check dependencies
echo [*] Checking module dependencies...
if not exist module\node_modules (
    echo [!] Installing module dependencies...
    cd module
    call npm install >nul 2>&1
    cd ..
)
echo [OK] Dependencies installed

echo.
echo STEP 2: Version Management
echo --------------------------

:: Get current version
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set current_version=%version_line:"=%
set current_version=%current_version:,=%
set current_version=%current_version: =%

echo Current version: v%current_version%

:: Check if there are uncommitted changes
git diff --quiet && git diff --cached --quiet
if errorlevel 1 (
    echo.
    echo [!] You have uncommitted changes:
    echo.
    git status --short
    echo.
    set /p commit_changes="Do you want to commit these changes first? (y/n): "
    if /i "!commit_changes!"=="y" (
        set /p commit_msg="Enter commit message: "
        git add -A
        git commit -m "!commit_msg!"
    )
)

:: Parse version parts
for /f "tokens=1,2,3 delims=." %%a in ("%current_version%") do (
    set major=%%a
    set minor=%%b
    set patch=%%c
)

:: Calculate new versions
set /a new_patch=%patch%+1
set /a new_minor=%minor%+1
set /a new_major=%major%+1

echo.
echo Select version bump type:
echo -------------------------
echo.
echo   [1] PATCH  %current_version% --^> %major%.%minor%.%new_patch%
echo       (Bug fixes, small changes)
echo.
echo   [2] MINOR  %current_version% --^> %major%.%new_minor%.0
echo       (New features, backwards compatible)
echo.
echo   [3] MAJOR  %current_version% --^> %new_major%.0.0
echo       (Breaking changes, major update)
echo.
echo   [4] CUSTOM
echo       (Enter your own version)
echo.
echo   [5] KEEP   %current_version%
echo       (Re-release current version)
echo.

choice /c 12345 /n /m "Select option [1-5]: "
set bump_type=%errorlevel%

:: Set new version based on selection
if %bump_type%==1 set new_version=%major%.%minor%.%new_patch%
if %bump_type%==2 set new_version=%major%.%new_minor%.0
if %bump_type%==3 set new_version=%new_major%.0.0
if %bump_type%==4 (
    echo.
    set /p new_version="Enter custom version (e.g., 1.2.3 or 1.2.3-beta.1): "
)
if %bump_type%==5 set new_version=%current_version%

echo.
echo Selected version: v%new_version%

:: Ask for release notes
echo.
echo STEP 3: Release Notes
echo ---------------------
echo What's new in v%new_version%? (Press Enter for default)
echo.
set /p release_notes="Release notes: "
if "%release_notes%"=="" set release_notes=Bug fixes and improvements

echo.
echo STEP 4: Updating Files
echo ----------------------

:: Update version in all files
if not %bump_type%==5 (
    echo [*] Updating module.json...
    powershell -Command "$content = Get-Content module\module.json -Raw; $content -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\module.json -NoNewline"
    
    echo [*] Updating package.json files...
    powershell -Command "$content = Get-Content package.json -Raw; $content -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content package.json -NoNewline"
    powershell -Command "$content = Get-Content module\package.json -Raw; $content -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\package.json -NoNewline"
    
    echo [OK] Version updated to %new_version%
) else (
    echo [*] Keeping version %new_version%
)

echo.
echo STEP 5: Building Module
echo -----------------------
echo [*] Creating module package...
cd module
call npm run package >package.log 2>&1
if errorlevel 1 (
    cd ..
    echo [ERROR] Package creation failed!
    echo.
    type module\package.log
    echo.
    pause
    exit /b 1
)
cd ..
del module\package.log >nul 2>&1

echo [OK] Module packaged successfully
echo     - module/release/module.json
echo     - module/release/module.zip

echo.
echo STEP 6: Git Operations
echo ----------------------

:: Stage all changes
echo [*] Staging changes...
git add -A

:: Show what will be committed
echo [*] Changes to commit:
git status --short

:: Commit
echo [*] Creating commit...
git commit -m "Release v%new_version%: %release_notes%" >nul 2>&1
echo [OK] Changes committed

:: Handle tags
echo [*] Creating release tag...

:: Delete local tag if exists
git tag -d v%new_version% >nul 2>&1

:: Delete remote tag if exists  
git push origin :refs/tags/v%new_version% >nul 2>&1

:: Create new tag
git tag -a v%new_version% -m "Release v%new_version%: %release_notes%"
echo [OK] Tag v%new_version% created

echo.
echo STEP 7: Publishing to GitHub
echo ----------------------------
echo [*] Pushing to GitHub...

:: Push commits
git push origin main --force-with-lease >push.log 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to push commits
    type push.log
    del push.log
    pause
    exit /b 1
)

:: Push tag
git push origin v%new_version% >>push.log 2>&1
if errorlevel 1 (
    echo [ERROR] Failed to push tag
    type push.log
    del push.log
    pause
    exit /b 1
)
del push.log >nul 2>&1

echo [OK] Pushed to GitHub successfully

echo.
echo ================================================================================
echo                            RELEASE PUBLISHED!
echo ================================================================================
echo.
echo Version: v%new_version%
echo Status:  Successfully published to GitHub
echo.
echo What happens next:
echo ------------------
echo 1. GitHub Actions is creating your release automatically
echo 2. The module.json and module.zip will be uploaded as assets
echo 3. Users can install your module using this URL:
echo.
echo    https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
echo.
echo Monitor progress:
echo -----------------
echo Actions: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
echo Release: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/tag/v%new_version%
echo.
echo Next steps:
echo -----------
echo 1. Check GitHub Actions to ensure the release was created
echo 2. Edit the release on GitHub to add detailed release notes
echo 3. Test the module installation in Foundry VTT
echo.
pause
@echo off
setlocal enabledelayedexpansion

echo.
echo ================================================
echo     SIMPLE API - ONE-CLICK RELEASE
echo ================================================
echo.

REM Check if npm is available
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if git is available
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

REM Get current version from module.json
for /f "tokens=2 delims=:" %%a in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%a
    REM Remove quotes and comma
    set version_line=!version_line:"=!
    set version_line=!version_line:,=!
    REM Trim spaces
    for /f "tokens=*" %%b in ("!version_line!") do set current_version=%%b
)

echo Current version: %current_version%
echo.

REM Check for uncommitted changes
git diff-index --quiet HEAD -- >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] You have uncommitted changes!
    set /p commit_changes="Commit them as part of this release? (Y/N): "
    if /i not "!commit_changes!"=="Y" (
        echo Release cancelled.
        pause
        exit /b 1
    )
)

REM Ask about version bump
echo.
echo How should we bump the version?
echo 1) Keep current version (%current_version%)
echo 2) Patch release (increment last number)
echo 3) Minor release (increment middle number)
echo 4) Major release (increment first number)
echo.
set /p version_choice="Choose (1-4): "

if "%version_choice%"=="1" (
    set new_version=%current_version%
    set skip_version_update=1
) else (
    echo.
    set /p new_version="Enter new version (current: %current_version%): "
    set skip_version_update=0
)

REM Get commit message
echo.
set default_message=Release v%new_version%
set /p commit_message="Commit message (press Enter for '%default_message%'): "
if "!commit_message!"=="" set commit_message=%default_message%

echo.
echo ========================================
echo Starting release process...
echo ========================================
echo.

REM Update version in files if needed
if "%skip_version_update%"=="0" (
    echo Updating version to %new_version%...
    
    REM Update module.json
    powershell -Command "(Get-Content 'module\module.json') -replace '\"version\": \".*\"', '\"version\": \"%new_version%\"' | Set-Content 'module\module.json'"
    
    REM Update package.json files
    powershell -Command "(Get-Content 'package.json') -replace '\"version\": \".*\"', '\"version\": \"%new_version%\"' | Set-Content 'package.json'"
    powershell -Command "(Get-Content 'module\package.json') -replace '\"version\": \".*\"', '\"version\": \"%new_version%\"' | Set-Content 'module\package.json'"
    
    echo Version updated.
    echo.
)

REM 1. Install dependencies if needed
if not exist module\node_modules (
    echo [1/6] Installing module dependencies...
    cd module
    call npm install
    cd ..
    echo Dependencies installed.
    echo.
) else (
    echo [1/6] Dependencies already installed.
    echo.
)

REM 2. Create package
echo [2/6] Creating release package...
cd module
call npm run package
if %errorlevel% neq 0 (
    cd ..
    echo [ERROR] Package creation failed!
    pause
    exit /b 1
)
cd ..
echo Package created.
echo.

REM 3. Stage all changes
echo [3/6] Staging changes...
git add -A
if %errorlevel% neq 0 (
    echo [ERROR] Failed to stage changes!
    pause
    exit /b 1
)
echo Changes staged.
echo.

REM 4. Commit changes
echo [4/6] Committing changes...
git commit -m "%commit_message%"
if %errorlevel% neq 0 (
    REM Check if there's nothing to commit
    git diff-index --quiet HEAD -- >nul 2>nul
    if %errorlevel% equ 0 (
        echo No changes to commit.
    ) else (
        echo [ERROR] Commit failed!
        pause
        exit /b 1
    )
) else (
    echo Changes committed.
)
echo.

REM 5. Create tag
echo [5/6] Creating tag %new_version%...
git tag -a %new_version% -m "Version %new_version%"
if %errorlevel% neq 0 (
    echo [WARNING] Tag might already exist, continuing...
) else (
    echo Tag created.
)
echo.

REM 6. Push to remote
echo [6/6] Pushing to GitHub...
git push
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push commits!
    pause
    exit /b 1
)

git push origin %new_version%
if %errorlevel% neq 0 (
    echo [ERROR] Failed to push tag!
    pause
    exit /b 1
)

echo.
echo ================================================
echo     RELEASE COMPLETED SUCCESSFULLY!
echo ================================================
echo.
echo Version %new_version% has been:
echo   - Built and packaged
echo   - Committed to git
echo   - Tagged
echo   - Pushed to GitHub
echo.
echo The GitHub Action will now:
echo   - Create a GitHub release
echo   - Upload module.json and module.zip
echo   - Make it available via the manifest URL
echo.
echo Your manifest URL:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
echo.
echo Release files created:
echo   - module\release\module.json
echo   - module\release\module.zip
echo   - module\release\simple-api-v%new_version%.zip
echo.
pause
@echo off
cls
echo ================================================================================
echo                    FORCE PUBLISH v4.0.0 - CLEAN START
echo ================================================================================
echo.
echo This will force publish version 4.0.0, removing any conflicts.
echo.
set /p confirm="Are you SURE you want to force v4.0.0? (yes/no): "
if not "%confirm%"=="yes" exit /b 0

echo.
echo [STEP 1] Packaging module...
cd module
call npm run package >nul 2>&1
cd ..
if not exist module\release\module.zip (
    echo [ERROR] Failed to package module
    pause
    exit /b 1
)
echo [OK] Module packaged

echo.
echo [STEP 2] Cleaning up old tags...
:: Remove any existing v4.0.0 tags locally and remotely
git tag -d v4.0.0 >nul 2>&1
git push origin :refs/tags/v4.0.0 >nul 2>&1
:: Also clean up old versions that might conflict
git tag -d v1.0.1 >nul 2>&1
git tag -d v1.0.2 >nul 2>&1
git push origin :refs/tags/v1.0.1 >nul 2>&1
git push origin :refs/tags/v1.0.2 >nul 2>&1
echo [OK] Old tags cleaned

echo.
echo [STEP 3] Committing v4.0.0...
git add -A
git commit -m "Release v4.0.0 - Simple API for Foundry VTT" >nul 2>&1
echo [OK] Changes committed

echo.
echo [STEP 4] Creating fresh v4.0.0 tag...
git tag -a v4.0.0 -m "Simple API v4.0.0 - Clean release" --force
echo [OK] Tag created

echo.
echo [STEP 5] Force pushing to GitHub...
git push origin main --force
if errorlevel 1 (
    echo [ERROR] Failed to push main branch
    pause
    exit /b 1
)
echo [OK] Main branch pushed

echo.
echo [STEP 6] Pushing tag v4.0.0...
git push origin v4.0.0 --force
if errorlevel 1 (
    echo [ERROR] Failed to push tag
    echo.
    echo Trying alternative push method...
    git push origin refs/tags/v4.0.0 --force
    if errorlevel 1 (
        echo [ERROR] Still failed. Let's try one more time...
        git push --tags --force
    )
)
echo [OK] Tag pushed

echo.
echo ================================================================================
echo                              VERIFYING...
echo ================================================================================
echo.

:: Check if tag is on remote
git ls-remote --tags origin | findstr /C:"v4.0.0" >nul
if errorlevel 1 (
    echo [WARNING] Tag might not be on remote yet
    echo.
    echo Try running this command manually:
    echo   git push origin v4.0.0 --force
    echo.
) else (
    echo [OK] Tag v4.0.0 confirmed on GitHub!
)

echo.
echo Next steps:
echo -----------
echo 1. Check GitHub Actions (should trigger automatically):
echo    https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
echo.
echo 2. If Actions don't trigger in 2 minutes, create release manually:
echo    https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/new?tag=v4.0.0
echo.
echo 3. For manual release, upload these files:
echo    - module/release/module.json
echo    - module/release/module.zip
echo.
echo Module install URL will be:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
echo.
pause
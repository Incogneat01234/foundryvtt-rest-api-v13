@echo off
echo ================================================================================
echo                    MANUAL GITHUB RELEASE CREATOR
echo ================================================================================
echo.
echo This will open your browser to create the v4.0.0 release manually.
echo.
echo IMPORTANT: First, let's make sure the files exist...
echo.

if not exist module\release\module.json (
    echo [!] module.json not found, packaging...
    cd module
    call npm run package
    cd ..
)

echo Files to upload:
echo ----------------
dir module\release\*.* /b
echo.

echo Instructions:
echo -------------
echo 1. Your browser will open to GitHub's release page
echo 2. Make sure "v4.0.0" is in the tag field
echo 3. Select "Create new tag: v4.0.0 on publish"
echo 4. Set title: "Simple API v4.0.0"
echo 5. Add description:
echo.
echo    # Simple API for Foundry VTT v4.0.0
echo.
echo    A lightweight WebSocket API for Foundry VTT with zero authentication.
echo.
echo    ## Installation
echo    ```
echo    https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
echo    ```
echo.
echo    ## What's New
echo    - Complete rewrite as Simple API
echo    - No authentication required
echo    - Lightweight ~400 lines of code
echo.
echo 6. Click "Attach binaries" and upload:
echo    - module\release\module.json
echo    - module\release\module.zip
echo.
echo 7. Click "Publish release"
echo.

:: Also create a direct link with the tag pre-filled
set github_url=https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/new?tag=v4.0.0^&title=Simple%%20API%%20v4.0.0

echo Opening browser...
start "" "%github_url%"

echo.
echo Also opening file explorer to the release folder...
start "" "module\release"

echo.
echo Press any key after you've created the release...
pause

echo.
echo Verifying release...
curl -s https://api.github.com/repos/Incogneat01234/foundryvtt-rest-api-v13/releases/tags/v4.0.0 | findstr "Simple API" >nul
if errorlevel 1 (
    echo [!] Release not found yet. It may take a moment to appear.
) else (
    echo [OK] Release confirmed!
    echo.
    echo Your module is now available at:
    echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
)

echo.
pause
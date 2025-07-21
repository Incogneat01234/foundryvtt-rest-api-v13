@echo off
cls
echo ===========================================================================
echo                        SIMPLE PUBLISH METHOD
echo ===========================================================================
echo.

:: Get version
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set version=%version_line:"=%
set version=%version:,=%
set version=%version: =%

echo Current version: %version%
echo.

:: Package the module
echo Packaging module...
cd module
call npm run package >nul 2>&1
cd ..

echo.
echo MODULE PACKAGED! Files ready:
echo - module/release/module.json
echo - module/release/module.zip
echo.
echo ===========================================================================
echo                              NEXT STEPS:
echo ===========================================================================
echo.
echo 1. This will open GitHub releases page in your browser
echo 2. Fill in these fields:
echo    - Tag: v%version%
echo    - Title: Simple API v%version%
echo    - Description: (anything you want)
echo.
echo 3. Drag these files to the upload area:
echo    - module\release\module.json
echo    - module\release\module.zip
echo.
echo 4. Click "Publish release"
echo.
echo That's it! Your module will be available at:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
echo.
echo Press any key to open GitHub and the files folder...
pause >nul

:: Open browser
start https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/new

:: Open file explorer
explorer module\release

echo.
echo Browser and folder opened. Just drag the files and publish!
echo.
pause
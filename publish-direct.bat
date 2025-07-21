@echo off
cls
echo ===========================================================================
echo                    DIRECT REPOSITORY PUBLISH
echo ===========================================================================
echo.
echo This method puts the module files directly in your repository.
echo No GitHub releases needed!
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

:: Package module
echo [1] Packaging module...
cd module
call npm run package >nul 2>&1
cd ..

:: Create latest folder
echo [2] Creating latest folder...
if not exist latest mkdir latest

:: Copy files to latest
echo [3] Copying files to latest/...
copy module\release\module.json latest\ >nul
copy module\release\module.zip latest\ >nul

:: Also copy to root for alternative access
copy module\release\module.json . >nul

:: Commit and push
echo [4] Committing files...
git add latest\module.json latest\module.zip module.json
git commit -m "Direct publish v%version%" >nul 2>&1

echo [5] Pushing to GitHub...
git push origin main

echo.
echo ===========================================================================
echo                              SUCCESS!
echo ===========================================================================
echo.
echo Your module is now available at:
echo.
echo Option 1 (from latest folder):
echo https://raw.githubusercontent.com/Incogneat01234/foundryvtt-rest-api-v13/main/latest/module.json
echo.
echo Option 2 (from root):
echo https://raw.githubusercontent.com/Incogneat01234/foundryvtt-rest-api-v13/main/module.json
echo.
echo Users can install your module using either URL in Foundry!
echo.
pause
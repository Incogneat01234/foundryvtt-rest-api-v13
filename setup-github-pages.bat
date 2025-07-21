@echo off
echo ===========================================================================
echo                    GITHUB PAGES MODULE HOSTING
echo ===========================================================================
echo.
echo This will set up GitHub Pages to host your module directly.
echo.

:: Create docs folder for GitHub Pages
if not exist docs mkdir docs

:: Package module
echo Packaging module...
cd module
call npm run package >nul 2>&1
cd ..

:: Copy files to docs
echo Setting up GitHub Pages files...
copy module\release\module.json docs\ >nul
copy module\release\module.zip docs\ >nul

:: Create index.html for GitHub Pages
echo ^<!DOCTYPE html^> > docs\index.html
echo ^<html^>^<body^> >> docs\index.html
echo ^<h1^>Simple API for Foundry VTT^</h1^> >> docs\index.html
echo ^<p^>Module manifest: ^<a href="module.json"^>module.json^</a^>^</p^> >> docs\index.html
echo ^<p^>Module package: ^<a href="module.zip"^>module.zip^</a^>^</p^> >> docs\index.html
echo ^</body^>^</html^> >> docs\index.html

:: Commit
git add docs\*
git commit -m "Update GitHub Pages module files" >nul 2>&1
git push origin main

echo.
echo ===========================================================================
echo                         SETUP COMPLETE!
echo ===========================================================================
echo.
echo Now do this ONE TIME:
echo.
echo 1. Go to: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/settings/pages
echo 2. Under "Source", select "Deploy from a branch"
echo 3. Under "Branch", select "main" and "/docs" folder
echo 4. Click "Save"
echo.
echo After ~5 minutes, your module will be available at:
echo https://incogneat01234.github.io/foundryvtt-rest-api-v13/module.json
echo.
echo This URL will ALWAYS work, no releases needed!
echo.
pause
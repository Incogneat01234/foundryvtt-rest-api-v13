@echo off
echo.
echo Simple API Publisher
echo ===================
echo.

:: Get current version
set /p version=<module\module.json
set version=%version:*"version": "=%
set version=%version:",*=%

echo Current version: %version%
echo.
echo 1 = Patch bump
echo 2 = Minor bump  
echo 3 = Major bump
echo 4 = Keep current
echo.

set /p choice="Pick 1-4: "

:: Just hardcode the version bumps
if "%choice%"=="1" set new_version=4.0.1
if "%choice%"=="2" set new_version=4.1.0
if "%choice%"=="3" set new_version=5.0.0
if "%choice%"=="4" set new_version=%version%

echo.
echo Publishing version %new_version%...

:: Update module.json
cd module
powershell -Command "(Get-Content module.json) -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module.json"

:: Package it
call npm run package

:: Go back
cd ..

:: Commit and tag
git add -A
git commit -m "Release %new_version%"
git tag %new_version%
git push origin main
git push origin %new_version%

echo.
echo DONE! Version %new_version% pushed.
echo.
echo Check: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
echo.
echo If no actions run, create release manually:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/new
echo.
pause
@echo off
echo Cleaning up version tags...
echo.

:: Remove v-prefixed tags
echo Removing v-prefixed tags...
git tag -d v1.0.1 >nul 2>&1
git tag -d v1.0.2 >nul 2>&1
git tag -d v4.0.0 >nul 2>&1

git push origin --delete v1.0.1 >nul 2>&1
git push origin --delete v1.0.2 >nul 2>&1
git push origin --delete v4.0.0 >nul 2>&1

echo.
echo Creating proper tag for current version...

:: Get current version
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set version=%version_line:"=%
set version=%version:,=%
set version=%version: =%

:: Create tag without v prefix
git tag -d %version% >nul 2>&1
git push origin --delete %version% >nul 2>&1

git tag -a %version% -m "Release %version%"
git push origin %version%

echo.
echo Done! Tag %version% created.
echo.
echo GitHub Actions should trigger at:
echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
echo.
pause
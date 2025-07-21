@echo off
echo ================================================================================
echo                         RELEASE VERIFICATION TOOL
echo ================================================================================
echo.

:: Get current version
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set version=%version_line:"=%
set version=%version:,=%
set version=%version: =%

echo Checking release status for v%version%...
echo.

:: Check if tag exists locally
echo [1] Local tag check:
git tag -l v%version% | findstr /C:"v%version%" >nul
if errorlevel 1 (
    echo    [FAIL] No local tag v%version%
    set local_tag=0
) else (
    echo    [OK] Local tag v%version% exists
    set local_tag=1
)

:: Check if tag exists on remote
echo.
echo [2] Remote tag check:
git ls-remote --tags origin refs/tags/v%version% | findstr /C:"v%version%" >nul
if errorlevel 1 (
    echo    [FAIL] No remote tag v%version%
    set remote_tag=0
) else (
    echo    [OK] Remote tag v%version% exists
    set remote_tag=1
)

:: Check GitHub release via API
echo.
echo [3] GitHub release check:
curl -s -o nul -I -w "%%{http_code}" https://api.github.com/repos/Incogneat01234/foundryvtt-rest-api-v13/releases/tags/v%version% > temp_status.txt
set /p http_status=<temp_status.txt
del temp_status.txt

if "%http_status%"=="200" (
    echo    [OK] GitHub release exists
    set github_release=1
) else (
    echo    [FAIL] No GitHub release found (HTTP %http_status%)
    set github_release=0
)

:: Check if module.json is downloadable
echo.
echo [4] Module manifest check:
curl -s -o nul -I -w "%%{http_code}" https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json > temp_status.txt
set /p http_status=<temp_status.txt
del temp_status.txt

if "%http_status%"=="302" (
    echo    [OK] module.json is downloadable
    set manifest_ok=1
) else if "%http_status%"=="200" (
    echo    [OK] module.json is downloadable
    set manifest_ok=1
) else (
    echo    [FAIL] module.json not accessible (HTTP %http_status%)
    set manifest_ok=0
)

:: Check if module.zip is downloadable
echo.
echo [5] Module package check:
curl -s -o nul -I -w "%%{http_code}" https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.zip > temp_status.txt
set /p http_status=<temp_status.txt
del temp_status.txt

if "%http_status%"=="302" (
    echo    [OK] module.zip is downloadable
    set package_ok=1
) else if "%http_status%"=="200" (
    echo    [OK] module.zip is downloadable
    set package_ok=1
) else (
    echo    [FAIL] module.zip not accessible (HTTP %http_status%)
    set package_ok=0
)

:: Summary
echo.
echo ================================================================================
echo                                 SUMMARY
echo ================================================================================

set /a total_ok=%local_tag%+%remote_tag%+%github_release%+%manifest_ok%+%package_ok%

if %total_ok%==5 (
    echo.
    echo [SUCCESS] All checks passed! Your module is properly released.
    echo.
    echo Users can install your module with:
    echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
    echo.
) else (
    echo.
    echo [WARNING] Some checks failed. Recommended actions:
    echo.
    if %local_tag%==0 echo - Create local tag: git tag -a v%version% -m "Release v%version%"
    if %remote_tag%==0 echo - Push tag: git push origin v%version%
    if %github_release%==0 echo - Run: create-github-release.bat
    if %manifest_ok%==0 echo - Upload module.json to the GitHub release
    if %package_ok%==0 echo - Upload module.zip to the GitHub release
    echo.
    echo Or run: fix-github-release.bat
)

echo.
pause
@echo off
echo GitHub Repository Check
echo ======================
echo.

echo [1] Checking remote configuration...
git remote -v
echo.

echo [2] Checking branch status...
git branch -vv
echo.

echo [3] Checking existing tags...
git tag -l
echo.

echo [4] Checking unpushed tags...
git show-ref --tags
echo.

echo [5] Checking GitHub Actions workflow...
if exist .github\workflows\release.yml (
    echo [OK] Release workflow found
) else (
    echo [ERROR] Release workflow not found!
)
echo.

echo [6] Checking last commits...
git log --oneline -5
echo.

echo [7] Force push the latest tag...
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set version=%version_line:"=%
set version=%version:,=%
set version=%version: =%

echo Current version in module.json: %version%
echo.

set /p push_tag="Do you want to force push tag v%version%? (y/n): "
if /i "%push_tag%"=="y" (
    echo [PUSH] Deleting remote tag if exists...
    git push origin :refs/tags/v%version% 2>nul
    
    echo [TAG] Creating fresh tag...
    git tag -d v%version% 2>nul
    git tag -a v%version% -m "Simple API v%version%"
    
    echo [PUSH] Pushing tag to GitHub...
    git push origin v%version% --force
    
    echo.
    echo [SUCCESS] Tag pushed! Check GitHub Actions at:
    echo https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
)

echo.
pause
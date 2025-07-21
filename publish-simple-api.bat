@echo off
echo Publishing Simple API Release...
echo.

:: Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Git is not installed or not in PATH
    pause
    exit /b 1
)

:: Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Not in a git repository
    pause
    exit /b 1
)

:: Get current version from module.json
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
:: Remove quotes and comma
set version=%version_line:"=%
set version=%version:,=%
set version=%version: =%

echo Current version: %version%
echo.

:: Package the module
echo 📦 Packaging module...
cd module
call npm run package
cd ..

if not exist module\release\module.zip (
    echo ❌ Error: Package creation failed
    pause
    exit /b 1
)

echo ✅ Module packaged successfully!
echo.

:: Stage changes
echo 📝 Staging changes...
git add .
git status --short

echo.
set /p commit_msg="Enter commit message (or press Enter for default): "
if "%commit_msg%"=="" set commit_msg=Release Simple API v%version%

:: Commit changes
git commit -m "%commit_msg%"

:: Create tag
echo.
echo 🏷️ Creating tag v%version%...
git tag -a v%version% -m "Simple API v%version%"

:: Push to remote
echo.
echo 🚀 Pushing to GitHub...
git push origin main --follow-tags

if errorlevel 1 (
    echo ❌ Error: Failed to push to GitHub
    echo Make sure you have set up your remote repository:
    echo   git remote add origin https://github.com/YOUR_USERNAME/foundryvtt-rest-api-v13.git
    pause
    exit /b 1
)

echo.
echo ✅ Successfully pushed to GitHub!
echo.
echo GitHub Actions will now:
echo 1. Create a new release for tag v%version%
echo 2. Upload module.json and module.zip as release assets
echo 3. Make the module available via manifest URL
echo.
echo Check your repository's Actions tab for progress.
echo.
pause
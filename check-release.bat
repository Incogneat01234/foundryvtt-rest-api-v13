@echo off
echo 🔍 Pre-Release Check for Simple API
echo =====================================
echo.

set errors=0

:: Check git status
echo Checking git status...
git status --porcelain > temp_status.txt
for %%A in (temp_status.txt) do (
    if %%~zA GTR 0 (
        echo ⚠️  Warning: You have uncommitted changes
        type temp_status.txt
        set /a errors+=1
    ) else (
        echo ✅ Git working directory clean
    )
)
del temp_status.txt

:: Check if remote is set
echo.
echo Checking git remote...
git remote -v | find "origin" >nul
if errorlevel 1 (
    echo ❌ Error: No origin remote found
    echo Run: git remote add origin https://github.com/Incogneat01234/foundryvtt-rest-api-v13.git
    set /a errors+=1
) else (
    echo ✅ Git remote configured
    git remote -v | find "origin"
)

:: Check GitHub authentication
echo.
echo Checking GitHub authentication...
git ls-remote origin >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Cannot connect to GitHub repository
    echo Make sure you have push access to the repository
    set /a errors+=1
) else (
    echo ✅ GitHub authentication working
)

:: Check module files
echo.
echo Checking module files...
if not exist module\module.json (
    echo ❌ Error: module\module.json not found
    set /a errors+=1
) else (
    echo ✅ module.json found
)

if not exist module\scripts\simple-api.js (
    echo ❌ Error: module\scripts\simple-api.js not found
    set /a errors+=1
) else (
    echo ✅ Module script found
)

:: Check dependencies
echo.
echo Checking dependencies...
if not exist module\node_modules (
    echo ⚠️  Warning: Module dependencies not installed
    echo Run: cd module && npm install
    set /a errors+=1
) else (
    echo ✅ Module dependencies installed
)

if not exist node_modules (
    echo ⚠️  Warning: Relay dependencies not installed
    echo Run: npm install
    set /a errors+=1
) else (
    echo ✅ Relay dependencies installed
)

:: Check GitHub Actions
echo.
echo Checking GitHub Actions workflow...
if not exist .github\workflows\release.yml (
    echo ❌ Error: GitHub Actions workflow not found
    set /a errors+=1
) else (
    echo ✅ GitHub Actions workflow found
)

:: Summary
echo.
echo =====================================
if %errors%==0 (
    echo ✅ All checks passed! Ready to publish.
    echo.
    echo Next steps:
    echo 1. Run bump-version.bat to update version (optional)
    echo 2. Run publish-simple-api.bat to create release
) else (
    echo ❌ Found %errors% issue(s). Please fix before publishing.
)
echo.
pause
@echo off
echo Simple API Version Bumper
echo.

:: Get current version
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do (
    set version_line=%%i
)
set current_version=%version_line:"=%
set current_version=%current_version:,=%
set current_version=%current_version: =%

echo Current version: %current_version%
echo.
echo Select version bump type:
echo 1. Patch (1.0.0 -> 1.0.1)
echo 2. Minor (1.0.0 -> 1.1.0)
echo 3. Major (1.0.0 -> 2.0.0)
echo 4. Custom version
echo.

choice /c 1234 /n /m "Select option (1-4): "
set bump_type=%errorlevel%

if %bump_type%==4 (
    set /p new_version="Enter new version (e.g., 1.2.3): "
) else (
    :: Parse current version
    for /f "tokens=1,2,3 delims=." %%a in ("%current_version%") do (
        set major=%%a
        set minor=%%b
        set patch=%%c
    )
    
    if %bump_type%==1 (
        set /a patch+=1
        set new_version=%major%.%minor%.%patch%
    )
    if %bump_type%==2 (
        set /a minor+=1
        set patch=0
        set new_version=%major%.%minor%.%patch%
    )
    if %bump_type%==3 (
        set /a major+=1
        set minor=0
        set patch=0
        set new_version=%major%.%minor%.%patch%
    )
)

echo.
echo Updating version to %new_version%...

:: Update module.json
powershell -Command "(Get-Content module\module.json) -replace '\"version\": \".*\"', '\"version\": \"%new_version%\"' | Set-Content module\module.json"

:: Update package.json files
powershell -Command "(Get-Content package.json) -replace '\"version\": \".*\"', '\"version\": \"%new_version%\",' | Set-Content package.json"
powershell -Command "(Get-Content module\package.json) -replace '\"version\": \".*\"', '\"version\": \"%new_version%\",' | Set-Content module\package.json"

echo ✅ Version updated to %new_version%
echo.
echo You can now run publish-simple-api.bat to create a release
echo.
pause
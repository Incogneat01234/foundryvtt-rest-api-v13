@echo off
:: Quick publish - patch version bump with minimal prompts
for /f "tokens=2 delims=:" %%i in ('findstr /c:"\"version\"" module\module.json') do set version_line=%%i
set current_version=%version_line:"=%
set current_version=%current_version:,=%
set current_version=%current_version: =%
for /f "tokens=1,2,3 delims=." %%a in ("%current_version%") do (
    set major=%%a
    set minor=%%b
    set patch=%%c
)
set /a patch+=1
set new_version=%major%.%minor%.%patch%

echo Quick Publishing v%current_version% -^> v%new_version%
powershell -Command "$content = Get-Content module\module.json -Raw; $content -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\module.json -NoNewline"
powershell -Command "$content = Get-Content package.json -Raw; $content -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content package.json -NoNewline"
powershell -Command "$content = Get-Content module\package.json -Raw; $content -replace '\"version\": \"[^\"]+\"', '\"version\": \"%new_version%\"' | Set-Content module\package.json -NoNewline"

cd module && call npm run package >nul 2>&1 && cd ..
git add -A
git commit -m "Release v%new_version%: Quick patch update" >nul 2>&1
git tag -d v%new_version% >nul 2>&1
git push origin :refs/tags/v%new_version% >nul 2>&1
git tag -a v%new_version% -m "Release v%new_version%"
git push origin main --force-with-lease && git push origin v%new_version%

echo Done! v%new_version% published.
echo Check: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions
pause
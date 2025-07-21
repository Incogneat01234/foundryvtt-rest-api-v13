# Simple API Release Publisher (PowerShell Version)
# This version may be more reliable for Git operations

Clear-Host
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "                     SIMPLE API RELEASE PUBLISHER (PS)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Get current version
$moduleJson = Get-Content "module\module.json" -Raw | ConvertFrom-Json
$currentVersion = $moduleJson.version
Write-Host "Current version: $currentVersion" -ForegroundColor Yellow

# Parse version
$versionParts = $currentVersion -split '\.'
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]

# Show options
Write-Host ""
Write-Host "Select version bump:" -ForegroundColor Green
Write-Host "[1] PATCH  $currentVersion -> $major.$minor.$($patch + 1)"
Write-Host "[2] MINOR  $currentVersion -> $major.$($minor + 1).0"
Write-Host "[3] MAJOR  $currentVersion -> $($major + 1).0.0"
Write-Host "[4] CUSTOM"
Write-Host ""

$choice = Read-Host "Select [1-4]"

switch ($choice) {
    "1" { $newVersion = "$major.$minor.$($patch + 1)" }
    "2" { $newVersion = "$major.$($minor + 1).0" }
    "3" { $newVersion = "$($major + 1).0.0" }
    "4" { $newVersion = Read-Host "Enter version" }
    default { 
        Write-Host "Invalid choice" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Publishing version: $newVersion" -ForegroundColor Green
Write-Host ""

# Update version in files
Write-Host "Updating version files..." -ForegroundColor Yellow
$files = @("module\module.json", "package.json", "module\package.json")
foreach ($file in $files) {
    $content = Get-Content $file -Raw
    $content = $content -replace '"version": "[^"]+"', "`"version`": `"$newVersion`""
    Set-Content $file $content -NoNewline
}

# Package module
Write-Host "Packaging module..." -ForegroundColor Yellow
Set-Location module
npm run package | Out-Null
Set-Location ..

# Git operations
Write-Host "Committing changes..." -ForegroundColor Yellow
git add -A
git commit -m "Release v$newVersion" | Out-Null

# Handle tag
Write-Host "Creating tag..." -ForegroundColor Yellow
git tag -d "v$newVersion" 2>$null | Out-Null
git push origin --delete "v$newVersion" 2>$null | Out-Null
git tag -a "v$newVersion" -m "Release v$newVersion"

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
$pushResult = git push origin main 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed: $pushResult" -ForegroundColor Red
    exit 1
}

$tagResult = git push origin "v$newVersion" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Tag push failed: $tagResult" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Green
Write-Host "SUCCESS! Release v$newVersion published!" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "GitHub Actions: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/actions"
Write-Host "Release Page: https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/tag/v$newVersion"
Write-Host ""
Write-Host "Module URL for Foundry:"
Write-Host "https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json" -ForegroundColor Cyan
Write-Host ""
# Foundry VTT REST API - Windows Installation Script
# This script builds the module and installs it to your Foundry VTT modules directory

param(
    [string]$FoundryPath = "$env:APPDATA\FoundryVTT\Data\modules",
    [switch]$Symlink,
    [switch]$Force
)

Write-Host "=== Foundry VTT REST API Installation Script ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator (required for symlinks)
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if ($Symlink -and -not $isAdmin) {
    Write-Host "ERROR: Creating symbolic links requires administrator privileges." -ForegroundColor Red
    Write-Host "Please run PowerShell as Administrator or use the copy method instead." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$moduleName = "foundry-rest-api"
$targetPath = Join-Path $FoundryPath $moduleName

Write-Host "Source Directory: $scriptDir" -ForegroundColor Gray
Write-Host "Target Directory: $targetPath" -ForegroundColor Gray
Write-Host ""

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✓ npm found (version $npmVersion)" -ForegroundColor Green
} catch {
    Write-Host "✗ npm not found. Please install Node.js first." -ForegroundColor Red
    Write-Host "  Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if target already exists
if (Test-Path $targetPath) {
    if ($Force) {
        Write-Host "Removing existing installation..." -ForegroundColor Yellow
        if ((Get-Item $targetPath).LinkType -eq "SymbolicLink") {
            (Get-Item $targetPath).Delete()
        } else {
            Remove-Item $targetPath -Recurse -Force
        }
    } else {
        Write-Host "WARNING: Module already installed at $targetPath" -ForegroundColor Yellow
        Write-Host "Use -Force flag to overwrite or remove the existing installation first." -ForegroundColor Yellow
        exit 1
    }
}

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Blue
Set-Location $scriptDir
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Build the module
Write-Host ""
Write-Host "Building module..." -ForegroundColor Blue
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to build module" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Module built successfully" -ForegroundColor Green

# Install to Foundry
Write-Host ""
if ($Symlink) {
    Write-Host "Creating symbolic link..." -ForegroundColor Blue
    try {
        New-Item -ItemType SymbolicLink -Path $targetPath -Target $scriptDir -Force | Out-Null
        Write-Host "✓ Symbolic link created" -ForegroundColor Green
        Write-Host "  Changes to source files will be reflected immediately" -ForegroundColor Gray
    } catch {
        Write-Host "✗ Failed to create symbolic link" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Copying files to Foundry..." -ForegroundColor Blue
    
    # Create target directory
    New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    
    # Copy required files
    Copy-Item -Path "$scriptDir\dist\*" -Destination $targetPath -Recurse -Force
    Copy-Item -Path "$scriptDir\src\module.json" -Destination $targetPath -Force
    Copy-Item -Path "$scriptDir\src\languages" -Destination $targetPath -Recurse -Force
    
    # Copy styles if they exist
    if (Test-Path "$scriptDir\src\styles") {
        Copy-Item -Path "$scriptDir\src\styles" -Destination $targetPath -Recurse -Force
    }
    
    Write-Host "✓ Files copied to Foundry modules directory" -ForegroundColor Green
}

# Verify installation
Write-Host ""
Write-Host "Verifying installation..." -ForegroundColor Blue
if (Test-Path "$targetPath\module.json") {
    $moduleJson = Get-Content "$targetPath\module.json" | ConvertFrom-Json
    Write-Host "✓ Module installed successfully!" -ForegroundColor Green
    Write-Host "  Name: $($moduleJson.title)" -ForegroundColor Gray
    Write-Host "  Version: $($moduleJson.version)" -ForegroundColor Gray
    Write-Host "  Compatibility: Foundry v$($moduleJson.compatibility.minimum) - v$($moduleJson.compatibility.verified)" -ForegroundColor Gray
} else {
    Write-Host "✗ Installation verification failed" -ForegroundColor Red
    exit 1
}

# Copy test scripts
Write-Host ""
Write-Host "Copying test scripts..." -ForegroundColor Blue
$testFiles = @("test-api.js", "test-api-advanced.js", "test-api-monitor.js")
foreach ($testFile in $testFiles) {
    if (Test-Path "$scriptDir\$testFile") {
        Copy-Item -Path "$scriptDir\$testFile" -Destination $targetPath -Force
        Write-Host "  ✓ $testFile" -ForegroundColor Gray
    }
}

# Final instructions
Write-Host ""
Write-Host "=== Installation Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Launch Foundry VTT v13"
Write-Host "2. Navigate to your world"
Write-Host "3. Go to Settings → Manage Modules"
Write-Host "4. Enable 'Foundry REST API'"
Write-Host "5. Configure the module in Settings → Module Settings"
Write-Host ""
Write-Host "Test scripts available in browser console:" -ForegroundColor Yellow
Write-Host "  - test-api.js (basic tests)"
Write-Host "  - test-api-advanced.js (router tests)"
Write-Host "  - test-api-monitor.js (performance monitoring)"
Write-Host ""

# Development mode reminder
if ($Symlink) {
    Write-Host "Development Mode Active:" -ForegroundColor Magenta
    Write-Host "  - Source files are symlinked"
    Write-Host "  - Run 'npm run dev' for watch mode"
    Write-Host "  - Changes will reflect after browser refresh"
    Write-Host ""
}
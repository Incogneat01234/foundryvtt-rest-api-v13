@echo off
echo =====================================
echo Simple API Diagnostic Tool
echo =====================================
echo.

echo [1] Checking Foundry connection...
echo.
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:30000' -UseBasicParsing -ErrorAction Stop; Write-Host '   ✓ Foundry is running on port 30000' -ForegroundColor Green } catch { Write-Host '   ✗ Foundry is NOT accessible on port 30000' -ForegroundColor Red; Write-Host '   Error: ' $_.Exception.Message }"
echo.

echo [2] Module installation check:
echo.
echo Please verify in Foundry:
echo   - Go to Game Settings -^> Manage Modules
echo   - Look for "Simple API" in the list
echo   - Make sure it's ENABLED (checkbox checked)
echo   - Click "Save Module Settings" if you make changes
echo.

echo [3] Authentication settings:
echo.
echo In Foundry, go to:
echo   - Game Settings -^> Module Settings
echo   - Find "Simple API" section
echo   - Check these settings:
echo     * Enable Authentication
echo     * API Username (default: API_USER)
echo     * API Password (default: API)
echo.

echo [4] Testing module in Foundry console:
echo.
echo Press F12 in Foundry and run:
echo   testSimpleAPIv2()
echo.
echo You should see output in the console.
echo.

echo [5] Common issues:
echo.
echo   - Foundry not running on port 30000
echo   - Module not installed/enabled
echo   - Not logged in as GM
echo   - Browser blocking WebSocket connections
echo   - Firewall blocking local connections
echo.

pause
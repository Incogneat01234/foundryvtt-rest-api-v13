@echo off
echo ========================================
echo Direct Foundry MCP Test
echo ========================================
echo.

:: Create logs directory
if not exist logs mkdir logs

:: Set log file with timestamp
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set DATE=%%d-%%b-%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TIME=%%a-%%b
set LOGFILE=logs\direct-mcp-test_%DATE%_%TIME%.log

echo Starting test at %DATE% %TIME% > %LOGFILE%
echo. >> %LOGFILE%

:: Install dependencies if needed
echo Checking dependencies...
echo Checking dependencies... >> %LOGFILE%
if not exist node_modules (
    echo Installing dependencies...
    echo Installing dependencies... >> %LOGFILE%
    npm install >> %LOGFILE% 2>&1
)

:: Test direct MCP connection
echo.
echo Testing Direct MCP Connection...
echo Testing Direct MCP Connection... >> %LOGFILE%
echo. >> %LOGFILE%

:: Create a test script
echo Creating test script...
echo const { spawn } = require('child_process'); > test-direct-mcp-runner.js
echo const mcp = spawn('node', ['mcp/direct-foundry-mcp.js'], { >> test-direct-mcp-runner.js
echo   stdio: ['pipe', 'pipe', 'pipe'] >> test-direct-mcp-runner.js
echo }); >> test-direct-mcp-runner.js
echo. >> test-direct-mcp-runner.js
echo mcp.stderr.on('data', (data) =^> { >> test-direct-mcp-runner.js
echo   console.log(data.toString()); >> test-direct-mcp-runner.js
echo }); >> test-direct-mcp-runner.js
echo. >> test-direct-mcp-runner.js
echo mcp.on('error', (err) =^> { >> test-direct-mcp-runner.js
echo   console.error('Failed to start MCP:', err); >> test-direct-mcp-runner.js
echo }); >> test-direct-mcp-runner.js
echo. >> test-direct-mcp-runner.js
echo setTimeout(() =^> { >> test-direct-mcp-runner.js
echo   console.log('Sending initialize request...'); >> test-direct-mcp-runner.js
echo   mcp.stdin.write(JSON.stringify({ >> test-direct-mcp-runner.js
echo     jsonrpc: '2.0', >> test-direct-mcp-runner.js
echo     id: 1, >> test-direct-mcp-runner.js
echo     method: 'initialize', >> test-direct-mcp-runner.js
echo     params: { >> test-direct-mcp-runner.js
echo       protocolVersion: '0.1.0', >> test-direct-mcp-runner.js
echo       capabilities: {} >> test-direct-mcp-runner.js
echo     } >> test-direct-mcp-runner.js
echo   }) + '\n'); >> test-direct-mcp-runner.js
echo }, 2000); >> test-direct-mcp-runner.js
echo. >> test-direct-mcp-runner.js
echo setTimeout(() =^> { >> test-direct-mcp-runner.js
echo   console.log('Listing tools...'); >> test-direct-mcp-runner.js
echo   mcp.stdin.write(JSON.stringify({ >> test-direct-mcp-runner.js
echo     jsonrpc: '2.0', >> test-direct-mcp-runner.js
echo     id: 2, >> test-direct-mcp-runner.js
echo     method: 'tools/list', >> test-direct-mcp-runner.js
echo     params: {} >> test-direct-mcp-runner.js
echo   }) + '\n'); >> test-direct-mcp-runner.js
echo }, 4000); >> test-direct-mcp-runner.js
echo. >> test-direct-mcp-runner.js
echo setTimeout(() =^> { >> test-direct-mcp-runner.js
echo   console.log('Getting system info...'); >> test-direct-mcp-runner.js
echo   mcp.stdin.write(JSON.stringify({ >> test-direct-mcp-runner.js
echo     jsonrpc: '2.0', >> test-direct-mcp-runner.js
echo     id: 3, >> test-direct-mcp-runner.js
echo     method: 'tools/call', >> test-direct-mcp-runner.js
echo     params: { >> test-direct-mcp-runner.js
echo       name: 'getSystemInfo', >> test-direct-mcp-runner.js
echo       arguments: {} >> test-direct-mcp-runner.js
echo     } >> test-direct-mcp-runner.js
echo   }) + '\n'); >> test-direct-mcp-runner.js
echo }, 6000); >> test-direct-mcp-runner.js
echo. >> test-direct-mcp-runner.js
echo mcp.stdout.on('data', (data) =^> { >> test-direct-mcp-runner.js
echo   console.log('MCP Response:', data.toString()); >> test-direct-mcp-runner.js
echo }); >> test-direct-mcp-runner.js
echo. >> test-direct-mcp-runner.js
echo setTimeout(() =^> { >> test-direct-mcp-runner.js
echo   console.log('Closing MCP...'); >> test-direct-mcp-runner.js
echo   mcp.kill(); >> test-direct-mcp-runner.js
echo   process.exit(0); >> test-direct-mcp-runner.js
echo }, 10000); >> test-direct-mcp-runner.js

:: Run the test
node test-direct-mcp-runner.js 2>&1 | tee -a %LOGFILE%

:: Clean up
del test-direct-mcp-runner.js

echo.
echo ========================================
echo Test completed!
echo Log saved to: %LOGFILE%
echo ========================================
echo.
echo Summary:
echo - Direct MCP attempts to connect to Foundry without relay
echo - Uses chat messages for communication (required by Foundry v13)
echo - If successful, this eliminates the need for the relay server
echo.
pause
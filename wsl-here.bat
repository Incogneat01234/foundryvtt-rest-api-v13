@echo off
REM Simple universal WSL launcher
REM Opens WSL in your current Command Prompt directory

REM Get current directory and convert to WSL format
for /f "delims=" %%i in ('wsl wslpath -u "%CD%"') do set "WSL_PATH=%%i"

echo Starting WSL in: %WSL_PATH%
wsl --cd "%WSL_PATH%"

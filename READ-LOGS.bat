@echo off
echo ========================================
echo VIEWING LATEST LOG FILES
echo ========================================
echo.

cd /d "%~dp0"

echo Available log files:
echo.
dir /B /O-D *.txt 2>nul | findstr "log"
echo.

REM Find the most recent log file
for /f "tokens=*" %%i in ('dir /B /O-D *log*.txt 2^>nul') do (
    set LATEST=%%i
    goto :found
)

:notfound
echo No log files found!
pause
exit /b

:found
echo Opening latest log: %LATEST%
echo.
notepad "%LATEST%"

echo.
echo Would you like to open another log? (Y/N)
choice /C YN /N
if %ERRORLEVEL%==1 goto :selectlog
exit /b

:selectlog
echo.
echo Select a log file number:
echo.
set /a COUNT=0
for /f "tokens=*" %%i in ('dir /B /O-D *log*.txt 2^>nul') do (
    set /a COUNT+=1
    echo !COUNT!. %%i
    set LOG!COUNT!=%%i
)

set /p CHOICE=Enter number: 
set SELECTED=!LOG%CHOICE%!
if defined SELECTED (
    notepad "!SELECTED!"
) else (
    echo Invalid selection
)

pause
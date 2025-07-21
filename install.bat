@echo off
echo Installing Simple API dependencies...
echo.

echo Installing relay server dependencies...
call npm install

echo.
echo Installing module packaging dependencies...
cd module
call npm install
cd ..

echo.
echo ✅ All dependencies installed!
echo.
echo You can now run:
echo   - run-simple-api.bat    (to start the relay server)
echo   - test-simple-api.bat   (to run tests)
echo   - publish-simple-api.bat (to create a release)
echo.
pause
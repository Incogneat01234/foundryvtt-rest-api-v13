@echo off
echo =====================================
echo Basic Connection Test
echo =====================================
echo.

echo Step 1: Testing HTTP endpoint...
curl -s http://localhost:8080 | findstr "connected"
echo.

echo Step 2: In Foundry console (F12), run:
echo   testSimpleAPI()
echo.
echo You should see:
echo - A response in the console
echo - A whispered chat message
echo.

echo Step 3: Check relay server output
echo You should see the response being received
echo.

pause
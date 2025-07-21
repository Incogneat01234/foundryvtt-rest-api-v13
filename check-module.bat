@echo off
echo =====================================
echo Simple API Module Checklist
echo =====================================
echo.
echo Please verify ALL of the following:
echo.
echo 1. [ ] Foundry VTT is running
echo        URL: http://localhost:30000
echo.
echo 2. [ ] You have a world loaded
echo.
echo 3. [ ] You are logged in as GAMEMASTER
echo        (Not just a player with GM permissions)
echo.
echo 4. [ ] Simple API module is INSTALLED
echo        - Check Add-on Modules in Foundry
echo        - Should show "simple-api" in the list
echo        - Current version: 5.0.2
echo.
echo 5. [ ] Simple API module is ENABLED
echo        - In Game Settings -^> Manage Modules
echo        - Checkbox next to "Simple API" is checked
echo        - Click "Save Module Settings" after enabling
echo.
echo 6. [ ] You've RELOADED after enabling
echo        - Press F5 in Foundry after enabling the module
echo.
echo 7. [ ] Configure Authentication (optional)
echo        - Game Settings -^> Module Settings -^> Simple API
echo        - Enable Authentication: ON/OFF
echo        - API Username: API_USER (default)
echo        - API Password: API (default)
echo.
echo =====================================
echo Testing the module:
echo.
echo In Foundry console (F12):
echo   testSimpleAPIv2()
echo.
echo You should see:
echo   - "Simple API v2 | Ready!"
echo   - Current settings displayed
echo   - Test ping response
echo.
echo =====================================
echo Common Issues:
echo.
echo - Settings not saving: Reload Foundry (F5)
echo - Relay can't connect: Check Foundry port
echo - No response: Check you're logged in as GM
echo.
pause
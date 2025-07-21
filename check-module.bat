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
echo.
echo 5. [ ] Simple API module is ENABLED
echo        - In Game Settings -^> Manage Modules
echo        - Checkbox next to "Simple API" is checked
echo        - Click "Save Module Settings" after enabling
echo.
echo 6. [ ] You've RELOADED after enabling
echo        - Press F5 in Foundry after enabling the module
echo.
echo =====================================
echo If all above are checked, the module should work!
echo.
echo To test if the module is working in Foundry:
echo 1. Open browser console (F12)
echo 2. Type: game.socket.emit("module.simple-api", {type: "ping"})
echo 3. You should see a response in the console
echo.
pause
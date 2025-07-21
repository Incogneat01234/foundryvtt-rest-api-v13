# External API Connection Instructions

## The Problem

Foundry v13's Socket.IO implementation has security restrictions:
- External connections CANNOT create chat messages
- Direct socket events (game.socket) are NOT relayed to external connections
- Only certain events are accessible to external Socket.IO clients

## The Solution

I've created `simple-api-external.js` which listens for multiple event types that external connections might be able to send:
- Direct module events
- Template events  
- Userspace messages
- Raw socket events

## Testing Process

### Step 1: Switch to External Module
```batch
switch-to-external.bat
```

### Step 2: Restart/Refresh Foundry
Either:
- Restart Foundry server completely, OR
- In Foundry: Settings → Manage Modules → Disable then re-enable "Simple API"

### Step 3: Verify Module Loaded
In Foundry F12 console:
```javascript
// Should show external listeners registered
game.modules.get('simple-api')?.active
```

### Step 4: Run External Connection Test
```batch
node test-external-events.js
```

This will try 6 different methods to communicate with Foundry.

### Step 5: Check Results
Watch for:
- Response events in the test output
- Console messages in Foundry's F12 console
- Any "Simple API External |" log messages

### Step 6: Restore Original Module
```batch
restore-module.bat
```

## If Nothing Works

If no events get through, it means Foundry v13 completely blocks external Socket.IO events. In that case, we need a different architecture:

1. **HTTP API**: Add an HTTP endpoint to the module
2. **WebRTC**: Use Foundry's A/V framework for data
3. **Database Polling**: Have module poll a shared database
4. **File Watching**: Module watches a file for commands

## Current Status

The relay architecture exists because of these limitations. The module uses chat messages internally because they work within Foundry, but external connections can't create them.

The most reliable solution remains the three-component architecture with the relay server acting as a bridge.
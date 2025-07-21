# Simple API - Quick Install Guide

## Step 1: Install the Module in Foundry

1. Copy the `simple-api-module` folder to your Foundry modules directory:
   ```
   FoundryData/Data/modules/
   ```

2. In Foundry:
   - Go to **Game Settings** → **Manage Modules**
   - Find and enable **Simple API**
   - Save and return to game

## Step 2: Run the Relay Server

```bash
# Windows
run-simple-api.bat

# Linux/Mac
node simple-api-relay.js
```

## Step 3: Test It Works

```bash
node test-simple-api.js
```

You should see:
- ✅ Connected to relay server
- 📥 Responses for each test
- Actors created in Foundry
- Dice rolls in chat
- Chat messages appear

## That's It! 🎉

The API is now ready. You can:
- Create, read, update, delete actors
- Roll dice and send to chat
- Create tokens on scenes
- Send chat messages
- And more!

## Example Code

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  // Create an actor
  ws.send(JSON.stringify({
    type: 'create-actor',
    requestId: '123',
    name: 'My Hero',
    actorType: 'character'
  }));
});

ws.on('message', (data) => {
  console.log('Response:', JSON.parse(data));
});
```

## Troubleshooting

**"Simple API module may not be installed"**
- Make sure the module is enabled in Foundry
- Make sure you're logged in as GM

**"Not connected to Foundry"**
- Check Foundry is running on port 30000
- Check the relay server shows "Connected to Foundry"

**No actors appear**
- The GM must be logged into Foundry
- The world must be loaded

## Advanced: Direct Connection

If you want to connect directly without the relay server, you can listen to Foundry's socket:

```javascript
// In a Foundry macro or module
game.socket.on("module.simple-api", (request) => {
  console.log("API Request:", request);
});

// Send a request
game.socket.emit("module.simple-api", {
  type: "get-actors",
  requestId: "123"
});
```
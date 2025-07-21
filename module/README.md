# Simple API Module for Foundry VTT

A dead-simple WebSocket API for Foundry VTT. No authentication, no complex setup - it just works.

## Features

- ✅ **No Authentication Required** - Connects using Foundry's existing Socket.IO
- ✅ **Simple Request/Response** - Send JSON, get JSON back
- ✅ **Full CRUD Operations** - Create, Read, Update, Delete actors and items
- ✅ **Dice Rolling** - Roll dice and send results to chat
- ✅ **Chat Messages** - Send messages to Foundry chat
- ✅ **Scene & Token Management** - Create tokens, get scene info
- ✅ **Minimal Code** - One file, ~400 lines, easy to modify

## Installation

### Method 1: Manual Installation

1. Create folder in your Foundry modules directory:
   ```
   FoundryData/Data/modules/simple-api/
   ```

2. Copy these files:
   - `module.json`
   - `scripts/simple-api.js`

3. In Foundry:
   - Go to **Game Settings** → **Manage Modules**
   - Enable **Simple API**
   - Save and reload

### Method 2: Manifest URL

In Foundry's module installer, use:
```
https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
```

## Usage

### 1. Install the Module in Foundry

Enable the module in your world. The GM must be logged in for the API to work.

### 2. Run the Relay Server

```bash
# Install dependencies
npm install ws

# Run the relay server
node simple-api-relay.js
```

The relay server connects to Foundry on port 30000 and exposes a WebSocket API on port 8080.

### 3. Send API Requests

Connect to `ws://localhost:8080` and send JSON requests.

## API Reference

### Actor Operations

**Get All Actors**
```json
{
  "type": "get-actors",
  "requestId": "123"
}
```

**Get Single Actor**
```json
{
  "type": "get-actor",
  "requestId": "123",
  "actorId": "kJDKFH3h4h2"
}
```

**Create Actor**
```json
{
  "type": "create-actor",
  "requestId": "123",
  "name": "Gandalf",
  "actorType": "character",
  "system": {
    "abilities": {
      "str": { "value": 10 },
      "dex": { "value": 14 },
      "con": { "value": 12 },
      "int": { "value": 18 },
      "wis": { "value": 16 },
      "cha": { "value": 15 }
    },
    "attributes": {
      "hp": { "value": 50, "max": 50 },
      "ac": { "value": 15 }
    }
  }
}
```

**Update Actor**
```json
{
  "type": "update-actor",
  "requestId": "123",
  "actorId": "kJDKFH3h4h2",
  "updates": {
    "name": "Gandalf the White",
    "system.attributes.hp.value": 75
  }
}
```

**Delete Actor**
```json
{
  "type": "delete-actor",
  "requestId": "123",
  "actorId": "kJDKFH3h4h2"
}
```

### Item Operations

**Create Item**
```json
{
  "type": "create-item",
  "requestId": "123",
  "name": "Longsword +1",
  "itemType": "weapon",
  "system": {
    "damage": {
      "parts": [["1d8 + 1", "slashing"]]
    },
    "attackBonus": 1
  }
}
```

**Add Item to Actor**
```json
{
  "type": "add-item-to-actor",
  "requestId": "123",
  "actorId": "kJDKFH3h4h2",
  "name": "Healing Potion",
  "itemType": "consumable"
}
```

### Dice Rolling

**Roll Dice**
```json
{
  "type": "roll-dice",
  "requestId": "123",
  "formula": "2d20kh + 5",
  "showInChat": true,
  "flavor": "Attack with advantage"
}
```

**Roll Ability Check** (D&D 5e)
```json
{
  "type": "roll-check",
  "requestId": "123",
  "actorId": "kJDKFH3h4h2",
  "ability": "str",
  "showInChat": true
}
```

### Scene & Token Operations

**Get Tokens**
```json
{
  "type": "get-tokens",
  "requestId": "123"
}
```

**Create Token**
```json
{
  "type": "create-token",
  "requestId": "123",
  "actorId": "kJDKFH3h4h2",
  "x": 1000,
  "y": 1000
}
```

### Chat Operations

**Send Chat Message**
```json
{
  "type": "send-chat",
  "requestId": "123",
  "message": "The dragon attacks!"
}
```

### Utility

**Ping**
```json
{
  "type": "ping",
  "requestId": "123"
}
```

**Get System Info**
```json
{
  "type": "get-system-info",
  "requestId": "123"
}
```

## Response Format

All responses include:
- `requestId` - Your original request ID
- `responseType` - The operation type + "-response" or "-error"
- Data fields specific to the operation

Success example:
```json
{
  "requestId": "123",
  "responseType": "create-actor-response",
  "created": true,
  "actor": {
    "_id": "abc123",
    "name": "Gandalf",
    "type": "character",
    "uuid": "Actor.abc123"
  }
}
```

Error example:
```json
{
  "requestId": "123",
  "responseType": "get-actor-error",
  "error": "Actor not found"
}
```

## Running Without Relay Server

The module uses Foundry's built-in socket system. If you want to connect directly:

1. Connect to Foundry's Socket.IO: `ws://localhost:30000/socket.io/?EIO=4&transport=websocket`
2. Send Socket.IO formatted messages: `42["module.simple-api",{...}]`
3. Listen for: `42["module.simple-api",{...}]` responses

## Customization

The module is intentionally simple. To add new operations:

1. Add a new case in the `handleApiRequest` function
2. Create the handler function
3. Return the response

Example:
```javascript
case "my-custom-operation":
  response = await myCustomOperation(request);
  break;

async function myCustomOperation(request) {
  // Your code here
  return { success: true };
}
```

## Security Note

This module has **NO AUTHENTICATION**. Anyone who can connect to your Foundry can use the API. Only use this:
- On local/trusted networks
- For development/testing
- With additional security layers

## License

MIT - Do whatever you want with it!
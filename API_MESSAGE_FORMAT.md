# Foundry VTT REST API Message Format Guide

This guide describes the WebSocket message format and available message types for the Foundry VTT REST API.

## Connection

### WebSocket URL Format
```
ws://localhost:8080?id=<client-id>&token=<api-token>
```

- `id`: A unique identifier for your client (e.g., `my-app-123`)
- `token`: API token (optional for local server, required for relay server)

### Connection Example
```javascript
const ws = new WebSocket('ws://localhost:8080?id=my-client&token=my-token');

ws.on('open', () => {
  console.log('Connected!');
  // Send a ping to verify connection
  ws.send(JSON.stringify({ type: 'ping' }));
});
```

## Message Format

All messages are JSON objects with at least a `type` field:

```typescript
interface Message {
  type: string;        // Message type identifier
  requestId?: string;  // Optional unique request ID for tracking responses
  [key: string]: any;  // Additional fields specific to message type
}
```

## Core Message Types

### 1. Connection Management

#### Ping/Pong (Keepalive)
```javascript
// Request
{
  "type": "ping"
}

// Response
{
  "type": "pong",
  "timestamp": 1234567890
}
```

### 2. Structure and Entities

#### Get World Structure
Returns the hierarchical structure of the Foundry world.

```javascript
// Request
{
  "type": "get-structure",
  "requestId": "req-123"
}

// Response
{
  "type": "structure-result",
  "requestId": "req-123",
  "success": true,
  "data": {
    "scenes": [...],
    "actors": [...],
    "items": [...],
    "journal": [...],
    "tables": [...],
    "playlists": [...],
    "compendiums": [...]
  }
}
```

#### Get Entities by Type
Retrieve all entities of a specific type.

```javascript
// Request
{
  "type": "get-entities",
  "requestId": "req-124",
  "entityType": "Actor"  // Actor, Item, Scene, JournalEntry, etc.
}

// Response
{
  "type": "entities-result",
  "requestId": "req-124",
  "success": true,
  "data": [
    {
      "id": "abc123",
      "name": "Character Name",
      "type": "character",
      // ... entity data
    }
  ]
}
```

#### Get Single Entity
Retrieve a specific entity by UUID.

```javascript
// Request
{
  "type": "get-entity",
  "requestId": "req-125",
  "uuid": "Actor.abc123"
}

// Response
{
  "type": "entity-result",
  "requestId": "req-125",
  "success": true,
  "data": {
    "id": "abc123",
    "name": "Character Name",
    // ... full entity data
  }
}
```

### 3. Dice Rolling

#### Get Recent Rolls
Retrieve recent dice rolls from the world.

```javascript
// Request
{
  "type": "get-rolls",
  "requestId": "req-126",
  "limit": 20  // Optional, default 20
}

// Response
{
  "type": "rolls-data",
  "requestId": "req-126",
  "data": [
    {
      "id": "roll_123",
      "formula": "1d20+5",
      "total": 18,
      "timestamp": 1234567890,
      // ... roll details
    }
  ]
}
```

#### Get Last Roll
```javascript
// Request
{
  "type": "get-last-roll",
  "requestId": "req-127"
}

// Response
{
  "type": "last-roll-data",
  "requestId": "req-127",
  "data": {
    "id": "roll_123",
    "formula": "1d20+5",
    "total": 18,
    // ... roll details
  }
}
```

#### Perform Roll
Execute a dice roll in Foundry.

```javascript
// Request - Simple Roll
{
  "type": "perform-roll",
  "requestId": "req-128",
  "formula": "2d6+3",
  "flavor": "Damage Roll",
  "createChatMessage": true
}

// Request - Item Roll
{
  "type": "perform-roll",
  "requestId": "req-129",
  "itemUuid": "Item.xyz789",
  "speaker": "Actor.abc123",    // Optional speaker UUID
  "target": "Token.def456",      // Optional target UUID
  "createChatMessage": true
}

// Response
{
  "type": "roll-result",
  "requestId": "req-128",
  "success": true,
  "data": {
    "id": "roll_124",
    "chatMessageCreated": true,
    "roll": {
      "formula": "2d6+3",
      "total": 10,
      "isCritical": false,
      "isFumble": false,
      "dice": [...],
      "timestamp": 1234567890
    }
  }
}
```

### 4. Search

#### Search Entities
Search for entities using QuickInsert (if available).

```javascript
// Request
{
  "type": "search",
  "requestId": "req-130",
  "query": "goblin",
  "filter": "Actor"  // Optional: Actor, Item, Scene, etc.
}

// Response
{
  "type": "search-result",
  "requestId": "req-130",
  "success": true,
  "data": [
    {
      "uuid": "Actor.abc123",
      "name": "Goblin Warrior",
      "documentType": "Actor",
      // ... search result data
    }
  ]
}
```

### 5. Macros

#### Execute Macro
Run a macro by name or UUID.

```javascript
// Request
{
  "type": "run-macro",
  "requestId": "req-131",
  "identifier": "Attack Roll",  // Macro name or UUID
  "args": {                     // Optional arguments
    "target": "Token.abc123"
  }
}

// Response
{
  "type": "macro-result",
  "requestId": "req-131",
  "success": true,
  "data": {
    "executed": true,
    "result": "..."  // Macro return value if any
  }
}
```

### 6. File System

#### List Files
Browse the Foundry data directory.

```javascript
// Request
{
  "type": "list-files",
  "requestId": "req-132",
  "path": "worlds/myworld/data"
}

// Response
{
  "type": "files-result",
  "requestId": "req-132",
  "success": true,
  "data": {
    "files": ["file1.json", "file2.png"],
    "dirs": ["subfolder1", "subfolder2"]
  }
}
```

#### Read File
Read file contents (text files only).

```javascript
// Request
{
  "type": "read-file",
  "requestId": "req-133",
  "path": "worlds/myworld/data/settings.json"
}

// Response
{
  "type": "file-content",
  "requestId": "req-133",
  "success": true,
  "data": {
    "content": "{ \"key\": \"value\" }",
    "encoding": "utf8"
  }
}
```

### 7. Sheets and UI

#### Open Actor/Item Sheet
Open a character or item sheet in Foundry.

```javascript
// Request
{
  "type": "open-sheet",
  "requestId": "req-134",
  "uuid": "Actor.abc123"
}

// Response
{
  "type": "sheet-result",
  "requestId": "req-134",
  "success": true,
  "data": {
    "opened": true,
    "uuid": "Actor.abc123"
  }
}
```

### 8. Combat Encounters

#### Get Active Encounter
```javascript
// Request
{
  "type": "get-encounter",
  "requestId": "req-135"
}

// Response
{
  "type": "encounter-data",
  "requestId": "req-135",
  "success": true,
  "data": {
    "active": true,
    "round": 2,
    "turn": 3,
    "combatants": [...],
    // ... combat data
  }
}
```

#### Combat Actions
```javascript
// Next Turn
{
  "type": "next-turn",
  "requestId": "req-136"
}

// Previous Turn
{
  "type": "previous-turn",
  "requestId": "req-137"
}

// Start Combat
{
  "type": "start-combat",
  "requestId": "req-138"
}

// End Combat
{
  "type": "end-combat",
  "requestId": "req-139"
}
```

### 9. Utility Functions

#### Evaluate Expression
Evaluate a JavaScript expression in Foundry's context.

```javascript
// Request
{
  "type": "evaluate",
  "requestId": "req-140",
  "expression": "game.actors.size"
}

// Response
{
  "type": "evaluate-result",
  "requestId": "req-140",
  "success": true,
  "data": {
    "result": 42
  }
}
```

## Error Responses

All endpoints can return error responses:

```javascript
{
  "type": "<original-type>-result",
  "requestId": "req-xxx",
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Real-time Events

The server also sends real-time events when things happen in Foundry:

### Roll Events
Automatically sent when dice are rolled in Foundry.

```javascript
{
  "type": "roll-data",
  "data": {
    "id": "roll_125",
    "user": {
      "id": "user123",
      "name": "Player Name"
    },
    "formula": "1d20+5",
    "total": 18,
    "flavor": "Attack Roll",
    // ... roll details
  }
}
```

## Complete Example

Here's a complete example of connecting and using the API:

```javascript
const WebSocket = require('ws');

class FoundryClient {
  constructor(url = 'ws://localhost:8080') {
    this.url = url;
    this.ws = null;
    this.requestCallbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.url}?id=example-client&token=optional`);
      
      this.ws.on('open', () => {
        console.log('Connected to Foundry');
        this.startPingInterval();
        resolve();
      });
      
      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        // Handle responses to requests
        if (message.requestId && this.requestCallbacks.has(message.requestId)) {
          const callback = this.requestCallbacks.get(message.requestId);
          this.requestCallbacks.delete(message.requestId);
          callback(message);
        }
        
        // Handle real-time events
        if (message.type === 'roll-data') {
          console.log('New roll:', message.data);
        }
      });
      
      this.ws.on('error', reject);
    });
  }
  
  sendRequest(message) {
    return new Promise((resolve) => {
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      message.requestId = requestId;
      
      this.requestCallbacks.set(requestId, resolve);
      this.ws.send(JSON.stringify(message));
    });
  }
  
  startPingInterval() {
    setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }
  
  // API Methods
  async getStructure() {
    return this.sendRequest({ type: 'get-structure' });
  }
  
  async getActors() {
    return this.sendRequest({ type: 'get-entities', entityType: 'Actor' });
  }
  
  async rollDice(formula, flavor) {
    return this.sendRequest({
      type: 'perform-roll',
      formula,
      flavor,
      createChatMessage: true
    });
  }
  
  async search(query, filter) {
    return this.sendRequest({ type: 'search', query, filter });
  }
}

// Usage
async function main() {
  const client = new FoundryClient();
  await client.connect();
  
  // Get world structure
  const structure = await client.getStructure();
  console.log('World structure:', structure);
  
  // Roll some dice
  const roll = await client.rollDice('2d6+3', 'Damage Roll');
  console.log('Roll result:', roll);
  
  // Search for entities
  const results = await client.search('goblin', 'Actor');
  console.log('Search results:', results);
}

main().catch(console.error);
```

## Notes

1. **Request IDs**: Always include a unique `requestId` for request/response correlation
2. **Error Handling**: Always check the `success` field in responses
3. **Authentication**: Local server accepts any token, relay server requires valid API key
4. **Real-time Events**: Some events (like rolls) are pushed automatically
5. **Type Safety**: Consider using TypeScript for better type checking

## Testing

You can test the API using the included test client:

```bash
node test-local-client.js
```

Or use any WebSocket client like `wscat`:

```bash
wscat -c "ws://localhost:8080?id=test&token=test"
> {"type":"ping"}
< {"type":"pong","timestamp":1234567890}
```
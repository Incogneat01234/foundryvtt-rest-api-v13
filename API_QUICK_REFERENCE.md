# Foundry VTT REST API Quick Reference

## Connection
```javascript
const ws = new WebSocket('ws://localhost:8080?id=my-client&token=optional');
```

## Common Operations

### 🎲 Roll Dice
```javascript
// Simple roll
{
  "type": "perform-roll",
  "formula": "1d20+5",
  "flavor": "Attack Roll",
  "createChatMessage": true
}

// Item/spell roll
{
  "type": "perform-roll",
  "itemUuid": "Item.abc123",
  "target": "Token.xyz789"  // optional
}
```

### 🔍 Search
```javascript
{
  "type": "search",
  "query": "sword",
  "filter": "Item"  // optional: Actor, Item, Scene, etc.
}
```

### 📋 Get Entities
```javascript
// All actors
{
  "type": "get-entities",
  "entityType": "Actor"
}

// Single entity
{
  "type": "get-entity",
  "uuid": "Actor.abc123"
}

// World structure
{
  "type": "get-structure"
}
```

### ⚔️ Combat
```javascript
// Get current combat
{
  "type": "get-encounter"
}

// Combat controls
{ "type": "next-turn" }
{ "type": "previous-turn" }
{ "type": "start-combat" }
{ "type": "end-combat" }
```

### 🎯 Macros
```javascript
{
  "type": "run-macro",
  "identifier": "Attack Roll",  // name or UUID
  "args": { "target": "Token.abc123" }
}
```

### 📂 Files
```javascript
// List files
{
  "type": "list-files",
  "path": "worlds/myworld/data"
}

// Read file
{
  "type": "read-file",
  "path": "worlds/myworld/data/config.json"
}
```

### 📑 UI Actions
```javascript
// Open character sheet
{
  "type": "open-sheet",
  "uuid": "Actor.abc123"
}
```

### 🔧 Utility
```javascript
// Evaluate JS expression
{
  "type": "evaluate",
  "expression": "game.actors.size"
}

// Keep connection alive
{
  "type": "ping"
}
```

## Response Format
```javascript
{
  "type": "<type>-result",
  "requestId": "your-request-id",
  "success": true,
  "data": { /* response data */ }
}
```

## Error Response
```javascript
{
  "type": "<type>-result",
  "requestId": "your-request-id", 
  "success": false,
  "error": "Error message"
}
```

## Real-time Events
```javascript
// Automatic roll notifications
{
  "type": "roll-data",
  "data": {
    "formula": "1d20+5",
    "total": 18,
    "user": { "name": "Player" }
  }
}
```
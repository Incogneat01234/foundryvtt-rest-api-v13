# Socket.IO Connection Handling Guide for Foundry VTT

This guide explains how to properly handle Socket.IO connections in Foundry VTT modules, especially for external connections, and how to avoid the "Cannot read properties of undefined (reading '_callbacks')" error.

## Understanding the Error

The `_callbacks` undefined error occurs when trying to access Socket.IO's internal properties that may not exist or have different structures across different Socket.IO versions. Foundry VTT uses Socket.IO internally, but the exact implementation details can vary.

## Foundry VTT Socket Architecture

1. **Main Socket**: `game.socket` - Foundry's wrapper around Socket.IO
2. **Internal Socket**: `game.socket._socket` - The actual Socket.IO client instance
3. **Socket.IO Version**: Foundry v10+ uses Socket.IO v4

## Safe Socket Message Handling

### Method 1: Standard Foundry Socket API (Recommended)

```javascript
// Always safe and recommended for module-to-module communication
game.socket.on("module.your-module-name", (data) => {
  handleRequest(data);
});

// Emit messages
game.socket.emit("module.your-module-name", {
  type: "request",
  data: "your data"
});
```

### Method 2: Safe External Connection Handling

```javascript
Hooks.once("ready", () => {
  // Only GM processes external requests
  if (!game.user.isGM) return;
  
  // Check for socket availability with proper error handling
  if (game.socket._socket) {
    setupExternalHandling();
  } else {
    console.warn("Socket not available for external connections");
  }
});

function setupExternalHandling() {
  const socket = game.socket._socket;
  
  // Method A: Check for callbacks object (Socket.IO v3/v4)
  if (socket._callbacks && typeof socket._callbacks === 'object') {
    // Safe callback registration
    if (!socket._callbacks['$userspace-socket-message']) {
      socket._callbacks['$userspace-socket-message'] = [];
    }
    socket._callbacks['$userspace-socket-message'].push((data) => {
      if (data?.action === "module.your-module") {
        handleExternalRequest(data.data);
      }
    });
  }
  
  // Method B: Check for onevent (Socket.IO v2)
  if (socket.onevent && typeof socket.onevent === 'function') {
    const originalOnEvent = socket.onevent.bind(socket);
    socket.onevent = function(packet) {
      try {
        if (packet?.data?.[0] === "module.your-module") {
          handleExternalRequest(packet.data[1]);
        }
      } catch (err) {
        console.error("Error in onevent handler:", err);
      }
      return originalOnEvent.call(this, packet);
    };
  }
}
```

## Authentication for External Connections

### Module Settings

```javascript
Hooks.once("init", () => {
  // Register authentication settings
  game.settings.register("your-module", "authToken", {
    name: "API Authentication Token",
    hint: "Token required for external API connections",
    scope: "world",
    config: true,
    type: String,
    default: "",
    restricted: true // Only GM can change
  });
  
  game.settings.register("your-module", "enableExternal", {
    name: "Enable External Connections",
    hint: "Allow connections from outside Foundry",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    restricted: true
  });
});
```

### Request Validation

```javascript
function validateAuth(request) {
  const authToken = game.settings.get("your-module", "authToken");
  
  if (!authToken) {
    console.warn("No auth token configured");
    return true; // Or false to require auth
  }
  
  if (request.auth !== authToken) {
    game.socket.emit("module.your-module", {
      type: "error",
      requestId: request.requestId,
      error: "Invalid authentication"
    });
    return false;
  }
  
  return true;
}
```

## External WebSocket Connection Pattern

### Relay Server Architecture

```
External Client <--WebSocket--> Relay Server <--Socket.IO--> Foundry VTT
```

### Relay Server Implementation

```javascript
// Connect to Foundry
const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
const foundryWs = new WebSocket(wsUrl);

// Socket.IO handshake
foundryWs.on('open', () => {
  foundryWs.send('40'); // Socket.IO connect packet
});

// Send messages to Foundry
function sendToFoundry(data) {
  // Method 1: Direct module message
  foundryWs.send(`42["module.your-module",${JSON.stringify(data)}]`);
  
  // Method 2: Userspace message (for external)
  foundryWs.send(`42["userspace-socket-message",{
    "action":"module.your-module",
    "data":${JSON.stringify(data)}
  }]`);
}
```

## Best Practices

### 1. Always Check for Availability

```javascript
// Bad
const callbacks = game.socket._socket._callbacks;

// Good
const callbacks = game.socket._socket?._callbacks;
if (callbacks && typeof callbacks === 'object') {
  // Safe to use
}
```

### 2. Use Try-Catch Blocks

```javascript
try {
  // Socket manipulation code
} catch (error) {
  console.error("Socket handling error:", error);
  // Fallback to standard Foundry API
}
```

### 3. Module Manifest Requirements

```json
{
  "id": "your-module",
  "socket": true,  // Required for socket functionality
  "flags": {
    "allowExternal": true  // Custom flag for your module
  }
}
```

### 4. Debugging Socket Issues

```javascript
// Log socket structure
console.log("Socket structure:", {
  hasSocket: !!game.socket._socket,
  hasCallbacks: !!game.socket._socket?._callbacks,
  callbackKeys: Object.keys(game.socket._socket?._callbacks || {}),
  socketIOVersion: game.socket._socket?.io?.engine?.id
});
```

## Common Issues and Solutions

### Issue 1: _callbacks is undefined

**Cause**: Different Socket.IO version or timing issue

**Solution**: Check for existence before access
```javascript
if (game.socket._socket?._callbacks) {
  // Safe to use
}
```

### Issue 2: Messages not received from external

**Cause**: Foundry filters unknown socket messages

**Solution**: Use userspace-socket-message wrapper
```javascript
// External sends:
42["userspace-socket-message",{"action":"module.your-module","data":{...}}]
```

### Issue 3: Authentication failures

**Cause**: Token mismatch or not configured

**Solution**: Ensure tokens match between Foundry and external client
```javascript
// In Foundry module settings
authToken: "your-secret-token"

// In external client
request.auth = "your-secret-token"
```

## Testing Socket Connections

### Browser Console Test

```javascript
// Test if your module receives messages
game.socket.emit("module.your-module", {
  type: "test",
  message: "Hello from console"
});
```

### External Connection Test

```bash
# Using the test client
API_KEY=your-secret-token node authenticated-client.js

# Or with environment variables
RELAY_URL=ws://localhost:8080 API_KEY=your-token node authenticated-client.js --interactive
```

## Security Considerations

1. **Always use authentication** for external connections
2. **Validate all inputs** from external sources
3. **Limit exposed functionality** to necessary operations
4. **Use HTTPS/WSS** in production environments
5. **Implement rate limiting** for API requests
6. **Log suspicious activity** for monitoring

## Summary

The key to avoiding Socket.IO errors in Foundry VTT is:

1. Always check for property existence before access
2. Use try-catch blocks for error handling
3. Prefer Foundry's standard socket API when possible
4. Test thoroughly with different Foundry versions
5. Implement proper authentication for external connections

By following these patterns, you can create robust socket handling that works reliably across different Foundry installations and Socket.IO versions.
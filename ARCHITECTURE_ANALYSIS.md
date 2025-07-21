# Foundry VTT REST API v13 Architecture Analysis

## Summary of Findings

After deep investigation of the Foundry v13 API documentation and testing the current implementation, here are the key findings:

### 1. Why the Three-Component Architecture Exists

The current architecture consists of:
- **Foundry Module** (simple-api-working.js) - Runs inside Foundry
- **Relay Server** (simple-api-relay.js) - Bridges Socket.IO to WebSocket
- **MCP Server** (simple-api.js) - Provides the MCP interface

This architecture exists because:

1. **Foundry uses Socket.IO, not standard WebSocket**: External connections cannot use standard WebSocket protocol to connect directly to Foundry.

2. **Socket events are NOT relayed to external connections**: Direct socket events (like `module.simple-api`) are only available to clients connected through the Foundry UI, not external Socket.IO connections.

3. **Chat messages ARE relayed**: The module uses chat messages (`API_REQUEST:` and `API_RESPONSE:`) as a workaround because these ARE relayed to all connected clients, including external ones.

### 2. The Chat Message Workaround

The module uses an clever workaround discovered in `simple-api-working.js`:

```javascript
// Listen for chat messages that contain API requests
Hooks.on("createChatMessage", (message, options, userId) => {
  const content = message.content;
  if (content.startsWith("API_REQUEST:")) {
    const request = JSON.parse(content.substring(12));
    handleApiRequest(request);
  }
});

// Send responses via chat
ChatMessage.create({
  content: `API_RESPONSE: ${JSON.stringify(response)}`,
  type: CONST.CHAT_MESSAGE_TYPES.OOC,
  user: game.user.id
});
```

This is necessary because Foundry v13's Socket.IO implementation doesn't relay custom socket events to external connections.

### 3. Can We Eliminate the Relay Server?

**Partially, yes!** I've created two solutions:

#### Solution 1: Chat-Based Relay (Improved)
- **File**: `relay/chat-api-relay.js`
- **Purpose**: Fixed relay that properly handles chat messages
- **Benefit**: Works with the existing module without changes

#### Solution 2: Direct MCP Connection (Experimental)
- **File**: `mcp/direct-foundry-mcp.js`
- **Purpose**: MCP server that connects directly to Foundry
- **Benefit**: Eliminates the relay server entirely
- **Limitation**: Still uses Socket.IO and chat messages internally

### 4. The Authentication Confusion

The `API_USER` and `API_PASSWORD` are NOT Foundry user accounts. They are:
- Simple authentication strings configured in the module
- Used to prevent unauthorized API access
- Checked by the module before processing requests

### 5. Why Requests Weren't Working

The original issue "requests aren't getting through" was caused by:
1. The relay server trying to use direct socket events (which don't work)
2. A bug in the relay server (undefined variable on line 279)
3. The module actually expects chat messages, not socket events

## Recommendations

### For Immediate Use:
Use the **chat-based relay** approach:
```batch
node relay/chat-api-relay.js
```

This properly handles the chat message protocol used by the module.

### For Simplified Architecture:
Use the **direct MCP** approach:
```batch
node mcp/direct-foundry-mcp.js
```

This eliminates the relay server but still requires Socket.IO.

### For Future Improvement:
Consider modifying the Foundry module to use a different approach:
1. HTTP webhooks for responses
2. A custom Foundry server module that provides a true REST API
3. Using Foundry's built-in API server (if available in v13)

## Testing Tools Created

1. **diagnose-all.bat** - Comprehensive diagnostic tool
2. **test-chat-relay.bat** - Test the chat-based relay
3. **test-direct-mcp.bat** - Test direct MCP connection
4. **setup-and-test.bat** - One-click setup and testing

All tools include logging for easy debugging.

## Conclusion

The three-component architecture cannot be completely simplified due to Foundry v13's Socket.IO limitations. However, we can:
1. Fix the relay to work properly with chat messages
2. Potentially eliminate the relay by building Socket.IO support directly into the MCP server
3. Both read and write operations are fully supported through the chat message protocol
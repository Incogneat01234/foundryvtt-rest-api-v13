# Foundry VTT REST API v13 - Solutions Summary

## The Challenge

Foundry v13's Socket.IO implementation has security restrictions that prevent external connections from:
- Creating chat messages
- Sending direct socket events that modules can receive
- Using most standard Socket.IO events

## Solutions Developed

### 1. ✅ Asymmetric Communication Pattern (RECOMMENDED)

**Files:**
- Module: `simple-api-asymmetric.js`
- Relay: `asymmetric-relay.js`

**How it works:**
- External sends `createChatMessage` events (even though messages aren't created)
- Module receives these events via hooks and processes requests
- Module creates real whispered response messages
- External receives responses via `createChatMessage` events
- Messages auto-delete after 100ms

**Pros:**
- Works within Foundry's security model
- Minimal chat spam (whispered, auto-deleting)
- Reliable bidirectional communication
- No special Foundry configuration needed

**Cons:**
- Still requires relay server
- Brief message visibility (100ms)

**Usage:**
```batch
switch-to-asymmetric.bat
node relay/asymmetric-relay.js
```

### 2. 🔧 Fixed Original Relay

**Files:**
- Module: `simple-api-working.js` (original)
- Relay: `simple-api-relay.js` (bug fixed)

**What was fixed:**
- Line 279: undefined variable `relayRequestId` → `requestId`

**Status:**
- Bug is fixed but approach doesn't work due to chat message restrictions

### 3. 🌐 HTTP API Module

**Files:**
- Module: `simple-api-http.js`
- MCP: `http-foundry-mcp.js`

**How it works:**
- Module creates its own HTTP server on port 3001
- Completely bypasses Socket.IO
- Direct REST API communication

**Pros:**
- No relay server needed!
- Standard HTTP/REST interface
- Most reliable approach

**Cons:**
- Requires Foundry to run with `--allow-node` flag
- Not all Foundry installations support this

**Usage:**
```batch
# Update module.json to use simple-api-http.js
# Restart Foundry with --allow-node
node mcp/http-foundry-mcp.js
```

### 4. 🧪 External Event Listener (Experimental)

**Files:**
- Module: `simple-api-external.js`
- Test: `test-external-events.js`

**Status:**
- Created to test various Socket.IO events
- Most events don't work for external connections
- Led to discovering the asymmetric pattern

## Quick Decision Guide

**Q: I want the simplest working solution**
→ Use the Asymmetric Communication Pattern

**Q: I can modify how Foundry starts**
→ Use the HTTP API Module with `--allow-node`

**Q: I need to minimize any chat visibility**
→ Use HTTP API Module or adjust auto-delete timing in asymmetric

**Q: I want to eliminate the relay server**
→ Only possible with HTTP API Module

## Architecture Comparison

| Component | Original | Asymmetric | HTTP API |
|-----------|----------|------------|----------|
| Module | Chat-based | Hook-based | HTTP server |
| Relay | Required (broken) | Required (working) | Not needed |
| MCP | Via relay | Via relay | Direct |
| Security | Blocked | Working | Requires --allow-node |

## Testing Tools

- `test-asymmetric-relay.bat` - Complete test with visual output
- `test-asymmetric-verbose.js` - Detailed step-by-step test
- `test-create-chat.js` - Verify event capability
- `diagnose-all.bat` - Original diagnostic suite

## Conclusion

The **Asymmetric Communication Pattern** is the recommended solution as it:
1. Works with default Foundry v13 installations
2. Provides reliable bidirectional communication
3. Minimizes chat visibility with whispers and auto-deletion
4. Uses Foundry's security model to our advantage

While the three-component architecture (Module → Relay → MCP) cannot be completely eliminated due to Socket.IO restrictions, the asymmetric pattern makes it reliable and functional.
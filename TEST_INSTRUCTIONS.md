# Testing Instructions

## Quick Test in Foundry Console

1. Open Foundry VTT in your browser
2. Press F12 to open Developer Console
3. Copy and paste these commands one by one:

```javascript
// Check if module is active
game.modules.get('simple-api')?.active

// Create a test API request via chat
ChatMessage.create({
  content: 'API_REQUEST: {"type":"ping","requestId":"console-test","auth":{"username":"API_USER","password":"API"}}',
  type: CONST.CHAT_MESSAGE_TYPES.OOC
});

// Watch the console for "Simple API | Received API request via chat"
```

If you see the module respond in the console, then the module is working correctly and the issue is with how the relay is sending messages.

## Testing the Chat Relay

Run this in command prompt:
```batch
node test-chat-direct.js
```

This will test different ways of sending chat messages to see which format Foundry accepts.

## The Issue

The chat relay is connecting to Foundry successfully, but the chat messages aren't being created. This could be because:

1. **External connections can't create chat messages** - Foundry might restrict chat message creation to authenticated users only
2. **Missing user context** - The Socket.IO connection might need to authenticate as a user
3. **Permission issue** - Only GMs can create certain types of messages

## Alternative Solution

Since external Socket.IO connections might not be able to create chat messages, we might need to:

1. Use a different approach (like the game.socket events)
2. Have the module listen on a different channel that external connections CAN use
3. Implement a custom handshake/authentication flow

Try the console test first to confirm the module is working, then we can determine the best fix.
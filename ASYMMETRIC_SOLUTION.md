# Asymmetric Communication Solution

## The Breakthrough

After extensive testing, we discovered that while external Socket.IO connections **cannot create** chat messages in Foundry v13, they **CAN**:
1. Send `createChatMessage` events (even though Foundry won't actually create the message)
2. Receive `createChatMessage` events when messages are created internally

This asymmetry allows us to create a working bidirectional communication pattern!

## How It Works

### Request Flow (External → Foundry)
1. External relay sends a `createChatMessage` Socket.IO event with the API request
2. Foundry receives the event and triggers the `createChatMessage` hook
3. Module intercepts the message, processes the request, and deletes it
4. Even though the message wasn't actually created, the hook still fires!

### Response Flow (Foundry → External)
1. Module creates a real chat message with the API response
2. Message is whispered to minimize visibility
3. External relay receives the `createChatMessage` event
4. Module auto-deletes the message after 100ms
5. External relay extracts and forwards the response

## Implementation

### Module: `simple-api-asymmetric.js`
- Listens for `createChatMessage` hooks containing `API_REQUEST:`
- Processes requests and validates authentication
- Creates whispered response messages with `API_RESPONSE:`
- Auto-deletes response messages after 100ms

### Relay: `asymmetric-relay.js`
- Sends requests as `createChatMessage` events
- Listens for `createChatMessage` events containing responses
- Maintains request/response tracking with IDs
- Handles Socket.IO connection and protocol

## Usage

### 1. Switch to Asymmetric Module
```batch
switch-to-asymmetric.bat
```

### 2. Restart/Refresh Foundry
Either restart the Foundry server or disable/re-enable the module

### 3. Run the Asymmetric Relay
```batch
node relay/asymmetric-relay.js
```

### 4. Test the Connection
```batch
node test-asymmetric.js
```

## Testing Tools

- `test-create-chat.js` - Tests if external can send createChatMessage events
- `test-asymmetric.js` - Full test suite for the asymmetric pattern
- `test-asymmetric-relay.bat` - One-click test with visual output

## Benefits

1. **Works with Foundry v13 Security** - Uses allowed events only
2. **Minimal Chat Spam** - Messages are whispered and auto-deleted
3. **Reliable Communication** - Both directions confirmed working
4. **Simple Architecture** - Still uses the relay but with better protocol

## Comparison to Other Approaches

| Approach | External Can Send | External Can Receive | Works? |
|----------|------------------|---------------------|--------|
| Direct Socket Events | ❌ | ❌ | ❌ |
| Chat Message Creation | ❌ | ✅ | ❌ |
| Chat Message Events | ✅ | ✅ | ✅ |
| HTTP API | ✅ | ✅ | ✅* |

*HTTP API requires Node.js access in Foundry

## Troubleshooting

### Messages Not Being Received
1. Check module is using `simple-api-asymmetric.js`
2. Verify you're logged in as GM in Foundry
3. Check F12 console for error messages
4. Ensure authentication matches in module settings

### Response Messages Visible in Chat
- Normal behavior - they auto-delete after 100ms
- Messages are whispered to minimize visibility
- Can adjust delete timeout in module if needed

### Connection Drops
- Relay automatically reconnects
- Check Foundry server is still running
- Verify network connectivity

## Future Improvements

1. **Batch Requests** - Send multiple requests in one message
2. **Compression** - Compress large responses
3. **Encryption** - Add message encryption for security
4. **Event Filtering** - Only listen for API messages

## Conclusion

The asymmetric pattern successfully enables bidirectional communication between external services and Foundry v13, working within the platform's security constraints. While not as clean as direct socket communication, it provides a reliable solution for REST API functionality.
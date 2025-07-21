# Quick Start - Asymmetric API

## Setup (One Time)

1. **Switch to Asymmetric Module**
   ```
   switch-to-asymmetric.bat
   ```

2. **Restart Foundry** or refresh the module

3. **Verify in Foundry Console (F12)**
   ```javascript
   game.modules.get('simple-api')?.active
   // Should return true
   ```

## Running the API

### Option 1: Quick Test (Recommended)
```
test-asymmetric-relay.bat
```
This opens two windows showing the relay and test client.

### Option 2: Manual Start
```
node relay/asymmetric-relay.js
```

## Testing

In another terminal:
```
node test-asymmetric.js
```

## What You Should See

### In Relay Window:
- "Request delivered to Foundry"
- "Got API response via chat!"

### In Test Window:
- Response messages with actual data

### In Foundry Console:
- "Simple API Asymmetric | Received API request"
- "Simple API Asymmetric | Sending response"

## Using with MCP

The existing MCP server works with the asymmetric relay:
```
node mcp/simple-api.js
```

## Troubleshooting

**Nothing happens?**
- Check you're GM in Foundry
- Module must be active
- Port 8080 must be free

**"Authentication failed"?**
- Default credentials: API_USER / API
- Check module settings in Foundry

**Still not working?**
- Run `test-create-chat.js` to verify events work
- Check Foundry console for errors
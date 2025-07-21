# Simple API for Foundry VTT v13

[![Foundry Version](https://img.shields.io/badge/Foundry-v13-informational)](https://foundryvtt.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A dead-simple WebSocket API for Foundry VTT v13 that allows external applications to interact with your game. Optional authentication for security, minimal complexity - just works.

## 🚀 Features

- ✅ **Minimal Configuration** - Optional authentication for security
- ✅ **Lightweight** - Only ~400 lines of code
- ✅ **All Core Functions** - Actors, items, dice, chat, combat
- ✅ **Local Only** - Runs on your machine, no external dependencies
- ✅ **Fast Setup** - Running in under 5 minutes

## 📦 Quick Install

### For Module Users

Install in Foundry VTT using one of these manifest URLs:

**From GitHub Releases (Recommended):**
```
https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
```

After installing the module in Foundry:

1. Download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure authentication (optional):
   - In Foundry: Settings → Module Settings → Simple API
   - Enable authentication and set username/password
   - Default: Username `API_USER`, Password `API`
4. Run the relay server:
   ```bash
   node relay/simple-api-relay.js
   ```
   Or with custom auth:
   ```bash
   API_USERNAME=myuser API_PASSWORD=mypass node relay/simple-api-relay.js
   ```

### For Developers

```bash
# 1. Clone and install
git clone https://github.com/Incogneat01234/foundryvtt-rest-api-v13.git
cd foundryvtt-rest-api-v13
npm install

# 2. Package the module
cd module && npm install && npm run package && cd ..

# 3. Copy module to Foundry and enable in-game

# 4. Start the relay server
node relay/simple-api-relay.js

# 5. Test it works
node tests/test-simple-api.js
```

## 🎯 What Can It Do?

- **Actors**: Create, read, update, delete characters and NPCs
- **Items**: Create items and manage inventories
- **Dice**: Roll any dice formula with modifiers
- **Chat**: Send messages to game chat
- **Combat**: Manage initiative and encounters
- **Tokens**: Create and update tokens on scenes

## 📝 Example Usage

```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  // Create a character
  ws.send(JSON.stringify({
    type: 'create-actor',
    requestId: '123',
    name: 'Gandalf',
    actorType: 'character',
    system: {
      abilities: {
        str: { value: 13 },
        int: { value: 20 }
      }
    }
  }));
});

ws.on('message', (data) => {
  console.log('Response:', JSON.parse(data));
});
```

## 📁 Project Structure

```
foundryvtt-rest-api-v13/
├── module/              # Foundry module files
│   ├── scripts/         # Module JavaScript
│   └── module.json      # Module manifest
├── relay/               # WebSocket relay server
├── tests/               # Test suite
├── examples/            # Usage examples
└── docker/              # Docker deployment
```

## 🐳 Docker Support

```bash
cd docker
docker-compose up -d
```

The Docker container auto-discovers your Foundry instance and provides the API on port 8080.

## 📖 API Documentation

See [SIMPLE-API-INSTALL.md](SIMPLE-API-INSTALL.md) for complete API reference with all message types and examples.

## 🛠️ Scripts

- `install.bat` - Install all dependencies
- `run-simple-api.bat` - Start the relay server
- `test-simple-api.bat` - Run the test suite
- `publish.bat` - **Publish new versions**

### Publishing a New Version

Run `publish.bat` to:
1. Choose version bump or enter custom version
2. Automatically update all version files
3. Package the module
4. Commit, tag, and push to GitHub
5. GitHub Actions automatically creates the release

The module will be available at:
```
https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
```

## ⚠️ Security Notice

**Authentication is optional but recommended!** 

When to use authentication:
- Multiple users on your network
- Running on shared/cloud servers
- Any non-localhost deployment

When authentication might not be needed:
- Single-user local development
- Isolated Docker containers
- Air-gapped systems

Never expose this API to the internet without authentication enabled.

## 🤝 MCP Integration

Designed to work with [Foundry VTT MCP Server](https://github.com/Incogneat01234/foundry-vtt-13-mcp-server) for AI assistant integration.

## 📄 License

MIT - Use it however you want!

## 🙏 Credits

- Simplified from the original [FoundryVTT-RestAPI](https://github.com/cs96and/FoundryVTT-RestAPI)
- Built for Foundry VTT v13 by the community
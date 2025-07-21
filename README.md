# Foundry VTT REST API (v13 Edition)

[![Foundry Version](https://img.shields.io/badge/Foundry-v13-informational)](https://foundryvtt.com)
[![License](https://img.shields.io/github/license/Incogneat01234/foundryvtt-rest-api-v13)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/Incogneat01234/foundryvtt-rest-api-v13)](https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest)

A comprehensive REST API module for Foundry VTT v13 that enables external applications to interact with your Foundry world through WebSocket connections. This fork has been completely updated for Foundry v13 compatibility with enhanced features and improved developer experience.

## 🎯 Key Features

- **Full Foundry v13 Compatibility** - Updated to work with the latest Foundry VTT v13 API changes
- **WebSocket-Based Communication** - Real-time bidirectional communication with your Foundry world
- **Local-Only Mode** - Run entirely on your local network without external dependencies
- **Comprehensive API Coverage** - Access to entities, combat, dice rolling, file management, and more
- **Enhanced Security** - API key authentication with show/hide toggle and connection testing
- **Developer-Friendly** - Extensive debug logging, TypeScript support, and detailed documentation
- **MCP Integration Ready** - Designed to work with AI assistants through Model Context Protocol

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Local Setup](#local-setup)
- [API Documentation](#api-documentation)
- [Available Endpoints](#available-endpoints)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Migration from v12](#migration-from-v12)
- [Contributing](#contributing)
- [Credits](#credits)

## 🚀 Installation

### Method 1: Manifest URL (Recommended)

1. Open Foundry VTT v13
2. Navigate to **Settings → Manage Modules → Install Module**
3. Paste this manifest URL:
   ```
   https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases/latest/download/module.json
   ```
4. Click **Install**

### Method 2: Manual Installation

1. Download the latest release from [Releases](https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases)
2. Extract the zip file to your Foundry modules directory:
   - Windows: `%appdata%/FoundryVTT/Data/modules/`
   - macOS: `~/Library/Application Support/FoundryVTT/Data/modules/`
   - Linux: `~/.local/share/FoundryVTT/Data/modules/`

### Method 3: Development Installation

```bash
# Clone the repository
git clone https://github.com/Incogneat01234/foundryvtt-rest-api-v13.git

# Install dependencies
cd foundryvtt-rest-api-v13
npm install

# Build the module
npm run build

# Create a symbolic link (run as administrator on Windows)
npm run install:windows:dev  # For Windows
npm run install:unix:dev     # For macOS/Linux
```

## 🎮 Quick Start

1. **Enable the Module**
   - In your Foundry world, go to **Settings → Manage Modules**
   - Enable "Foundry REST API"
   - Reload when prompted

2. **Configure Settings**
   - Go to **Settings → Module Settings**
   - Find "Foundry REST API" section
   - Set your API key (or use the default world ID)
   - Click **Test Connection** to verify WebSocket connectivity

3. **Connect Your Application**
   - Default WebSocket URL: `ws://localhost:8080` (local mode)
   - Alternative relay URL: `wss://foundryvtt-rest-api-relay.fly.dev`
   - Use your API key for authentication
   - See the [API Test Collection](https://github.com/ThreeHats/foundryvtt-rest-api-relay/blob/main/Foundry%20REST%20API%20Documentation.postman_collection.json) for examples

## 🏠 Local Setup

The module now supports running entirely locally without external dependencies. This provides better privacy, security, and control.

### Quick Start with Embedded Server Mode

1. **Enable Embedded Server in Foundry**
   - Go to Module Settings
   - Enable "Use Embedded Server"
   - Save and reload

2. **Start the Local Server**
   - **Windows**: Double-click `start-local-server.bat`
   - **macOS/Linux**: Run `./start-local-server.sh`
   - **Manual**: Run `npm run local-server`

The module will automatically connect to the local server. No additional configuration needed!

### Benefits of Local Mode

- No external network dependencies
- Full control over the server
- Lower latency
- Enhanced privacy and security
- Easier development and debugging
- Simple one-click startup

See [LOCAL_SETUP.md](LOCAL_SETUP.md) for detailed configuration options.

## 📚 API Documentation

### WebSocket Connection

#### Local Mode (Recommended)
```javascript
const ws = new WebSocket('ws://localhost:8080?id=your-client-id&token=optional-token');

ws.on('open', () => {
  console.log('Connected to local Foundry server!');
  
  // Send a test ping
  ws.send(JSON.stringify({
    type: 'ping',
    requestId: 'test-1'
  }));
});
```

#### Relay Mode
```javascript
const ws = new WebSocket('wss://foundryvtt-rest-api-relay.fly.dev?id=your-world-id&token=your-api-key');

ws.on('open', () => {
  console.log('Connected to Foundry relay!');
  
  // Send a test ping
  ws.send(JSON.stringify({
    type: 'ping',
    requestId: 'test-1'
  }));
});
```

Both modes use the same message format:

```javascript
ws.on('message', (data) => {
  const response = JSON.parse(data);
  console.log('Received:', response);
});
```

### Message Format

All messages follow this structure:

```typescript
// Request
{
  type: string;        // Action type
  requestId: string;   // Unique request ID
  [key: string]: any;  // Additional parameters
}

// Response
{
  type: string;        // Response type
  requestId: string;   // Matching request ID
  data?: any;          // Response data
  error?: string;      // Error message if failed
}
```

## 🛠️ Available Endpoints

### Entity Management

| Action | Description |
|--------|-------------|
| `get-entity` | Retrieve any entity by UUID |
| `create-entity` | Create new actors, items, scenes, etc. |
| `update-entity` | Update entity properties |
| `delete-entity` | Delete entities |
| `increase-attribute` | Increase numeric attributes |
| `decrease-attribute` | Decrease numeric attributes |
| `kill-entity` | Mark tokens/actors as defeated |
| `give-item` | Transfer items between actors |

### Combat & Encounters

| Action | Description |
|--------|-------------|
| `get-encounters` | List all combat encounters |
| `start-encounter` | Create and start new combat |
| `encounter-next-turn` | Advance to next turn |
| `encounter-previous-turn` | Go back one turn |
| `encounter-next-round` | Advance to next round |
| `encounter-previous-round` | Go back one round |
| `add-to-encounter` | Add combatants |
| `remove-from-encounter` | Remove combatants |
| `end-encounter` | End active combat |

### Dice Rolling

| Action | Description |
|--------|-------------|
| `perform-roll` | Execute dice rolls with formulas |
| `get-rolls` | Retrieve roll history |
| `get-last-roll` | Get the most recent roll |

### Search & Discovery

| Action | Description |
|--------|-------------|
| `perform-search` | Search across all content |
| `get-structure` | Get world folder structure |
| `get-contents` | Browse folder/compendium contents |

### Automation

| Action | Description |
|--------|-------------|
| `execute-macro` | Run macros by ID |
| `execute-js` | Execute JavaScript code |
| `select-entities` | Programmatically select tokens |
| `get-selected-entities` | Get current selection |

### File Management

| Action | Description |
|--------|-------------|
| `get-file-system` | Browse file structure |
| `upload-file` | Upload files to Foundry |
| `download-file` | Download files from Foundry |

### Other

| Action | Description |
|--------|-------------|
| `get-sheet-html` | Render entity sheets as HTML |
| `ping` | Test connection |
| `pong` | Connection test response |

## ⚙️ Configuration

### Module Settings

- **WebSocket Relay URL**: The relay server URL (default: public relay)
- **API Key**: Your authentication token (shown as password field with toggle)
- **Log Level**: Debug logging verbosity (Debug/Info/Warn/Error)
- **Ping Interval**: Keep-alive ping frequency (seconds)
- **Max Reconnect Attempts**: Connection retry limit
- **Reconnect Base Delay**: Initial reconnection delay (ms)
- **Test Connection**: Button to verify WebSocket connectivity

### Debug Logging

The module includes comprehensive debug logging enabled by default:

```javascript
// In browser console (F12)
// You'll see detailed logs like:
foundry-rest-api [2025-07-21T01:00:00.000Z] DEBUG [WebSocketManager.connect:123] | Connecting to WebSocket
foundry-rest-api [2025-07-21T01:00:01.000Z] INFO [WebSocketManager.onOpen:456] | WebSocket connected
```

## 🔧 Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Foundry VTT v13

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/Incogneat01234/foundryvtt-rest-api-v13.git
cd foundryvtt-rest-api-v13

# Install dependencies
npm install

# Build in watch mode
npm run dev

# Run tests
npm test
```

### Project Structure

```
foundryvtt-rest-api-v13/
├── src/
│   ├── ts/                  # TypeScript source
│   │   ├── module.ts        # Main module entry
│   │   ├── network/         # WebSocket handling
│   │   │   ├── routers/     # API endpoint handlers
│   │   │   └── webSocketManager.ts
│   │   └── utils/           # Utilities
│   ├── styles/              # SCSS styles
│   └── module.json          # Module manifest
├── dist/                    # Built files
├── tests/                   # Test files
└── MCP_PLAN.md             # MCP integration plan
```

### Building for Release

```bash
# One-click release (Windows)
publish.bat

# One-click release (Unix)
npm run publish

# Manual build
npm run build
npm run package
```

## 🧪 Testing

### Browser Console Tests

```javascript
// Copy test scripts from:
// - test-module-console.js    (basic module test)
// - test-websocket-advanced.js (advanced WebSocket test)

// Or run manually:
const api = game.modules.get('foundry-rest-api').api;
console.log('Connected:', api.websocket.isConnected());
```

### API Testing

Use the provided test scripts:
- `test-api.js` - Basic API functionality
- `test-api-advanced.js` - Advanced router testing
- `test-api-monitor.js` - Performance monitoring

## 🔄 Migration from v12

### Breaking Changes

1. **Type Definitions**: Updated to v13 types
   - Some `game.data` references changed to `game` 
   - New document class structure

2. **API Updates**: 
   - `getDocumentClass` utility added for v13 compatibility
   - Enhanced error handling for settings

3. **UI Changes**:
   - API key field now has show/hide toggle
   - Test Connection button added
   - Enhanced debug logging

### Migration Steps

1. Backup your world
2. Disable the v12 module
3. Install the v13 version
4. Re-enable and configure
5. Test your integrations

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Test on Foundry v13

## 📢 Support

- **Issues**: [GitHub Issues](https://github.com/Incogneat01234/foundryvtt-rest-api-v13/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Incogneat01234/foundryvtt-rest-api-v13/discussions)
- **Discord**: [Original Discord Server](https://discord.gg/U634xNGRAC)

## 🎉 What's New in v13

### Major Updates

- ✅ **Full Foundry v13 Compatibility**
- ✅ **Enhanced Security** - Password field with visibility toggle
- ✅ **Connection Testing** - Built-in test button
- ✅ **Comprehensive Debug Logging** - Detailed logs with timestamps
- ✅ **Improved Error Handling** - Graceful fallbacks
- ✅ **TypeScript Support** - Better type safety
- ✅ **One-Click Publishing** - Automated release process
- ✅ **MCP Integration Ready** - AI assistant compatibility

### Technical Improvements

- Fixed `game.settings` registration order issues
- Added `@ts-nocheck` for v13 type compatibility
- Improved WebSocket reconnection logic
- Enhanced build process with fallbacks
- Added comprehensive test scripts

## 👥 Credits

### Current Maintainer
- **[Incogneat01234](https://github.com/Incogneat01234)** - v13 update and enhancements

### Original Creator
- **[ThreeHats](https://github.com/ThreeHats)** - Original module creator

### Contributors
- See [Contributors](https://github.com/Incogneat01234/foundryvtt-rest-api-v13/graphs/contributors)

### Special Thanks
- The Foundry VTT community
- Original module users and testers
- [League of Extraordinary Foundry Developers](https://github.com/League-of-Foundry-Developers)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Made with ❤️ for the Foundry VTT community
  <br>
  <a href="https://foundryvtt.com">Foundry VTT</a> • 
  <a href="https://github.com/Incogneat01234/foundryvtt-rest-api-v13">GitHub</a> • 
  <a href="https://github.com/Incogneat01234/foundryvtt-rest-api-v13/releases">Releases</a>
</p>
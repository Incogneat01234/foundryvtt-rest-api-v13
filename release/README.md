# Foundry VTT REST API Module

This module provides a REST-like API over WebSocket for Foundry VTT, allowing external applications to interact with your game data.

## Installation

1. In Foundry VTT, go to **Settings → Manage Modules → Install Module**
2. Enter the manifest URL or use the module browser
3. Click Install and enable the module in your world

## Quick Start

The module supports two modes of operation:

### Option 1: External Relay Server (Default)
- The module connects to an external WebSocket server
- Default URL: `ws://localhost:8080`
- Configure in module settings

### Option 2: Embedded Server Mode
Since browsers cannot create servers, you need to run the included Node.js server:

1. **Locate the Module Directory**
   - Find your Foundry modules folder
   - Navigate to `foundry-rest-api/server/`

2. **First Time Setup** (one time only)
   ```bash
   cd "path/to/foundry-rest-api/server"
   npm install
   ```

3. **Start the Server**
   ```bash
   npm start
   ```
   
   Or with a custom port:
   ```bash
   PORT=3000 npm start
   ```

4. **In Foundry VTT**
   - Go to module settings
   - Enable "Use Embedded Server"
   - Click "Start Server" button (this will show you the exact commands)
   - The module will automatically connect to your local server

## Module Settings

- **WebSocket Relay URL**: External server URL (default: `ws://localhost:8080`)
- **API Key**: Authentication key for the API
- **Use Embedded Server**: Enable local server mode
- **Embedded Server Port**: Port for local server (default: 8080)

## API Documentation

Once connected, the API supports operations like:
- Getting/setting entity data
- Rolling dice
- Searching content
- Managing encounters
- Executing macros
- And more!

See the full API documentation in the project repository.

## Troubleshooting

### Server won't start
- Ensure Node.js is installed (v14 or higher)
- Check if the port is already in use
- Run with administrator/sudo privileges if needed

### Can't connect to server
- Verify the server is running (`npm start` in the server directory)
- Check firewall settings
- Ensure the port matches in both server and module settings

### Module can't find server directory
- The notification in Foundry will show the exact path
- Check the browser console for detailed path information

## Support

For issues and feature requests, visit the project repository.
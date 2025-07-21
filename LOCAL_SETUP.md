# Local WebSocket Server Setup

This guide explains how to run the Foundry VTT REST API entirely locally without using the external relay server.

## Overview

By default, the Foundry VTT REST API uses an external relay server hosted at `wss://foundryvtt-rest-api-relay.fly.dev`. This local setup allows you to run everything on your own machine for better privacy, security, and control.

## Quick Start

### Windows
Double-click `start-local-server.bat` to start the local server.

### macOS/Linux
Run `./start-local-server.sh` to start the local server.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Foundry VTT with the REST API module installed

## Setup Instructions

### Method 1: Using Embedded Server Mode (Recommended)

1. In Foundry VTT, go to **Game Settings** > **Configure Settings** > **Module Settings**
2. Find **Foundry REST API** settings
3. Enable **Use Embedded Server**
4. Set **Embedded Server Port** (default: 8080)
5. Save and reload Foundry VTT
6. Start the local server using one of these methods:
   - **Windows**: Double-click `start-local-server.bat`
   - **macOS/Linux**: Run `./start-local-server.sh`
   - **Manual**: Run `npm run local-server`

The module will automatically connect to `ws://localhost:8080`.

### Method 2: Manual Setup

First, install the WebSocket dependency:

```bash
npm install ws
```

Then start the local server:

```bash
node local-server.js
```

The server will start on `ws://localhost:8080` by default. You can customize the host and port:

```bash
HOST=0.0.0.0 PORT=9090 node local-server.js
```

Configure Foundry VTT Module:

1. In Foundry VTT, go to **Game Settings** > **Configure Settings** > **Module Settings**
2. Find **Foundry VTT REST API** settings
3. Set **WebSocket Server URL** to your local server URL (default: `ws://localhost:8080`)
4. The **API Key** can be any value for local setup (it's not validated by the local server)
5. Save and reload Foundry VTT

### 3. Verify Connection

1. Check the local server console - you should see connection messages when Foundry connects
2. The server status page at `http://localhost:8080` shows active connections
3. In Foundry's console (F12), you should see WebSocket connection logs

## Local Server Features

The local server provides:

- No authentication requirements (accepts any API key)
- Connection status monitoring
- Automatic cleanup of stale connections
- Basic message handling and routing
- Ping/pong keepalive support

## Security Considerations

When running locally:

- The server only accepts connections from localhost by default
- To allow connections from other machines, set `HOST=0.0.0.0`
- Consider firewall rules if exposing the server on your network
- The local server doesn't validate API keys - add authentication if needed

## Customizing the Local Server

The `local-server.js` file can be modified to:

- Add custom message handling logic
- Implement authentication
- Add logging or monitoring
- Connect to other local services

## Troubleshooting

### Connection Failed

- Ensure the local server is running
- Check the WebSocket URL in Foundry settings
- Verify no firewall is blocking the connection
- Check browser console for errors

### Server Crashes

- Check Node.js error messages
- Ensure the ws package is installed
- Verify port is not already in use

### No Messages Received

- Check that you're logged in as a GM in Foundry
- Verify the module is enabled
- Check server console for incoming messages

## Differences from Relay Mode

When using local mode:

- No external network dependency
- No relay server authentication
- Direct connection between Foundry and your applications
- Lower latency for local connections
- Full control over the server implementation

## API Client Configuration

Update your API clients to connect to the local server:

```javascript
const ws = new WebSocket('ws://localhost:8080?id=my-client&token=any-token');
```

The local server accepts any token value, making development easier.
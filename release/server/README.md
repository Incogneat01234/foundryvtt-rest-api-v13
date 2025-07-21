# Foundry REST API Local Server

This is the local WebSocket server component for the Foundry VTT REST API module.

## Installation

1. Navigate to this directory in your terminal
2. Run `npm install` to install dependencies

## Running the Server

Run one of the following commands:

```bash
# Using npm
npm start

# Or directly with node
node local-server.js

# With custom port
PORT=3000 node local-server.js
```

The server will start on `ws://localhost:8080` by default.

## Configuration

- `PORT`: Change the port (default: 8080)
- `HOST`: Change the host (default: localhost)

Example:
```bash
PORT=3000 HOST=0.0.0.0 node local-server.js
```
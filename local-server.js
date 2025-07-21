#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Configuration
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';

// Store connected clients
const clients = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(`FoundryVTT REST API Local WebSocket Server\nActive connections: ${clients.size}\n`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log(`Starting local WebSocket server on ${HOST}:${PORT}`);

wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const clientId = parsedUrl.query.id || `client-${Date.now()}`;
  const token = parsedUrl.query.token;
  
  console.log(`New connection: ${clientId} from ${req.socket.remoteAddress}`);
  console.log(`Token provided: ${token ? 'Yes' : 'No'}`);
  
  // Store client
  clients.set(clientId, {
    ws,
    id: clientId,
    token,
    connectedAt: new Date(),
    lastPing: new Date()
  });
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    clientId,
    message: 'Connected to local WebSocket server'
  }));
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Message from ${clientId}:`, data.type);
      
      // Update last ping time if it's a ping
      if (data.type === 'ping') {
        const client = clients.get(clientId);
        if (client) {
          client.lastPing = new Date();
        }
        
        // Send pong response
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
        return;
      }
      
      // Handle other message types
      handleMessage(clientId, data, ws);
      
    } catch (error) {
      console.error(`Error processing message from ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        error: error.message
      }));
    }
  });
  
  // Handle client disconnect
  ws.on('close', (code, reason) => {
    console.log(`Client ${clientId} disconnected. Code: ${code}, Reason: ${reason}`);
    clients.delete(clientId);
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${clientId}:`, error);
  });
});

// Handle different message types
function handleMessage(clientId, data, ws) {
  console.log(`Handling ${data.type} message from ${clientId}`);
  
  // For now, echo back successful responses
  // In a real implementation, you would handle each message type appropriately
  switch (data.type) {
    case 'get-rolls':
    case 'get-last-roll':
    case 'perform-roll':
    case 'get-structure':
    case 'get-entities':
    case 'get-entity':
    case 'search':
      // Echo back a success response with the expected response type
      const responseType = data.type.replace('get-', '').replace('perform-', '') + '-result';
      ws.send(JSON.stringify({
        type: responseType,
        requestId: data.requestId,
        success: true,
        data: {},
        message: `Handled ${data.type} locally`
      }));
      break;
      
    default:
      console.log(`Unknown message type: ${data.type}`);
      ws.send(JSON.stringify({
        type: 'error',
        requestId: data.requestId,
        message: `Unknown message type: ${data.type}`
      }));
  }
}

// Periodic cleanup of stale connections
setInterval(() => {
  const now = new Date();
  const timeout = 60000; // 60 seconds
  
  for (const [clientId, client] of clients.entries()) {
    const timeSinceLastPing = now - client.lastPing;
    if (timeSinceLastPing > timeout) {
      console.log(`Removing stale client: ${clientId}`);
      client.ws.close(1000, 'Ping timeout');
      clients.delete(clientId);
    }
  }
}, 30000); // Check every 30 seconds

// Start server
server.listen(PORT, HOST, () => {
  console.log(`WebSocket server listening on ws://${HOST}:${PORT}`);
  console.log(`HTTP status endpoint: http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  
  // Close all client connections
  for (const [clientId, client] of clients.entries()) {
    client.ws.close(1000, 'Server shutting down');
  }
  
  // Close server
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Configuration
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const API_KEY = process.env.API_KEY || 'your-secret-api-key';

// Store connected clients
const clients = new Map();
const foundryClients = new Map(); // Foundry module connections

// Create HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      apiClients: clients.size,
      foundryClients: foundryClients.size,
      uptime: process.uptime()
    }));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Foundry VTT REST API Relay Server

Active API clients: ${clients.size}
Connected Foundry instances: ${foundryClients.size}

To connect:
- API Clients: ws://${HOST}:${PORT}?token=YOUR_API_KEY
- Foundry Module: ws://${HOST}:${PORT}?type=foundry&token=YOUR_API_KEY
`);
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log(`Starting WebSocket relay server on ${HOST}:${PORT}`);

wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const clientType = parsedUrl.query.type || 'api';
  const clientId = parsedUrl.query.id || `${clientType}-${Date.now()}`;
  const token = parsedUrl.query.token;
  
  // Validate API key
  if (token !== API_KEY) {
    console.log(`Rejected ${clientType} connection: Invalid API key`);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid API key'
    }));
    ws.close(1008, 'Invalid API key');
    return;
  }
  
  console.log(`New ${clientType} connection: ${clientId} from ${req.socket.remoteAddress}`);
  
  // Store client based on type
  const clientInfo = {
    ws,
    id: clientId,
    type: clientType,
    connectedAt: new Date(),
    lastPing: new Date()
  };
  
  if (clientType === 'foundry') {
    foundryClients.set(clientId, clientInfo);
  } else {
    clients.set(clientId, clientInfo);
  }
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    clientId,
    clientType,
    message: `Connected to relay server as ${clientType} client`
  }));
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Message from ${clientId} (${clientType}):`, data.type);
      
      // Update last ping time
      const clientMap = clientType === 'foundry' ? foundryClients : clients;
      const client = clientMap.get(clientId);
      if (client) {
        client.lastPing = new Date();
      }
      
      // Handle ping
      if (data.type === 'ping') {
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }));
        return;
      }
      
      // Route messages
      if (clientType === 'foundry') {
        // Message from Foundry - route to API clients
        routeToApiClients(data, clientId);
      } else {
        // Message from API client - route to Foundry
        routeToFoundry(data, clientId, ws);
      }
      
    } catch (error) {
      console.error(`Error processing message from ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        error: error.message
      }));
    }
  });
  
  // Handle disconnect
  ws.on('close', (code, reason) => {
    console.log(`${clientType} client ${clientId} disconnected. Code: ${code}, Reason: ${reason}`);
    
    if (clientType === 'foundry') {
      foundryClients.delete(clientId);
      // Notify API clients
      broadcast(clients, {
        type: 'foundry-disconnected',
        foundryId: clientId,
        message: 'Foundry instance disconnected'
      });
    } else {
      clients.delete(clientId);
    }
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for ${clientId}:`, error);
  });
});

// Route message from API client to Foundry
function routeToFoundry(data, clientId, ws) {
  if (foundryClients.size === 0) {
    ws.send(JSON.stringify({
      type: 'error',
      requestId: data.requestId,
      message: 'No Foundry instance connected'
    }));
    return;
  }
  
  // Add client ID to track responses
  data.clientId = clientId;
  
  // Send to all connected Foundry instances (usually just one)
  broadcast(foundryClients, data);
}

// Route message from Foundry to specific API client
function routeToApiClients(data, foundryId) {
  // If message has a specific client ID, route to that client
  if (data.clientId) {
    const client = clients.get(data.clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  } else {
    // Broadcast to all API clients
    broadcast(clients, {
      ...data,
      foundryId
    });
  }
}

// Broadcast message to a group of clients
function broadcast(clientMap, message) {
  const messageStr = JSON.stringify(message);
  for (const [id, client] of clientMap.entries()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  }
}

// Periodic cleanup of stale connections
setInterval(() => {
  const now = new Date();
  const timeout = 60000; // 60 seconds
  
  // Check API clients
  for (const [clientId, client] of clients.entries()) {
    const timeSinceLastPing = now - client.lastPing;
    if (timeSinceLastPing > timeout) {
      console.log(`Removing stale API client: ${clientId}`);
      client.ws.close(1000, 'Ping timeout');
      clients.delete(clientId);
    }
  }
  
  // Check Foundry clients
  for (const [clientId, client] of foundryClients.entries()) {
    const timeSinceLastPing = now - client.lastPing;
    if (timeSinceLastPing > timeout) {
      console.log(`Removing stale Foundry client: ${clientId}`);
      client.ws.close(1000, 'Ping timeout');
      foundryClients.delete(clientId);
    }
  }
}, 30000);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`WebSocket relay server listening on ws://${HOST}:${PORT}`);
  console.log(`HTTP status endpoint: http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
  console.log(`\nAPI Key: ${API_KEY}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  
  // Close all connections
  for (const [id, client] of clients.entries()) {
    client.ws.close(1000, 'Server shutting down');
  }
  for (const [id, client] of foundryClients.entries()) {
    client.ws.close(1000, 'Server shutting down');
  }
  
  // Close server
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});
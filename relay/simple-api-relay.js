#!/usr/bin/env node

/**
 * Simple API Relay Server
 * 
 * This server connects to Foundry's Socket.IO and relays API requests
 * Works with the simple-api module installed in Foundry
 */

const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 8080;
const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';

// Store connected clients
const clients = new Map();
const pendingRequests = new Map();

// Foundry connection
let foundryWs = null;
let foundryConnected = false;
let requestCounter = 0;

// Create HTTP server for status
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  res.writeHead(200);
  res.end(JSON.stringify({
    status: foundryConnected ? 'connected' : 'disconnected',
    foundryUrl: FOUNDRY_URL,
    clients: clients.size,
    message: 'Simple API Relay Server'
  }));
});

// Connect to Foundry
function connectToFoundry() {
  console.log('🔌 Connecting to Foundry...');
  
  const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
  foundryWs = new WebSocket(wsUrl);
  
  foundryWs.on('open', () => {
    console.log('✅ Connected to Foundry');
    foundryWs.send('40'); // Socket.IO handshake
  });
  
  foundryWs.on('message', (data) => {
    const message = data.toString();
    
    // Handle Socket.IO protocol
    if (message.startsWith('0')) {
      // Handshake response - send connection request
      const sid = JSON.parse(message.substring(1)).sid;
      console.log('🤝 Handshake complete, SID:', sid);
    } else if (message.startsWith('40')) {
      // Connected
      foundryConnected = true;
      console.log('✅ Socket.IO connected');
      
      // Listen for simple-api responses
      setTimeout(() => {
        console.log('📡 Listening for simple-api messages');
      }, 1000);
    } else if (message.startsWith('42')) {
      // Data message
      try {
        const jsonStart = message.indexOf('[');
        if (jsonStart >= 0) {
          const [eventName, eventData] = JSON.parse(message.substring(jsonStart));
          
          // Handle module.simple-api events
          if (eventName === 'module.simple-api') {
            handleFoundryResponse(eventData);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    } else if (message === '3') {
      // Ping
      foundryWs.send('2'); // Pong
    }
  });
  
  foundryWs.on('close', () => {
    console.log('❌ Disconnected from Foundry');
    foundryConnected = false;
    // Reconnect after 5 seconds
    setTimeout(connectToFoundry, 5000);
  });
  
  foundryWs.on('error', (err) => {
    console.error('❌ Foundry connection error:', err.message);
  });
}

// Handle responses from Foundry
function handleFoundryResponse(data) {
  console.log('📥 Foundry response:', data.responseType || data.type);
  
  if (data.type === 'api-ready') {
    console.log('✅ Simple API module is ready!');
    console.log('   World:', data.world);
    console.log('   System:', data.system);
    notifyClients({ type: 'api-ready', ...data });
    return;
  }
  
  // Find the pending request
  if (data.requestId && pendingRequests.has(data.requestId)) {
    const { client, originalRequest } = pendingRequests.get(data.requestId);
    pendingRequests.delete(data.requestId);
    
    // Send response to client
    client.send(JSON.stringify({
      ...data,
      requestId: originalRequest.requestId
    }));
  }
}

// Send request to Foundry
function sendToFoundry(request) {
  if (!foundryConnected || !foundryWs) {
    throw new Error('Not connected to Foundry');
  }
  
  const message = `42["module.simple-api",${JSON.stringify(request)}]`;
  console.log('📤 Sending to Foundry:', request.type);
  foundryWs.send(message);
}

// Notify all clients
function notifyClients(message) {
  const data = JSON.stringify(message);
  for (const [id, ws] of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

// Create WebSocket server for clients
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  const clientId = `client-${Date.now()}`;
  console.log(`👤 Client connected: ${clientId}`);
  
  clients.set(clientId, ws);
  
  // Send welcome
  ws.send(JSON.stringify({
    type: 'welcome',
    connected: foundryConnected,
    message: 'Connected to Simple API Relay'
  }));
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📤 Client request: ${data.type}`);
      
      // Generate unique request ID for tracking
      const relayRequestId = `relay-${++requestCounter}`;
      
      // Store pending request
      pendingRequests.set(relayRequestId, {
        client: ws,
        originalRequest: data
      });
      
      // Forward to Foundry with our request ID
      const foundryRequest = {
        ...data,
        requestId: relayRequestId
      };
      
      try {
        sendToFoundry(foundryRequest);
        
        // Set timeout for response
        setTimeout(() => {
          if (pendingRequests.has(relayRequestId)) {
            pendingRequests.delete(relayRequestId);
            ws.send(JSON.stringify({
              type: 'error',
              requestId: data.requestId,
              error: 'Request timeout - Simple API module may not be installed or enabled'
            }));
          }
        }, 10000);
        
      } catch (error) {
        pendingRequests.delete(relayRequestId);
        ws.send(JSON.stringify({
          type: 'error',
          requestId: data.requestId,
          error: error.message
        }));
      }
      
    } catch (error) {
      console.error('Error handling client message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`👋 Client disconnected: ${clientId}`);
    clients.delete(clientId);
  });
  
  ws.on('error', (error) => {
    console.error(`❌ Client error: ${error.message}`);
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Simple API Relay Server');
  console.log(`📍 Foundry URL: ${FOUNDRY_URL}`);
  console.log(`✨ API Server: http://localhost:${PORT}`);
  console.log('\n📝 Make sure the simple-api module is installed and enabled in Foundry!\n');
  
  connectToFoundry();
});

// Keep connection alive
setInterval(() => {
  if (foundryWs && foundryWs.readyState === WebSocket.OPEN) {
    foundryWs.send('2'); // Socket.IO ping
  }
}, 25000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  
  if (foundryWs) foundryWs.close();
  
  for (const [id, ws] of clients) {
    ws.close(1000, 'Server shutting down');
  }
  
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});
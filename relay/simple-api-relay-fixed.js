#!/usr/bin/env node

/**
 * Fixed Simple API Relay Server
 * 
 * This version properly handles the module.simple-api events
 */

const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 8080;
const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const API_USERNAME = process.env.API_USERNAME || 'API_USER';
const API_PASSWORD = process.env.API_PASSWORD || 'API';

// Store connected clients and pending requests
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
    message: 'Simple API Relay Server (Fixed)',
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
    
    if (message.startsWith('0')) {
      // Handshake response
      const sid = JSON.parse(message.substring(1)).sid;
      console.log('🤝 Handshake complete, SID:', sid);
    } else if (message.startsWith('40')) {
      // Connected
      foundryConnected = true;
      console.log('✅ Socket.IO connected');
      console.log('📡 Waiting for Simple API module...\n');
      
      // Keep alive with pings
      setInterval(() => {
        if (foundryWs && foundryWs.readyState === WebSocket.OPEN) {
          foundryWs.send('2'); // Ping
        }
      }, 25000);
    } else if (message.startsWith('42')) {
      // Data message
      try {
        const jsonStart = message.indexOf('[');
        if (jsonStart >= 0) {
          const data = JSON.parse(message.substring(jsonStart));
          
          if (Array.isArray(data) && data[0] === 'module.simple-api') {
            console.log('📥 Module response received');
            handleFoundryResponse(data[1]);
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    } else if (message === '3') {
      // Pong
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
  console.log('   Type:', data.type);
  console.log('   Request ID:', data.requestId);
  
  // Special handling for api-ready message
  if (data.type === 'api-ready') {
    console.log('✅ Simple API module is ready!');
    console.log('   World:', data.world);
    console.log('   System:', data.system);
    notifyClients(data);
    return;
  }
  
  // Find the pending request
  if (data.requestId && pendingRequests.has(data.requestId)) {
    const { client } = pendingRequests.get(data.requestId);
    pendingRequests.delete(data.requestId);
    
    console.log('   ✅ Sending to client\n');
    client.send(JSON.stringify(data));
  } else {
    console.log('   ⚠️  No client waiting for this response\n');
  }
}

// Send request to Foundry
function sendToFoundry(request) {
  if (!foundryConnected || !foundryWs) {
    throw new Error('Not connected to Foundry');
  }
  
  // Send as direct module message - this is the format that works
  const directMessage = `42["module.simple-api",${JSON.stringify(request)}]`;
  console.log('📤 Sending to module:', request.type);
  foundryWs.send(directMessage);
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
    message: 'Connected to Simple API Relay (Fixed)'
  }));
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`\n📨 Client request: ${data.type}`);
      
      // Generate request ID if not provided
      const requestId = data.requestId || `relay-${++requestCounter}`;
      
      // Store pending request
      pendingRequests.set(requestId, {
        client: ws,
        timestamp: Date.now()
      });
      
      // Forward to Foundry with the request ID
      const foundryRequest = {
        ...data,
        requestId: requestId
      };
      
      try {
        sendToFoundry(foundryRequest);
        
        // Set timeout for response
        setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            console.log('⏱️  Request timeout:', requestId);
            ws.send(JSON.stringify({
              type: 'error',
              requestId: data.requestId,
              error: 'Request timeout - module may not be responding'
            }));
          }
        }, 5000);
        
      } catch (error) {
        pendingRequests.delete(requestId);
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
  console.log('🚀 Simple API Relay Server (Fixed Version)');
  console.log(`📍 Foundry URL: ${FOUNDRY_URL}`);
  console.log(`✨ API Server: http://localhost:${PORT}`);
  console.log('\n📝 Make sure:');
  console.log('   1. Foundry is running with a world loaded');
  console.log('   2. You are logged in as GM');
  console.log('   3. simple-api module is installed and enabled\n');
  
  connectToFoundry();
});

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
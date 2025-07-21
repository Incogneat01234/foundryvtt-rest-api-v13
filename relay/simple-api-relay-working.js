#!/usr/bin/env node

/**
 * Simple API Relay Server - Working Version
 * Uses chat messages as a reliable communication channel
 */

const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 8080;
const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const API_USERNAME = process.env.API_USERNAME || 'API_USER';
const API_PASSWORD = process.env.API_PASSWORD || 'API';

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
    message: 'Simple API Relay Server (Working Version)'
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
      
      // Notify clients
      notifyClients({ type: 'connected', message: 'Connected to Foundry' });
      
    } else if (message.startsWith('42')) {
      // Data message
      try {
        const jsonStart = message.indexOf('[');
        if (jsonStart >= 0) {
          const [eventName, eventData] = JSON.parse(message.substring(jsonStart));
          
          // Look for chat messages that contain API responses
          if (eventName === 'modifyDocument' && eventData.type === 'ChatMessage') {
            if (eventData.result && Array.isArray(eventData.result)) {
              for (const msg of eventData.result) {
                if (msg.content && msg.content.startsWith('API_RESPONSE:')) {
                  handleApiResponse(msg.content);
                }
              }
            }
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

// Handle API responses from Foundry
function handleApiResponse(content) {
  try {
    const jsonStart = content.indexOf('{');
    if (jsonStart >= 0) {
      const response = JSON.parse(content.substring(jsonStart));
      console.log('📥 API Response:', response.type);
      
      // Find the pending request
      if (response.requestId && pendingRequests.has(response.requestId)) {
        const { client } = pendingRequests.get(response.requestId);
        pendingRequests.delete(response.requestId);
        
        // Send response to client
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(response));
        }
      }
    }
  } catch (e) {
    console.error('Error parsing API response:', e);
  }
}

// Send request to Foundry via chat message
function sendToFoundry(request) {
  if (!foundryConnected || !foundryWs) {
    throw new Error('Not connected to Foundry');
  }
  
  // Create a chat message containing the API request
  const chatMessage = {
    content: `API_REQUEST:${JSON.stringify(request)}`,
    type: 1 // OOC message
  };
  
  const message = `42["modifyDocument",{"type":"ChatMessage","action":"create","data":[${JSON.stringify(chatMessage)}],"options":{},"pack":null}]`;
  
  console.log('📤 Sending API request via chat message');
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
    message: 'Connected to Simple API Relay (Working Version)'
  }));
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📤 Client request: ${data.type}`);
      
      // Store pending request
      const requestId = data.requestId || `relay-${++requestCounter}`;
      pendingRequests.set(requestId, {
        client: ws,
        originalRequest: data
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
            ws.send(JSON.stringify({
              type: 'error',
              requestId: data.requestId,
              error: 'Request timeout'
            }));
          }
        }, 10000);
        
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
  console.log('🚀 Simple API Relay Server (Working Version)');
  console.log(`📍 Foundry URL: ${FOUNDRY_URL}`);
  console.log(`✨ API Server: http://localhost:${PORT}`);
  console.log('\n📝 Using chat messages for reliable communication');
  console.log('📝 Make sure simple-api-working module is enabled!\n');
  
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
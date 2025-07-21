#!/usr/bin/env node

/**
 * Chat API Relay Server
 * 
 * This server connects to Foundry's Socket.IO and relays API requests through chat messages
 * Works with the simple-api-working module that uses chat messages for communication
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
let pingInterval = null;

// Create HTTP server for status
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  res.writeHead(200);
  res.end(JSON.stringify({
    status: foundryConnected ? 'connected' : 'disconnected',
    foundryUrl: FOUNDRY_URL,
    clients: clients.size,
    message: 'Chat API Relay Server',
    authEnabled: true,
    authUsername: API_USERNAME
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
      // Handshake response
      const sid = JSON.parse(message.substring(1)).sid;
      console.log('🤝 Handshake complete, SID:', sid);
    } else if (message.startsWith('40')) {
      // Connected
      foundryConnected = true;
      console.log('✅ Socket.IO connected');
      console.log('📡 Listening for chat messages');
      
      // Start ping interval
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (foundryWs && foundryWs.readyState === WebSocket.OPEN) {
          foundryWs.send('2'); // Send ping
        }
      }, 25000);
    } else if (message.startsWith('42')) {
      // Data message
      try {
        const jsonStart = message.indexOf('[');
        if (jsonStart >= 0) {
          const data = JSON.parse(message.substring(jsonStart));
          
          if (Array.isArray(data)) {
            const [eventName, eventData] = data;
            
            // Handle chat messages
            if (eventName === 'createChatMessage' && eventData) {
              const chatContent = eventData.content || '';
              
              // Check for API response in chat
              if (chatContent.startsWith('API_RESPONSE:')) {
                console.log('📥 Got API response from chat!');
                const jsonStart = chatContent.indexOf('{');
                if (jsonStart >= 0) {
                  try {
                    const response = JSON.parse(chatContent.substring(jsonStart));
                    handleFoundryResponse(response);
                  } catch (e) {
                    console.error('Failed to parse API response:', e);
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        console.log('Parse error:', e.message);
      }
    } else if (message === '3') {
      // Ping
      foundryWs.send('2'); // Pong
    }
  });
  
  foundryWs.on('close', () => {
    console.log('❌ Disconnected from Foundry');
    foundryConnected = false;
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
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
  
  // Find the pending request
  if (data.requestId) {
    console.log('🔎 Looking for request ID:', data.requestId);
    
    if (pendingRequests.has(data.requestId)) {
      const { client, originalRequest } = pendingRequests.get(data.requestId);
      pendingRequests.delete(data.requestId);
      
      // Send response to client
      const response = {
        ...data,
        requestId: originalRequest.requestId
      };
      console.log('📤 Sending to client:', response.type);
      client.send(JSON.stringify(response));
    } else {
      console.log('⚠️ No pending request found for ID:', data.requestId);
    }
  }
}

// Send request to Foundry as chat message
function sendToFoundry(request) {
  if (!foundryConnected || !foundryWs) {
    throw new Error('Not connected to Foundry');
  }
  
  // Create chat message with API request
  const chatMessage = {
    content: `API_REQUEST: ${JSON.stringify({
      ...request,
      auth: {
        username: API_USERNAME,
        password: API_PASSWORD
      }
    })}`,
    type: 0, // OOC message
    user: null,
    speaker: null,
    whisper: [],
    blind: false
  };
  
  // Send as createChatMessage event
  const socketMessage = `42["createChatMessage",${JSON.stringify(chatMessage)}]`;
  console.log('📤 Sending chat message to Foundry');
  foundryWs.send(socketMessage);
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
    message: 'Connected to Chat API Relay'
  }));
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📤 Client request: ${data.type}`);
      
      // Generate request ID if not provided
      const requestId = data.requestId || `relay-${++requestCounter}`;
      
      // Store pending request
      pendingRequests.set(requestId, {
        client: ws,
        originalRequest: data
      });
      
      // Forward to Foundry
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
              error: 'Request timeout - Module may not be responding to chat messages'
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
  console.log('🚀 Chat API Relay Server');
  console.log(`📍 Foundry URL: ${FOUNDRY_URL}`);
  console.log(`✨ API Server: http://localhost:${PORT}`);
  console.log(`🔐 Auth Username: ${API_USERNAME}`);
  console.log(`🔐 Auth Password: ${API_PASSWORD}`);
  console.log('\n📝 This relay uses CHAT MESSAGES for communication');
  console.log('📝 Make sure the simple-api module is installed and enabled in Foundry!');
  console.log('📝 Configure matching username/password in Foundry module settings!\n');
  
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
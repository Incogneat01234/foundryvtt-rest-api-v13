#!/usr/bin/env node

/**
 * Simple API Relay Server - Chat Version
 * 
 * This version works with the chat-based API implementation
 */

const WebSocket = require('ws');
const http = require('http');

// Configuration
const PORT = process.env.PORT || 8080;
const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';

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
    message: 'Simple API Relay Server (Chat Version)',
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
      console.log('📡 Ready to relay chat-based API requests\n');
      
      // Keep alive with pings
      setInterval(() => {
        if (foundryWs && foundryWs.readyState === WebSocket.OPEN) {
          foundryWs.send('2'); // Ping
        }
      }, 25000);
      
      // Send a test message to verify module is working
      setTimeout(() => {
        console.log('📝 Sending test ping via chat...');
        sendChatRequest({ type: 'ping', requestId: 'startup-test' });
      }, 1000);
      
    } else if (message.startsWith('42')) {
      // Data message
      try {
        const jsonStart = message.indexOf('[');
        if (jsonStart >= 0) {
          const data = JSON.parse(message.substring(jsonStart));
          
          // Look for chat messages
          if (data[0] === 'createDocument' && data[1]?.type === 'ChatMessage') {
            const chatMessage = data[1].result?.[0] || data[1];
            if (chatMessage?.content?.startsWith('API_RESPONSE:')) {
              console.log('📥 Got API response from chat');
              handleChatResponse(chatMessage.content);
            }
          }
          
          // Also check for modifyDocument events (chat updates)
          if (data[0] === 'modifyDocument' && data[1]?.type === 'ChatMessage') {
            const updates = data[1].updates?.[0] || data[1];
            if (updates?.content?.startsWith('API_RESPONSE:')) {
              console.log('📥 Got API response from chat update');
              handleChatResponse(updates.content);
            }
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

// Handle chat responses from Foundry
function handleChatResponse(content) {
  try {
    const jsonStart = content.indexOf('{');
    if (jsonStart >= 0) {
      const response = JSON.parse(content.substring(jsonStart));
      
      console.log('   Type:', response.type);
      console.log('   Request ID:', response.requestId);
      
      // Find the pending request
      if (response.requestId && pendingRequests.has(response.requestId)) {
        const { client } = pendingRequests.get(response.requestId);
        pendingRequests.delete(response.requestId);
        
        console.log('   ✅ Sending to client\n');
        client.send(JSON.stringify(response));
      } else {
        console.log('   ⚠️  No client waiting for this response\n');
      }
    }
  } catch (e) {
    console.error('Error parsing chat response:', e);
  }
}

// Send request to Foundry via chat
function sendChatRequest(request) {
  if (!foundryConnected || !foundryWs) {
    throw new Error('Not connected to Foundry');
  }
  
  // Create a chat message with the API request
  const chatData = {
    content: `API_REQUEST:${JSON.stringify(request)}`,
    type: CONST.CHAT_MESSAGE_TYPES?.OTHER || 5,
    user: null, // Will be filled by server
  };
  
  // Send as createDocument message
  const createMessage = `42["createDocument",{"type":"ChatMessage","data":[${JSON.stringify(chatData)}]}]`;
  console.log('📤 Sending request via chat:', request.type);
  foundryWs.send(createMessage);
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
    message: 'Connected to Simple API Relay (Chat Version)'
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
        sendChatRequest(foundryRequest);
        
        // Set timeout for response
        setTimeout(() => {
          if (pendingRequests.has(requestId)) {
            pendingRequests.delete(requestId);
            console.log('⏱️  Request timeout:', requestId);
            ws.send(JSON.stringify({
              type: 'error',
              requestId: data.requestId,
              error: 'Request timeout - check if module is enabled and you are GM'
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

// CONST polyfill for chat message types
const CONST = {
  CHAT_MESSAGE_TYPES: {
    OTHER: 5
  }
};

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Simple API Relay Server (Chat Version)');
  console.log(`📍 Foundry URL: ${FOUNDRY_URL}`);
  console.log(`✨ API Server: http://localhost:${PORT}`);
  console.log('\n📝 This version uses chat messages for communication');
  console.log('   Make sure you are logged in as GM!\n');
  
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
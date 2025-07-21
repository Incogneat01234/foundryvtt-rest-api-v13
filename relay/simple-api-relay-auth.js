#!/usr/bin/env node

/**
 * Simple API Relay Server with Authentication
 * 
 * This server connects to Foundry's Socket.IO and relays API requests
 * Includes authentication support for secure external connections
 */

const WebSocket = require('ws');
const http = require('http');
const crypto = require('crypto');

// Configuration
const PORT = process.env.PORT || 8080;
const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const API_KEY = process.env.API_KEY || ''; // Set this to match your Foundry module auth token
const ENABLE_AUTH = process.env.ENABLE_AUTH === 'true' || !!API_KEY;

// Store connected clients
const clients = new Map();
const pendingRequests = new Map();

// Foundry connection
let foundryWs = null;
let foundryConnected = false;
let requestCounter = 0;
let pingInterval = null;
let reconnectTimeout = null;

// Create HTTP server for status and health checks
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: foundryConnected ? 'healthy' : 'unhealthy',
      foundryConnected,
      clientsConnected: clients.size,
      pendingRequests: pendingRequests.size,
      authEnabled: ENABLE_AUTH
    }));
  } else {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: foundryConnected ? 'connected' : 'disconnected',
      foundryUrl: FOUNDRY_URL,
      clients: clients.size,
      authEnabled: ENABLE_AUTH,
      message: 'Simple API Relay Server with Authentication'
    }));
  }
});

// Connect to Foundry
function connectToFoundry() {
  // Clear any existing reconnect timeout
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  console.log('🔌 Connecting to Foundry at:', FOUNDRY_URL);
  
  const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
  
  try {
    foundryWs = new WebSocket(wsUrl, {
      headers: {
        'User-Agent': 'Simple-API-Relay/1.0'
      }
    });
    
    foundryWs.on('open', () => {
      console.log('✅ WebSocket connected to Foundry');
      // Send Socket.IO handshake
      foundryWs.send('40');
    });
    
    foundryWs.on('message', (data) => {
      const message = data.toString();
      handleFoundryMessage(message);
    });
    
    foundryWs.on('close', (code, reason) => {
      console.log('❌ Disconnected from Foundry:', code, reason.toString());
      foundryConnected = false;
      cleanup();
      
      // Notify all clients
      notifyClients({
        type: 'connection-lost',
        message: 'Lost connection to Foundry'
      });
      
      // Reconnect after 5 seconds
      reconnectTimeout = setTimeout(connectToFoundry, 5000);
    });
    
    foundryWs.on('error', (err) => {
      console.error('❌ Foundry connection error:', err.message);
      if (err.code === 'ECONNREFUSED') {
        console.log('🔄 Foundry appears to be offline, will retry...');
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to create WebSocket:', error);
    reconnectTimeout = setTimeout(connectToFoundry, 5000);
  }
}

// Handle messages from Foundry
function handleFoundryMessage(message) {
  try {
    // Handle Socket.IO protocol messages
    if (message.startsWith('0')) {
      // Handshake response
      const handshake = JSON.parse(message.substring(1));
      console.log('🤝 Handshake complete, SID:', handshake.sid);
      console.log('   Ping interval:', handshake.pingInterval, 'ms');
      console.log('   Ping timeout:', handshake.pingTimeout, 'ms');
    } else if (message === '40') {
      // Connected acknowledgment
      foundryConnected = true;
      console.log('✅ Socket.IO connected successfully');
      
      // Start ping interval
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        if (foundryWs && foundryWs.readyState === WebSocket.OPEN) {
          foundryWs.send('2'); // Send ping
        }
      }, 25000);
      
      // Notify clients
      notifyClients({
        type: 'connected',
        message: 'Connected to Foundry'
      });
    } else if (message.startsWith('42')) {
      // Data message
      const jsonStart = message.indexOf('[');
      if (jsonStart >= 0) {
        const data = JSON.parse(message.substring(jsonStart));
        
        if (Array.isArray(data) && data.length >= 2) {
          const [eventName, eventData] = data;
          
          // Handle different event types
          if (eventName === 'module.simple-api') {
            handleFoundryResponse(eventData);
          } else if (eventName === 'userspace-socket-message' && eventData) {
            // Handle userspace messages
            if (eventData.action === 'module.simple-api' && eventData.data) {
              handleFoundryResponse(eventData.data);
            }
          }
        }
      }
    } else if (message === '3') {
      // Ping from server
      foundryWs.send('2'); // Send pong
    } else if (message === '2') {
      // Pong received
    } else if (message.startsWith('44')) {
      // Disconnect message
      console.log('📤 Server requested disconnect');
    }
  } catch (error) {
    console.error('❌ Error handling Foundry message:', error);
    console.error('   Message:', message);
  }
}

// Cleanup on disconnect
function cleanup() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  
  // Clear pending requests
  for (const [requestId, { client }] of pendingRequests) {
    client.send(JSON.stringify({
      type: 'error',
      requestId,
      error: 'Connection to Foundry lost'
    }));
  }
  pendingRequests.clear();
}

// Handle responses from Foundry
function handleFoundryResponse(data) {
  console.log('📥 Foundry response:', data.type || data.responseType);
  
  if (data.type === 'api-ready') {
    console.log('✅ Simple API module is ready!');
    console.log('   World:', data.world);
    console.log('   System:', data.system);
    console.log('   External enabled:', data.externalEnabled);
    notifyClients({ type: 'api-ready', ...data });
    return;
  }
  
  // Find the pending request
  if (data.requestId && pendingRequests.has(data.requestId)) {
    const { client, originalRequest } = pendingRequests.get(data.requestId);
    pendingRequests.delete(data.requestId);
    
    // Send response to client
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        ...data,
        requestId: originalRequest.requestId
      }));
    }
  }
}

// Send request to Foundry
function sendToFoundry(request) {
  if (!foundryConnected || !foundryWs || foundryWs.readyState !== WebSocket.OPEN) {
    throw new Error('Not connected to Foundry');
  }
  
  // Add auth token if configured
  if (API_KEY) {
    request.auth = API_KEY;
  }
  
  // Try multiple sending methods for compatibility
  
  // Method 1: Direct module message
  const directMessage = `42["module.simple-api",${JSON.stringify(request)}]`;
  console.log('📤 Sending direct to Foundry:', request.type);
  foundryWs.send(directMessage);
  
  // Method 2: Userspace socket message (for external connections)
  const userspaceMessage = `42["userspace-socket-message",{"action":"module.simple-api","data":${JSON.stringify(request)}}]`;
  setTimeout(() => {
    if (foundryWs && foundryWs.readyState === WebSocket.OPEN) {
      console.log('📤 Sending userspace to Foundry:', request.type);
      foundryWs.send(userspaceMessage);
    }
  }, 100);
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

// Validate client authentication
function validateClientAuth(authHeader) {
  if (!ENABLE_AUTH) return true;
  
  if (!authHeader) {
    console.warn('🚫 No authentication provided');
    return false;
  }
  
  // Support Bearer token format
  const token = authHeader.replace(/^Bearer\s+/i, '');
  
  if (token !== API_KEY) {
    console.warn('🚫 Invalid authentication token');
    return false;
  }
  
  return true;
}

// Create WebSocket server for clients
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info) => {
    if (!ENABLE_AUTH) return true;
    
    const auth = info.req.headers.authorization;
    return validateClientAuth(auth);
  }
});

wss.on('connection', (ws, req) => {
  const clientId = `client-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const clientIp = req.socket.remoteAddress;
  console.log(`👤 Client connected: ${clientId} from ${clientIp}`);
  
  clients.set(clientId, ws);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    connected: foundryConnected,
    authRequired: ENABLE_AUTH,
    message: 'Connected to Simple API Relay'
  }));
  
  // Handle client messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`📨 Client request: ${data.type} from ${clientId}`);
      
      // Generate unique request ID for tracking
      const relayRequestId = `relay-${++requestCounter}-${Date.now()}`;
      
      // Store pending request
      pendingRequests.set(relayRequestId, {
        client: ws,
        originalRequest: data,
        timestamp: Date.now()
      });
      
      // Forward to Foundry with our request ID
      const foundryRequest = {
        ...data,
        requestId: relayRequestId,
        relayedAt: new Date().toISOString()
      };
      
      try {
        sendToFoundry(foundryRequest);
        
        // Set timeout for response
        setTimeout(() => {
          if (pendingRequests.has(relayRequestId)) {
            pendingRequests.delete(relayRequestId);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                requestId: data.requestId,
                error: 'Request timeout - Simple API module may not be installed, enabled, or configured for external connections'
              }));
            }
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
      console.error('❌ Error handling client message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`👋 Client disconnected: ${clientId}`);
    clients.delete(clientId);
    
    // Clean up any pending requests from this client
    for (const [requestId, request] of pendingRequests) {
      if (request.client === ws) {
        pendingRequests.delete(requestId);
      }
    }
  });
  
  ws.on('error', (error) => {
    console.error(`❌ Client error ${clientId}:`, error.message);
  });
});

// Clean up old pending requests periodically
setInterval(() => {
  const now = Date.now();
  for (const [requestId, request] of pendingRequests) {
    if (now - request.timestamp > 30000) { // 30 second timeout
      pendingRequests.delete(requestId);
      console.log(`🧹 Cleaned up stale request: ${requestId}`);
    }
  }
}, 60000); // Run every minute

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Simple API Relay Server with Authentication');
  console.log(`📍 Foundry URL: ${FOUNDRY_URL}`);
  console.log(`✨ API Server: http://localhost:${PORT}`);
  console.log(`🔐 Authentication: ${ENABLE_AUTH ? 'ENABLED' : 'DISABLED'}`);
  if (ENABLE_AUTH && !API_KEY) {
    console.log('⚠️  Warning: Auth enabled but no API_KEY set!');
  }
  console.log('\n📝 Make sure the simple-api module is installed and enabled in Foundry!');
  console.log('📝 If using authentication, set the same token in Foundry module settings.\n');
  
  connectToFoundry();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }
  
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  
  if (foundryWs) {
    foundryWs.close(1000, 'Server shutting down');
  }
  
  for (const [id, ws] of clients) {
    ws.close(1000, 'Server shutting down');
  }
  
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
  
  // Force exit after 5 seconds
  setTimeout(() => {
    console.log('⚠️  Forced shutdown');
    process.exit(0);
  }, 5000);
});
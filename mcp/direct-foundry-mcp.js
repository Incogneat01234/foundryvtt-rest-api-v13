#!/usr/bin/env node

/**
 * Direct Foundry MCP Server
 * Attempts to connect directly to Foundry using Socket.IO
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const WebSocket = require('ws');

// Configuration
const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const API_USERNAME = process.env.API_USERNAME || 'API_USER';
const API_PASSWORD = process.env.API_PASSWORD || 'API';

// Foundry connection
let foundryWs = null;
let foundryConnected = false;
let pendingRequests = new Map();
let requestCounter = 0;

// Connect to Foundry
async function connectToFoundry() {
  return new Promise((resolve, reject) => {
    console.error('🔌 Connecting directly to Foundry...');
    
    const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
    foundryWs = new WebSocket(wsUrl);
    
    foundryWs.on('open', () => {
      console.error('✅ Connected to Foundry');
      foundryWs.send('40'); // Socket.IO handshake
    });
    
    foundryWs.on('message', (data) => {
      const message = data.toString();
      
      if (message.startsWith('0')) {
        // Handshake response
        const sid = JSON.parse(message.substring(1)).sid;
        console.error('🤝 Handshake complete, SID:', sid);
      } else if (message.startsWith('40')) {
        // Connected
        foundryConnected = true;
        console.error('✅ Socket.IO connected - using CHAT messages');
        resolve();
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
                
                // Check for API response
                if (chatContent.startsWith('API_RESPONSE:')) {
                  console.error('📥 Got API response from chat!');
                  const jsonStart = chatContent.indexOf('{');
                  if (jsonStart >= 0) {
                    try {
                      const response = JSON.parse(chatContent.substring(jsonStart));
                      handleFoundryResponse(response);
                    } catch (e) {
                      console.error('Failed to parse response:', e);
                    }
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
      console.error('❌ Disconnected from Foundry');
      foundryConnected = false;
    });
    
    foundryWs.on('error', (err) => {
      console.error('❌ Foundry connection error:', err.message);
      reject(err);
    });
  });
}

// Handle Foundry responses
function handleFoundryResponse(data) {
  if (data.requestId && pendingRequests.has(data.requestId)) {
    const { resolve } = pendingRequests.get(data.requestId);
    pendingRequests.delete(data.requestId);
    resolve(data);
  }
}

// Send request to Foundry via chat
async function sendToFoundry(request) {
  if (!foundryConnected || !foundryWs) {
    throw new Error('Not connected to Foundry');
  }
  
  return new Promise((resolve, reject) => {
    const requestId = `mcp-${++requestCounter}`;
    
    // Store pending request
    pendingRequests.set(requestId, { resolve, reject });
    
    // Create chat message with API request
    const chatMessage = {
      content: `API_REQUEST: ${JSON.stringify({
        ...request,
        requestId,
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
    console.error('📤 Sending chat message to Foundry');
    foundryWs.send(socketMessage);
    
    // Set timeout
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }
    }, 10000);
  });
}

// Create MCP server
const server = new Server(
  {
    name: 'direct-foundry-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// System info tool
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!foundryConnected) {
    throw new Error('Not connected to Foundry');
  }
  
  switch (name) {
    case 'getSystemInfo': {
      const response = await sendToFoundry({ type: 'system-info' });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    }
    
    case 'getActors': {
      const response = await sendToFoundry({ type: 'get-actors' });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    }
    
    case 'executeMacro': {
      const response = await sendToFoundry({
        type: 'execute-macro',
        data: { name: args.name }
      });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response.data, null, 2),
          },
        ],
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// List available tools
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'getSystemInfo',
        description: 'Get Foundry system information',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'getActors',
        description: 'Get list of actors',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'executeMacro',
        description: 'Execute a Foundry macro',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the macro to execute',
            },
          },
          required: ['name'],
        },
      },
    ],
  };
});

// Start server
async function main() {
  try {
    console.error('🚀 Direct Foundry MCP Server starting...');
    console.error(`📍 Foundry URL: ${FOUNDRY_URL}`);
    console.error('📝 Using CHAT MESSAGES for communication');
    
    // Connect to Foundry first
    await connectToFoundry();
    
    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('✅ MCP server ready');
    
    // Keep connection alive
    setInterval(() => {
      if (foundryWs && foundryWs.readyState === WebSocket.OPEN) {
        foundryWs.send('2'); // Socket.IO ping
      }
    }, 25000);
    
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

main();
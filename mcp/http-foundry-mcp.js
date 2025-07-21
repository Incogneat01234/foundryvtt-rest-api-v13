#!/usr/bin/env node

/**
 * HTTP Foundry MCP Server
 * Connects to Foundry's Simple API HTTP server directly
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Configuration
const FOUNDRY_HTTP_API = process.env.FOUNDRY_HTTP_API || 'http://localhost:3001';
const API_USERNAME = process.env.API_USERNAME || 'API_USER';
const API_PASSWORD = process.env.API_PASSWORD || 'API';

let requestCounter = 0;

// Make HTTP request to Foundry
async function callFoundryAPI(request) {
  const authHeader = `Basic ${Buffer.from(`${API_USERNAME}:${API_PASSWORD}`).toString('base64')}`;
  
  const response = await fetch(FOUNDRY_HTTP_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify(request)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${error}`);
  }
  
  return await response.json();
}

// Create MCP server
const server = new Server(
  {
    name: 'http-foundry-mcp',
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
  
  switch (name) {
    case 'getSystemInfo': {
      const response = await callFoundryAPI({ 
        type: 'system-info',
        requestId: `mcp-${++requestCounter}`
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
    
    case 'getActors': {
      const response = await callFoundryAPI({ 
        type: 'get-actors',
        requestId: `mcp-${++requestCounter}`
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
    
    case 'executeMacro': {
      const response = await callFoundryAPI({
        type: 'execute-macro',
        requestId: `mcp-${++requestCounter}`,
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
    console.error('🚀 HTTP Foundry MCP Server starting...');
    console.error(`📍 Foundry HTTP API: ${FOUNDRY_HTTP_API}`);
    console.error('📝 Using direct HTTP connection (no Socket.IO)');
    
    // Test connection
    try {
      const testResponse = await callFoundryAPI({ 
        type: 'ping',
        requestId: 'startup-test'
      });
      console.error('✅ Successfully connected to Foundry HTTP API');
    } catch (error) {
      console.error('❌ Failed to connect to Foundry HTTP API');
      console.error('   Make sure simple-api-http.js is loaded in Foundry');
      console.error('   Error:', error.message);
      process.exit(1);
    }
    
    // Start MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error('✅ MCP server ready');
    
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

main();
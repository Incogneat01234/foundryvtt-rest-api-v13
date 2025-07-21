/**
 * Simple API Module for Foundry VTT - HTTP Server Version
 * 
 * This version creates its own HTTP server, bypassing Socket.IO limitations
 * WARNING: This requires Foundry to be running with Node.js access
 */

Hooks.once("init", () => {
  console.log("Simple API HTTP | Initializing");
  
  // Register module settings
  game.settings.register("simple-api", "httpPort", {
    name: "HTTP API Port",
    hint: "Port for the HTTP API server (requires restart)",
    scope: "world",
    config: true,
    type: Number,
    default: 3001
  });
  
  game.settings.register("simple-api", "authEnabled", {
    name: "Enable Authentication",
    hint: "Require authentication for API connections",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });
  
  game.settings.register("simple-api", "username", {
    name: "API Username",
    hint: "Username for API authentication",
    scope: "world",
    config: true,
    type: String,
    default: "API_USER"
  });
  
  game.settings.register("simple-api", "password", {
    name: "API Password",
    hint: "Password for API authentication",
    scope: "world",
    config: true,
    type: String,
    default: "API"
  });
});

Hooks.once("ready", async () => {
  console.log("Simple API HTTP | Ready");
  
  if (!game.user.isGM) {
    console.log("Simple API HTTP | Not GM, skipping initialization");
    return;
  }
  
  // Check if we can create HTTP server
  if (typeof require === 'undefined') {
    console.error("Simple API HTTP | Cannot create HTTP server - Node.js modules not available");
    console.error("Simple API HTTP | This version requires Foundry to run with --allow-node flag");
    ui.notifications.error("Simple API HTTP: Node.js access required. Use standard version instead.");
    return;
  }
  
  try {
    await startHttpServer();
  } catch (error) {
    console.error("Simple API HTTP | Failed to start HTTP server:", error);
    ui.notifications.error("Simple API HTTP: Failed to start server. Check console for details.");
  }
});

async function startHttpServer() {
  const http = require('http');
  const port = game.settings.get("simple-api", "httpPort");
  
  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Parse request body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const request = body ? JSON.parse(body) : {};
        
        // Check authentication
        const authEnabled = game.settings.get("simple-api", "authEnabled");
        if (authEnabled) {
          const auth = req.headers.authorization;
          const username = game.settings.get("simple-api", "username");
          const password = game.settings.get("simple-api", "password");
          const expectedAuth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
          
          if (auth !== expectedAuth) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Authentication failed' }));
            return;
          }
        }
        
        // Handle API request
        const response = await handleApiRequest(request);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        
      } catch (error) {
        console.error("Simple API HTTP | Request error:", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  });
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`Simple API HTTP | Server started on port ${port}`);
    ui.notifications.info(`Simple API HTTP server started on port ${port}`);
  });
  
  // Store server reference for cleanup
  game.modules.get("simple-api").httpServer = server;
}

async function handleApiRequest(request) {
  console.log("Simple API HTTP | Processing request:", request.type);
  
  try {
    switch (request.type) {
      case "ping":
        return {
          type: "ping-response",
          requestId: request.requestId,
          data: {
            message: "pong",
            timestamp: Date.now(),
            world: game.world.title,
            system: game.system.id
          }
        };
        
      case "system-info":
        return {
          type: "system-info-response",
          requestId: request.requestId,
          data: {
            world: game.world.title,
            system: game.system.id,
            version: game.version,
            users: game.users.contents.map(u => ({
              id: u.id,
              name: u.name,
              role: u.role
            })),
            modules: Array.from(game.modules.entries())
              .filter(([id, m]) => m.active)
              .map(([id, m]) => ({ id, title: m.title }))
          }
        };
        
      case "get-actors":
        return {
          type: "actors-response",
          requestId: request.requestId,
          data: {
            actors: game.actors.contents.map(a => ({
              id: a.id,
              name: a.name,
              type: a.type,
              img: a.img
            }))
          }
        };
        
      case "execute-macro":
        const macro = game.macros.getName(request.data.name);
        if (macro) {
          const result = await macro.execute();
          return {
            type: "macro-response",
            requestId: request.requestId,
            data: {
              success: true,
              macroName: request.data.name,
              result: result
            }
          };
        } else {
          return {
            type: "error",
            requestId: request.requestId,
            error: `Macro "${request.data.name}" not found`
          };
        }
        
      default:
        return {
          type: "error",
          requestId: request.requestId,
          error: `Unknown request type: ${request.type}`
        };
    }
  } catch (error) {
    console.error("Simple API HTTP | Error processing request:", error);
    return {
      type: "error",
      requestId: request.requestId,
      error: error.message
    };
  }
}

// Cleanup on shutdown
Hooks.once("closeSimpleAPIHTTP", () => {
  const module = game.modules.get("simple-api");
  if (module && module.httpServer) {
    console.log("Simple API HTTP | Shutting down server");
    module.httpServer.close();
  }
});
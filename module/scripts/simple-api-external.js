/**
 * Simple API Module for Foundry VTT - External Connection Support
 * 
 * This version listens for events that external Socket.IO connections can send
 */

Hooks.once("init", () => {
  console.log("Simple API External | Initializing");
  
  // Register module settings
  game.settings.register("simple-api", "authEnabled", {
    name: "Enable Authentication",
    hint: "Require authentication for external API connections",
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

Hooks.once("ready", () => {
  console.log("Simple API External | Ready");
  
  if (!game.user.isGM) {
    console.log("Simple API External | Not GM, skipping initialization");
    return;
  }
  
  setupApiHandlers();
  setupExternalListeners();
  
  // Send ready notification
  game.socket.emit("module.simple-api", {
    type: "api-ready",
    world: game.world.title,
    system: game.system.id,
    version: game.version
  });
  
  console.log("Simple API External | Ready to receive API requests from external connections");
});

function setupApiHandlers() {
  // Method 1: Listen for direct socket messages (works for internal connections)
  game.socket.on("module.simple-api", async (data) => {
    console.log("Simple API External | Received direct socket message:", data);
    await handleApiRequest(data);
  });
  
  // Method 2: Listen for template messages
  game.socket.on("template", async (template, data) => {
    console.log("Simple API External | Received template message:", template);
    if (template === "simple-api-request") {
      await handleApiRequest(data);
    }
  });
  
  // Method 3: Listen for userspace messages
  game.socket.on("userspace-socket-message", async (data) => {
    console.log("Simple API External | Received userspace message:", data);
    if (data.action === "module.simple-api") {
      await handleApiRequest(data.data);
    }
  });
  
  // Create test function
  window.testSimpleAPI = () => {
    console.log("Testing Simple API External...");
    handleApiRequest({ type: "ping", requestId: "manual-test" });
  };
}

function setupExternalListeners() {
  // Try to intercept raw Socket.IO messages
  if (game.socket._callbacks) {
    console.log("Simple API External | Available socket callbacks:", Object.keys(game.socket._callbacks));
  }
  
  // Hook into the socket's raw message handler if possible
  const originalEmit = game.socket.emit;
  game.socket.emit = function(event, ...args) {
    if (event.includes("simple-api") || event === "template" || event === "userspace-socket-message") {
      console.log("Simple API External | Intercepted emit:", event, args);
    }
    return originalEmit.apply(this, [event, ...args]);
  };
  
  // Also try to hook the raw socket
  if (game.socket.io && game.socket.io.on) {
    game.socket.io.on("message", (data) => {
      console.log("Simple API External | Raw socket message:", data);
    });
  }
}

/**
 * Handle API requests
 */
async function handleApiRequest(request) {
  console.log("Simple API External | Processing request:", request);
  
  // Check authentication if enabled
  const authEnabled = game.settings.get("simple-api", "authEnabled");
  if (authEnabled) {
    const username = game.settings.get("simple-api", "username");
    const password = game.settings.get("simple-api", "password");
    
    if (!request.auth || request.auth.username !== username || request.auth.password !== password) {
      console.log("Simple API External | Authentication failed");
      await sendResponse({
        type: "error",
        requestId: request.requestId,
        error: "Authentication failed"
      });
      return;
    }
  }
  
  try {
    let response;
    
    switch (request.type) {
      case "ping":
        response = {
          type: "ping-response",
          requestId: request.requestId,
          data: {
            message: "pong",
            timestamp: Date.now(),
            world: game.world.title,
            system: game.system.id
          }
        };
        break;
        
      case "system-info":
        response = {
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
        break;
        
      case "get-actors":
        response = {
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
        break;
        
      case "execute-macro":
        const macro = game.macros.getName(request.data.name);
        if (macro) {
          const result = await macro.execute();
          response = {
            type: "macro-response",
            requestId: request.requestId,
            data: {
              success: true,
              macroName: request.data.name,
              result: result
            }
          };
        } else {
          response = {
            type: "error",
            requestId: request.requestId,
            error: `Macro "${request.data.name}" not found`
          };
        }
        break;
        
      default:
        response = {
          type: "error",
          requestId: request.requestId,
          error: `Unknown request type: ${request.type}`
        };
    }
    
    await sendResponse(response);
    
  } catch (error) {
    console.error("Simple API External | Error processing request:", error);
    await sendResponse({
      type: "error",
      requestId: request.requestId,
      error: error.message
    });
  }
}

/**
 * Send response back through all possible channels
 */
async function sendResponse(response) {
  console.log("Simple API External | Sending response:", response.type);
  
  // Try multiple methods to ensure external connections receive it
  
  // Method 1: Direct socket emit
  game.socket.emit("module.simple-api", response);
  
  // Method 2: Template message
  game.socket.emit("template", "simple-api-response", response);
  
  // Method 3: Userspace message
  game.socket.emit("userspace-socket-message", {
    action: "module.simple-api-response",
    data: response
  });
  
  // Method 4: Try raw Socket.IO emit if available
  if (game.socket.io && game.socket.io.emit) {
    game.socket.io.emit("module.simple-api", response);
  }
  
  console.log("Simple API External | Response sent through all channels");
}
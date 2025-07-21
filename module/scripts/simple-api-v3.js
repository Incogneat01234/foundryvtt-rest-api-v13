/**
 * Simple API Module for Foundry VTT v3 - Debug Version
 * 
 * Enhanced logging to debug socket communication issues
 */

Hooks.once("init", () => {
  console.log("Simple API v3 | Initializing");
  
  // Register module settings
  game.settings.register("simple-api", "authEnabled", {
    name: "Enable Authentication",
    hint: "Require authentication for external API connections",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      console.log("Simple API v3 | Authentication enabled:", value);
    }
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
  console.log("Simple API v3 | Ready");
  
  // Log current settings
  console.log("Simple API v3 | Current settings:", {
    authEnabled: game.settings.get("simple-api", "authEnabled"),
    username: game.settings.get("simple-api", "username"),
    password: game.settings.get("simple-api", "password")
  });
  
  // Only GM can handle API requests
  if (!game.user.isGM) {
    console.log("Simple API v3 | Not GM, skipping initialization");
    return;
  }
  
  console.log("Simple API v3 | Setting up message handlers...");
  
  // Log all socket events to understand what's happening
  const socket = game.socket;
  console.log("Simple API v3 | Socket object:", socket);
  console.log("Simple API v3 | Socket._socket:", socket._socket);
  
  // Method 1: Standard Foundry socket listener
  game.socket.on("module.simple-api", (data) => {
    console.log("Simple API v3 | Received via game.socket.on:", data);
    handleApiRequest(data);
  });
  
  // Method 2: Try to intercept all socket messages
  if (socket._socket) {
    const originalEmit = socket._socket.emit;
    socket._socket.emit = function(event, ...args) {
      console.log("Simple API v3 | Socket emit intercepted:", event, args);
      if (event === "module.simple-api") {
        handleApiRequest(args[0]);
      }
      return originalEmit.apply(this, arguments);
    };
    
    // Try to add listeners for socket.io events
    const io = socket._socket;
    
    // Listen for any event
    const originalOnevent = io.onevent;
    io.onevent = function(packet) {
      console.log("Simple API v3 | Socket.IO packet:", packet);
      if (packet && packet.data) {
        const [eventName, eventData] = packet.data;
        console.log("Simple API v3 | Event:", eventName, "Data:", eventData);
        
        if (eventName === "module.simple-api") {
          handleApiRequest(eventData);
        } else if (eventName === "userspace-socket-message" && eventData?.action === "module.simple-api") {
          handleApiRequest(eventData.data);
        }
      }
      if (originalOnevent) {
        return originalOnevent.call(this, packet);
      }
    };
  }
  
  // Send ready signal
  console.log("Simple API v3 | Sending ready signal");
  game.socket.emit("module.simple-api", {
    type: "api-ready",
    world: game.world.id,
    system: game.system.id,
    user: game.user.name
  });
  
  // Create test functions
  window.simpleAPITest = {
    ping: () => {
      console.log("Manual test: ping");
      handleApiRequest({ type: "ping", requestId: "manual-ping" });
    },
    emit: () => {
      console.log("Manual test: emit");
      game.socket.emit("module.simple-api", { type: "test", data: "Hello!" });
    },
    getActors: () => {
      console.log("Manual test: get actors");
      handleApiRequest({ type: "get-actors", requestId: "manual-actors" });
    }
  };
  
  console.log("Simple API v3 | Ready! Test with:");
  console.log("  simpleAPITest.ping()");
  console.log("  simpleAPITest.emit()");
  console.log("  simpleAPITest.getActors()");
});

/**
 * Validate authentication
 */
function validateAuth(auth) {
  if (!game.settings.get("simple-api", "authEnabled")) {
    return true; // Auth not required
  }
  
  const expectedUsername = game.settings.get("simple-api", "username");
  const expectedPassword = game.settings.get("simple-api", "password");
  
  return auth.username === expectedUsername && auth.password === expectedPassword;
}

/**
 * Main request handler
 */
async function handleApiRequest(request) {
  console.log("Simple API v3 | handleApiRequest called:", request);
  
  // Only GM processes requests
  if (!game.user.isGM) {
    console.log("Simple API v3 | Not GM, ignoring");
    return;
  }
  
  let response;
  
  try {
    switch (request.type) {
      case "ping":
        response = {
          type: "ping-response",
          requestId: request.requestId,
          pong: true,
          world: game.world.id,
          system: game.system.id,
          user: game.user.name,
          foundryVersion: game.version
        };
        break;
        
      case "get-system-info":
        response = {
          type: "system-info-response",
          requestId: request.requestId,
          world: {
            id: game.world.id,
            title: game.world.title,
            system: game.world.system,
            version: game.world.coreVersion
          },
          system: {
            id: game.system.id,
            title: game.system.title,
            version: game.system.version
          },
          user: {
            id: game.user.id,
            name: game.user.name,
            role: game.user.role
          },
          modules: game.modules.filter(m => m.active).map(m => ({
            id: m.id,
            title: m.title,
            version: m.version
          }))
        };
        break;
        
      case "get-actors":
        const actors = game.actors.map(actor => ({
          id: actor.id,
          name: actor.name,
          type: actor.type,
          img: actor.img,
          uuid: actor.uuid
        }));
        
        response = {
          type: "actors-response",
          requestId: request.requestId,
          actors: actors
        };
        break;
        
      case "create-actor":
        const actorData = {
          name: request.name,
          type: request.actorType || "character",
          img: request.img,
          system: request.system || {}
        };
        
        const actor = await Actor.create(actorData);
        
        response = {
          type: "create-actor-response",
          requestId: request.requestId,
          created: true,
          actor: {
            id: actor.id,
            name: actor.name,
            type: actor.type,
            uuid: actor.uuid
          }
        };
        break;
        
      default:
        response = {
          type: "error",
          requestId: request.requestId,
          error: `Unknown request type: ${request.type}`
        };
    }
  } catch (error) {
    console.error("Simple API v3 | Error handling request:", error);
    response = {
      type: "error", 
      requestId: request.requestId,
      error: error.message
    };
  }
  
  // Send response multiple ways to ensure delivery
  console.log("Simple API v3 | Sending response:", response);
  
  // Method 1: Direct emit
  game.socket.emit("module.simple-api", response);
  
  // Method 2: Try userspace-socket-message
  game.socket.emit("userspace-socket-message", {
    action: "module.simple-api",
    data: response
  });
  
  console.log("Simple API v3 | Response sent");
}
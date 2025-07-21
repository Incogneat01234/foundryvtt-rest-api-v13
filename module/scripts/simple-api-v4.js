/**
 * Simple API Module for Foundry VTT v4
 * 
 * Uses system messages to communicate with external connections
 */

Hooks.once("init", () => {
  console.log("Simple API v4 | Initializing");
  
  // Register module settings
  game.settings.register("simple-api", "authEnabled", {
    name: "Enable Authentication",
    hint: "Require authentication for external API connections",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      console.log("Simple API v4 | Authentication enabled:", value);
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
  console.log("Simple API v4 | Ready");
  
  // Log current settings
  console.log("Simple API v4 | Current settings:", {
    authEnabled: game.settings.get("simple-api", "authEnabled"),
    username: game.settings.get("simple-api", "username"),
    password: game.settings.get("simple-api", "password")
  });
  
  // Only GM can handle API requests
  if (!game.user.isGM) {
    console.log("Simple API v4 | Not GM, skipping initialization");
    return;
  }
  
  console.log("Simple API v4 | Setting up message handlers...");
  
  // Listen for system messages (these are relayed to external connections)
  Hooks.on("userConnected", (user, connected) => {
    console.log(`Simple API v4 | User ${connected ? 'connected' : 'disconnected'}:`, user.name);
  });
  
  // Method 1: Listen for module messages
  game.socket.on("module.simple-api", async (data) => {
    console.log("Simple API v4 | Received module message:", data);
    await handleApiRequest(data);
  });
  
  // Method 2: Hook into system messages
  game.socket.on("system.simple-api", async (data) => {
    console.log("Simple API v4 | Received system message:", data);
    await handleApiRequest(data);
  });
  
  // Method 3: Use template pattern to intercept messages
  const socket = game.socket;
  
  // Send ready signal using system message
  console.log("Simple API v4 | Sending ready signal");
  socket.emit("template", ["simple-api-ready", {
    type: "api-ready",
    world: game.world.id,  
    system: game.system.id,
    user: game.user.name,
    version: "4.0.0"
  }]);
  
  // Listen for template messages
  socket.on("template", (templateId, messageData, emittingUser) => {
    console.log("Simple API v4 | Template message:", templateId, messageData);
    
    if (templateId === "simple-api-request" && messageData) {
      console.log("Simple API v4 | Processing API request via template");
      handleApiRequest(messageData);
    }
  });
  
  // Create test functions
  window.simpleAPIv4 = {
    test: () => {
      console.log("Manual test v4");
      handleApiRequest({ type: "ping", requestId: "manual-v4" });
    },
    sendTemplate: () => {
      game.socket.emit("template", ["simple-api-test", { message: "Hello from v4!" }]);
    }
  };
  
  console.log("Simple API v4 | Ready! Test with: simpleAPIv4.test()");
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
  console.log("Simple API v4 | handleApiRequest called:", request);
  
  // Only GM processes requests
  if (!game.user.isGM) {
    console.log("Simple API v4 | Not GM, ignoring");
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
        
      case "roll-dice":
        const roll = new Roll(request.formula || "1d20");
        await roll.evaluate();
        
        if (request.showInChat) {
          await roll.toMessage({
            flavor: request.flavor || "API Dice Roll"
          });
        }
        
        response = {
          type: "roll-dice-response",
          requestId: request.requestId,
          formula: request.formula,
          total: roll.total,
          result: roll.result,
          dice: roll.dice.map(d => ({
            faces: d.faces,
            results: d.results.map(r => r.result)
          }))
        };
        break;
        
      case "send-chat":
        const chatData = {
          content: request.message,
          type: request.chatType || CONST.CHAT_MESSAGE_TYPES.OTHER
        };
        
        if (request.speaker) {
          chatData.speaker = request.speaker;
        }
        
        await ChatMessage.create(chatData);
        
        response = {
          type: "send-chat-response",
          requestId: request.requestId,
          sent: true
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
    console.error("Simple API v4 | Error handling request:", error);
    response = {
      type: "error", 
      requestId: request.requestId,
      error: error.message
    };
  }
  
  // Send response using template pattern (visible to external connections)
  console.log("Simple API v4 | Sending response via template:", response.type);
  game.socket.emit("template", ["simple-api-response", response]);
  
  // Also try module.simple-api for backwards compatibility
  game.socket.emit("module.simple-api", response);
}
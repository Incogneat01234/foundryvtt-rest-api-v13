/**
 * Simple API Module for Foundry VTT - Final Version
 * 
 * Uses a hybrid approach for maximum compatibility
 */

Hooks.once("init", () => {
  console.log("Simple API | Initializing");
  
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
  console.log("Simple API | Ready");
  
  // Only GM can handle API requests
  if (!game.user.isGM) {
    console.log("Simple API | Not GM, skipping initialization");
    return;
  }
  
  console.log("Simple API | Current settings:", {
    authEnabled: game.settings.get("simple-api", "authEnabled"),
    username: game.settings.get("simple-api", "username"),
    password: game.settings.get("simple-api", "password")
  });
  
  // Set up message handlers
  setupMessageHandlers();
  
  // Send ready signal
  console.log("Simple API | Module ready!");
});

function setupMessageHandlers() {
  const socket = game.socket;
  
  // Listen for direct module messages
  socket.on("module.simple-api", async (data) => {
    console.log("Simple API | Received module message:", data);
    await handleApiRequest(data);
  });
  
  // Hook into the raw socket to catch all messages
  if (socket._socket) {
    const originalOnEvent = socket._socket.onevent;
    socket._socket.onevent = function(packet) {
      if (packet && packet.data) {
        const [eventName, ...args] = packet.data;
        
        // Log all events for debugging
        if (!eventName.includes("userActivity")) {
          console.log("Simple API | Socket event:", eventName);
        }
        
        // Handle template messages
        if (eventName === "template" && args[0]) {
          const [templateId, templateData] = args[0];
          if (templateId === "simple-api-request") {
            console.log("Simple API | Template request:", templateData);
            handleApiRequest(templateData);
          }
        }
        
        // Handle userspace messages
        if (eventName === "userspace-socket-message" && args[0]) {
          const data = args[0];
          if (data.action === "module.simple-api" && data.data) {
            console.log("Simple API | Userspace request:", data.data);
            handleApiRequest(data.data);
          }
        }
      }
      
      if (originalOnEvent) {
        return originalOnEvent.call(this, packet);
      }
    };
  }
  
  // Create a global test function
  window.testSimpleAPI = () => {
    console.log("Testing Simple API...");
    handleApiRequest({ type: "ping", requestId: "manual-test" });
  };
}

/**
 * Validate authentication
 */
function validateAuth(auth) {
  if (!game.settings.get("simple-api", "authEnabled")) {
    return true;
  }
  
  const expectedUsername = game.settings.get("simple-api", "username");
  const expectedPassword = game.settings.get("simple-api", "password");
  
  return auth && auth.username === expectedUsername && auth.password === expectedPassword;
}

/**
 * Send response back through multiple channels
 */
function sendResponse(response) {
  console.log("Simple API | Sending response:", response.type);
  
  // Method 1: Direct module message
  game.socket.emit("module.simple-api", response);
  
  // Method 2: Template message (for external connections)
  game.socket.emit("template", ["simple-api-response", response]);
  
  // Method 3: Create a chat message with the response (visible proof)
  if (response.type === "ping-response") {
    ChatMessage.create({
      content: `Simple API: Ping received (${response.requestId})`,
      style: CONST.CHAT_MESSAGE_STYLES.OTHER,
      whisper: [game.user.id]
    });
  }
}

/**
 * Main request handler
 */
async function handleApiRequest(request) {
  console.log("Simple API | Processing request:", request);
  
  // Check authentication if provided
  if (request.auth && !validateAuth(request.auth)) {
    console.log("Simple API | Authentication failed");
    sendResponse({
      type: "error",
      requestId: request.requestId,
      error: "Authentication failed"
    });
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
          style: request.chatStyle || CONST.CHAT_MESSAGE_STYLES.OTHER
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
    console.error("Simple API | Error:", error);
    response = {
      type: "error",
      requestId: request.requestId,
      error: error.message
    };
  }
  
  sendResponse(response);
}

// Add all the helper functions from v2
async function getActor(request) {
  const actor = game.actors.get(request.actorId);
  
  if (!actor) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "Actor not found"
    };
  }
  
  return {
    type: "actor-response",
    requestId: request.requestId,
    actor: {
      id: actor.id,
      name: actor.name,
      type: actor.type,
      img: actor.img,
      system: actor.system,
      items: actor.items.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        img: i.img
      }))
    }
  };
}

async function updateActor(request) {
  const actor = game.actors.get(request.actorId);
  
  if (!actor) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "Actor not found"
    };
  }
  
  await actor.update(request.updates);
  
  return {
    type: "update-actor-response",
    requestId: request.requestId,
    updated: true,
    actor: {
      id: actor.id,
      name: actor.name
    }
  };
}

async function deleteActor(request) {
  const actor = game.actors.get(request.actorId);
  
  if (!actor) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "Actor not found"
    };
  }
  
  await actor.delete();
  
  return {
    type: "delete-actor-response",
    requestId: request.requestId,
    deleted: true
  };
}
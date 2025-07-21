/**
 * Simple API Module for Foundry VTT - Safe Version
 * 
 * This version uses safer socket interception methods that handle undefined properties gracefully
 */

Hooks.once("init", () => {
  console.log("Simple API Safe | Initializing");
  
  // Register module settings for authentication
  game.settings.register("simple-api", "authToken", {
    name: "API Authentication Token",
    hint: "Token required for external API connections. Leave blank to disable authentication.",
    scope: "world",
    config: true,
    type: String,
    default: "",
    restricted: true // Only GM can change
  });
  
  game.settings.register("simple-api", "enableExternalConnections", {
    name: "Enable External Connections",
    hint: "Allow connections from outside Foundry (requires authentication token)",
    scope: "world", 
    config: true,
    type: Boolean,
    default: false,
    restricted: true
  });
});

Hooks.once("ready", () => {
  console.log("Simple API Safe | Ready");
  
  // Only GM can handle API requests
  if (!game.user.isGM) {
    console.log("Simple API Safe | Not GM, skipping initialization");
    return;
  }
  
  console.log("Simple API Safe | Setting up socket listeners...");
  
  // Method 1: Standard Foundry socket listener (always safe)
  game.socket.on("module.simple-api", handleApiRequest);
  
  // Method 2: Safe socket interception for external connections
  if (game.settings.get("simple-api", "enableExternalConnections")) {
    setupExternalSocketHandling();
  }
  
  console.log("Simple API Safe | Ready to receive API requests");
  
  // Send ready signal  
  game.socket.emit("module.simple-api", {
    type: "api-ready",
    world: game.world.id,
    system: game.system.id,
    user: game.user.name,
    externalEnabled: game.settings.get("simple-api", "enableExternalConnections")
  });
});

/**
 * Setup external socket handling with proper error handling
 */
function setupExternalSocketHandling() {
  console.log("Simple API Safe | Setting up external socket handling...");
  
  try {
    // Check if we have access to the internal socket
    if (!game.socket._socket) {
      console.warn("Simple API Safe | No access to internal socket, external connections may not work");
      return;
    }
    
    const socket = game.socket._socket;
    
    // Method 1: Try to intercept onevent (Socket.IO v2 style)
    if (socket.onevent && typeof socket.onevent === 'function') {
      const originalOnEvent = socket.onevent.bind(socket);
      socket.onevent = function(packet) {
        try {
          if (packet && packet.data && Array.isArray(packet.data)) {
            const [eventName, eventData] = packet.data;
            if (eventName === "module.simple-api" && eventData) {
              console.log("Simple API Safe | Intercepted external packet:", eventData);
              // Validate authentication if enabled
              if (validateAuth(eventData)) {
                handleApiRequest(eventData);
              }
            }
          }
        } catch (err) {
          console.error("Simple API Safe | Error in onevent interceptor:", err);
        }
        return originalOnEvent.call(this, packet);
      };
      console.log("Simple API Safe | OneEvent interceptor installed");
    }
    
    // Method 2: Try to add to callbacks (Socket.IO v3/v4 style)
    if (socket._callbacks && typeof socket._callbacks === 'object') {
      // Add handler for userspace-socket-message
      if (!socket._callbacks['$userspace-socket-message']) {
        socket._callbacks['$userspace-socket-message'] = [];
      }
      socket._callbacks['$userspace-socket-message'].push((data) => {
        try {
          console.log("Simple API Safe | Userspace message:", data);
          if (data && data.action === "module.simple-api" && data.data) {
            if (validateAuth(data.data)) {
              handleApiRequest(data.data);
            }
          }
        } catch (err) {
          console.error("Simple API Safe | Error in userspace handler:", err);
        }
      });
      console.log("Simple API Safe | Userspace callback installed");
    }
    
    // Method 3: Try manager packet interception (newer Socket.IO)
    if (socket.io && socket.io._callbacks) {
      // This is for Socket.IO v4
      const io = socket.io;
      if (!io._callbacks['$packet']) {
        io._callbacks['$packet'] = [];
      }
      io._callbacks['$packet'].push((packet) => {
        try {
          if (packet && packet.type === 2 && packet.data) {
            const [eventName, eventData] = packet.data;
            if (eventName === "module.simple-api" && eventData) {
              console.log("Simple API Safe | Intercepted io packet:", eventData);
              if (validateAuth(eventData)) {
                handleApiRequest(eventData);
              }
            }
          }
        } catch (err) {
          console.error("Simple API Safe | Error in io packet handler:", err);
        }
      });
      console.log("Simple API Safe | IO packet callback installed");
    }
    
    // Log what we have access to for debugging
    console.log("Simple API Safe | Socket structure:", {
      hasSocket: !!socket,
      hasOnevent: !!socket.onevent,
      hasCallbacks: !!socket._callbacks,
      callbackKeys: socket._callbacks ? Object.keys(socket._callbacks) : [],
      hasIo: !!socket.io,
      ioCallbacks: socket.io && socket.io._callbacks ? Object.keys(socket.io._callbacks) : []
    });
    
  } catch (error) {
    console.error("Simple API Safe | Error setting up external socket handling:", error);
  }
}

/**
 * Validate authentication token
 */
function validateAuth(request) {
  const authToken = game.settings.get("simple-api", "authToken");
  
  // If no auth token is set, allow all requests (but warn)
  if (!authToken) {
    console.warn("Simple API Safe | No auth token set, accepting all requests");
    return true;
  }
  
  // Check if request has matching auth token
  if (request.auth !== authToken) {
    console.warn("Simple API Safe | Invalid auth token:", request.auth);
    // Send error response
    game.socket.emit("module.simple-api", {
      type: "error",
      requestId: request.requestId,
      error: "Invalid authentication token"
    });
    return false;
  }
  
  return true;
}

/**
 * Main request handler
 */
async function handleApiRequest(request) {
  console.log("Simple API Safe | handleApiRequest:", request);
  
  // Only GM processes requests
  if (!game.user.isGM) return;
  
  let response;
  
  try {
    switch (request.type) {
      // ========== SYSTEM INFO ==========
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
        response = await getSystemInfo(request);
        break;
        
      // ========== ACTOR OPERATIONS ==========
      case "get-actors":
        response = await getActors(request);
        break;
        
      case "get-actor":
        response = await getActor(request);
        break;
        
      case "create-actor":
        response = await createActor(request);
        break;
        
      case "update-actor":
        response = await updateActor(request);
        break;
        
      case "delete-actor":
        response = await deleteActor(request);
        break;
        
      // ========== ITEM OPERATIONS ==========
      case "create-item":
        response = await createItem(request);
        break;
        
      case "add-item-to-actor":
        response = await addItemToActor(request);
        break;
        
      // ========== DICE OPERATIONS ==========
      case "roll-dice":
        response = await rollDice(request);
        break;
        
      case "roll-check":
        response = await rollCheck(request);
        break;
        
      // ========== CHAT OPERATIONS ==========
      case "send-chat":
        response = await sendChat(request);
        break;
        
      default:
        response = {
          type: "error",
          requestId: request.requestId,
          error: `Unknown request type: ${request.type}`
        };
    }
  } catch (error) {
    console.error("Simple API Safe | Error handling request:", error);
    response = {
      type: "error", 
      requestId: request.requestId,
      error: error.message
    };
  }
  
  // Send response
  console.log("Simple API Safe | Sending response:", response);
  game.socket.emit("module.simple-api", response);
}

// ========== SYSTEM INFO FUNCTIONS ==========
async function getSystemInfo(request) {
  return {
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
}

// ========== ACTOR FUNCTIONS ==========
async function getActors(request) {
  const actors = game.actors.map(actor => ({
    id: actor.id,
    name: actor.name,
    type: actor.type,
    img: actor.img,
    uuid: actor.uuid
  }));
  
  return {
    type: "actors-response",
    requestId: request.requestId,
    actors: actors
  };
}

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

async function createActor(request) {
  const actorData = {
    name: request.name,
    type: request.actorType || "character",
    img: request.img,
    system: request.system || {}
  };
  
  const actor = await Actor.create(actorData);
  
  return {
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

// ========== ITEM FUNCTIONS ==========
async function createItem(request) {
  const itemData = {
    name: request.name,
    type: request.itemType || "item",
    img: request.img,
    system: request.system || {}
  };
  
  const item = await Item.create(itemData);
  
  return {
    type: "create-item-response",
    requestId: request.requestId,
    created: true,
    item: {
      id: item.id,
      name: item.name,
      type: item.type,
      uuid: item.uuid
    }
  };
}

async function addItemToActor(request) {
  const actor = game.actors.get(request.actorId);
  
  if (!actor) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "Actor not found"
    };
  }
  
  const itemData = {
    name: request.name,
    type: request.itemType || "item",
    system: request.system || {}
  };
  
  const items = await actor.createEmbeddedDocuments("Item", [itemData]);
  
  return {
    type: "add-item-response",
    requestId: request.requestId,
    added: true,
    item: {
      id: items[0].id,
      name: items[0].name
    }
  };
}

// ========== DICE FUNCTIONS ==========
async function rollDice(request) {
  const roll = new Roll(request.formula);
  await roll.evaluate();
  
  // Send to chat if requested
  if (request.showInChat) {
    await roll.toMessage({
      flavor: request.flavor || "API Dice Roll"
    });
  }
  
  return {
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
}

async function rollCheck(request) {
  const actor = game.actors.get(request.actorId);
  
  if (!actor) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "Actor not found"
    };
  }
  
  // For D&D 5e
  if (game.system.id === "dnd5e") {
    const ability = actor.system.abilities[request.ability];
    if (!ability) {
      return {
        type: "error",
        requestId: request.requestId,
        error: "Ability not found"
      };
    }
    
    const roll = new Roll(`1d20 + ${ability.mod}`);
    await roll.evaluate();
    
    if (request.showInChat) {
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `${request.ability.toUpperCase()} Check`
      });
    }
    
    return {
      type: "roll-check-response",
      requestId: request.requestId,
      ability: request.ability,
      modifier: ability.mod,
      total: roll.total,
      formula: roll.formula
    };
  }
  
  return {
    type: "error",
    requestId: request.requestId,
    error: "System not supported for ability checks"
  };
}

// ========== CHAT FUNCTIONS ==========
async function sendChat(request) {
  const chatData = {
    content: request.message,
    type: request.chatType || CONST.CHAT_MESSAGE_TYPES.OTHER
  };
  
  if (request.speaker) {
    chatData.speaker = request.speaker;
  }
  
  await ChatMessage.create(chatData);
  
  return {
    type: "send-chat-response",
    requestId: request.requestId,
    sent: true
  };
}
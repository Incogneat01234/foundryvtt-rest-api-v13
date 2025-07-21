/**
 * Simple API Module for Foundry VTT
 * 
 * This module exposes basic CRUD operations via Foundry's built-in socket system
 * No external WebSocket server needed - it uses Foundry's existing connection
 */

Hooks.once("init", () => {
  console.log("Simple API | Initializing");
});

Hooks.once("ready", () => {
  console.log("Simple API | Ready");
  
  // Only GM can handle API requests
  if (!game.user.isGM) {
    console.log("Simple API | Not GM, skipping initialization");
    return;
  }
  
  // Register socket listeners
  game.socket.on("module.simple-api", handleApiRequest);
  
  console.log("Simple API | Listening for requests");
  
  // Announce that we're ready
  game.socket.emit("module.simple-api", {
    type: "api-ready",
    world: game.world.id,
    system: game.system.id
  });
});

/**
 * Main request handler
 */
async function handleApiRequest(request) {
  console.log("Simple API | Request:", request);
  
  // Only GM processes requests
  if (!game.user.isGM) return;
  
  try {
    let response;
    
    switch (request.type) {
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
      case "get-items":
        response = await getItems(request);
        break;
        
      case "create-item":
        response = await createItem(request);
        break;
        
      case "add-item-to-actor":
        response = await addItemToActor(request);
        break;
        
      // ========== ROLL OPERATIONS ==========
      case "roll-dice":
        response = await rollDice(request);
        break;
        
      case "roll-check":
        response = await rollCheck(request);
        break;
        
      // ========== SCENE OPERATIONS ==========
      case "get-scenes":
        response = await getScenes(request);
        break;
        
      case "get-tokens":
        response = await getTokens(request);
        break;
        
      case "create-token":
        response = await createToken(request);
        break;
        
      // ========== CHAT OPERATIONS ==========
      case "send-chat":
        response = await sendChat(request);
        break;
        
      // ========== UTILITY ==========
      case "ping":
        response = { type: "pong", time: Date.now() };
        break;
        
      case "get-system-info":
        response = getSystemInfo();
        break;
        
      default:
        response = {
          error: `Unknown request type: ${request.type}`
        };
    }
    
    // Send response
    game.socket.emit("module.simple-api", {
      ...response,
      requestId: request.requestId,
      responseType: request.type + "-response"
    });
    
  } catch (error) {
    console.error("Simple API | Error:", error);
    game.socket.emit("module.simple-api", {
      error: error.message,
      requestId: request.requestId,
      responseType: request.type + "-error"
    });
  }
}

// ========== ACTOR FUNCTIONS ==========

async function getActors(request) {
  const actors = game.actors.contents.map(actor => ({
    _id: actor.id,
    name: actor.name,
    type: actor.type,
    img: actor.img,
    system: actor.system
  }));
  
  return { actors };
}

async function getActor(request) {
  const actor = game.actors.get(request.actorId);
  if (!actor) throw new Error("Actor not found");
  
  return {
    actor: {
      _id: actor.id,
      name: actor.name,
      type: actor.type,
      img: actor.img,
      system: actor.system,
      items: actor.items.map(i => ({
        _id: i.id,
        name: i.name,
        type: i.type,
        img: i.img,
        system: i.system
      }))
    }
  };
}

async function createActor(request) {
  const actorData = {
    name: request.name || "New Actor",
    type: request.actorType || "character",
    img: request.img,
    system: request.system || {}
  };
  
  const actor = await Actor.create(actorData);
  
  return {
    created: true,
    actor: {
      _id: actor.id,
      name: actor.name,
      type: actor.type,
      uuid: actor.uuid
    }
  };
}

async function updateActor(request) {
  const actor = game.actors.get(request.actorId);
  if (!actor) throw new Error("Actor not found");
  
  await actor.update(request.updates);
  
  return {
    updated: true,
    actorId: actor.id
  };
}

async function deleteActor(request) {
  const actor = game.actors.get(request.actorId);
  if (!actor) throw new Error("Actor not found");
  
  await actor.delete();
  
  return {
    deleted: true,
    actorId: request.actorId
  };
}

// ========== ITEM FUNCTIONS ==========

async function getItems(request) {
  const items = game.items.contents.map(item => ({
    _id: item.id,
    name: item.name,
    type: item.type,
    img: item.img,
    system: item.system
  }));
  
  return { items };
}

async function createItem(request) {
  const itemData = {
    name: request.name || "New Item",
    type: request.itemType || "weapon",
    img: request.img,
    system: request.system || {}
  };
  
  const item = await Item.create(itemData);
  
  return {
    created: true,
    item: {
      _id: item.id,
      name: item.name,
      type: item.type,
      uuid: item.uuid
    }
  };
}

async function addItemToActor(request) {
  const actor = game.actors.get(request.actorId);
  if (!actor) throw new Error("Actor not found");
  
  const itemData = {
    name: request.name || "New Item",
    type: request.itemType || "weapon",
    system: request.system || {}
  };
  
  const item = await actor.createEmbeddedDocuments("Item", [itemData]);
  
  return {
    created: true,
    item: item[0]
  };
}

// ========== ROLL FUNCTIONS ==========

async function rollDice(request) {
  const roll = new Roll(request.formula || "1d20");
  await roll.evaluate({async: true});
  
  // Show in chat if requested
  if (request.showInChat) {
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker(),
      flavor: request.flavor
    });
  }
  
  return {
    rolled: true,
    formula: roll.formula,
    total: roll.total,
    dice: roll.dice.map(d => ({
      faces: d.faces,
      results: d.results.map(r => r.result)
    }))
  };
}

async function rollCheck(request) {
  const actor = game.actors.get(request.actorId);
  if (!actor) throw new Error("Actor not found");
  
  // For D&D 5e ability checks
  if (game.system.id === "dnd5e" && request.ability) {
    const ability = actor.system.abilities[request.ability];
    if (!ability) throw new Error("Invalid ability");
    
    const roll = new Roll(`1d20 + ${ability.mod}`, actor.getRollData());
    await roll.evaluate({async: true});
    
    if (request.showInChat) {
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor}),
        flavor: `${CONFIG.DND5E.abilities[request.ability]} Check`
      });
    }
    
    return {
      rolled: true,
      formula: roll.formula,
      total: roll.total
    };
  }
  
  throw new Error("Roll check not supported for this system");
}

// ========== SCENE FUNCTIONS ==========

async function getScenes(request) {
  const scenes = game.scenes.contents.map(scene => ({
    _id: scene.id,
    name: scene.name,
    active: scene.active,
    img: scene.img
  }));
  
  return { scenes };
}

async function getTokens(request) {
  const scene = request.sceneId ? 
    game.scenes.get(request.sceneId) : 
    game.scenes.active;
    
  if (!scene) throw new Error("No active scene");
  
  const tokens = scene.tokens.contents.map(token => ({
    _id: token.id,
    name: token.name,
    x: token.x,
    y: token.y,
    img: token.texture.src,
    actorId: token.actorId
  }));
  
  return { tokens };
}

async function createToken(request) {
  const scene = request.sceneId ? 
    game.scenes.get(request.sceneId) : 
    game.scenes.active;
    
  if (!scene) throw new Error("No active scene");
  
  const actor = game.actors.get(request.actorId);
  if (!actor) throw new Error("Actor not found");
  
  const tokenData = {
    actorId: actor.id,
    x: request.x || 1000,
    y: request.y || 1000
  };
  
  const token = await scene.createEmbeddedDocuments("Token", [tokenData]);
  
  return {
    created: true,
    token: token[0]
  };
}

// ========== CHAT FUNCTIONS ==========

async function sendChat(request) {
  const chatData = {
    content: request.message,
    speaker: request.speaker || ChatMessage.getSpeaker()
  };
  
  const message = await ChatMessage.create(chatData);
  
  return {
    sent: true,
    messageId: message.id
  };
}

// ========== UTILITY FUNCTIONS ==========

function getSystemInfo() {
  return {
    foundry: {
      version: game.version,
      system: game.system.id,
      systemVersion: game.system.version,
      world: game.world.id
    },
    actors: game.actors.size,
    items: game.items.size,
    scenes: game.scenes.size,
    users: game.users.contents.map(u => ({
      id: u.id,
      name: u.name,
      role: u.role
    }))
  };
}

// ========== EXTERNAL ACCESS ==========

// Expose API for external WebSocket servers to relay through
window.SimpleAPI = {
  handleRequest: handleApiRequest,
  isReady: () => game.ready,
  
  // Direct access methods
  getActors: () => game.actors.contents,
  getActor: (id) => game.actors.get(id),
  createActor: (data) => Actor.create(data),
  updateActor: (id, updates) => game.actors.get(id)?.update(updates),
  deleteActor: (id) => game.actors.get(id)?.delete(),
  
  // Utility
  roll: (formula) => new Roll(formula).evaluate({async: true})
};
/**
 * Simple API Module for Foundry VTT v2
 * 
 * Uses a more robust approach to intercept external socket messages
 */

Hooks.once("init", () => {
  console.log("Simple API v2 | Initializing");
});

Hooks.once("ready", () => {
  console.log("Simple API v2 | Ready");
  
  // Only GM can handle API requests
  if (!game.user.isGM) {
    console.log("Simple API v2 | Not GM, skipping initialization");
    return;
  }
  
  console.log("Simple API v2 | Setting up message handlers...");
  
  // Method 1: Standard Foundry socket listener
  game.socket.on("module.simple-api", handleApiRequest);
  
  // Method 2: Intercept Socket.IO manager messages
  if (game.socket._socket && game.socket._socket._callbacks) {
    // Hook into the Socket.IO callbacks
    const callbacks = game.socket._socket._callbacks;
    
    // Add handler for userspace-socket-message
    if (!callbacks['$userspace-socket-message']) {
      callbacks['$userspace-socket-message'] = [];
    }
    callbacks['$userspace-socket-message'].push((data) => {
      console.log("Simple API v2 | Userspace message:", data);
      if (data && data.action === "module.simple-api" && data.data) {
        handleApiRequest(data.data);
      }
    });
    
    // Add direct handler for module.simple-api
    if (!callbacks['$module.simple-api']) {
      callbacks['$module.simple-api'] = [];
    }
    callbacks['$module.simple-api'].push((data) => {
      console.log("Simple API v2 | Direct module message:", data);
      handleApiRequest(data);
    });
  }
  
  // Method 3: Override the socket manager's handleMessage
  if (game.socket._socket && game.socket._socket.manager) {
    const manager = game.socket._socket.manager;
    const originalHandlePacket = manager._packet.bind(manager);
    
    manager._packet = function(packet) {
      // Check for our custom messages
      if (packet && packet.type === 2 && packet.data) {
        const [eventName, eventData] = packet.data;
        if (eventName === "module.simple-api" || 
            (eventName === "userspace-socket-message" && eventData?.action === "module.simple-api")) {
          console.log("Simple API v2 | Intercepted packet:", eventName, eventData);
        }
      }
      
      return originalHandlePacket(packet);
    };
  }
  
  console.log("Simple API v2 | Message handlers installed");
  console.log("Simple API v2 | Socket callbacks:", Object.keys(game.socket._socket._callbacks || {}));
  
  // Send ready signal
  game.socket.emit("module.simple-api", {
    type: "api-ready",
    world: game.world.id,
    system: game.system.id,
    user: game.user.name
  });
  
  // Also make a global test function
  window.testSimpleAPIv2 = () => {
    console.log("Testing Simple API v2...");
    const testRequest = { type: "ping", requestId: "manual-test" };
    console.log("Sending:", testRequest);
    handleApiRequest(testRequest);
  };
  
  console.log("Simple API v2 | Ready! Test with: testSimpleAPIv2()");
});

/**
 * Main request handler
 */
async function handleApiRequest(request) {
  console.log("Simple API v2 | handleApiRequest:", request);
  
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
        
      // ========== TOKEN/SCENE OPERATIONS ==========
      case "get-tokens":
        response = await getTokens(request);
        break;
        
      case "create-token":
        response = await createToken(request);
        break;
        
      // ========== COMBAT OPERATIONS ==========
      case "get-combats":
        response = await getCombats(request);
        break;
        
      case "create-combat":
        response = await createCombat(request);
        break;
        
      case "add-to-combat":
        response = await addToCombat(request);
        break;
        
      case "roll-initiative":
        response = await rollInitiative(request);
        break;
        
      case "next-turn":
        response = await nextTurn(request);
        break;
        
      default:
        response = {
          type: "error",
          requestId: request.requestId,
          error: `Unknown request type: ${request.type}`
        };
    }
  } catch (error) {
    console.error("Simple API v2 | Error handling request:", error);
    response = {
      type: "error", 
      requestId: request.requestId,
      error: error.message
    };
  }
  
  // Send response
  console.log("Simple API v2 | Sending response:", response);
  game.socket.emit("module.simple-api", response);
  
  // Also try sending via userspace-socket-message
  game.socket.emit("userspace-socket-message", {
    action: "module.simple-api",
    data: response
  });
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

// ========== TOKEN/SCENE FUNCTIONS ==========
async function getTokens(request) {
  const scene = game.scenes.active;
  if (!scene) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "No active scene"
    };
  }
  
  const tokens = scene.tokens.map(t => ({
    id: t.id,
    name: t.name,
    x: t.x,
    y: t.y,
    img: t.texture.src,
    actorId: t.actorId
  }));
  
  return {
    type: "tokens-response",
    requestId: request.requestId,
    sceneId: scene.id,
    tokens: tokens
  };
}

async function createToken(request) {
  const scene = game.scenes.active;
  if (!scene) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "No active scene"
    };
  }
  
  const actor = game.actors.get(request.actorId);
  if (!actor) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "Actor not found"
    };
  }
  
  const tokenData = {
    actorId: actor.id,
    x: request.x || 1000,
    y: request.y || 1000
  };
  
  const tokens = await scene.createEmbeddedDocuments("Token", [tokenData]);
  
  return {
    type: "create-token-response",
    requestId: request.requestId,
    created: true,
    token: {
      id: tokens[0].id,
      name: tokens[0].name,
      x: tokens[0].x,
      y: tokens[0].y
    }
  };
}

// ========== COMBAT FUNCTIONS ==========
async function getCombats(request) {
  const combats = game.combats.map(c => ({
    id: c.id,
    round: c.round,
    turn: c.turn,
    started: c.started,
    combatants: c.combatants.map(cb => ({
      id: cb.id,
      name: cb.name,
      initiative: cb.initiative,
      actorId: cb.actorId,
      tokenId: cb.tokenId
    }))
  }));
  
  return {
    type: "combats-response",
    requestId: request.requestId,
    combats: combats,
    active: game.combat ? game.combat.id : null
  };
}

async function createCombat(request) {
  const combat = await Combat.create({
    scene: game.scenes.active.id
  });
  
  return {
    type: "create-combat-response",
    requestId: request.requestId,
    created: true,
    combat: {
      id: combat.id
    }
  };
}

async function addToCombat(request) {
  const combat = game.combat;
  if (!combat) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "No active combat"
    };
  }
  
  const token = game.scenes.active.tokens.get(request.tokenId);
  if (!token) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "Token not found"
    };
  }
  
  await combat.createEmbeddedDocuments("Combatant", [{
    tokenId: token.id,
    actorId: token.actorId
  }]);
  
  return {
    type: "add-to-combat-response",
    requestId: request.requestId,
    added: true
  };
}

async function rollInitiative(request) {
  const combat = game.combat;
  if (!combat) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "No active combat"
    };
  }
  
  if (request.combatantId) {
    await combat.rollInitiative([request.combatantId]);
  } else {
    await combat.rollAll();
  }
  
  return {
    type: "roll-initiative-response",
    requestId: request.requestId,
    rolled: true
  };
}

async function nextTurn(request) {
  const combat = game.combat;
  if (!combat) {
    return {
      type: "error",
      requestId: request.requestId,
      error: "No active combat"
    };
  }
  
  await combat.nextTurn();
  
  return {
    type: "next-turn-response",
    requestId: request.requestId,
    turn: combat.turn,
    round: combat.round
  };
}
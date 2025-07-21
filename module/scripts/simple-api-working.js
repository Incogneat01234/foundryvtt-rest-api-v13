/**
 * Simple API Module for Foundry VTT - Working Version
 * 
 * Uses modifyDocument messages which ARE relayed to external connections
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
  
  if (!game.user.isGM) {
    console.log("Simple API | Not GM, skipping initialization");
    return;
  }
  
  setupApiHandlers();
  console.log("Simple API | Ready to receive API requests");
});

function setupApiHandlers() {
  // Listen for chat messages that contain API requests
  Hooks.on("createChatMessage", (message, options, userId) => {
    const content = message.content;
    
    // Check if this is an API request
    if (content.startsWith("API_REQUEST:")) {
      console.log("Simple API | Received API request via chat");
      
      try {
        const jsonStart = content.indexOf("{");
        if (jsonStart >= 0) {
          const request = JSON.parse(content.substring(jsonStart));
          handleApiRequest(request);
        }
      } catch (e) {
        console.error("Simple API | Error parsing request:", e);
      }
      
      // Delete the API request message immediately
      message.delete();
    }
  });
  
  // Also listen for direct socket messages (for internal use)
  game.socket.on("module.simple-api", async (data) => {
    console.log("Simple API | Received direct socket message:", data);
    await handleApiRequest(data);
  });
  
  // Create test function
  window.testSimpleAPI = () => {
    console.log("Testing Simple API...");
    handleApiRequest({ type: "ping", requestId: "manual-test" });
  };
}

/**
 * Send response back to the relay
 */
async function sendResponse(response) {
  console.log("Simple API | Sending response:", response.type);
  
  // Method 1: Create a chat message with the response
  // This WILL be seen by external connections
  const responseMessage = await ChatMessage.create({
    content: `API_RESPONSE:${JSON.stringify(response)}`,
    style: CONST.CHAT_MESSAGE_STYLES.OTHER,
    whisper: [game.user.id],
    flags: {
      "simple-api": {
        isApiResponse: true,
        response: response
      }
    }
  });
  
  // Delete the response message after a short delay
  setTimeout(() => {
    responseMessage.delete();
  }, 100);
  
  // Method 2: Also emit as socket message (for internal connections)
  game.socket.emit("module.simple-api", response);
}

/**
 * Main request handler
 */
async function handleApiRequest(request) {
  console.log("Simple API | Processing request:", request);
  
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
        await ChatMessage.create({
          content: request.message,
          style: request.chatStyle || CONST.CHAT_MESSAGE_STYLES.OTHER,
          speaker: request.speaker
        });
        
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
  
  await sendResponse(response);
}
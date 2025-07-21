/**
 * Simple API Module for Foundry VTT - Asymmetric Communication Version
 * 
 * This version uses an asymmetric pattern:
 * - External connections send requests via createChatMessage events
 * - Module responds via self-deleting whispered chat messages
 * - External connections receive responses via createChatMessage events
 */

Hooks.once("init", () => {
  console.log("Simple API Asymmetric | Initializing");
  
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
  console.log("Simple API Asymmetric | Ready");
  
  if (!game.user.isGM) {
    console.log("Simple API Asymmetric | Not GM, skipping initialization");
    return;
  }
  
  setupApiHandlers();
  console.log("Simple API Asymmetric | Ready to receive API requests");
  
  // Send ready notification
  sendApiResponse({
    type: "api-ready",
    world: game.world.title,
    system: game.system.id,
    version: game.version
  });
});

function setupApiHandlers() {
  // Listen for chat messages that contain API requests
  Hooks.on("createChatMessage", async (message, options, userId) => {
    const content = message.content;
    
    // Check if this is an API request
    if (content.startsWith("API_REQUEST:")) {
      console.log("Simple API Asymmetric | Received API request via chat");
      
      try {
        const jsonStart = content.indexOf("{");
        if (jsonStart >= 0) {
          const request = JSON.parse(content.substring(jsonStart));
          
          // Process the request
          await handleApiRequest(request);
          
          // Delete the request message immediately
          await message.delete();
        }
      } catch (e) {
        console.error("Simple API Asymmetric | Error parsing request:", e);
        // Still delete the message to avoid spam
        await message.delete();
        
        // Send error response
        await sendApiResponse({
          type: "error",
          error: "Failed to parse request",
          details: e.message
        });
      }
    }
  });
  
  // Also listen for direct socket messages (for internal use)
  game.socket.on("module.simple-api", async (data) => {
    console.log("Simple API Asymmetric | Received direct socket message:", data);
    await handleApiRequest(data);
  });
  
  // Create test function
  window.testSimpleAPI = () => {
    console.log("Testing Simple API Asymmetric...");
    handleApiRequest({ type: "ping", requestId: "manual-test" });
  };
}

/**
 * Send response via self-deleting whispered chat message
 */
async function sendApiResponse(response) {
  console.log("Simple API Asymmetric | Sending response:", response.type);
  
  try {
    // Create a whispered chat message with the response
    const chatData = {
      content: `API_RESPONSE: ${JSON.stringify(response)}`,
      type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
      whisper: [game.user.id], // Whisper to self to minimize visibility
      flags: {
        "simple-api": {
          isApiResponse: true,
          autoDelete: true
        }
      }
    };
    
    // Create the message
    const message = await ChatMessage.create(chatData);
    
    // Delete after a short delay to ensure external connections receive it
    if (message) {
      setTimeout(async () => {
        try {
          await message.delete();
          console.log("Simple API Asymmetric | Response message auto-deleted");
        } catch (e) {
          // Message might already be deleted
        }
      }, 100); // 100ms should be enough for external connections to receive
    }
    
  } catch (error) {
    console.error("Simple API Asymmetric | Error sending response:", error);
  }
}

/**
 * Handle API requests
 */
async function handleApiRequest(request) {
  console.log("Simple API Asymmetric | Processing request:", request);
  
  // Check authentication if enabled
  const authEnabled = game.settings.get("simple-api", "authEnabled");
  if (authEnabled) {
    const username = game.settings.get("simple-api", "username");
    const password = game.settings.get("simple-api", "password");
    
    if (!request.auth || request.auth.username !== username || request.auth.password !== password) {
      console.log("Simple API Asymmetric | Authentication failed");
      await sendApiResponse({
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
    
    await sendApiResponse(response);
    
  } catch (error) {
    console.error("Simple API Asymmetric | Error processing request:", error);
    await sendApiResponse({
      type: "error",
      requestId: request.requestId,
      error: error.message
    });
  }
}
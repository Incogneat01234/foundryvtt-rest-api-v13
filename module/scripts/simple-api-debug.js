/**
 * Simple API Module for Foundry VTT - DEBUG VERSION
 */

Hooks.once("init", () => {
  console.log("Simple API DEBUG | Initializing");
});

Hooks.once("ready", () => {
  console.log("Simple API DEBUG | Ready");
  console.log("Simple API DEBUG | User:", game.user.name, "isGM:", game.user.isGM);
  console.log("Simple API DEBUG | World:", game.world.id);
  console.log("Simple API DEBUG | System:", game.system.id);
  
  // Only GM can handle API requests
  if (!game.user.isGM) {
    console.log("Simple API DEBUG | Not GM, skipping initialization");
    return;
  }
  
  // Test basic socket functionality
  console.log("Simple API DEBUG | Testing socket...");
  
  // Listen for ALL socket messages to debug
  game.socket._callbacks.$module = game.socket._callbacks.$module || [];
  const originalEmit = game.socket.emit;
  game.socket.emit = function(...args) {
    console.log("Simple API DEBUG | Socket emit:", args);
    return originalEmit.apply(this, args);
  };
  
  // Register socket listeners with more specific event name
  game.socket.on("module.simple-api", (data) => {
    console.log("Simple API DEBUG | Received module.simple-api event:", data);
    handleApiRequest(data);
  });
  
  // Also try listening on the general module channel
  game.socket.on("module", (eventName, data) => {
    console.log("Simple API DEBUG | Received module event:", eventName, data);
    if (eventName === "simple-api") {
      handleApiRequest(data);
    }
  });
  
  console.log("Simple API DEBUG | Socket listeners registered");
  console.log("Simple API DEBUG | Current socket callbacks:", Object.keys(game.socket._callbacks));
  
  // Send a test message
  game.socket.emit("module.simple-api", {
    type: "api-ready",
    world: game.world.id,
    system: game.system.id,
    debug: true
  });
  
  // Create a global function for testing
  window.testSimpleAPI = () => {
    console.log("Testing Simple API...");
    game.socket.emit("module.simple-api", { type: "test", message: "Hello from Foundry!" });
  };
  
  console.log("Simple API DEBUG | Ready to receive requests. Test with: testSimpleAPI()");
});

/**
 * Main request handler
 */
async function handleApiRequest(request) {
  console.log("Simple API DEBUG | handleApiRequest called with:", request);
  
  // Only GM processes requests
  if (!game.user.isGM) {
    console.log("Simple API DEBUG | Not GM, ignoring request");
    return;
  }
  
  try {
    let response = {
      type: request.type + "-response",
      requestId: request.requestId,
      debug: true
    };
    
    switch (request.type) {
      case "ping":
        response.pong = true;
        response.world = game.world.id;
        response.user = game.user.name;
        break;
        
      case "test":
        response.message = "Test received!";
        break;
        
      default:
        response.error = `Unknown request type: ${request.type}`;
    }
    
    console.log("Simple API DEBUG | Sending response:", response);
    game.socket.emit("module.simple-api", response);
    
  } catch (error) {
    console.error("Simple API DEBUG | Error:", error);
    game.socket.emit("module.simple-api", {
      type: "error",
      requestId: request.requestId,
      error: error.message,
      debug: true
    });
  }
}
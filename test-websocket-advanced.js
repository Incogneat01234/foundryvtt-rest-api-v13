// Advanced WebSocket Test for Foundry REST API
// Run this in browser console after the module is loaded

(function() {
  console.log("=== Advanced WebSocket Test ===");
  
  const moduleId = "foundry-rest-api";
  const api = game.modules.get(moduleId)?.api;
  
  if (!api) {
    console.error("❌ Foundry REST API module not found or API not available");
    return;
  }
  
  if (!api.websocket) {
    console.error("❌ WebSocket manager not available");
    return;
  }
  
  const ws = api.websocket;
  
  // Test 1: Connection Status
  console.log("\n1. Connection Status:");
  console.log("   Connected:", ws.isConnected());
  console.log("   URL:", ws.url);
  console.log("   Client ID:", ws.clientId);
  console.log("   Is Primary GM:", ws.isPrimaryGM);
  
  // Test 2: Send Test Messages
  if (ws.isConnected()) {
    console.log("\n2. Sending test messages...");
    
    // Test ping
    console.log("   → Sending ping");
    ws.send({ type: "ping" });
    
    // Test getting rolls
    setTimeout(() => {
      console.log("   → Requesting recent rolls");
      ws.send({ 
        type: "get-rolls", 
        requestId: "test-" + Date.now(),
        limit: 5
      });
    }, 500);
    
    // Test getting an actor (if one exists)
    setTimeout(() => {
      const actor = game.actors.contents[0];
      if (actor) {
        console.log(`   → Requesting actor data for: ${actor.name}`);
        ws.send({
          type: "get-entity",
          requestId: "test-actor-" + Date.now(),
          uuid: actor.uuid
        });
      }
    }, 1000);
  } else {
    console.log("\n❌ WebSocket not connected. Attempting connection...");
    ws.connect();
    console.log("Wait a few seconds and run this test again.");
  }
  
  // Test 3: List available message handlers
  console.log("\n3. Available message handlers:");
  if (ws.messageHandlers && ws.messageHandlers.size > 0) {
    ws.messageHandlers.forEach((handler, type) => {
      console.log(`   - ${type}`);
    });
  } else {
    console.log("   No handlers registered");
  }
  
  // Test 4: Create a test roll
  console.log("\n4. Creating a test roll...");
  const roll = new Roll("1d20 + 5");
  roll.evaluate({ async: false });
  roll.toMessage({
    flavor: "REST API Test Roll",
    speaker: ChatMessage.getSpeaker()
  });
  console.log("   Roll created. Check if it appears in the API.");
  
  // Monitor incoming messages for 10 seconds
  console.log("\n5. Monitoring WebSocket messages for 10 seconds...");
  console.log("   (Any incoming messages will be logged below)");
  
  // Override the onMessage temporarily to log
  const originalOnMessage = ws.onMessage;
  let messageCount = 0;
  
  ws.onMessage = function(event) {
    messageCount++;
    console.log(`\n📨 Message #${messageCount}:`, JSON.parse(event.data));
    // Call original handler
    originalOnMessage.call(this, event);
  };
  
  // Restore after 10 seconds
  setTimeout(() => {
    ws.onMessage = originalOnMessage;
    console.log(`\n✓ Monitoring complete. Received ${messageCount} messages.`);
  }, 10000);
  
})();
// Foundry REST API Module Test Script
// Run this in your browser console (F12) while in Foundry

console.log("=== Foundry REST API Module Test ===");

// 1. Check if module is active
const moduleId = "foundry-rest-api";
const module = game.modules.get(moduleId);
console.log("✓ Module loaded:", module?.active ? "YES" : "NO");
console.log("  Version:", module?.version);

// 2. Check settings
console.log("\n=== Settings ===");
try {
  console.log("✓ WebSocket URL:", game.settings.get(moduleId, "wsRelayUrl"));
  console.log("✓ API Key:", game.settings.get(moduleId, "apiKey") ? "***SET***" : "NOT SET");
  console.log("✓ Log Level:", game.settings.get(moduleId, "logLevel"));
  console.log("✓ Ping Interval:", game.settings.get(moduleId, "pingInterval"));
} catch (e) {
  console.error("✗ Error reading settings:", e);
}

// 3. Check if WebSocket Manager exists
console.log("\n=== WebSocket Manager ===");
const hasWebSocketManager = window.game?.modules?.get(moduleId)?.api?.websocket !== undefined;
console.log("✓ WebSocket Manager available:", hasWebSocketManager ? "YES" : "NO");

if (hasWebSocketManager) {
  const ws = window.game.modules.get(moduleId).api.websocket;
  console.log("✓ WebSocket connected:", ws?.isConnected() ? "YES" : "NO");
  console.log("✓ WebSocket URL:", ws?.url);
  console.log("✓ Client ID:", ws?.clientId);
}

// 4. Check API endpoints
console.log("\n=== API Endpoints ===");
const api = window.game?.modules?.get(moduleId)?.api;
if (api) {
  console.log("✓ Available methods:");
  Object.keys(api).forEach(method => {
    console.log(`  - ${method}`);
  });
}

// 5. Test WebSocket connection
console.log("\n=== Testing WebSocket Connection ===");
if (api?.websocket && !api.websocket.isConnected()) {
  console.log("Attempting to connect...");
  api.websocket.connect();
  
  // Check connection after 2 seconds
  setTimeout(() => {
    console.log("Connection status:", api.websocket.isConnected() ? "CONNECTED" : "NOT CONNECTED");
  }, 2000);
} else if (api?.websocket?.isConnected()) {
  console.log("✓ Already connected!");
}

// 6. Display help
console.log("\n=== Manual Test Commands ===");
console.log("To test the API manually, try these commands:");
console.log("");
console.log("// Get the API");
console.log("const api = game.modules.get('foundry-rest-api').api;");
console.log("");
console.log("// Check WebSocket status");
console.log("api.websocket.isConnected();");
console.log("");
console.log("// Send a test ping");
console.log("api.websocket.send({ type: 'ping' });");
console.log("");
console.log("// Watch for messages in the console");
console.log("// The module has debug logging enabled by default");

console.log("\n=== Test Complete ===");
console.log("Check the console for any errors above.");
console.log("If WebSocket is not connecting, check:");
console.log("1. Your API key is set correctly");
console.log("2. You are logged in as a GM");
console.log("3. No firewall is blocking WebSocket connections");
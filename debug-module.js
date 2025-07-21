// Run this in Foundry console (F12) to debug the module

console.log("=== Simple API Debug ===");
console.log("Module loaded:", game.modules.get("simple-api"));
console.log("Module active:", game.modules.get("simple-api")?.active);
console.log("Current user:", game.user.name, "isGM:", game.user.isGM);

// Test creating a chat message
ChatMessage.create({
  content: "API_REQUEST:" + JSON.stringify({ type: "ping", requestId: "debug-1" }),
  style: CONST.CHAT_MESSAGE_STYLES.OTHER
}).then(msg => {
  console.log("Created test message:", msg.id);
});

// Check if testSimpleAPI exists
console.log("testSimpleAPI function exists:", typeof window.testSimpleAPI);

// List all hooks
console.log("Registered hooks:", Object.keys(Hooks._hooks));
console.log(`
🔍 FOUNDRY MODULE DEBUG COMMANDS

Copy and run these in Foundry console (F12):

1️⃣ Basic checks:
`);
console.log(`
// Are you GM?
console.log("GM Status:", game.user.isGM);

// Is module installed?
console.log("Module:", game.modules.get('simple-api'));

// Is it active?
console.log("Active:", game.modules.get('simple-api')?.active);
`);

console.log(`
2️⃣ Check what script is actually loaded:
`);
console.log(`
// Get module data
const mod = game.modules.get('simple-api');
console.log("Module scripts:", mod?.esmodules);
console.log("Module path:", mod?.path);
`);

console.log(`
3️⃣ Check if ANY Simple API code loaded:
`);
console.log(`
// Look for any Simple API in console
console.log("Test function exists:", typeof window.testSimpleAPI);

// Check for module in window
console.log("Window keys with 'api':", Object.keys(window).filter(k => k.toLowerCase().includes('api')));
`);

console.log(`
4️⃣ Check ALL hooks to see what's registered:
`);
console.log(`
// See all registered hooks
console.log("All hooks:", Object.keys(Hooks._hooks));

// Check ready hooks specifically
console.log("Ready hooks:", Hooks._hooks.ready);
`);

console.log(`
5️⃣ Try to manually run the module setup:
`);
console.log(`
// First, let's see if we can find the module's code
if (game.modules.get('simple-api')?.active) {
  console.log("Module is active, checking for initialization...");
  
  // Look in the global scope for any Simple API functions
  if (typeof setupApiHandlers !== 'undefined') {
    console.log("Found setupApiHandlers!");
    setupApiHandlers();
  } else {
    console.log("setupApiHandlers not found in global scope");
  }
}
`);

console.log(`
6️⃣ Force reload the module:
`);
console.log(`
// This will reload all modules
// game.modules.get('simple-api')?.reload();
// Then refresh the page (F5)
`);

console.log(`
7️⃣ Create a test message manually:
`);
console.log(`
// Try creating a chat message the old-fashioned way
ChatMessage.create({
  content: "TEST: If you see this, chat is working",
  type: 5 // OTHER type
});
`);
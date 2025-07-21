// Test commands to run in Foundry's F12 console

// Test 1: Check if module is loaded
console.log("Module loaded:", game.modules.get('simple-api')?.active);

// Test 2: Check settings
console.log("Auth enabled:", game.settings.get('simple-api', 'authEnabled'));
console.log("Username:", game.settings.get('simple-api', 'username'));
console.log("Password:", game.settings.get('simple-api', 'password'));

// Test 3: Create a test chat message that simulates an API request
ChatMessage.create({
  content: 'API_REQUEST: {"type":"ping","requestId":"console-test","auth":{"username":"API_USER","password":"API"}}',
  type: CONST.CHAT_MESSAGE_TYPES.OOC
});

// Test 4: Check if test function exists
console.log("Test function exists:", typeof window.testSimpleAPI);

// Test 5: Run the test function if it exists
if (window.testSimpleAPI) {
  window.testSimpleAPI();
}
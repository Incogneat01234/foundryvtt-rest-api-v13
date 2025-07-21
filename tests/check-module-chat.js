console.log(`
🔍 Check Simple API Chat Implementation in Foundry Console

Open Foundry (F12 console) and run these tests:

1️⃣ Check if module is active:
`);
console.log(`game.modules.get('simple-api')?.active`);

console.log(`
2️⃣ Test the chat-based API directly:
`);
console.log(`
// Create a test API request via chat
ChatMessage.create({
  content: "API_REQUEST:{\\"type\\":\\"ping\\",\\"requestId\\":\\"console-test\\"}",
  type: CONST.CHAT_MESSAGE_TYPES.OTHER
});
`);

console.log(`
3️⃣ Check if testSimpleAPI function exists:
`);
console.log(`window.testSimpleAPI`);

console.log(`
4️⃣ If it exists, run it:
`);
console.log(`window.testSimpleAPI()`);

console.log(`
5️⃣ Look for hooks:
`);
console.log(`
// Check if the module registered its chat hook
Hooks._hooks.createChatMessage
`);

console.log(`
6️⃣ Check recent chat messages:
`);
console.log(`
// Look for API_REQUEST or API_RESPONSE messages
game.messages.contents.filter(m => 
  m.content.includes('API_REQUEST') || 
  m.content.includes('API_RESPONSE')
).map(m => m.content)
`);

console.log(`
EXPECTED BEHAVIOR:
- You should see the module create chat messages starting with "API_REQUEST:"
- The module should immediately delete these and create "API_RESPONSE:" messages
- Check the chat log - you might see whispered messages
`);
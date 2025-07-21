const WebSocket = require('ws');

console.log('Testing connection to relay server...\n');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('✅ Connected to relay server');
  
  // Send a simple ping
  const request = {
    type: 'ping',
    requestId: 'connection-test-1'
  };
  
  console.log('📤 Sending:', request);
  ws.send(JSON.stringify(request));
});

ws.on('message', (data) => {
  console.log('📥 Received:', JSON.parse(data));
});

ws.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\nMake sure the relay server is running:');
  console.log('  node relay/simple-api-relay.js');
});

ws.on('close', () => {
  console.log('Connection closed');
});

// Exit after 5 seconds
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 5000);
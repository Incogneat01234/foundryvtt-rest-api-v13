const WebSocket = require('ws');

console.log('🧪 Testing Simple API...\n');

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  console.log('✅ Connected to relay server\n');
  
  // Test 1: Ping
  console.log('Test 1: Ping');
  ws.send(JSON.stringify({
    type: 'ping',
    requestId: 'test-1'
  }));
  
  // Test 2: Get system info
  setTimeout(() => {
    console.log('\nTest 2: Get System Info');
    ws.send(JSON.stringify({
      type: 'get-system-info',
      requestId: 'test-2'
    }));
  }, 1000);
  
  // Test 3: Get all actors
  setTimeout(() => {
    console.log('\nTest 3: Get All Actors');
    ws.send(JSON.stringify({
      type: 'get-actors',
      requestId: 'test-3'
    }));
  }, 2000);
  
  // Test 4: Create an actor
  setTimeout(() => {
    console.log('\nTest 4: Create Actor');
    ws.send(JSON.stringify({
      type: 'create-actor',
      requestId: 'test-4',
      name: 'Test Hero from API',
      actorType: 'character',
      system: {
        abilities: {
          str: { value: 15 },
          dex: { value: 14 },
          con: { value: 13 },
          int: { value: 12 },
          wis: { value: 10 },
          cha: { value: 8 }
        },
        attributes: {
          hp: { value: 30, max: 30 },
          ac: { value: 15 }
        }
      }
    }));
  }, 3000);
  
  // Test 5: Roll dice
  setTimeout(() => {
    console.log('\nTest 5: Roll Dice');
    ws.send(JSON.stringify({
      type: 'roll-dice',
      requestId: 'test-5',
      formula: '1d20 + 5',
      showInChat: true,
      flavor: 'Test roll from API'
    }));
  }, 4000);
  
  // Test 6: Send chat message
  setTimeout(() => {
    console.log('\nTest 6: Send Chat Message');
    ws.send(JSON.stringify({
      type: 'send-chat',
      requestId: 'test-6',
      message: 'Hello from the Simple API!'
    }));
  }, 5000);
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('📥 Response:', JSON.stringify(msg, null, 2));
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

// Close after 10 seconds
setTimeout(() => {
  console.log('\n✅ Test complete');
  ws.close();
  process.exit(0);
}, 10000);
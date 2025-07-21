#!/usr/bin/env node

/**
 * Test the relay server to see what's happening with messages
 */

const WebSocket = require('ws');

console.log('🔍 Testing Relay Message Flow\n');

const ws = new WebSocket('ws://localhost:8080');
let testNum = 1;

ws.on('open', () => {
  console.log('✅ Connected to relay\n');
  
  // Test 1: Simple ping
  setTimeout(() => {
    const msg = {
      type: 'ping',
      requestId: `relay-test-${testNum++}`
    };
    console.log(`📤 SENDING TEST ${testNum-1}:`);
    console.log(JSON.stringify(msg, null, 2));
    ws.send(JSON.stringify(msg));
  }, 1000);
  
  // Test 2: Get actors
  setTimeout(() => {
    const msg = {
      type: 'get-actors',
      requestId: `relay-test-${testNum++}`
    };
    console.log(`\n📤 SENDING TEST ${testNum-1}:`);
    console.log(JSON.stringify(msg, null, 2));
    ws.send(JSON.stringify(msg));
  }, 3000);
  
  // Test 3: System info
  setTimeout(() => {
    const msg = {
      type: 'get-system-info',
      requestId: `relay-test-${testNum++}`
    };
    console.log(`\n📤 SENDING TEST ${testNum-1}:`);
    console.log(JSON.stringify(msg, null, 2));
    ws.send(JSON.stringify(msg));
  }, 5000);
});

ws.on('message', (data) => {
  console.log(`\n📥 RECEIVED:`);
  try {
    const msg = JSON.parse(data.toString());
    console.log(JSON.stringify(msg, null, 2));
    
    // Analyze response
    if (msg.type === 'error') {
      console.log('❌ ERROR: ' + msg.error);
    } else if (msg.type === 'welcome') {
      console.log('ℹ️  Relay status: ' + (msg.connected ? 'Connected to Foundry' : 'Not connected'));
    } else if (msg.type?.includes('-response')) {
      console.log('✅ Got proper response type: ' + msg.type);
    }
  } catch (e) {
    console.log('Raw:', data.toString());
  }
});

ws.on('error', (err) => {
  console.log('❌ Error:', err.message);
});

// Close after 10 seconds
setTimeout(() => {
  console.log('\n👋 Closing connection...');
  ws.close();
}, 10000);
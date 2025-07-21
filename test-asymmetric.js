#!/usr/bin/env node

/**
 * Test Asymmetric API Communication
 */

const WebSocket = require('ws');

const RELAY_URL = process.env.RELAY_URL || 'ws://localhost:8080';

console.log('🔌 Testing Asymmetric API Communication');
console.log('📍 Relay URL:', RELAY_URL);
console.log('');

const ws = new WebSocket(RELAY_URL);

ws.on('open', () => {
  console.log('✅ Connected to asymmetric relay');
  
  // Test 1: Ping
  console.log('\n📤 Test 1: Ping...');
  ws.send(JSON.stringify({
    type: 'ping',
    requestId: 'test-1'
  }));
  
  // Test 2: System info
  setTimeout(() => {
    console.log('\n📤 Test 2: Getting system info...');
    ws.send(JSON.stringify({
      type: 'system-info',
      requestId: 'test-2'
    }));
  }, 1000);
  
  // Test 3: Get actors
  setTimeout(() => {
    console.log('\n📤 Test 3: Getting actors...');
    ws.send(JSON.stringify({
      type: 'get-actors',
      requestId: 'test-3'
    }));
  }, 2000);
  
  // Test 4: Execute macro
  setTimeout(() => {
    console.log('\n📤 Test 4: Executing test macro...');
    ws.send(JSON.stringify({
      type: 'execute-macro',
      data: {
        name: 'testSimpleAPI'
      },
      requestId: 'test-4'
    }));
  }, 3000);
  
  // Close after tests
  setTimeout(() => {
    console.log('\n✅ All tests sent! Waiting for responses...');
  }, 4000);
  
  setTimeout(() => {
    console.log('\n👋 Closing connection...');
    ws.close();
  }, 10000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('\n📥 Response received!');
    console.log('   Type:', message.type);
    console.log('   Request ID:', message.requestId);
    
    if (message.type === 'api-ready') {
      console.log('   ✅ API is ready!');
      console.log('   World:', message.world);
      console.log('   System:', message.system);
    } else if (message.type === 'error') {
      console.log('   ❌ Error:', message.error);
    } else if (message.data) {
      console.log('   📋 Data:', JSON.stringify(message.data, null, 2).substring(0, 200) + '...');
    }
  } catch (e) {
    console.log('📥 Raw message:', data.toString());
  }
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

ws.on('close', () => {
  console.log('\n👋 Connection closed');
  console.log('\n📊 Test Summary:');
  console.log('   - If you saw responses, the asymmetric pattern is working!');
  console.log('   - Check Foundry console for any error messages');
  console.log('   - Whispered messages should auto-delete after 100ms');
  process.exit(0);
});
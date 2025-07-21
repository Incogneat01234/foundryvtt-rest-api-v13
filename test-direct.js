#!/usr/bin/env node

/**
 * Direct WebSocket Test for Foundry
 * Connects directly to Foundry to test socket communication
 */

const WebSocket = require('ws');

const FOUNDRY_URL = 'http://localhost:30000';
const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;

console.log('🔌 Direct connection test to Foundry...');
console.log(`📍 URL: ${wsUrl}\n`);

const ws = new WebSocket(wsUrl);
let isConnected = false;

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  console.log('🤝 Sending Socket.IO handshake...');
  ws.send('40');
});

ws.on('message', (data) => {
  const message = data.toString();
  console.log('📥 Received:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
  
  if (message.startsWith('0')) {
    console.log('✅ Handshake response received');
  } else if (message.startsWith('40')) {
    console.log('✅ Socket.IO connected successfully');
    isConnected = true;
    
    // Send test messages
    console.log('\n📤 Sending test messages...\n');
    
    // Test 1: Direct module message
    const test1 = {
      type: "ping",
      requestId: "direct-test-1"
    };
    const msg1 = `42["module.simple-api",${JSON.stringify(test1)}]`;
    console.log('Test 1 - Direct module message:', msg1);
    ws.send(msg1);
    
    // Test 2: Emit to see if module sends anything
    setTimeout(() => {
      const msg2 = '42["module.simple-api",{"type":"get-actors","requestId":"direct-test-2"}]';
      console.log('\nTest 2 - Get actors:', msg2);
      ws.send(msg2);
    }, 1000);
    
    // Keep connection alive
    setInterval(() => {
      if (isConnected) {
        ws.send('2'); // Ping
      }
    }, 25000);
    
  } else if (message.startsWith('42')) {
    try {
      const jsonStart = message.indexOf('[');
      if (jsonStart >= 0) {
        const data = JSON.parse(message.substring(jsonStart));
        console.log('\n📥 Socket.IO message received:');
        console.log('Event:', data[0]);
        console.log('Data:', JSON.stringify(data[1], null, 2));
      }
    } catch (e) {
      // Ignore parse errors
    }
  } else if (message === '3') {
    ws.send('2'); // Pong
  }
});

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', () => {
  console.log('❌ WebSocket closed');
  isConnected = false;
});

// Exit after 30 seconds
setTimeout(() => {
  console.log('\n⏱️ Test complete');
  process.exit(0);
}, 30000);
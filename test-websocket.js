#!/usr/bin/env node

/**
 * WebSocket Test for Foundry Connection
 * Tests the raw Socket.IO connection to Foundry
 */

const WebSocket = require('ws');

const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;

console.log('🔌 Testing WebSocket connection to Foundry...');
console.log(`📍 URL: ${wsUrl}`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  console.log('🤝 Sending Socket.IO handshake...');
  ws.send('40');
});

ws.on('message', (data) => {
  const message = data.toString();
  console.log('📥 Received:', message.substring(0, 100));
  
  if (message.startsWith('0')) {
    console.log('✅ Handshake response received');
    const sid = JSON.parse(message.substring(1)).sid;
    console.log('   Session ID:', sid);
  } else if (message.startsWith('40')) {
    console.log('✅ Socket.IO connected successfully');
    
    // Try different message formats
    console.log('\n📤 Testing message formats...\n');
    
    // Test 1: Direct module message
    console.log('Test 1: Direct module.simple-api message');
    ws.send('42["module.simple-api",{"type":"ping","requestId":"test-1"}]');
    
    setTimeout(() => {
      // Test 2: Userspace socket message
      console.log('\nTest 2: Userspace socket message');
      ws.send('42["userspace-socket-message",{"action":"module.simple-api","data":{"type":"ping","requestId":"test-2"}}]');
    }, 1000);
    
    setTimeout(() => {
      // Test 3: System message
      console.log('\nTest 3: System message');
      ws.send('42["system.message",{"action":"module.simple-api","data":{"type":"ping","requestId":"test-3"}}]');
    }, 2000);
    
    setTimeout(() => {
      console.log('\n📊 Test complete. Check Foundry console for any activity.');
      console.log('If no activity in Foundry console, the module may not be intercepting messages correctly.');
      process.exit(0);
    }, 5000);
    
  } else if (message.startsWith('42')) {
    try {
      const jsonStart = message.indexOf('[');
      if (jsonStart >= 0) {
        const data = JSON.parse(message.substring(jsonStart));
        console.log('📥 Socket.IO message:', JSON.stringify(data, null, 2));
      }
    } catch (e) {
      // Ignore
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
});
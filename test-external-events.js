#!/usr/bin/env node

/**
 * Test different Socket.IO events to find which ones work with external connections
 */

const WebSocket = require('ws');

const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const API_USERNAME = process.env.API_USERNAME || 'API_USER';
const API_PASSWORD = process.env.API_PASSWORD || 'API';

const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;

console.log('🔌 Testing external Socket.IO events');
console.log('📍 Foundry URL:', wsUrl);
console.log('');

const ws = new WebSocket(wsUrl);
let connected = false;
let testCount = 0;

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  ws.send('40'); // Socket.IO handshake
});

ws.on('message', (data) => {
  const message = data.toString();
  
  if (message.startsWith('0')) {
    // Handshake response
    const sid = JSON.parse(message.substring(1)).sid;
    console.log('🤝 Handshake complete, SID:', sid);
  } else if (message.startsWith('40')) {
    // Connected
    connected = true;
    console.log('✅ Socket.IO connected');
    console.log('\n📡 Starting tests...\n');
    
    runTests();
  } else if (message.startsWith('42')) {
    // Data message
    try {
      const jsonStart = message.indexOf('[');
      if (jsonStart >= 0) {
        const data = JSON.parse(message.substring(jsonStart));
        const [eventName, eventData] = data;
        
        console.log(`📥 Received event: ${eventName}`);
        if (eventData) {
          console.log('   Data:', JSON.stringify(eventData).substring(0, 100));
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  } else if (message === '3') {
    ws.send('2'); // Pong
  }
});

function runTests() {
  const request = {
    type: 'ping',
    auth: {
      username: API_USERNAME,
      password: API_PASSWORD
    }
  };
  
  // Test 1: Direct module event
  setTimeout(() => {
    testCount++;
    request.requestId = `test-${testCount}`;
    console.log(`\n📤 Test ${testCount}: Direct module event`);
    const msg = `42["module.simple-api",${JSON.stringify(request)}]`;
    console.log('   Sending:', msg);
    ws.send(msg);
  }, 1000);
  
  // Test 2: Template event
  setTimeout(() => {
    testCount++;
    request.requestId = `test-${testCount}`;
    console.log(`\n📤 Test ${testCount}: Template event`);
    const msg = `42["template",["simple-api-request",${JSON.stringify(request)}]]`;
    console.log('   Sending:', msg);
    ws.send(msg);
  }, 2000);
  
  // Test 3: Userspace message
  setTimeout(() => {
    testCount++;
    request.requestId = `test-${testCount}`;
    console.log(`\n📤 Test ${testCount}: Userspace message`);
    const userspaceMsg = {
      action: "module.simple-api",
      data: request
    };
    const msg = `42["userspace-socket-message",${JSON.stringify(userspaceMsg)}]`;
    console.log('   Sending:', msg);
    ws.send(msg);
  }, 3000);
  
  // Test 4: Emit event
  setTimeout(() => {
    testCount++;
    request.requestId = `test-${testCount}`;
    console.log(`\n📤 Test ${testCount}: Emit event`);
    const msg = `42["emit",["module.simple-api",${JSON.stringify(request)}]]`;
    console.log('   Sending:', msg);
    ws.send(msg);
  }, 4000);
  
  // Test 5: Message event
  setTimeout(() => {
    testCount++;
    request.requestId = `test-${testCount}`;
    console.log(`\n📤 Test ${testCount}: Message event`);
    const msg = `42["message",${JSON.stringify(request)}]`;
    console.log('   Sending:', msg);
    ws.send(msg);
  }, 5000);
  
  // Test 6: Custom event
  setTimeout(() => {
    testCount++;
    request.requestId = `test-${testCount}`;
    console.log(`\n📤 Test ${testCount}: Custom simple-api event`);
    const msg = `42["simple-api",${JSON.stringify(request)}]`;
    console.log('   Sending:', msg);
    ws.send(msg);
  }, 6000);
  
  // Close after tests
  setTimeout(() => {
    console.log('\n\n📊 Test Summary:');
    console.log('If any test worked, you should have seen response events above.');
    console.log('Look for "module.simple-api" or similar response events.');
    console.log('\n👋 Closing connection...');
    ws.close();
  }, 8000);
}

ws.on('error', (err) => {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', () => {
  console.log('👋 Connection closed');
  process.exit(0);
});
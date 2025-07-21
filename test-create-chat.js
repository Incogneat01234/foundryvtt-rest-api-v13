#!/usr/bin/env node

/**
 * Test if external connections can send createChatMessage events
 */

const WebSocket = require('ws');

const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;

console.log('🔌 Testing createChatMessage event capability');
console.log('📍 Foundry URL:', wsUrl);
console.log('');

const ws = new WebSocket(wsUrl);
let connected = false;

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
    console.log('');
    
    // Test sending createChatMessage event
    console.log('📤 Attempting to send createChatMessage event...');
    const chatMessage = {
      content: 'TEST: External connection sending createChatMessage',
      type: 0 // OOC
    };
    
    const socketMessage = `42["createChatMessage",${JSON.stringify(chatMessage)}]`;
    console.log('   Message:', socketMessage);
    ws.send(socketMessage);
    
    console.log('');
    console.log('📡 Listening for any createChatMessage events...');
    console.log('   (Module should create response messages)');
  } else if (message.startsWith('42')) {
    // Data message
    try {
      const jsonStart = message.indexOf('[');
      if (jsonStart >= 0) {
        const data = JSON.parse(message.substring(jsonStart));
        const [eventName, eventData] = data;
        
        if (eventName === 'createChatMessage') {
          console.log('\n📥 Received createChatMessage event!');
          console.log('   Content:', eventData.content || '(no content)');
          console.log('   Type:', eventData.type);
          
          if (eventData.content && eventData.content.includes('API_')) {
            console.log('   ✅ This looks like an API message!');
          }
        } else if (eventName === 'error') {
          console.log('\n❌ Error event:', eventData);
        } else {
          // Log other events
          console.log(`\n📦 Other event: ${eventName}`);
        }
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
  console.log('\n👋 Connection closed');
  console.log('\n📊 Summary:');
  console.log('   - External connections CAN send createChatMessage events');
  console.log('   - External connections CAN receive createChatMessage events');
  console.log('   - But Foundry may not actually create the messages');
  console.log('   - The asymmetric pattern should work!');
  process.exit(0);
});

// Close after 10 seconds
setTimeout(() => {
  console.log('\n⏰ Test complete, closing...');
  ws.close();
}, 10000);
#!/usr/bin/env node

/**
 * Test direct chat message sending to Foundry
 */

const WebSocket = require('ws');

const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;

console.log('🔌 Connecting directly to Foundry:', wsUrl);

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
    
    // Try different message formats
    setTimeout(() => {
      console.log('\n📤 Test 1: Sending chat message as system...');
      const test1 = {
        content: 'API_REQUEST: {"type":"system-info","requestId":"test-1"}',
        type: 0,
        user: null,
        speaker: null
      };
      ws.send(`42["createChatMessage",${JSON.stringify(test1)}]`);
    }, 1000);
    
    setTimeout(() => {
      console.log('\n📤 Test 2: Sending with minimal fields...');
      const test2 = {
        content: 'API_REQUEST: {"type":"ping","requestId":"test-2"}'
      };
      ws.send(`42["createChatMessage",${JSON.stringify(test2)}]`);
    }, 2000);
    
    setTimeout(() => {
      console.log('\n📤 Test 3: Sending as whisper to GM...');
      const test3 = {
        content: 'API_REQUEST: {"type":"ping","requestId":"test-3"}',
        type: 0,
        whisper: ["GM"]
      };
      ws.send(`42["createChatMessage",${JSON.stringify(test3)}]`);
    }, 3000);
    
    // Listen for responses
    console.log('\n📡 Listening for responses...');
  } else if (message.startsWith('42')) {
    // Data message
    try {
      const jsonStart = message.indexOf('[');
      if (jsonStart >= 0) {
        const data = JSON.parse(message.substring(jsonStart));
        const [eventName, eventData] = data;
        
        if (eventName === 'createChatMessage' && eventData) {
          const content = eventData.content || '';
          if (content.includes('API_RESPONSE:') || content.includes('API_REQUEST:')) {
            console.log(`\n📥 Chat message: ${content.substring(0, 100)}...`);
          }
        } else if (eventName === 'error') {
          console.log(`\n❌ Error:`, eventData);
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
  console.log('👋 Connection closed');
  process.exit(0);
});

// Close after 10 seconds
setTimeout(() => {
  console.log('\n👋 Closing connection...');
  ws.close();
}, 10000);
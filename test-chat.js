#!/usr/bin/env node

/**
 * Test using chat messages as a communication channel
 * This should definitely work as chat messages are always relayed
 */

const WebSocket = require('ws');

const FOUNDRY_URL = 'http://localhost:30000';
const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;

console.log('🔌 Testing chat-based communication...');
console.log(`📍 URL: ${wsUrl}\n`);

const ws = new WebSocket(wsUrl);
let isConnected = false;

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  ws.send('40');
});

ws.on('message', (data) => {
  const message = data.toString();
  
  if (message.startsWith('0')) {
    console.log('✅ Handshake response received');
  } else if (message.startsWith('40')) {
    console.log('✅ Socket.IO connected successfully');
    isConnected = true;
    
    // Send a chat message
    const chatMessage = {
      content: "API Test: Please respond with 'pong' if you see this",
      type: 1 // OOC message
    };
    
    const msg = `42["modifyDocument",{"type":"ChatMessage","action":"create","data":[${JSON.stringify(chatMessage)}],"options":{},"pack":null}]`;
    console.log('\n📤 Sending chat message...');
    ws.send(msg);
    
  } else if (message.startsWith('42')) {
    try {
      const jsonStart = message.indexOf('[');
      if (jsonStart >= 0) {
        const data = JSON.parse(message.substring(jsonStart));
        const [eventName, eventData] = data;
        
        if (eventName === "modifyDocument" && eventData.type === "ChatMessage") {
          console.log('\n💬 Chat message event:', eventData.action);
          if (eventData.result && eventData.result[0]) {
            console.log('Message:', eventData.result[0].content);
          }
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
  console.log('❌ WebSocket closed');
});

// Exit after 10 seconds
setTimeout(() => {
  console.log('\n⏱️ Test complete');
  process.exit(0);
}, 10000);
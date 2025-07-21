#!/usr/bin/env node

/**
 * Monitor what the relay is actually seeing from Foundry
 */

const WebSocket = require('ws');

console.log('🔍 Monitoring Foundry Socket.IO Messages\n');

const wsUrl = 'ws://localhost:30000/socket.io/?EIO=4&transport=websocket';
const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected to Foundry');
  ws.send('40'); // Socket.IO handshake
});

ws.on('message', (data) => {
  const message = data.toString();
  
  if (message.startsWith('0')) {
    console.log('🤝 Handshake complete');
  } else if (message.startsWith('40')) {
    console.log('✅ Socket.IO connected\n');
    console.log('Monitoring for chat messages...\n');
  } else if (message.startsWith('42')) {
    // Parse Socket.IO data
    try {
      const jsonStart = message.indexOf('[');
      if (jsonStart >= 0) {
        const data = JSON.parse(message.substring(jsonStart));
        const [eventName, eventData] = data;
        
        // Filter for interesting events
        if (eventName === 'modifyDocument' && eventData?.type === 'ChatMessage') {
          console.log('📝 CHAT MESSAGE EVENT:');
          console.log('   Operation:', eventData.operation);
          if (eventData.result) {
            console.log('   Result:', JSON.stringify(eventData.result, null, 2));
          }
          if (eventData.data) {
            console.log('   Data:', JSON.stringify(eventData.data, null, 2));
          }
          console.log('');
        } else if (eventName === 'createDocument' && eventData?.type === 'ChatMessage') {
          console.log('📝 CREATE CHAT MESSAGE:');
          console.log(JSON.stringify(eventData, null, 2));
          console.log('');
        } else if (eventName.includes('chat') || eventName.includes('Chat')) {
          console.log(`📦 ${eventName} event:`, eventData);
        }
      }
    } catch (e) {
      // Only show non-ping/pong messages
      if (message !== '3' && message !== '2') {
        console.log('Raw message:', message.substring(0, 100));
      }
    }
  }
});

// After connection, create a test message
setTimeout(() => {
  console.log('📤 Creating test chat message in Foundry...\n');
  console.log('Go to Foundry console and run:');
  console.log('ChatMessage.create({ content: "TEST MESSAGE", type: 5 });\n');
}, 2000);

ws.on('error', (err) => {
  console.log('❌ Error:', err.message);
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\n👋 Closing monitor...');
  ws.close();
  process.exit();
});
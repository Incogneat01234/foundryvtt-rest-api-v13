#!/usr/bin/env node

/**
 * Message flow monitor for debugging Foundry REST API v13
 * 
 * This script shows exactly what messages are being sent/received
 */

const WebSocket = require('ws');

const RELAY_URL = process.env.RELAY_URL || 'ws://localhost:8080';

console.log('📡 Message Flow Monitor\n');
console.log(`Connecting to relay at: ${RELAY_URL}\n`);

const ws = new WebSocket(RELAY_URL);

// Track messages
let messageCount = 0;

ws.on('open', () => {
  console.log('✅ Connected to relay server\n');
  
  // Send a test ping after 1 second
  setTimeout(() => {
    const testMsg = {
      type: 'ping',
      requestId: `monitor-${Date.now()}`
    };
    
    console.log(`📤 SENDING [${++messageCount}]:`);
    console.log(JSON.stringify(testMsg, null, 2));
    console.log('');
    
    ws.send(JSON.stringify(testMsg));
  }, 1000);
  
  // Send another test after 3 seconds
  setTimeout(() => {
    const testMsg = {
      type: 'get-actors',
      requestId: `monitor-actors-${Date.now()}`
    };
    
    console.log(`📤 SENDING [${++messageCount}]:`);
    console.log(JSON.stringify(testMsg, null, 2));
    console.log('');
    
    ws.send(JSON.stringify(testMsg));
  }, 3000);
});

ws.on('message', (data) => {
  console.log(`📥 RECEIVED [${++messageCount}]:`);
  try {
    const msg = JSON.parse(data.toString());
    console.log(JSON.stringify(msg, null, 2));
    
    // Analyze the message
    if (msg.type === 'error') {
      console.log('⚠️  ERROR RESPONSE - Check authentication or module installation');
    } else if (msg.type === 'welcome') {
      console.log(`ℹ️  Relay connected to Foundry: ${msg.connected}`);
    } else if (msg.type === 'api-ready') {
      console.log('✅ Simple API module is ready!');
    }
  } catch (e) {
    console.log('RAW:', data.toString());
  }
  console.log('');
});

ws.on('error', (err) => {
  console.log('❌ WebSocket Error:', err.message);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
});

// Keep alive
process.on('SIGINT', () => {
  console.log('\n👋 Closing monitor...');
  ws.close();
  process.exit();
});

console.log('Press Ctrl+C to stop monitoring\n');
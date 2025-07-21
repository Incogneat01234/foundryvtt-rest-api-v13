#!/usr/bin/env node

/**
 * Verbose test of Asymmetric API Communication
 * Shows exactly what's happening at each step
 */

const WebSocket = require('ws');

const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;

console.log('🔬 ASYMMETRIC COMMUNICATION TEST - VERBOSE MODE');
console.log('==============================================');
console.log('');
console.log('📍 Connecting directly to Foundry:', wsUrl);
console.log('');

const ws = new WebSocket(wsUrl);
let messageCount = 0;

ws.on('open', () => {
  console.log('✅ WebSocket connected to Foundry');
  console.log('📤 Sending Socket.IO handshake...');
  ws.send('40');
});

ws.on('message', (data) => {
  const message = data.toString();
  messageCount++;
  
  if (message.startsWith('0')) {
    // Handshake response
    console.log('📥 Received handshake response');
    const sid = JSON.parse(message.substring(1)).sid;
    console.log('   Session ID:', sid);
  } else if (message.startsWith('40')) {
    // Connected
    console.log('✅ Socket.IO connection established');
    console.log('');
    console.log('🧪 STARTING ASYMMETRIC PATTERN TEST');
    console.log('===================================');
    console.log('');
    
    // Test the asymmetric pattern
    setTimeout(() => {
      console.log('📤 STEP 1: Sending createChatMessage event with API request');
      console.log('   Note: Foundry will NOT actually create this message');
      console.log('   But the module WILL receive the event!');
      
      const apiRequest = {
        content: 'API_REQUEST: {"type":"ping","requestId":"verbose-test","auth":{"username":"API_USER","password":"API"}}',
        type: 0,
        flags: { "simple-api": { isApiRequest: true } }
      };
      
      const socketMessage = `42["createChatMessage",${JSON.stringify(apiRequest)}]`;
      console.log('   Raw message:', socketMessage);
      ws.send(socketMessage);
      console.log('');
      console.log('⏳ STEP 2: Waiting for module to process request...');
      console.log('   Module should:');
      console.log('   - Receive the createChatMessage event');
      console.log('   - Process the API_REQUEST');
      console.log('   - Create a real whispered response message');
      console.log('   - Auto-delete the response after 100ms');
      console.log('');
    }, 1000);
    
  } else if (message.startsWith('42')) {
    // Data message
    try {
      const jsonStart = message.indexOf('[');
      if (jsonStart >= 0) {
        const data = JSON.parse(message.substring(jsonStart));
        const [eventName, eventData] = data;
        
        if (eventName === 'createChatMessage' && eventData) {
          const content = eventData.content || '';
          
          if (content.includes('API_RESPONSE:')) {
            console.log('🎉 STEP 3: Received API response via createChatMessage!');
            console.log('   This is a REAL message created by the module');
            console.log('   Message type:', eventData.type === 4 ? 'WHISPER' : 'OTHER');
            console.log('   Content:', content.substring(0, 100) + '...');
            
            // Parse the response
            const jsonStart = content.indexOf('{');
            if (jsonStart >= 0) {
              const response = JSON.parse(content.substring(jsonStart));
              console.log('   Parsed response:', JSON.stringify(response, null, 2));
            }
            
            console.log('');
            console.log('✅ ASYMMETRIC PATTERN CONFIRMED WORKING!');
            console.log('   - External CAN send createChatMessage events');
            console.log('   - Module CAN receive and process them');
            console.log('   - Module CAN create response messages');
            console.log('   - External CAN receive the responses');
            console.log('');
            
            setTimeout(() => {
              console.log('👋 Test complete, closing connection...');
              ws.close();
            }, 2000);
          } else if (content.includes('API_REQUEST:')) {
            console.log('📤 Confirmed: Our request was delivered');
            console.log('   (Even though Foundry didn\'t create the message)');
          }
        } else {
          // Log other events for debugging
          if (eventName !== 'userActivity' && eventName !== 'template') {
            console.log(`📦 Other event: ${eventName}`);
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
  console.log('');
  console.log('📊 CONNECTION SUMMARY');
  console.log('====================');
  console.log(`Total messages received: ${messageCount}`);
  console.log('Connection closed');
  process.exit(0);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log('');
  console.log('⏰ Test timeout - no response received');
  console.log('');
  console.log('🔍 TROUBLESHOOTING:');
  console.log('   1. Is the module using simple-api-asymmetric.js?');
  console.log('   2. Are you logged in as GM in Foundry?');
  console.log('   3. Check Foundry console (F12) for errors');
  console.log('   4. Make sure module is enabled');
  ws.close();
}, 15000);
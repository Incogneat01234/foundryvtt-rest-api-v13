#!/usr/bin/env node

/**
 * Test Chat API Relay
 * Tests the chat-based relay server
 */

const WebSocket = require('ws');

const RELAY_URL = process.env.RELAY_URL || 'ws://localhost:8080';

console.log('🔌 Connecting to Chat Relay at:', RELAY_URL);

const ws = new WebSocket(RELAY_URL);

ws.on('open', () => {
  console.log('✅ Connected to relay');
  
  // Test 1: System info
  console.log('\n📤 Test 1: Getting system info...');
  ws.send(JSON.stringify({
    type: 'system-info',
    requestId: 'test-1'
  }));
  
  // Test 2: Get actors
  setTimeout(() => {
    console.log('\n📤 Test 2: Getting actors...');
    ws.send(JSON.stringify({
      type: 'get-actors',
      requestId: 'test-2'
    }));
  }, 1000);
  
  // Test 3: Execute macro
  setTimeout(() => {
    console.log('\n📤 Test 3: Executing test macro...');
    ws.send(JSON.stringify({
      type: 'execute-macro',
      data: {
        name: 'testSimpleAPI'
      },
      requestId: 'test-3'
    }));
  }, 2000);
  
  // Close after tests
  setTimeout(() => {
    console.log('\n👋 Closing connection...');
    ws.close();
  }, 10000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('\n📥 Received:', message.type || 'unknown');
    console.log('📋 Data:', JSON.stringify(message, null, 2));
  } catch (e) {
    console.log('📥 Raw message:', data.toString());
  }
});

ws.on('error', (err) => {
  console.error('❌ Error:', err.message);
});

ws.on('close', () => {
  console.log('👋 Connection closed');
  process.exit(0);
});
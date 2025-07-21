#!/usr/bin/env node

const WebSocket = require('ws');

// Configuration
const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8080';
const CLIENT_ID = `test-client-${Date.now()}`;
const TOKEN = 'test-token';

console.log(`Connecting to ${SERVER_URL}...`);

// Create WebSocket connection
const ws = new WebSocket(`${SERVER_URL}?id=${CLIENT_ID}&token=${TOKEN}`);

// Connection opened
ws.on('open', () => {
  console.log('Connected to local server!');
  
  // Send initial ping
  console.log('Sending ping...');
  ws.send(JSON.stringify({ type: 'ping' }));
  
  // Test some API calls
  setTimeout(() => {
    console.log('Testing get-rolls...');
    ws.send(JSON.stringify({
      type: 'get-rolls',
      requestId: 'test-1',
      limit: 10
    }));
  }, 1000);
  
  setTimeout(() => {
    console.log('Testing get-structure...');
    ws.send(JSON.stringify({
      type: 'get-structure',
      requestId: 'test-2'
    }));
  }, 2000);
  
  // Send periodic pings
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000);
});

// Handle messages
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('Received:', message);
  } catch (error) {
    console.error('Failed to parse message:', error);
  }
});

// Connection closed
ws.on('close', (code, reason) => {
  console.log(`Connection closed. Code: ${code}, Reason: ${reason}`);
  process.exit(0);
});

// Handle errors
ws.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nClosing connection...');
  ws.close(1000, 'Client shutdown');
});
#!/usr/bin/env node

/**
 * Diagnostic tool for Foundry REST API v13 connection issues
 * 
 * This script tests each component in the chain:
 * 1. Foundry HTTP API
 * 2. Socket.IO connection
 * 3. Simple API module
 * 4. Relay server
 * 5. End-to-end test
 */

const http = require('http');
const WebSocket = require('ws');

// Configuration
const FOUNDRY_URL = process.env.FOUNDRY_URL || 'http://localhost:30000';
const RELAY_URL = process.env.RELAY_URL || 'ws://localhost:8080';
const API_USERNAME = process.env.API_USERNAME || 'API_USER';
const API_PASSWORD = process.env.API_PASSWORD || 'API';

console.log('🔍 Foundry REST API v13 Diagnostic Tool\n');
console.log('Configuration:');
console.log(`  Foundry URL: ${FOUNDRY_URL}`);
console.log(`  Relay URL: ${RELAY_URL}`);
console.log(`  API Username: ${API_USERNAME}\n`);

let testResults = {
  foundryHttp: false,
  foundryWorld: false,
  socketIoConnection: false,
  moduleInstalled: false,
  relayConnection: false,
  endToEnd: false
};

// Test 1: Check Foundry HTTP API
async function testFoundryHttp() {
  console.log('1️⃣ Testing Foundry HTTP connection...');
  
  return new Promise((resolve) => {
    http.get(`${FOUNDRY_URL}/api/status`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          console.log(`   ✅ Foundry running: v${status.version}`);
          
          if (status.world) {
            console.log(`   ✅ World loaded: ${status.world.title}`);
            testResults.foundryWorld = true;
          } else {
            console.log('   ❌ No world loaded!');
            console.log('      → Launch a world in Foundry first');
          }
          
          testResults.foundryHttp = true;
          resolve(true);
        } catch (e) {
          console.log('   ❌ Invalid response from Foundry');
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`   ❌ Cannot connect to Foundry: ${err.message}`);
      console.log('      → Make sure Foundry is running on port 30000');
      resolve(false);
    });
  });
}

// Test 2: Check Socket.IO connection
async function testSocketIO() {
  console.log('\n2️⃣ Testing Socket.IO connection...');
  
  return new Promise((resolve) => {
    const wsUrl = `${FOUNDRY_URL.replace(/^http/, 'ws')}/socket.io/?EIO=4&transport=websocket`;
    console.log(`   Connecting to: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    let timeout = setTimeout(() => {
      console.log('   ❌ Socket.IO connection timeout');
      ws.close();
      resolve(false);
    }, 5000);
    
    ws.on('open', () => {
      console.log('   ✅ WebSocket connected');
      ws.send('40'); // Socket.IO handshake
    });
    
    ws.on('message', (data) => {
      const message = data.toString();
      
      if (message.startsWith('0')) {
        // Handshake response
        console.log('   ✅ Socket.IO handshake successful');
        clearTimeout(timeout);
        
        // Test if module is responding
        console.log('   Testing Simple API module...');
        
        // Send a ping to the module
        const pingMessage = '42["module.simple-api",{"type":"ping","requestId":"diag-1"}]';
        ws.send(pingMessage);
        
        // Wait for response
        setTimeout(() => {
          if (!testResults.moduleInstalled) {
            console.log('   ⚠️  No response from Simple API module');
            console.log('      → Check if module is installed and enabled');
          }
          ws.close();
          resolve(true);
        }, 2000);
        
      } else if (message.includes('module.simple-api')) {
        console.log('   ✅ Simple API module is responding!');
        testResults.moduleInstalled = true;
      }
    });
    
    ws.on('error', (err) => {
      clearTimeout(timeout);
      console.log(`   ❌ Socket.IO error: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 3: Check Relay Server
async function testRelayServer() {
  console.log('\n3️⃣ Testing Relay Server connection...');
  
  return new Promise((resolve) => {
    // First check HTTP status
    const relayHttpUrl = RELAY_URL.replace('ws://', 'http://');
    
    http.get(relayHttpUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          console.log('   ✅ Relay server is running');
          console.log(`   Status: ${status.status}`);
          console.log(`   Clients: ${status.clients}`);
          
          // Now test WebSocket
          testRelayWebSocket(resolve);
        } catch (e) {
          console.log('   ❌ Invalid response from relay server');
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`   ❌ Cannot connect to relay server: ${err.message}`);
      console.log('      → Make sure relay server is running (node relay/simple-api-relay.js)');
      resolve(false);
    });
  });
}

// Test WebSocket connection to relay
function testRelayWebSocket(resolve) {
  console.log('   Testing WebSocket connection...');
  
  const ws = new WebSocket(RELAY_URL);
  let timeout = setTimeout(() => {
    console.log('   ❌ WebSocket connection timeout');
    ws.close();
    resolve(false);
  }, 5000);
  
  ws.on('open', () => {
    console.log('   ✅ WebSocket connected to relay');
    testResults.relayConnection = true;
  });
  
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'welcome') {
        console.log('   ✅ Received welcome message');
        console.log(`      Connected to Foundry: ${msg.connected}`);
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      }
    } catch (e) {
      // Ignore parse errors
    }
  });
  
  ws.on('error', (err) => {
    clearTimeout(timeout);
    console.log(`   ❌ WebSocket error: ${err.message}`);
    resolve(false);
  });
}

// Test 4: End-to-end test
async function testEndToEnd() {
  console.log('\n4️⃣ Testing end-to-end communication...');
  
  if (!testResults.relayConnection) {
    console.log('   ⏭️  Skipping - relay not connected');
    return;
  }
  
  return new Promise((resolve) => {
    const ws = new WebSocket(RELAY_URL);
    let receivedResponse = false;
    
    ws.on('open', () => {
      console.log('   Sending ping request...');
      
      // Send a ping request
      const request = {
        type: 'ping',
        requestId: 'e2e-test-1'
      };
      
      ws.send(JSON.stringify(request));
      
      // Timeout for response
      setTimeout(() => {
        if (!receivedResponse) {
          console.log('   ❌ No response received');
          console.log('      → Check module settings for authentication');
          console.log('      → Check relay server logs for errors');
        }
        ws.close();
        resolve();
      }, 5000);
    });
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'ping-response' && msg.requestId === 'e2e-test-1') {
          console.log('   ✅ Received ping response!');
          console.log(`      World: ${msg.world}`);
          console.log(`      User: ${msg.user}`);
          receivedResponse = true;
          testResults.endToEnd = true;
        } else if (msg.type === 'error') {
          console.log(`   ❌ Error response: ${msg.error}`);
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    ws.on('error', (err) => {
      console.log(`   ❌ WebSocket error: ${err.message}`);
      resolve();
    });
  });
}

// Run all tests
async function runDiagnostics() {
  await testFoundryHttp();
  
  if (testResults.foundryHttp) {
    testResults.socketIoConnection = await testSocketIO();
  }
  
  await testRelayServer();
  
  if (testResults.relayConnection) {
    await testEndToEnd();
  }
  
  // Summary
  console.log('\n📊 Diagnostic Summary:');
  console.log('─────────────────────');
  
  const tests = [
    ['Foundry HTTP API', testResults.foundryHttp],
    ['World Loaded', testResults.foundryWorld],
    ['Socket.IO Connection', testResults.socketIoConnection],
    ['Simple API Module', testResults.moduleInstalled],
    ['Relay Server', testResults.relayConnection],
    ['End-to-End Test', testResults.endToEnd]
  ];
  
  for (const [name, result] of tests) {
    console.log(`${result ? '✅' : '❌'} ${name}`);
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (!testResults.foundryHttp) {
    console.log('1. Start Foundry VTT on port 30000');
  }
  
  if (!testResults.foundryWorld) {
    console.log('1. Launch a world in Foundry VTT');
  }
  
  if (!testResults.moduleInstalled) {
    console.log('1. Install the Simple API module in Foundry');
    console.log('2. Enable the module in your world');
    console.log('3. Configure authentication if needed');
  }
  
  if (!testResults.relayConnection) {
    console.log('1. Start the relay server: node relay/simple-api-relay.js');
    console.log('2. Check that ports 8080 is available');
  }
  
  if (!testResults.endToEnd) {
    console.log('1. Check module authentication settings match relay server');
    console.log('2. Look at relay server console for error messages');
    console.log('3. Check Foundry console (F12) for module errors');
  }
  
  console.log('\n🔧 Debug Commands:');
  console.log('  Watch relay logs: node relay/simple-api-relay.js');
  console.log('  Test simple client: node tests/test-simple-api.js');
  console.log('  Check Foundry console: F12 in Foundry');
}

// Run diagnostics
runDiagnostics();
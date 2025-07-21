#!/usr/bin/env node

/**
 * Authenticated WebSocket Client for Simple API
 * 
 * Demonstrates how to connect to the relay server with authentication
 */

const WebSocket = require('ws');

// Configuration
const RELAY_URL = process.env.RELAY_URL || 'ws://localhost:8080';
const API_KEY = process.env.API_KEY || 'your-secret-api-key'; // Must match Foundry module setting

// Create authenticated WebSocket connection
function connect() {
  console.log('🔌 Connecting to relay server...');
  
  const ws = new WebSocket(RELAY_URL, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  
  ws.on('open', () => {
    console.log('✅ Connected to relay server');
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📥 Received:', message.type || 'unknown');
      
      switch (message.type) {
        case 'welcome':
          console.log('👋 Welcome message received');
          console.log('   Foundry connected:', message.connected);
          console.log('   Auth required:', message.authRequired);
          if (message.connected) {
            // Start sending test requests
            runTests(ws);
          }
          break;
          
        case 'connected':
          console.log('🔗 Relay connected to Foundry');
          runTests(ws);
          break;
          
        case 'api-ready':
          console.log('✅ API Ready!');
          console.log('   World:', message.world);
          console.log('   System:', message.system);
          console.log('   External enabled:', message.externalEnabled);
          break;
          
        case 'ping-response':
          console.log('🏓 Pong received!');
          console.log('   World:', message.world);
          console.log('   System:', message.system);
          console.log('   Foundry version:', message.foundryVersion);
          break;
          
        case 'system-info-response':
          console.log('📊 System Info:');
          console.log('   World:', message.world.title);
          console.log('   System:', message.system.title, message.system.version);
          console.log('   User:', message.user.name, `(${message.user.role})`);
          console.log('   Active modules:', message.modules.length);
          break;
          
        case 'actors-response':
          console.log('👥 Actors:', message.actors.length);
          message.actors.forEach(actor => {
            console.log(`   - ${actor.name} (${actor.type})`);
          });
          break;
          
        case 'error':
          console.error('❌ Error:', message.error);
          if (message.error.includes('authentication')) {
            console.error('🔐 Authentication failed! Check your API key.');
          }
          break;
          
        default:
          console.log('📦 Response:', JSON.stringify(message, null, 2));
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      console.error('   Raw data:', data.toString());
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log('❌ Disconnected:', code, reason.toString());
    if (code === 1008) {
      console.error('🔐 Authentication failed! Check your API key.');
    } else {
      // Reconnect after 5 seconds
      setTimeout(connect, 5000);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('🔄 Relay server appears to be offline, will retry...');
    }
  });
  
  return ws;
}

// Run test requests
function runTests(ws) {
  let testIndex = 0;
  const tests = [
    // Test 1: Ping
    {
      type: 'ping',
      requestId: 'test-ping'
    },
    
    // Test 2: Get system info
    {
      type: 'get-system-info',
      requestId: 'test-system-info'
    },
    
    // Test 3: Get actors
    {
      type: 'get-actors',
      requestId: 'test-get-actors'
    },
    
    // Test 4: Create an actor (example)
    /*
    {
      type: 'create-actor',
      requestId: 'test-create-actor',
      name: 'Test Character',
      actorType: 'character',
      system: {
        health: { value: 10, max: 10 }
      }
    },
    */
    
    // Test 5: Roll dice
    /*
    {
      type: 'roll-dice',
      requestId: 'test-roll-dice',
      formula: '1d20 + 5',
      showInChat: true,
      flavor: 'Test roll from API'
    },
    */
  ];
  
  // Send tests one by one with delay
  const sendNextTest = () => {
    if (testIndex < tests.length && ws.readyState === WebSocket.OPEN) {
      const test = tests[testIndex++];
      console.log(`\n📤 Sending test ${testIndex}/${tests.length}: ${test.type}`);
      ws.send(JSON.stringify(test));
      
      // Send next test after 2 seconds
      setTimeout(sendNextTest, 2000);
    }
  };
  
  // Start after a short delay
  setTimeout(sendNextTest, 1000);
}

// Interactive mode
if (process.argv.includes('--interactive')) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  let ws = null;
  
  console.log('🎮 Interactive mode - Commands:');
  console.log('   connect         - Connect to relay server');
  console.log('   ping           - Send ping request');
  console.log('   info           - Get system info');
  console.log('   actors         - List actors');
  console.log('   roll <formula> - Roll dice (e.g., roll 1d20+5)');
  console.log('   chat <message> - Send chat message');
  console.log('   exit           - Exit');
  console.log('');
  
  const prompt = () => {
    rl.question('> ', (input) => {
      const [command, ...args] = input.trim().split(' ');
      
      switch (command) {
        case 'connect':
          ws = connect();
          break;
          
        case 'ping':
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ping',
              requestId: `ping-${Date.now()}`
            }));
          } else {
            console.log('❌ Not connected');
          }
          break;
          
        case 'info':
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'get-system-info',
              requestId: `info-${Date.now()}`
            }));
          } else {
            console.log('❌ Not connected');
          }
          break;
          
        case 'actors':
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'get-actors',
              requestId: `actors-${Date.now()}`
            }));
          } else {
            console.log('❌ Not connected');
          }
          break;
          
        case 'roll':
          if (ws && ws.readyState === WebSocket.OPEN) {
            const formula = args.join(' ') || '1d20';
            ws.send(JSON.stringify({
              type: 'roll-dice',
              requestId: `roll-${Date.now()}`,
              formula: formula,
              showInChat: true,
              flavor: 'API Roll'
            }));
          } else {
            console.log('❌ Not connected');
          }
          break;
          
        case 'chat':
          if (ws && ws.readyState === WebSocket.OPEN) {
            const message = args.join(' ') || 'Hello from API!';
            ws.send(JSON.stringify({
              type: 'send-chat',
              requestId: `chat-${Date.now()}`,
              message: message
            }));
          } else {
            console.log('❌ Not connected');
          }
          break;
          
        case 'exit':
          if (ws) ws.close();
          process.exit(0);
          break;
          
        default:
          if (command) {
            console.log('❓ Unknown command:', command);
          }
      }
      
      prompt();
    });
  };
  
  prompt();
} else {
  // Auto mode - run tests
  console.log('🤖 Running in automatic test mode');
  console.log('   Use --interactive flag for interactive mode');
  console.log('');
  
  connect();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});
#!/usr/bin/env node

/**
 * HTTP Test for Simple API
 * Tests the relay server HTTP endpoint
 */

const http = require('http');

console.log('🧪 Testing Simple API HTTP endpoint...\n');

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`✅ Status: ${res.statusCode}`);
  console.log(`📋 Headers: ${JSON.stringify(res.headers, null, 2)}\n`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('📊 Response:');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.status === 'connected') {
        console.log('\n✅ Relay server is connected to Foundry!');
      } else {
        console.log('\n❌ Relay server is NOT connected to Foundry');
        console.log('   Make sure Foundry is running on port 30000');
      }
    } catch (e) {
      console.error('❌ Failed to parse response:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection failed:', error.message);
  console.log('\nMake sure the relay server is running:');
  console.log('  node relay/simple-api-relay.js');
});

req.end();
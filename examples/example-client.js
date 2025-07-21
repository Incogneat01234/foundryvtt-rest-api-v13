const WebSocket = require('ws');

/**
 * Example client showing how to use the Simple API
 */

class FoundryAPIClient {
  constructor(url = 'ws://localhost:8080') {
    this.url = url;
    this.ws = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }
  
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      
      this.ws.on('open', () => {
        console.log('✅ Connected to Simple API');
        resolve();
      });
      
      this.ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        
        // Handle responses
        if (msg.requestId && this.pendingRequests.has(msg.requestId)) {
          const { resolve, reject } = this.pendingRequests.get(msg.requestId);
          this.pendingRequests.delete(msg.requestId);
          
          if (msg.error) {
            reject(new Error(msg.error));
          } else {
            resolve(msg);
          }
        }
      });
      
      this.ws.on('error', reject);
    });
  }
  
  async request(type, data = {}) {
    const requestId = `req-${++this.requestId}`;
    
    return new Promise((resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Send request
      this.ws.send(JSON.stringify({
        type,
        requestId,
        ...data
      }));
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }
  
  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Example usage
async function main() {
  const api = new FoundryAPIClient();
  
  try {
    // Connect
    await api.connect();
    
    // Get system info
    console.log('\n📊 System Info:');
    const info = await api.request('get-system-info');
    console.log(`  Foundry: ${info.foundry.version}`);
    console.log(`  System: ${info.foundry.system} v${info.foundry.systemVersion}`);
    console.log(`  World: ${info.foundry.world}`);
    console.log(`  Actors: ${info.actors}`);
    
    // Get all actors
    console.log('\n🎭 Current Actors:');
    const { actors } = await api.request('get-actors');
    actors.forEach(actor => {
      console.log(`  - ${actor.name} (${actor.type})`);
    });
    
    // Create a new actor
    console.log('\n➕ Creating new actor...');
    const createResult = await api.request('create-actor', {
      name: 'Sir Example the Bold',
      actorType: 'character',
      system: {
        abilities: {
          str: { value: 16 },
          dex: { value: 14 },
          con: { value: 15 },
          int: { value: 10 },
          wis: { value: 12 },
          cha: { value: 13 }
        },
        attributes: {
          hp: { value: 45, max: 45 },
          ac: { value: 16 }
        },
        details: {
          level: 5,
          class: 'Fighter'
        }
      }
    });
    console.log(`  Created: ${createResult.actor.name} (ID: ${createResult.actor._id})`);
    
    // Update the actor
    console.log('\n📝 Updating actor...');
    await api.request('update-actor', {
      actorId: createResult.actor._id,
      updates: {
        'system.attributes.hp.value': 30,
        'system.details.level': 6
      }
    });
    console.log('  Updated HP and level');
    
    // Add an item to the actor
    console.log('\n🗡️ Adding item to actor...');
    const itemResult = await api.request('add-item-to-actor', {
      actorId: createResult.actor._id,
      name: 'Flaming Sword',
      itemType: 'weapon',
      system: {
        damage: {
          parts: [['1d8 + 3', 'slashing'], ['1d6', 'fire']]
        },
        attackBonus: 1,
        equipped: true
      }
    });
    console.log('  Added: Flaming Sword');
    
    // Roll some dice
    console.log('\n🎲 Rolling dice...');
    const rollResult = await api.request('roll-dice', {
      formula: '2d20kh + 5',
      showInChat: true,
      flavor: 'Attack with advantage (from API)'
    });
    console.log(`  Rolled ${rollResult.formula} = ${rollResult.total}`);
    
    // Send a chat message
    console.log('\n💬 Sending chat message...');
    await api.request('send-chat', {
      message: '🤖 Hello from the Simple API example client!'
    });
    console.log('  Message sent');
    
    // Roll an ability check (D&D 5e specific)
    if (info.foundry.system === 'dnd5e') {
      console.log('\n🎯 Rolling ability check...');
      const checkResult = await api.request('roll-check', {
        actorId: createResult.actor._id,
        ability: 'str',
        showInChat: true
      });
      console.log(`  Strength check: ${checkResult.total}`);
    }
    
    // Clean up - delete the test actor
    console.log('\n🗑️ Cleaning up...');
    await api.request('delete-actor', {
      actorId: createResult.actor._id
    });
    console.log('  Test actor deleted');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    api.close();
  }
}

// Run the example
main().catch(console.error);
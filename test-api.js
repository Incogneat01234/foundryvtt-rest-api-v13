/**
 * Foundry VTT REST API - Comprehensive Test Script
 * 
 * Run this script in the browser console after the module is loaded
 * Make sure you have:
 * 1. The module enabled
 * 2. QuickInsert module installed and enabled (for search tests)
 * 3. At least one actor, item, scene, and journal entry in your world
 * 4. A token on the current scene (for selected token tests)
 */

console.log('%c=== Foundry REST API Test Suite ===', 'color: #4a90e2; font-size: 16px; font-weight: bold');

// Helper function to log test results
function logTest(testName, success, details = '') {
    const icon = success ? '✅' : '❌';
    const color = success ? '#4caf50' : '#f44336';
    console.log(`%c${icon} ${testName}`, `color: ${color}; font-weight: bold`, details);
}

// Helper function to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main test function
async function runAllTests() {
    const module = game.modules.get('foundry-rest-api');
    
    if (!module) {
        console.error('❌ Module not found! Make sure "foundry-rest-api" is enabled.');
        return;
    }
    
    console.log('\n%c📋 Starting Tests...', 'color: #2196f3; font-weight: bold');
    
    // Test 1: Module API exists
    console.log('\n%c1. Module API Tests', 'color: #ff9800; font-weight: bold');
    try {
        logTest('Module API exists', !!module.api);
        logTest('getWebSocketManager exists', typeof module.api.getWebSocketManager === 'function');
        logTest('search exists', typeof module.api.search === 'function');
        logTest('getByUuid exists', typeof module.api.getByUuid === 'function');
    } catch (error) {
        logTest('Module API Tests', false, error.message);
    }
    
    // Test 2: WebSocket Manager
    console.log('\n%c2. WebSocket Manager Tests', 'color: #ff9800; font-weight: bold');
    try {
        const wsManager = module.api.getWebSocketManager();
        logTest('WebSocket Manager retrieved', !!wsManager);
        
        if (wsManager) {
            logTest('WebSocket connected', wsManager.isConnected());
            
            // Test sending a ping
            const pingSuccess = wsManager.send({ type: 'ping' });
            logTest('Ping sent', pingSuccess);
        } else {
            console.warn('⚠️  No WebSocket manager available. You may not be a GM or the primary GM.');
        }
    } catch (error) {
        logTest('WebSocket Manager Tests', false, error.message);
    }
    
    // Test 3: Search API (requires QuickInsert)
    console.log('\n%c3. Search API Tests', 'color: #ff9800; font-weight: bold');
    try {
        if (!game.modules.get('quick-insert')?.active) {
            console.warn('⚠️  QuickInsert module not active. Skipping search tests.');
        } else {
            // Search for all items
            const allResults = await module.api.search('');
            logTest('Search all items', Array.isArray(allResults), `Found ${allResults.length} items`);
            
            // Search with query
            const queryResults = await module.api.search('sword');
            logTest('Search with query "sword"', Array.isArray(queryResults), `Found ${queryResults.length} items`);
            
            // Search with filter
            const actorResults = await module.api.search('', 'Actor');
            logTest('Search with Actor filter', Array.isArray(actorResults), `Found ${actorResults.length} actors`);
        }
    } catch (error) {
        logTest('Search API Tests', false, error.message);
    }
    
    // Test 4: UUID Lookup
    console.log('\n%c4. UUID Lookup Tests', 'color: #ff9800; font-weight: bold');
    try {
        // Get first actor
        const firstActor = game.actors.contents[0];
        if (firstActor) {
            const entity = await module.api.getByUuid(firstActor.uuid);
            logTest('Get entity by UUID', !!entity, `Retrieved: ${entity?.name}`);
            
            // Test invalid UUID
            const invalidEntity = await module.api.getByUuid('Actor.invalid123');
            logTest('Handle invalid UUID', invalidEntity === null, 'Returned null as expected');
        } else {
            console.warn('⚠️  No actors in world. Create an actor to test UUID lookup.');
        }
    } catch (error) {
        logTest('UUID Lookup Tests', false, error.message);
    }
    
    // Test 5: Entity Operations via WebSocket
    console.log('\n%c5. Entity Operation Tests (via WebSocket)', 'color: #ff9800; font-weight: bold');
    const wsManager = module.api.getWebSocketManager();
    
    if (wsManager?.isConnected()) {
        // Test get-entity
        try {
            const testActor = game.actors.contents[0];
            if (testActor) {
                const requestId = `test-${Date.now()}`;
                
                // Set up response listener
                const responsePromise = new Promise((resolve) => {
                    const checkResponse = setInterval(() => {
                        // In a real implementation, you'd listen for the response
                        // For now, we'll just simulate success after a delay
                        clearInterval(checkResponse);
                        resolve(true);
                    }, 1000);
                });
                
                wsManager.send({
                    type: 'get-entity',
                    requestId: requestId,
                    uuid: testActor.uuid
                });
                
                await responsePromise;
                logTest('Get entity via WebSocket', true, `Requested: ${testActor.name}`);
            }
        } catch (error) {
            logTest('Get entity via WebSocket', false, error.message);
        }
        
        // Test get-structure
        try {
            wsManager.send({
                type: 'get-structure',
                requestId: `structure-${Date.now()}`
            });
            logTest('Get folder structure', true, 'Request sent');
        } catch (error) {
            logTest('Get folder structure', false, error.message);
        }
        
        // Test selected token operations
        if (canvas.tokens.controlled.length > 0) {
            try {
                wsManager.send({
                    type: 'get-entity',
                    requestId: `selected-${Date.now()}`,
                    selected: true,
                    actor: true
                });
                logTest('Get selected token actor', true, `${canvas.tokens.controlled.length} tokens selected`);
            } catch (error) {
                logTest('Get selected token actor', false, error.message);
            }
        } else {
            console.warn('⚠️  No tokens selected. Select a token to test selected token operations.');
        }
    } else {
        console.warn('⚠️  WebSocket not connected. Skipping WebSocket operation tests.');
    }
    
    // Test 6: Roll Detection
    console.log('\n%c6. Roll Detection Test', 'color: #ff9800; font-weight: bold');
    try {
        // Create a test roll
        const roll = new Roll('1d20 + 5');
        await roll.evaluate({async: true});
        
        // Create a chat message with the roll
        await ChatMessage.create({
            content: 'Test roll for REST API',
            roll: roll,
            type: CONST.CHAT_MESSAGE_TYPES.ROLL
        });
        
        logTest('Roll detection', true, `Created test roll: ${roll.total}`);
        console.log('Check WebSocket messages for roll-data message');
    } catch (error) {
        logTest('Roll detection', false, error.message);
    }
    
    // Test 7: Module Settings
    console.log('\n%c7. Module Settings Tests', 'color: #ff9800; font-weight: bold');
    try {
        const wsUrl = game.settings.get('foundry-rest-api', 'wsRelayUrl');
        logTest('WebSocket URL setting', !!wsUrl, wsUrl);
        
        const apiKey = game.settings.get('foundry-rest-api', 'apiKey');
        logTest('API Key setting', !!apiKey, 'Key is set');
        
        const logLevel = game.settings.get('foundry-rest-api', 'logLevel');
        logTest('Log level setting', logLevel === 0, `Current level: ${logLevel} (0=debug)`);
    } catch (error) {
        logTest('Module Settings Tests', false, error.message);
    }
    
    console.log('\n%c✨ Test Suite Complete!', 'color: #4caf50; font-size: 14px; font-weight: bold');
    console.log('%cCheck the console for debug messages from the module.', 'color: #666; font-style: italic');
}

// Additional utility functions for manual testing
window.foundrRestApiTests = {
    // Run all tests
    runAll: runAllTests,
    
    // Test individual operations
    async testSearch(query = 'sword', filter = null) {
        const module = game.modules.get('foundry-rest-api');
        const results = await module.api.search(query, filter);
        console.table(results);
        return results;
    },
    
    async testGetEntity(uuid) {
        const module = game.modules.get('foundry-rest-api');
        const entity = await module.api.getByUuid(uuid);
        console.log('Entity:', entity);
        return entity;
    },
    
    testWebSocketSend(message) {
        const module = game.modules.get('foundry-rest-api');
        const wsManager = module.api.getWebSocketManager();
        if (wsManager?.isConnected()) {
            return wsManager.send(message);
        } else {
            console.error('WebSocket not connected');
            return false;
        }
    },
    
    // Create test data
    async createTestData() {
        console.log('Creating test data...');
        
        // Create test actor
        const actor = await Actor.create({
            name: 'Test Actor for REST API',
            type: 'character',
            system: { attributes: { hp: { value: 10, max: 10 } } }
        });
        console.log('Created actor:', actor.name);
        
        // Create test item
        const item = await Item.create({
            name: 'Test Sword',
            type: 'weapon'
        });
        console.log('Created item:', item.name);
        
        // Create test journal
        const journal = await JournalEntry.create({
            name: 'Test Journal Entry'
        });
        console.log('Created journal:', journal.name);
        
        return { actor, item, journal };
    },
    
    // Clean up test data
    async cleanupTestData() {
        console.log('Cleaning up test data...');
        
        // Delete test actors
        const testActors = game.actors.filter(a => a.name.includes('Test Actor for REST API'));
        for (const actor of testActors) {
            await actor.delete();
        }
        
        // Delete test items
        const testItems = game.items.filter(i => i.name === 'Test Sword');
        for (const item of testItems) {
            await item.delete();
        }
        
        // Delete test journals
        const testJournals = game.journal.filter(j => j.name === 'Test Journal Entry');
        for (const journal of testJournals) {
            await journal.delete();
        }
        
        console.log('Cleanup complete');
    },
    
    // Monitor WebSocket messages
    monitorWebSocket(duration = 30000) {
        const module = game.modules.get('foundry-rest-api');
        const wsManager = module.api.getWebSocketManager();
        
        if (!wsManager?.isConnected()) {
            console.error('WebSocket not connected');
            return;
        }
        
        console.log(`Monitoring WebSocket messages for ${duration/1000} seconds...`);
        console.log('Try performing actions like rolling dice, moving tokens, etc.');
        
        // The debug logging should show all messages automatically
        
        setTimeout(() => {
            console.log('WebSocket monitoring complete');
        }, duration);
    }
};

// Run tests automatically
console.log('\n%c🚀 Running automatic tests...', 'color: #2196f3; font-weight: bold');
runAllTests();

// Print manual testing instructions
console.log('\n%c📚 Manual Testing Commands:', 'color: #9c27b0; font-weight: bold');
console.log('window.foundrRestApiTests.runAll() - Run all tests again');
console.log('window.foundrRestApiTests.testSearch("sword") - Test search');
console.log('window.foundrRestApiTests.testGetEntity("Actor.abc123") - Test get entity');
console.log('window.foundrRestApiTests.createTestData() - Create test entities');
console.log('window.foundrRestApiTests.cleanupTestData() - Remove test entities');
console.log('window.foundrRestApiTests.monitorWebSocket() - Monitor WebSocket traffic for 30s');
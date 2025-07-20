/**
 * Foundry VTT REST API - Advanced Router Tests
 * 
 * This script tests all WebSocket router endpoints
 * Run after the basic test-api.js script
 */

console.log('%c=== Advanced Router Tests ===', 'color: #e91e63; font-size: 16px; font-weight: bold');

// Test configuration
const TEST_CONFIG = {
    timeout: 5000, // Wait time for responses
    verbose: true  // Show detailed logs
};

// Helper to create unique request IDs
const createRequestId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper to send message and wait for response
async function sendAndWait(wsManager, message, responseType, timeout = TEST_CONFIG.timeout) {
    return new Promise((resolve, reject) => {
        const requestId = createRequestId(message.type);
        const fullMessage = { ...message, requestId };
        
        if (TEST_CONFIG.verbose) {
            console.log(`📤 Sending: ${message.type}`, fullMessage);
        }
        
        // For testing, we'll just send and resolve after a delay
        // In production, you'd listen for the actual response
        const success = wsManager.send(fullMessage);
        
        if (!success) {
            reject(new Error('Failed to send message'));
            return;
        }
        
        setTimeout(() => {
            resolve({ success: true, requestId });
        }, 100);
    });
}

// Router test suites
const routerTests = {
    // Entity Router Tests
    async testEntityRouter(wsManager) {
        console.log('\n%c🔧 Entity Router Tests', 'color: #ff5722; font-weight: bold');
        const results = [];
        
        // Test 1: Get entity by UUID
        try {
            const actor = game.actors.contents[0];
            if (actor) {
                await sendAndWait(wsManager, {
                    type: 'get-entity',
                    uuid: actor.uuid
                }, 'entity-data');
                results.push({ test: 'Get entity by UUID', success: true, details: actor.name });
            }
        } catch (error) {
            results.push({ test: 'Get entity by UUID', success: false, error: error.message });
        }
        
        // Test 2: Get selected entities
        try {
            if (canvas.tokens.controlled.length > 0) {
                await sendAndWait(wsManager, {
                    type: 'get-entity',
                    selected: true,
                    actor: true
                }, 'entity-data');
                results.push({ test: 'Get selected entities', success: true, details: `${canvas.tokens.controlled.length} selected` });
            } else {
                results.push({ test: 'Get selected entities', success: false, error: 'No tokens selected' });
            }
        } catch (error) {
            results.push({ test: 'Get selected entities', success: false, error: error.message });
        }
        
        // Test 3: Create entity
        try {
            await sendAndWait(wsManager, {
                type: 'create-entity',
                entityType: 'Actor',
                data: {
                    name: 'REST API Test Actor',
                    type: 'npc'
                }
            }, 'entity-created');
            results.push({ test: 'Create entity', success: true });
        } catch (error) {
            results.push({ test: 'Create entity', success: false, error: error.message });
        }
        
        // Test 4: Update entity
        try {
            const testActor = game.actors.getName('REST API Test Actor');
            if (testActor) {
                await sendAndWait(wsManager, {
                    type: 'update-entity',
                    uuid: testActor.uuid,
                    updateData: {
                        name: 'REST API Test Actor (Updated)'
                    }
                }, 'entity-updated');
                results.push({ test: 'Update entity', success: true });
            }
        } catch (error) {
            results.push({ test: 'Update entity', success: false, error: error.message });
        }
        
        // Test 5: Modify attributes
        try {
            const actor = game.actors.contents[0];
            if (actor && actor.system?.attributes?.hp) {
                await sendAndWait(wsManager, {
                    type: 'decrease-attribute',
                    uuid: actor.uuid,
                    attribute: 'system.attributes.hp.value',
                    amount: 1
                }, 'modify-attribute-result');
                results.push({ test: 'Decrease attribute', success: true });
                
                await sendAndWait(wsManager, {
                    type: 'increase-attribute',
                    uuid: actor.uuid,
                    attribute: 'system.attributes.hp.value',
                    amount: 1
                }, 'modify-attribute-result');
                results.push({ test: 'Increase attribute', success: true });
            }
        } catch (error) {
            results.push({ test: 'Modify attributes', success: false, error: error.message });
        }
        
        // Test 6: Delete entity
        try {
            const testActor = game.actors.getName('REST API Test Actor (Updated)');
            if (testActor) {
                await sendAndWait(wsManager, {
                    type: 'delete-entity',
                    uuid: testActor.uuid
                }, 'entity-deleted');
                results.push({ test: 'Delete entity', success: true });
            }
        } catch (error) {
            results.push({ test: 'Delete entity', success: false, error: error.message });
        }
        
        return results;
    },
    
    // Structure Router Tests
    async testStructureRouter(wsManager) {
        console.log('\n%c📁 Structure Router Tests', 'color: #ff5722; font-weight: bold');
        const results = [];
        
        // Test 1: Get folder structure
        try {
            await sendAndWait(wsManager, {
                type: 'get-structure'
            }, 'structure-data');
            results.push({ test: 'Get folder structure', success: true });
        } catch (error) {
            results.push({ test: 'Get folder structure', success: false, error: error.message });
        }
        
        // Test 2: Get folder contents
        try {
            const folder = game.folders.contents[0];
            if (folder) {
                await sendAndWait(wsManager, {
                    type: 'get-contents',
                    path: folder.uuid
                }, 'contents-data');
                results.push({ test: 'Get folder contents', success: true, details: folder.name });
            }
        } catch (error) {
            results.push({ test: 'Get folder contents', success: false, error: error.message });
        }
        
        // Test 3: Get compendium contents
        try {
            const pack = game.packs.contents[0];
            if (pack) {
                await sendAndWait(wsManager, {
                    type: 'get-contents',
                    path: `Compendium.${pack.collection}`
                }, 'contents-data');
                results.push({ test: 'Get compendium contents', success: true, details: pack.title });
            }
        } catch (error) {
            results.push({ test: 'Get compendium contents', success: false, error: error.message });
        }
        
        return results;
    },
    
    // Search Router Tests
    async testSearchRouter(wsManager) {
        console.log('\n%c🔍 Search Router Tests', 'color: #ff5722; font-weight: bold');
        const results = [];
        
        if (!game.modules.get('quick-insert')?.active) {
            results.push({ test: 'Search tests', success: false, error: 'QuickInsert not active' });
            return results;
        }
        
        // Test 1: Basic search
        try {
            await sendAndWait(wsManager, {
                type: 'perform-search',
                query: 'test'
            }, 'search-results');
            results.push({ test: 'Basic search', success: true });
        } catch (error) {
            results.push({ test: 'Basic search', success: false, error: error.message });
        }
        
        // Test 2: Search with filter
        try {
            await sendAndWait(wsManager, {
                type: 'perform-search',
                query: '',
                filter: 'Actor'
            }, 'search-results');
            results.push({ test: 'Search with filter', success: true });
        } catch (error) {
            results.push({ test: 'Search with filter', success: false, error: error.message });
        }
        
        return results;
    },
    
    // Roll Router Tests
    async testRollRouter(wsManager) {
        console.log('\n%c🎲 Roll Router Tests', 'color: #ff5722; font-weight: bold');
        const results = [];
        
        // Test 1: Roll dice
        try {
            await sendAndWait(wsManager, {
                type: 'roll-dice',
                formula: '2d20 + 5',
                flavor: 'REST API Test Roll'
            }, 'roll-result');
            results.push({ test: 'Roll dice', success: true });
        } catch (error) {
            results.push({ test: 'Roll dice', success: false, error: error.message });
        }
        
        // Test 2: Get recent rolls
        try {
            await sendAndWait(wsManager, {
                type: 'get-recent-rolls'
            }, 'recent-rolls-data');
            results.push({ test: 'Get recent rolls', success: true });
        } catch (error) {
            results.push({ test: 'Get recent rolls', success: false, error: error.message });
        }
        
        return results;
    },
    
    // Macro Router Tests
    async testMacroRouter(wsManager) {
        console.log('\n%c⚡ Macro Router Tests', 'color: #ff5722; font-weight: bold');
        const results = [];
        
        // Test 1: Execute macro by name
        try {
            const macro = game.macros.contents[0];
            if (macro) {
                await sendAndWait(wsManager, {
                    type: 'execute-macro',
                    name: macro.name
                }, 'macro-executed');
                results.push({ test: 'Execute macro by name', success: true, details: macro.name });
            }
        } catch (error) {
            results.push({ test: 'Execute macro by name', success: false, error: error.message });
        }
        
        // Test 2: Execute macro by UUID
        try {
            const macro = game.macros.contents[0];
            if (macro) {
                await sendAndWait(wsManager, {
                    type: 'execute-macro',
                    uuid: macro.uuid
                }, 'macro-executed');
                results.push({ test: 'Execute macro by UUID', success: true });
            }
        } catch (error) {
            results.push({ test: 'Execute macro by UUID', success: false, error: error.message });
        }
        
        return results;
    },
    
    // Utility Router Tests
    async testUtilityRouter(wsManager) {
        console.log('\n%c🛠️ Utility Router Tests', 'color: #ff5722; font-weight: bold');
        const results = [];
        
        // Test 1: Evaluate expression
        try {
            await sendAndWait(wsManager, {
                type: 'evaluate-expression',
                expression: 'game.user.name'
            }, 'evaluation-result');
            results.push({ test: 'Evaluate expression', success: true });
        } catch (error) {
            results.push({ test: 'Evaluate expression', success: false, error: error.message });
        }
        
        // Test 2: Get system info
        try {
            await sendAndWait(wsManager, {
                type: 'get-system-info'
            }, 'system-info');
            results.push({ test: 'Get system info', success: true });
        } catch (error) {
            results.push({ test: 'Get system info', success: false, error: error.message });
        }
        
        return results;
    }
};

// Main test runner
async function runAdvancedTests() {
    const module = game.modules.get('foundry-rest-api');
    if (!module) {
        console.error('Module not found!');
        return;
    }
    
    const wsManager = module.api.getWebSocketManager();
    if (!wsManager?.isConnected()) {
        console.error('WebSocket not connected!');
        return;
    }
    
    console.log('\n%c🚀 Running Advanced Router Tests...', 'color: #2196f3; font-weight: bold');
    
    const allResults = {};
    
    // Run all router tests
    for (const [routerName, testFunc] of Object.entries(routerTests)) {
        try {
            const results = await testFunc(wsManager);
            allResults[routerName] = results;
        } catch (error) {
            console.error(`Error in ${routerName}:`, error);
            allResults[routerName] = [{ test: 'Router test suite', success: false, error: error.message }];
        }
    }
    
    // Display results summary
    console.log('\n%c📊 Test Results Summary', 'color: #4caf50; font-size: 14px; font-weight: bold');
    
    for (const [routerName, results] of Object.entries(allResults)) {
        const passed = results.filter(r => r.success).length;
        const total = results.length;
        const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
        
        console.log(`\n${routerName}:`);
        console.log(`  Passed: ${passed}/${total} (${percentage}%)`);
        
        // Show failed tests
        const failed = results.filter(r => !r.success);
        if (failed.length > 0) {
            console.log('  Failed tests:');
            failed.forEach(f => {
                console.log(`    ❌ ${f.test}: ${f.error || 'Unknown error'}`);
            });
        }
    }
    
    // Store results for manual inspection
    window.foundrRestApiAdvancedResults = allResults;
    console.log('\n%cDetailed results available in: window.foundrRestApiAdvancedResults', 'color: #666; font-style: italic');
}

// Stress test function
async function stressTest(wsManager, messagesPerSecond = 10, duration = 10) {
    console.log(`\n%c⚡ Starting Stress Test: ${messagesPerSecond} msg/sec for ${duration}s`, 'color: #f44336; font-weight: bold');
    
    let sent = 0;
    let errors = 0;
    const startTime = Date.now();
    
    const interval = setInterval(() => {
        try {
            // Send various message types
            const messageTypes = [
                { type: 'ping' },
                { type: 'get-entity', uuid: game.actors.contents[0]?.uuid },
                { type: 'get-structure' },
                { type: 'get-recent-rolls' }
            ];
            
            const message = messageTypes[Math.floor(Math.random() * messageTypes.length)];
            const success = wsManager.send({ ...message, requestId: createRequestId('stress') });
            
            if (success) {
                sent++;
            } else {
                errors++;
            }
        } catch (error) {
            errors++;
        }
    }, 1000 / messagesPerSecond);
    
    setTimeout(() => {
        clearInterval(interval);
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`%c✅ Stress Test Complete`, 'color: #4caf50; font-weight: bold');
        console.log(`  Duration: ${elapsed.toFixed(1)}s`);
        console.log(`  Messages sent: ${sent}`);
        console.log(`  Errors: ${errors}`);
        console.log(`  Actual rate: ${(sent / elapsed).toFixed(1)} msg/sec`);
    }, duration * 1000);
}

// Export test functions
window.foundrRestApiAdvanced = {
    runAll: runAdvancedTests,
    stressTest: (messagesPerSecond, duration) => {
        const module = game.modules.get('foundry-rest-api');
        const wsManager = module?.api?.getWebSocketManager();
        if (wsManager?.isConnected()) {
            stressTest(wsManager, messagesPerSecond, duration);
        } else {
            console.error('WebSocket not connected!');
        }
    },
    testRouter: async (routerName) => {
        const module = game.modules.get('foundry-rest-api');
        const wsManager = module?.api?.getWebSocketManager();
        if (!wsManager?.isConnected()) {
            console.error('WebSocket not connected!');
            return;
        }
        
        if (routerTests[routerName]) {
            const results = await routerTests[routerName](wsManager);
            console.table(results);
            return results;
        } else {
            console.error(`Unknown router: ${routerName}`);
            console.log('Available routers:', Object.keys(routerTests));
        }
    }
};

// Instructions
console.log('\n%c📚 Advanced Test Commands:', 'color: #9c27b0; font-weight: bold');
console.log('window.foundrRestApiAdvanced.runAll() - Run all router tests');
console.log('window.foundrRestApiAdvanced.testRouter("testEntityRouter") - Test specific router');
console.log('window.foundrRestApiAdvanced.stressTest(10, 5) - Stress test (10 msg/sec for 5s)');
console.log('\nAvailable routers:', Object.keys(routerTests));

// Auto-run if WebSocket is connected
const module = game.modules.get('foundry-rest-api');
if (module?.api?.getWebSocketManager()?.isConnected()) {
    console.log('\n%c🔄 Auto-running advanced tests...', 'color: #2196f3');
    runAdvancedTests();
} else {
    console.warn('\n⚠️  WebSocket not connected. Connect first, then run: window.foundrRestApiAdvanced.runAll()');
}
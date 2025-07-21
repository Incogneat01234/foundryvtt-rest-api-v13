// src/ts/module.ts
// @ts-nocheck
import "../styles/style.scss";
import { FoundryRestApi } from "./types";
import { moduleId, recentRolls, MAX_ROLLS_STORED } from "./constants";
import { ModuleLogger } from "./utils/logger";
import { initializeWebSocket } from "./network/webSocketEndpoints";


Hooks.once("init", () => {
  console.log(`Initializing ${moduleId}`);
  ModuleLogger.functionEntry('init hook');
  ModuleLogger.debug('Module initialization started', {
    moduleId,
    version: (game as Game).modules.get(moduleId)?.version
  });
  
  // Register module settings for WebSocket configuration
  ModuleLogger.debug('Registering module settings');
  game.settings.register(moduleId, "wsRelayUrl", {
    name: "WebSocket Relay URL",
    hint: "URL for the WebSocket relay server",
    scope: "world",
    config: true,
    type: String,
    default: "wss://foundryvtt-rest-api-relay.fly.dev",
    requiresReload: true
  });
  
  game.settings.register(moduleId, "apiKey", {
    name: "API Key",
    hint: "API Key for authentication with the relay server",
    scope: "world",
    config: true,
    type: String,
    default: game.world.id,
    requiresReload: true
  });

  game.settings.register(moduleId, "logLevel", {
    name: "Log Level",
    hint: "Set the level of detail for module logging",
    scope: "world",
    config: true,
    type: Number,
    choices: {
      0: "debug",
      1: "info",
      2: "warn",
      3: "error"
    } as any,
    default: 0
  });

  // Add new settings for connection management
  game.settings.register(moduleId, "pingInterval", {
    name: "Ping Interval (seconds)",
    hint: "How often (in seconds) the module sends a ping to the relay server to keep the connection alive.",
    scope: "world",
    config: true,
    type: Number,
    default: 30,
    range: {
      min: 5,
      max: 600,
      step: 1
    },
    requiresReload: true
  } as any);

  game.settings.register(moduleId, "reconnectMaxAttempts", {
    name: "Max Reconnect Attempts",
    hint: "Maximum number of times the module will try to reconnect after losing connection.",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    requiresReload: true
  } as any);

  game.settings.register(moduleId, "reconnectBaseDelay", {
    name: "Reconnect Base Delay (ms)",
    hint: "Initial delay (in milliseconds) before the first reconnect attempt. Subsequent attempts use exponential backoff.",
    scope: "world",
    config: true,
    type: Number,
    default: 1000,
    requiresReload: true
  } as any);

  // Add a dummy setting for the test connection button
  game.settings.register(moduleId, "testConnection", {
    name: "Test Connection",
    hint: "Click the button to test the WebSocket connection to the relay server",
    scope: "world",
    config: true,
    type: String,
    default: "",
    requiresReload: false
  });

  // Create and expose module API
  ModuleLogger.debug('Creating module API');
  const module = game.modules.get(moduleId) as FoundryRestApi;
  module.api = {
    getWebSocketManager: () => {
      ModuleLogger.functionEntry('api.getWebSocketManager');
      if (!module.socketManager) {
        ModuleLogger.warn(`WebSocketManager requested but not initialized`);
        ModuleLogger.functionExit('api.getWebSocketManager', null);
        return null;
      }
      ModuleLogger.debug('Returning WebSocketManager instance');
      ModuleLogger.functionExit('api.getWebSocketManager', 'instance');
      return module.socketManager;
    },
    search: async (query: string, filter?: string) => {
      ModuleLogger.functionEntry('api.search', { query, filter });
      if (!window.QuickInsert) {
        ModuleLogger.error(`QuickInsert not available`);
        ModuleLogger.functionExit('api.search', []);
        return [];
      }
      
      ModuleLogger.debug('QuickInsert status', { hasIndex: window.QuickInsert.hasIndex });
      if (!window.QuickInsert.hasIndex) {
        ModuleLogger.info(`QuickInsert index not ready, forcing index creation`);
        try {
          window.QuickInsert.forceIndex();
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          ModuleLogger.error(`Failed to force QuickInsert index:`, error);
        }
      }
      
      let filterFunc = null;
      if (filter) {
        ModuleLogger.debug('Creating filter function', { filter });
        filterFunc = (item: any) => item.documentType === filter;
      }
      
      const results = await window.QuickInsert.search(query, filterFunc, 100);
      ModuleLogger.debug('Search results', { count: results.length });
      ModuleLogger.functionExit('api.search', results);
      return results;
    },
    getByUuid: async (uuid: string) => {
      ModuleLogger.functionEntry('api.getByUuid', { uuid });
      try {
        const entity = await fromUuid(uuid);
        ModuleLogger.debug('UUID lookup result', { 
          found: !!entity, 
          type: entity?.documentName 
        });
        ModuleLogger.functionExit('api.getByUuid', entity);
        return entity;
      } catch (error) {
        ModuleLogger.error(`Error getting entity by UUID:`, error);
        ModuleLogger.functionExit('api.getByUuid', null);
        return null;
      }
    }
  };
  
  ModuleLogger.info('Module API created successfully');
  ModuleLogger.functionExit('init hook');
});

// Replace the API key input field with a password field
Hooks.on("renderSettingsConfig", (_: SettingsConfig, html: JQuery | HTMLElement) => {
  ModuleLogger.functionEntry('renderSettingsConfig hook');
  
  try {
    // Ensure html is a jQuery object
    const $html = html instanceof HTMLElement ? $(html) : html;
    
    const apiKeyInput = $html.find(`input[name="${moduleId}.apiKey"]`);
    ModuleLogger.debug('API key input field', { found: apiKeyInput.length > 0 });
    if (apiKeyInput.length) {
      // Change the input type to password
      apiKeyInput.attr("type", "password");
      
      // Add a toggle button to show/hide the API key
      const toggleButton = $(`<button type="button" class="api-key-toggle" style="margin-left: 5px;">
        <i class="fas fa-eye"></i>
      </button>`);
      
      apiKeyInput.after(toggleButton);
      
      // Toggle password visibility
      toggleButton.on("click", (e) => {
        e.preventDefault();
        const currentType = apiKeyInput.attr("type");
        const newType = currentType === "password" ? "text" : "password";
        apiKeyInput.attr("type", newType);
        
        // Update icon
        const icon = toggleButton.find("i");
        icon.removeClass("fa-eye fa-eye-slash");
        icon.addClass(newType === "password" ? "fa-eye" : "fa-eye-slash");
      });

    // Add an event listener to save the value when it changes
    apiKeyInput.on("change", (event) => {
      ModuleLogger.debug('API key change event triggered');
      const newValue = (event.target as HTMLInputElement).value;
      game.settings.set(moduleId, "apiKey", newValue).then(() => {
        new Dialog({
          title: "Reload Required",
          content: "<p>The API Key has been updated. A reload is required for the changes to take effect. Would you like to reload now?</p>",
          buttons: {
            yes: {
              label: "Reload",
              callback: () => window.location.reload()
            },
            no: {
              label: "Later"
            }
          },
          default: "yes"
        }).render(true);
      });
    });
    }
    
    // Add Test Connection button
    const testConnectionInput = $html.find(`input[name="${moduleId}.testConnection"]`);
    if (testConnectionInput.length) {
      // Hide the input field
      testConnectionInput.hide();
      
      // Replace with a button
      const testButton = $(`<button type="button" class="test-connection-btn">
        <i class="fas fa-plug"></i> Test Connection
      </button>`);
      
      testConnectionInput.after(testButton);
      
      testButton.on("click", async (e) => {
        e.preventDefault();
        testButton.prop("disabled", true);
        testButton.html('<i class="fas fa-spinner fa-spin"></i> Testing...');
        
        try {
          const module = game.modules.get(moduleId) as any;
          const ws = module?.socketManager;
          
          if (!ws) {
            ui.notifications.error("WebSocket Manager not initialized. Are you logged in as GM?");
            testButton.html('<i class="fas fa-times"></i> Failed');
            setTimeout(() => {
              testButton.prop("disabled", false);
              testButton.html('<i class="fas fa-plug"></i> Test Connection');
            }, 2000);
            return;
          }
          
          if (ws.isConnected()) {
            // Send a ping and wait for response
            const testId = `test-${Date.now()}`;
            let responseReceived = false;
            
            // Set up one-time listener for pong
            const pongHandler = (data: any) => {
              if (data.type === "pong") {
                responseReceived = true;
              }
            };
            
            ws.onMessageType("pong", pongHandler);
            
            // Send ping
            ws.send({ type: "ping", testId });
            
            // Wait for response
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (responseReceived) {
              ui.notifications.info("Connection successful! WebSocket is connected and responding.");
              testButton.html('<i class="fas fa-check"></i> Connected');
            } else {
              ui.notifications.warn("Connected but no response received. Check your API key.");
              testButton.html('<i class="fas fa-exclamation-triangle"></i> No Response');
            }
          } else {
            // Try to connect
            ws.connect();
            
            // Wait a bit for connection
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            if (ws.isConnected()) {
              ui.notifications.info("Connection established successfully!");
              testButton.html('<i class="fas fa-check"></i> Connected');
            } else {
              ui.notifications.error("Failed to connect. Check your API key and network settings.");
              testButton.html('<i class="fas fa-times"></i> Failed');
            }
          }
        } catch (error) {
          ModuleLogger.error("Test connection error:", error);
          ui.notifications.error("Error testing connection: " + error.message);
          testButton.html('<i class="fas fa-times"></i> Error');
        }
        
        // Reset button after delay
        setTimeout(() => {
          testButton.prop("disabled", false);
          testButton.html('<i class="fas fa-plug"></i> Test Connection');
        }, 3000);
      });
    }
  } catch (error) {
    ModuleLogger.error('Error in renderSettingsConfig hook:', error);
  }
  ModuleLogger.functionExit('renderSettingsConfig hook');
});

Hooks.once("ready", () => {
  ModuleLogger.functionEntry('ready hook');
  ModuleLogger.info('Foundry VTT is ready, scheduling WebSocket initialization');
  setTimeout(() => {
    ModuleLogger.debug('WebSocket initialization timer fired');
    initializeWebSocket();
  }, 1000);
  ModuleLogger.functionExit('ready hook');
});

Hooks.on("createChatMessage", (message: any) => {
  ModuleLogger.functionEntry('createChatMessage hook', { 
    messageId: message.id, 
    isRoll: message.isRoll 
  });
  
  if (message.isRoll && message.rolls?.length > 0) {
    ModuleLogger.info(`Detected dice roll from ${message.user?.name || 'unknown'}`);
    ModuleLogger.debug('Roll details', {
      rollCount: message.rolls.length,
      formula: message.rolls[0]?.formula,
      total: message.rolls[0]?.total
    });
    
    // Generate a unique ID using the message ID to prevent duplicates
    const rollId = message.id;
    
    // Format roll data
    const rollData = {
      id: rollId,
      messageId: message.id,
      user: {
        id: message.user?.id,
        name: message.user?.name
      },
      speaker: message.speaker,
      flavor: message.flavor || "",
      rollTotal: message.rolls[0].total,
      formula: message.rolls[0].formula,
      isCritical: message.rolls[0].isCritical || false,
      isFumble: message.rolls[0].isFumble || false,
      dice: message.rolls[0].dice?.map((d: any) => ({
        faces: d.faces,
        results: d.results.map((r: any) => ({
          result: r.result,
          active: r.active
        }))
      })),
      timestamp: Date.now()
    };
    
    // Check if this roll ID already exists in recentRolls
    const existingIndex = recentRolls.findIndex(roll => roll.id === rollId);
    if (existingIndex !== -1) {
      // If it exists, update it instead of adding a new entry
      ModuleLogger.debug('Updating existing roll entry', { rollId, index: existingIndex });
      recentRolls[existingIndex] = rollData;
    } else {
      // Add to recent rolls
      ModuleLogger.debug('Adding new roll entry', { rollId });
      recentRolls.unshift(rollData);
      
      // Trim the array if needed
      if (recentRolls.length > MAX_ROLLS_STORED) {
        ModuleLogger.debug('Trimming recent rolls array', { 
          oldLength: recentRolls.length, 
          maxLength: MAX_ROLLS_STORED 
        });
        recentRolls.length = MAX_ROLLS_STORED;
      }
    }
    
    // Send to relay server if connected
    const module = game.modules.get(moduleId) as FoundryRestApi;
    if (module.socketManager?.isConnected()) {
      ModuleLogger.debug('Sending roll data to WebSocket');
      module.socketManager.send({
        type: "roll-data",
        data: rollData
      });
    } else {
      ModuleLogger.debug('WebSocket not connected, roll data not sent');
    }
  }
  
  ModuleLogger.functionExit('createChatMessage hook');
});

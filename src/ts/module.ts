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
Hooks.on("renderSettingsConfig", (_: SettingsConfig, html: JQuery) => {
  ModuleLogger.functionEntry('renderSettingsConfig hook');
  const apiKeyInput = html.find(`input[name="${moduleId}.apiKey"]`);
  ModuleLogger.debug('API key input field', { found: apiKeyInput.length > 0 });
  if (apiKeyInput.length) {
    // Change the input type to password
    apiKeyInput.attr("type", "password");

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

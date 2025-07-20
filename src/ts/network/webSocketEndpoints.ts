// @ts-nocheck
import { moduleId } from "../constants";
import { FoundryRestApi } from "../types";
import { ModuleLogger } from "../utils/logger";
import { WebSocketManager } from "./webSocketManager";
import { routers } from "./routers/all"
import { Router } from "./routers/baseRouter";

export function initializeWebSocket() {
    ModuleLogger.functionEntry('initializeWebSocket');
    
    // Get settings
    const wsRelayUrl = game.settings.get(moduleId, "wsRelayUrl") as string;
    const apiKey = game.settings.get(moduleId, "apiKey") as string;
    const module = game.modules.get(moduleId) as FoundryRestApi;
    
    ModuleLogger.debug('WebSocket settings', {
        wsRelayUrl,
        hasApiKey: !!apiKey,
        moduleFound: !!module
    });
    
    if (!wsRelayUrl) {
      ModuleLogger.error(`WebSocket relay URL is empty. Please configure it in module settings.`);
      ModuleLogger.functionExit('initializeWebSocket', 'no URL');
      return;
    }
    
    ModuleLogger.info(`Initializing WebSocket with URL: ${wsRelayUrl}`);
    
    try {
        // Create and connect the WebSocket manager - only if it doesn't exist already
        if (!module.socketManager) {
            ModuleLogger.debug('Creating new WebSocket manager instance');
            module.socketManager = WebSocketManager.getInstance(wsRelayUrl, apiKey);
            // Only attempt to connect if we got a valid instance (meaning this GM is the primary GM)
            if (module.socketManager) {
                ModuleLogger.debug('WebSocket manager created, initiating connection');
                module.socketManager.connect();
            } else {
                ModuleLogger.debug('WebSocket manager not created (not primary GM)');
            }
        } else {
            ModuleLogger.info(`WebSocket manager already exists, not creating a new one`);
        }
        
        // If we don't have a valid socket manager, exit early
        if (!module.socketManager) {
            ModuleLogger.warn(`No WebSocket manager available, skipping message handler setup`);
            ModuleLogger.functionExit('initializeWebSocket', 'no socket manager');
            return;
        }
        
        // Register message handlers using routers
        const socketManager = module.socketManager;
        ModuleLogger.debug('Registering message handlers from routers', {
            routerCount: routers.length
        });
        
        routers.forEach((router: Router, index: number) => {
            ModuleLogger.debug(`Registering router ${index + 1}/${routers.length}`, {
                routerName: router.constructor.name
            });
            router.reflect(socketManager);
        });
        
        ModuleLogger.info(`Registered ${routers.length} routers with WebSocket manager`);
        ModuleLogger.functionExit('initializeWebSocket', 'success');
        
    } catch (error) {
      ModuleLogger.error(`Error initializing WebSocket:`, error);
      ModuleLogger.debug('Error details', {
          errorName: (error as Error).name,
          errorMessage: (error as Error).message,
          errorStack: (error as Error).stack
      });
      ModuleLogger.functionExit('initializeWebSocket', 'error');
    }
}

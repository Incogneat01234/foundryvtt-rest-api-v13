// @ts-nocheck
import { WSCloseCodes } from "../types";
import { ModuleLogger } from "../utils/logger";
import { moduleId } from "../constants"; // Corrected import path
import { HandlerContext } from "./routers/baseRouter"

type MessageHandler = (data: any, context: HandlerContext) => void;

export class WebSocketManager {
  private url: string;
  private token: string;
  private socket: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler> = new Map();
  private reconnectTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private clientId: string;
  private pingInterval: number | null = null;
  private isConnecting: boolean = false;
  private isPrimaryGM: boolean = false;
  
  // Singleton instance
  private static instance: WebSocketManager | null = null;

  constructor(url: string, token: string) {
    ModuleLogger.functionEntry('WebSocketManager.constructor', { url, token: token ? '***' : 'none' });
    
    this.url = url;
    this.token = token;
    this.clientId = `foundry-${game.user?.id || Math.random().toString(36).substring(2, 15)}`;
    
    ModuleLogger.debug('Generated client ID', { clientId: this.clientId });
    
    // Determine if this is the primary GM (lowest user ID among full GMs with role 4)
    this.isPrimaryGM = this.checkIfPrimaryGM();
    
    ModuleLogger.info(`Created WebSocketManager with clientId: ${this.clientId}, isPrimaryGM: ${this.isPrimaryGM}`);
    
    // Listen for user join/leave events to potentially take over as primary
    if (game.user?.isGM && game.user?.role === 4) {
      // When another user connects or disconnects, check if we need to become primary
      ModuleLogger.debug('Registering user connection hooks');
      Hooks.on("userConnected", this.reevaluatePrimaryGM.bind(this));
      Hooks.on("userDisconnected", this.reevaluatePrimaryGM.bind(this));
    }
    
    ModuleLogger.functionExit('WebSocketManager.constructor');
  }
  
  /**
   * Factory method that ensures only one instance is created and only for GM users
   * @param url The WebSocket server URL
   * @param token The authorization token
   * @returns WebSocketManager instance or null if not GM
   */
  public static getInstance(url: string, token: string): WebSocketManager | null {
    ModuleLogger.functionEntry('WebSocketManager.getInstance', { url, hasToken: !!token });
    
    // Only create an instance if the user is a full GM (role 4), not Assistant GM
    const user = game.user;
    ModuleLogger.debug('Checking user permissions', { 
      userId: user?.id, 
      isGM: user?.isGM, 
      role: user?.role 
    });
    
    if (!user?.isGM || user?.role !== 4) {
      ModuleLogger.info(`WebSocketManager not created - user is not a full GM`);
      ModuleLogger.functionExit('WebSocketManager.getInstance', null);
      return null;
    }
    
    // Only create the instance once
    if (!WebSocketManager.instance) {
      ModuleLogger.info(`Creating new WebSocketManager instance`);
      WebSocketManager.instance = new WebSocketManager(url, token);
    } else {
      ModuleLogger.debug('Returning existing WebSocketManager instance');
    }
    
    ModuleLogger.functionExit('WebSocketManager.getInstance', 'instance');
    return WebSocketManager.instance;
  }

  /**
   * Determines if this GM has the lowest user ID among all active GMs
   */
  private checkIfPrimaryGM(): boolean {
    ModuleLogger.functionEntry('checkIfPrimaryGM');
    
    // Make sure current user is a full GM (role 4), not an Assistant GM
    const user = game.user;
    if (!user?.isGM || user?.role !== 4) {
      ModuleLogger.debug('User is not a full GM', { isGM: user?.isGM, role: user?.role });
      ModuleLogger.functionExit('checkIfPrimaryGM', false);
      return false;
    }
    
    const currentUserId = user?.id;
    // Only consider active users with role 4 (full GM), not Assistant GMs (role 3)
    const activeGMs = game.users?.filter((u: User) => u.role === 4 && u.active) || [];
    
    ModuleLogger.debug('Active GMs found', { 
      count: activeGMs.length, 
      ids: activeGMs.map(u => u.id) 
    });
    
    if (activeGMs.length === 0) {
      ModuleLogger.functionExit('checkIfPrimaryGM', false);
      return false;
    }
    
    // Sort by user ID (alphanumeric)
    const sortedGMs = [...activeGMs].sort((a: User, b: User) => (a.id || '').localeCompare(b.id || ''));
    
    // Check if current user has the lowest ID
    const isPrimary = sortedGMs[0]?.id === currentUserId;
    
    ModuleLogger.info(`Primary GM check - Current user: ${currentUserId}, Primary GM: ${sortedGMs[0]?.id}, isPrimary: ${isPrimary}`);
    
    ModuleLogger.functionExit('checkIfPrimaryGM', isPrimary);
    return isPrimary;
  }
  
  /**
   * Re-evaluate if this GM should be the primary when users connect/disconnect
   */
  private reevaluatePrimaryGM(): void {
    const wasPrimary = this.isPrimaryGM;
    this.isPrimaryGM = this.checkIfPrimaryGM();
    
    // If status changed, log it
    if (wasPrimary !== this.isPrimaryGM) {
      ModuleLogger.info(`Primary GM status changed: ${wasPrimary} -> ${this.isPrimaryGM}`);
      
      // If we just became primary, connect
      if (this.isPrimaryGM && !this.isConnected()) {
        ModuleLogger.info(`Taking over as primary GM, connecting WebSocket`);
        this.connect();
      }
      
      // If we're no longer primary, disconnect
      if (!this.isPrimaryGM && this.isConnected()) {
        ModuleLogger.info(`No longer primary GM, disconnecting WebSocket`);
        this.disconnect();
      }
    }
  }

  connect(): void {
    ModuleLogger.functionEntry('connect');
    
    // Double-check that user is still a full GM (role 4) and is the primary GM before connecting
    const user = game.user;
    if (!user?.isGM || user?.role !== 4) {
      ModuleLogger.info(`WebSocket connection aborted - user is not a full GM`);
      ModuleLogger.functionExit('connect');
      return;
    }
    
    if (!this.isPrimaryGM) {
      ModuleLogger.info(`WebSocket connection aborted - user is not the primary GM`);
      ModuleLogger.functionExit('connect');
      return;
    }
    
    if (this.isConnecting) {
      ModuleLogger.info(`Already attempting to connect`);
      ModuleLogger.functionExit('connect');
      return;
    }

    if (this.socket) {
      ModuleLogger.debug('Checking existing socket state', { readyState: this.socket.readyState });
      if (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN) {
        ModuleLogger.info(`WebSocket already connected or connecting`);
        ModuleLogger.functionExit('connect');
        return;
      }
    }

    this.isConnecting = true;
    ModuleLogger.debug('Starting connection attempt');

    try {
      // Build the WebSocket URL with query parameters
      const wsUrl = new URL(this.url);
      wsUrl.searchParams.set('id', this.clientId);
      wsUrl.searchParams.set('token', this.token);
      
      ModuleLogger.info(`Connecting to WebSocket at ${wsUrl.toString()}`);
      ModuleLogger.debug('Connection parameters', { 
        clientId: this.clientId, 
        hasToken: !!this.token 
      });
      
      // Create WebSocket and set up event handlers
      this.socket = new WebSocket(wsUrl.toString());

      // Add timeout for connection attempt
      const connectionTimeout = window.setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
          ModuleLogger.error(`Connection timed out`);
          this.socket.close();
          this.socket = null;
          this.isConnecting = false;
          this.scheduleReconnect();
        }
      }, 5000); // 5 second timeout

      this.socket.addEventListener('open', (event) => {
        window.clearTimeout(connectionTimeout);
        this.onOpen(event);
      });
      
      this.socket.addEventListener('close', (event) => {
        window.clearTimeout(connectionTimeout);
        this.onClose(event);
      });
      
      this.socket.addEventListener('error', (event) => {
        window.clearTimeout(connectionTimeout);
        this.onError(event);
      });
      
      this.socket.addEventListener('message', this.onMessage.bind(this));
    } catch (error) {
      ModuleLogger.error(`Error creating WebSocket:`, error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    ModuleLogger.functionEntry('disconnect');
    
    if (this.socket) {
      ModuleLogger.info(`Disconnecting WebSocket`);
      ModuleLogger.debug('Socket state before disconnect', { readyState: this.socket.readyState });
      this.socket.close(WSCloseCodes.Normal, "Disconnecting");
      this.socket = null;
    } else {
      ModuleLogger.debug('No socket to disconnect');
    }
    
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.reconnectAttempts = 0;
    this.isConnecting = false;
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  send(data: any): boolean {
    ModuleLogger.functionEntry('send', data);
    ModuleLogger.debug(`Send called, readyState: ${this.socket?.readyState}`);
    
    // Ensure we're connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        const jsonData = JSON.stringify(data);
        ModuleLogger.websocket('send', data);
        ModuleLogger.debug('Sending data size', { bytes: jsonData.length });
        this.socket.send(jsonData);
        ModuleLogger.functionExit('send', true);
        return true;
      } catch (error) {
        ModuleLogger.error(`Error sending message:`, error);
        ModuleLogger.functionExit('send', false);
        return false;
      }
    } else {
      ModuleLogger.warn(`WebSocket not ready, state: ${this.socket?.readyState}`);
      ModuleLogger.functionExit('send', false);
      return false;
    }
  }

  onMessageType(type: string, handler: MessageHandler): void {
    this.messageHandlers.set(type, handler);
  }

  private onOpen(_event: Event): void {
    ModuleLogger.functionEntry('onOpen');
    ModuleLogger.info(`WebSocket connected`);
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    ModuleLogger.debug('Connection established', { 
      clientId: this.clientId, 
      isPrimaryGM: this.isPrimaryGM 
    });
    
    // Send an initial ping
    this.send({ type: "ping" });
    
    // Start ping interval using the setting value
    const pingIntervalSeconds = game.settings.get(moduleId, "pingInterval") as number;
    const pingIntervalMs = pingIntervalSeconds * 1000;
    ModuleLogger.info(`Starting application ping interval: ${pingIntervalSeconds} seconds`);
    
    // Clear any existing interval first
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
    }
    
    this.pingInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: "ping" });
      }
    }, pingIntervalMs);
  }

  private onClose(event: CloseEvent): void {
    ModuleLogger.functionEntry('onClose', { code: event.code, reason: event.reason });
    ModuleLogger.info(`WebSocket disconnected: ${event.code} - ${event.reason}`);
    ModuleLogger.debug('Close event details', { 
      wasClean: event.wasClean, 
      code: event.code, 
      reason: event.reason 
    });
    this.socket = null;
    this.isConnecting = false;
    
    // Clear ping interval
    if (this.pingInterval !== null) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    // Don't reconnect if this was a normal closure or if not primary GM
    if (event.code !== WSCloseCodes.Normal && this.isPrimaryGM) {
      this.scheduleReconnect();
    }
  }

  private onError(event: Event): void {
    ModuleLogger.error(`WebSocket error:`, event);
    this.isConnecting = false;
  }

  private async onMessage(event: MessageEvent): Promise<void> {
    ModuleLogger.functionEntry('onMessage');
    try {
      ModuleLogger.debug('Raw message received', { dataLength: event.data.length });
      const data = JSON.parse(event.data);
      ModuleLogger.websocket('receive', data);
      
      if (data.type && this.messageHandlers.has(data.type)) {
        ModuleLogger.info(`Handling message of type: ${data.type}`);
        ModuleLogger.debug('Calling handler for message type', { 
          type: data.type, 
          hasHandler: this.messageHandlers.has(data.type) 
        });
        this.messageHandlers.get(data.type)!(data, {socketManager: this} as HandlerContext);
      } else if (data.type) {
        ModuleLogger.warn(`No handler for message type: ${data.type}`);
        ModuleLogger.debug('Available handlers', { 
          handlers: Array.from(this.messageHandlers.keys()) 
        });
      }
    } catch (error) {
      ModuleLogger.error(`Error processing message:`, error);
      ModuleLogger.debug('Failed message data', { rawData: event.data });
    }
    ModuleLogger.functionExit('onMessage');
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      return; // Already scheduled
    }
    
    // Read settings for reconnection parameters
    const maxAttempts = game.settings.get(moduleId, "reconnectMaxAttempts") as number;
    const baseDelay = game.settings.get(moduleId, "reconnectBaseDelay") as number;
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > maxAttempts) {
      ModuleLogger.error(`Maximum reconnection attempts (${maxAttempts}) reached`);
      this.reconnectAttempts = 0; // Reset for future disconnections
      return;
    }
    
    // Calculate delay with exponential backoff (max 30 seconds)
    const delay = Math.min(30000, baseDelay * Math.pow(2, this.reconnectAttempts - 1));
    ModuleLogger.info(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${maxAttempts})`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      // Only attempt reconnect if still the primary GM
      if (this.isPrimaryGM) {
         ModuleLogger.info(`Attempting reconnect...`);
         ModuleLogger.debug('Reconnect conditions', { 
           isPrimaryGM: this.isPrimaryGM, 
           attempt: this.reconnectAttempts 
         });
         this.connect();
      } else {
         ModuleLogger.info(`Reconnect attempt aborted - no longer primary GM.`);
         this.reconnectAttempts = 0; // Reset attempts if not primary
      }
    }, delay);
  }
}
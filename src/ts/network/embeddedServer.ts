// @ts-nocheck
import { ModuleLogger } from "../utils/logger";
import { moduleId } from "../constants";

interface ClientInfo {
  ws: any;
  id: string;
  token: string;
  connectedAt: Date;
  lastPing: Date;
}

export class EmbeddedWebSocketServer {
  private server: any = null;
  private wss: any = null;
  private clients: Map<string, ClientInfo> = new Map();
  private port: number;
  private isRunning: boolean = false;
  private cleanupInterval: number | null = null;
  
  constructor(port: number = 8080) {
    this.port = port;
  }
  
  async start(): Promise<void> {
    if (this.isRunning) {
      ModuleLogger.warn("Embedded server already running");
      return;
    }
    
    try {
      ModuleLogger.info(`Starting embedded WebSocket server on port ${this.port}`);
      
      // Since we're in a browser environment, we need to use a different approach
      // We'll create a simple WebSocket relay that connects to the local server
      ModuleLogger.warn("Browser environment detected. Embedded server requires a local Node.js process.");
      ui.notifications.warn("Embedded server mode requires running the local server separately. Please run 'npm run local-server' in a terminal.");
      throw new Error("Cannot create HTTP server in browser environment. Please run the local server separately.");
      
      this.wss.on('connection', (ws: any, req: any) => {
        this.handleConnection(ws, req);
      });
      
      // Start listening
      await new Promise<void>((resolve, reject) => {
        this.server.listen(this.port, 'localhost', () => {
          ModuleLogger.info(`Embedded WebSocket server listening on ws://localhost:${this.port}`);
          this.isRunning = true;
          resolve();
        });
        
        this.server.on('error', (error: any) => {
          ModuleLogger.error('Server error:', error);
          reject(error);
        });
      });
      
      // Start cleanup interval
      this.cleanupInterval = window.setInterval(() => {
        this.cleanupStaleConnections();
      }, 30000);
      
      // Update module status
      game.settings.set(moduleId, "embeddedServerStatus", "running");
      
    } catch (error) {
      ModuleLogger.error("Failed to start embedded server:", error);
      throw error;
    }
  }
  
  async stop(): Promise<void> {
    if (!this.isRunning) {
      ModuleLogger.warn("Embedded server not running");
      return;
    }
    
    ModuleLogger.info("Stopping embedded WebSocket server");
    
    // Clear cleanup interval
    if (this.cleanupInterval !== null) {
      window.clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Close all client connections
    for (const [clientId, client] of this.clients.entries()) {
      try {
        client.ws.close(1000, 'Server shutting down');
      } catch (error) {
        ModuleLogger.error(`Error closing client ${clientId}:`, error);
      }
    }
    this.clients.clear();
    
    // Close WebSocket server
    if (this.wss) {
      await new Promise<void>((resolve) => {
        this.wss.close(() => {
          ModuleLogger.debug("WebSocket server closed");
          resolve();
        });
      });
    }
    
    // Close HTTP server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server.close(() => {
          ModuleLogger.debug("HTTP server closed");
          resolve();
        });
      });
    }
    
    this.isRunning = false;
    this.server = null;
    this.wss = null;
    
    // Update module status
    game.settings.set(moduleId, "embeddedServerStatus", "stopped");
  }
  
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }
  
  isActive(): boolean {
    return this.isRunning;
  }
  
  getClientCount(): number {
    return this.clients.size;
  }
  
  private handleConnection(ws: any, req: any): void {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const clientId = url.searchParams.get('id') || `client-${Date.now()}`;
    const token = url.searchParams.get('token');
    
    ModuleLogger.info(`New embedded server connection: ${clientId}`);
    
    // Store client
    this.clients.set(clientId, {
      ws,
      id: clientId,
      token: token || '',
      connectedAt: new Date(),
      lastPing: new Date()
    });
    
    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      clientId,
      message: 'Connected to Foundry embedded WebSocket server'
    }));
    
    // Handle messages
    ws.on('message', (message: any) => {
      try {
        const data = JSON.parse(message.toString());
        ModuleLogger.debug(`Embedded server received from ${clientId}:`, data.type);
        
        // Update last ping time
        if (data.type === 'ping') {
          const client = this.clients.get(clientId);
          if (client) {
            client.lastPing = new Date();
          }
          
          ws.send(JSON.stringify({
            type: 'pong',
            timestamp: Date.now()
          }));
          return;
        }
        
        // Forward message to the main WebSocket manager
        this.forwardToFoundry(clientId, data, ws);
        
      } catch (error) {
        ModuleLogger.error(`Error processing embedded server message:`, error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          error: error.message
        }));
      }
    });
    
    // Handle disconnect
    ws.on('close', (code: number, reason: string) => {
      ModuleLogger.info(`Embedded server client ${clientId} disconnected. Code: ${code}, Reason: ${reason}`);
      this.clients.delete(clientId);
    });
    
    // Handle errors
    ws.on('error', (error: any) => {
      ModuleLogger.error(`Embedded server WebSocket error for ${clientId}:`, error);
    });
  }
  
  private forwardToFoundry(clientId: string, data: any, ws: any): void {
    // Import and use the existing router handlers
    import("./routers/all").then(({ allRouters }) => {
      // Find matching router
      for (const router of allRouters) {
        const route = router.routes.find(r => r.actionType === data.type);
        if (route) {
          ModuleLogger.debug(`Embedded server handling ${data.type} with ${router.title}`);
          
          // Create a mock context that sends responses back through embedded server
          const context = {
            socketManager: {
              send: (response: any) => {
                ModuleLogger.debug(`Embedded server sending response:`, response.type);
                ws.send(JSON.stringify(response));
              }
            }
          };
          
          // Call the handler
          route.handler(data, context);
          return;
        }
      }
      
      // No handler found
      ModuleLogger.warn(`Embedded server: no handler for message type: ${data.type}`);
      ws.send(JSON.stringify({
        type: 'error',
        requestId: data.requestId,
        message: `Unknown message type: ${data.type}`
      }));
    });
  }
  
  private cleanupStaleConnections(): void {
    const now = new Date();
    const timeout = 60000; // 60 seconds
    
    for (const [clientId, client] of this.clients.entries()) {
      const timeSinceLastPing = now.getTime() - client.lastPing.getTime();
      if (timeSinceLastPing > timeout) {
        ModuleLogger.info(`Removing stale embedded server client: ${clientId}`);
        try {
          client.ws.close(1000, 'Ping timeout');
        } catch (error) {
          ModuleLogger.error(`Error closing stale client:`, error);
        }
        this.clients.delete(clientId);
      }
    }
  }
}

// Global instance
let embeddedServer: EmbeddedWebSocketServer | null = null;

export function getEmbeddedServer(): EmbeddedWebSocketServer {
  if (!embeddedServer) {
    const port = game.settings.get(moduleId, "embeddedServerPort") as number || 8080;
    embeddedServer = new EmbeddedWebSocketServer(port);
  }
  return embeddedServer;
}

export async function startEmbeddedServer(): Promise<void> {
  const server = getEmbeddedServer();
  await server.start();
}

export async function stopEmbeddedServer(): Promise<void> {
  const server = getEmbeddedServer();
  await server.stop();
}

export async function restartEmbeddedServer(): Promise<void> {
  const server = getEmbeddedServer();
  await server.restart();
}
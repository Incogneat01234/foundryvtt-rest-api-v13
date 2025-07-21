# Foundry VTT MCP Server - Comprehensive Development Plan

## Executive Summary

This document outlines the development of a Model Context Protocol (MCP) server that enables Claude Desktop to interact with Foundry Virtual Tabletop (VTT) through the Foundry REST API WebSocket interface. The MCP server will provide a comprehensive set of tools allowing AI assistants to read game state, create content, manage combat, and enhance the tabletop RPG experience.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technical Stack](#technical-stack)
3. [WebSocket API Integration](#websocket-api-integration)
4. [MCP Tools Specification](#mcp-tools-specification)
5. [Resource Providers](#resource-providers)
6. [Context7 Grounding Strategy](#context7-grounding-strategy)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)
9. [Use Cases & Examples](#use-cases--examples)

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Claude Desktop  │────▶│   MCP Server    │────▶│ Foundry REST API│
│                 │◀────│                 │◀────│   (WebSocket)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │                         │
                               ▼                         ▼
                        ┌─────────────┐          ┌─────────────┐
                        │Context Cache│          │ Foundry VTT │
                        └─────────────┘          └─────────────┘
```

### Component Responsibilities

1. **MCP Server**: Bridge between Claude and Foundry, manages WebSocket connection, implements MCP protocol
2. **Context Cache**: Stores frequently accessed data to reduce API calls
3. **WebSocket Client**: Maintains persistent connection to Foundry REST API relay
4. **Tool Registry**: Defines all available MCP tools and their schemas
5. **Resource Providers**: Supply contextual information about game state

## Technical Stack

### Core Dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "ws": "^8.0.0",
    "winston": "^3.0.0",
    "zod": "^3.0.0",
    "dotenv": "^16.0.0",
    "node-cache": "^5.0.0"
  },
  "devDependencies": {
    "@types/ws": "^8.0.0",
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Project Structure
```
foundry-mcp-server/
├── src/
│   ├── index.ts                 # MCP server entry point
│   ├── websocket/
│   │   ├── client.ts           # WebSocket connection manager
│   │   ├── message-handler.ts  # Message routing
│   │   └── types.ts            # WebSocket message types
│   ├── tools/
│   │   ├── entity/             # Entity management tools
│   │   ├── combat/             # Combat & encounter tools
│   │   ├── roll/               # Dice rolling tools
│   │   ├── search/             # Search & discovery tools
│   │   ├── automation/         # Macro & script tools
│   │   └── file/               # File management tools
│   ├── resources/
│   │   ├── providers/          # Resource provider implementations
│   │   └── cache.ts            # Context caching layer
│   └── utils/
│       ├── foundry-types.ts    # Foundry data structures
│       ├── logger.ts           # Logging utilities
│       └── validators.ts       # Input validation
├── context7/                    # Foundry API documentation
├── tests/
├── .env.example
└── package.json
```

## WebSocket API Integration

### Connection Management
```typescript
interface WebSocketConfig {
  url: string;              // wss://foundryvtt-rest-api-relay.fly.dev
  apiKey: string;           // Authentication token
  worldId: string;          // Target world identifier
  reconnectAttempts: number;
  reconnectDelay: number;
  pingInterval: number;
}

class FoundryWebSocketClient {
  private ws: WebSocket;
  private messageQueue: Map<string, PendingRequest>;
  private reconnectTimer: NodeJS.Timeout;
  
  async connect(): Promise<void>;
  async send(message: WebSocketMessage): Promise<WebSocketResponse>;
  handleReconnection(): void;
  handleMessage(data: string): void;
}
```

### Message Protocol
```typescript
interface WebSocketMessage {
  type: string;
  requestId: string;
  [key: string]: any;
}

interface WebSocketResponse {
  type: string;
  requestId: string;
  error?: string;
  data?: any;
}
```

## MCP Tools Specification

### 1. Entity Management Tools

#### `foundry_get_entity`
```typescript
{
  name: "foundry_get_entity",
  description: "Retrieve any entity (Actor, Item, Scene, etc.) by UUID",
  inputSchema: {
    type: "object",
    properties: {
      uuid: {
        type: "string",
        description: "Entity UUID (e.g., 'Actor.abc123', 'Item.def456')"
      },
      includeItems: {
        type: "boolean",
        description: "Include embedded items for actors",
        default: true
      }
    },
    required: ["uuid"]
  }
}
```

#### `foundry_create_entity`
```typescript
{
  name: "foundry_create_entity",
  description: "Create a new entity in the world",
  inputSchema: {
    type: "object",
    properties: {
      entityType: {
        type: "string",
        enum: ["Actor", "Item", "Scene", "JournalEntry", "Macro", "RollTable", "Playlist"],
        description: "Type of entity to create"
      },
      data: {
        type: "object",
        description: "Entity data following Foundry's data model"
      },
      folder: {
        type: "string",
        description: "Folder ID to place the entity in"
      }
    },
    required: ["entityType", "data"]
  }
}
```

#### `foundry_update_entity`
```typescript
{
  name: "foundry_update_entity",
  description: "Update an existing entity",
  inputSchema: {
    type: "object",
    properties: {
      uuid: {
        type: "string",
        description: "Entity UUID to update"
      },
      updates: {
        type: "object",
        description: "Update data (can use dot notation for nested properties)"
      },
      diff: {
        type: "boolean",
        description: "Whether to diff the update",
        default: true
      }
    },
    required: ["uuid", "updates"]
  }
}
```

#### `foundry_delete_entity`
```typescript
{
  name: "foundry_delete_entity",
  description: "Delete an entity from the world",
  inputSchema: {
    type: "object",
    properties: {
      uuid: {
        type: "string",
        description: "Entity UUID to delete"
      },
      deleteSubItems: {
        type: "boolean",
        description: "Also delete embedded items",
        default: false
      }
    },
    required: ["uuid"]
  }
}
```

#### `foundry_modify_attribute`
```typescript
{
  name: "foundry_modify_attribute",
  description: "Increase or decrease a numeric attribute",
  inputSchema: {
    type: "object",
    properties: {
      uuid: {
        type: "string",
        description: "Entity UUID"
      },
      attribute: {
        type: "string",
        description: "Attribute path (e.g., 'system.attributes.hp.value')"
      },
      delta: {
        type: "number",
        description: "Amount to change (positive or negative)"
      }
    },
    required: ["uuid", "attribute", "delta"]
  }
}
```

#### `foundry_transfer_item`
```typescript
{
  name: "foundry_transfer_item",
  description: "Transfer an item between actors",
  inputSchema: {
    type: "object",
    properties: {
      itemUuid: {
        type: "string",
        description: "UUID of the item to transfer"
      },
      fromUuid: {
        type: "string",
        description: "Source actor UUID (optional if item UUID is fully qualified)"
      },
      toUuid: {
        type: "string",
        description: "Target actor UUID"
      },
      quantity: {
        type: "number",
        description: "Quantity to transfer (for stackable items)"
      }
    },
    required: ["itemUuid", "toUuid"]
  }
}
```

#### `foundry_kill_entity`
```typescript
{
  name: "foundry_kill_entity",
  description: "Mark an entity as defeated/dead",
  inputSchema: {
    type: "object",
    properties: {
      uuid: {
        type: "string",
        description: "Entity UUID to defeat"
      },
      applyEffects: {
        type: "boolean",
        description: "Apply dead/unconscious status effect",
        default: true
      }
    },
    required: ["uuid"]
  }
}
```

### 2. Combat & Encounter Tools

#### `foundry_get_combat_state`
```typescript
{
  name: "foundry_get_combat_state",
  description: "Get current combat encounters and their state",
  inputSchema: {
    type: "object",
    properties: {
      includeInactive: {
        type: "boolean",
        description: "Include non-active encounters",
        default: false
      }
    }
  }
}
```

#### `foundry_start_encounter`
```typescript
{
  name: "foundry_start_encounter",
  description: "Start a new combat encounter",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Encounter name"
      },
      combatants: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Array of token/actor UUIDs to add"
      },
      rollInitiative: {
        type: "string",
        enum: ["all", "npc", "none"],
        description: "Who to roll initiative for",
        default: "npc"
      },
      activateImmediately: {
        type: "boolean",
        description: "Start combat immediately",
        default: true
      }
    }
  }
}
```

#### `foundry_combat_turn`
```typescript
{
  name: "foundry_combat_turn",
  description: "Navigate combat turns and rounds",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["next-turn", "previous-turn", "next-round", "previous-round"],
        description: "Navigation action"
      },
      encounterId: {
        type: "string",
        description: "Specific encounter ID (uses active if not provided)"
      }
    },
    required: ["action"]
  }
}
```

#### `foundry_modify_combat`
```typescript
{
  name: "foundry_modify_combat",
  description: "Add or remove combatants from encounter",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "remove"],
        description: "Modification action"
      },
      combatants: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Token/actor UUIDs"
      },
      encounterId: {
        type: "string",
        description: "Target encounter (uses active if not provided)"
      }
    },
    required: ["action", "combatants"]
  }
}
```

#### `foundry_end_encounter`
```typescript
{
  name: "foundry_end_encounter",
  description: "End a combat encounter",
  inputSchema: {
    type: "object",
    properties: {
      encounterId: {
        type: "string",
        description: "Encounter to end (uses active if not provided)"
      }
    }
  }
}
```

### 3. Dice Rolling Tools

#### `foundry_roll_dice`
```typescript
{
  name: "foundry_roll_dice",
  description: "Perform a dice roll with formula",
  inputSchema: {
    type: "object",
    properties: {
      formula: {
        type: "string",
        description: "Dice formula (e.g., '2d20kh + 5', '3d6')"
      },
      flavor: {
        type: "string",
        description: "Description of the roll"
      },
      speaker: {
        type: "string",
        description: "UUID of speaking entity"
      },
      whisper: {
        type: "array",
        items: {
          type: "string"
        },
        description: "User IDs to whisper to"
      },
      blind: {
        type: "boolean",
        description: "Blind roll (only GM sees result)",
        default: false
      }
    },
    required: ["formula"]
  }
}
```

#### `foundry_use_item`
```typescript
{
  name: "foundry_use_item",
  description: "Use an item (weapon attack, spell, consumable)",
  inputSchema: {
    type: "object",
    properties: {
      itemUuid: {
        type: "string",
        description: "UUID of item to use"
      },
      targetUuid: {
        type: "string",
        description: "Target token/actor UUID"
      },
      options: {
        type: "object",
        properties: {
          advantage: {
            type: "boolean",
            description: "Roll with advantage"
          },
          disadvantage: {
            type: "boolean",
            description: "Roll with disadvantage"
          },
          critical: {
            type: "boolean",
            description: "Automatic critical hit"
          }
        }
      }
    },
    required: ["itemUuid"]
  }
}
```

#### `foundry_get_roll_history`
```typescript
{
  name: "foundry_get_roll_history",
  description: "Get recent dice rolls",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Number of rolls to retrieve",
        default: 10,
        maximum: 50
      },
      actorUuid: {
        type: "string",
        description: "Filter by specific actor"
      }
    }
  }
}
```

### 4. Search & Discovery Tools

#### `foundry_search_content`
```typescript
{
  name: "foundry_search_content",
  description: "Search across all game content",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query"
      },
      types: {
        type: "array",
        items: {
          type: "string",
          enum: ["Actor", "Item", "Scene", "JournalEntry", "Macro", "RollTable"]
        },
        description: "Entity types to search"
      },
      includeCompendiums: {
        type: "boolean",
        description: "Search in compendiums",
        default: true
      },
      fuzzy: {
        type: "boolean",
        description: "Use fuzzy matching",
        default: true
      },
      limit: {
        type: "number",
        description: "Maximum results",
        default: 20
      }
    },
    required: ["query"]
  }
}
```

#### `foundry_browse_structure`
```typescript
{
  name: "foundry_browse_structure",
  description: "Browse world folders and compendiums",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Folder path or 'root' for top level"
      },
      includeContents: {
        type: "boolean",
        description: "Include folder contents",
        default: false
      }
    }
  }
}
```

#### `foundry_get_compendium`
```typescript
{
  name: "foundry_get_compendium",
  description: "List contents of a compendium",
  inputSchema: {
    type: "object",
    properties: {
      packId: {
        type: "string",
        description: "Compendium pack ID"
      },
      type: {
        type: "string",
        description: "Filter by entity type"
      }
    },
    required: ["packId"]
  }
}
```

### 5. Automation Tools

#### `foundry_execute_macro`
```typescript
{
  name: "foundry_execute_macro",
  description: "Execute a macro by ID or name",
  inputSchema: {
    type: "object",
    properties: {
      identifier: {
        type: "string",
        description: "Macro ID or name"
      },
      args: {
        type: "object",
        description: "Arguments to pass to the macro"
      }
    },
    required: ["identifier"]
  }
}
```

#### `foundry_run_script`
```typescript
{
  name: "foundry_run_script",
  description: "Execute custom JavaScript code in Foundry context",
  inputSchema: {
    type: "object",
    properties: {
      code: {
        type: "string",
        description: "JavaScript code to execute"
      },
      context: {
        type: "object",
        properties: {
          selectedTokens: {
            type: "boolean",
            description: "Include selected tokens in context"
          },
          targetedTokens: {
            type: "boolean",
            description: "Include targeted tokens in context"
          }
        }
      }
    },
    required: ["code"]
  }
}
```

#### `foundry_select_tokens`
```typescript
{
  name: "foundry_select_tokens",
  description: "Programmatically select tokens on the canvas",
  inputSchema: {
    type: "object",
    properties: {
      criteria: {
        type: "object",
        properties: {
          uuids: {
            type: "array",
            items: { type: "string" },
            description: "Specific token UUIDs"
          },
          actorNames: {
            type: "array",
            items: { type: "string" },
            description: "Select by actor name"
          },
          disposition: {
            type: "string",
            enum: ["hostile", "neutral", "friendly"],
            description: "Select by disposition"
          },
          attributes: {
            type: "object",
            description: "Match by attributes (e.g., {hp: {lt: 10}})"
          }
        }
      },
      action: {
        type: "string",
        enum: ["set", "add", "remove", "toggle"],
        description: "Selection action",
        default: "set"
      }
    },
    required: ["criteria"]
  }
}
```

### 6. File Management Tools

#### `foundry_upload_file`
```typescript
{
  name: "foundry_upload_file",
  description: "Upload a file to Foundry's data directory",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Target path in data directory"
      },
      content: {
        type: "string",
        description: "Base64 encoded file content"
      },
      overwrite: {
        type: "boolean",
        description: "Overwrite if exists",
        default: false
      }
    },
    required: ["path", "content"]
  }
}
```

#### `foundry_get_file`
```typescript
{
  name: "foundry_get_file",
  description: "Download a file from Foundry",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "File path to download"
      },
      encoding: {
        type: "string",
        enum: ["base64", "utf8"],
        description: "Return encoding",
        default: "base64"
      }
    },
    required: ["path"]
  }
}
```

#### `foundry_browse_files`
```typescript
{
  name: "foundry_browse_files",
  description: "Browse file system structure",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Directory path",
        default: "/"
      },
      extensions: {
        type: "array",
        items: { type: "string" },
        description: "Filter by file extensions"
      }
    }
  }
}
```

### 7. Scene & Canvas Tools

#### `foundry_get_scene_info`
```typescript
{
  name: "foundry_get_scene_info",
  description: "Get information about a scene",
  inputSchema: {
    type: "object",
    properties: {
      sceneId: {
        type: "string",
        description: "Scene ID (uses active if not provided)"
      },
      includeTokens: {
        type: "boolean",
        description: "Include token data",
        default: true
      },
      includeNotes: {
        type: "boolean",
        description: "Include journal notes",
        default: true
      }
    }
  }
}
```

#### `foundry_activate_scene`
```typescript
{
  name: "foundry_activate_scene",
  description: "Switch to a different scene",
  inputSchema: {
    type: "object",
    properties: {
      sceneId: {
        type: "string",
        description: "Scene ID to activate"
      }
    },
    required: ["sceneId"]
  }
}
```

## Resource Providers

### 1. Current Scene Context
```typescript
{
  uri: "foundry://scene/current",
  name: "Current Scene Context",
  description: "Provides information about the active scene",
  mimeType: "application/json",
  schema: {
    scene: {
      id: string,
      name: string,
      dimensions: { width: number, height: number },
      gridSize: number
    },
    tokens: Array<{
      uuid: string,
      name: string,
      position: { x: number, y: number },
      disposition: string,
      visibility: string
    }>,
    lighting: {
      globalLight: boolean,
      darkness: number
    }
  }
}
```

### 2. Party Summary
```typescript
{
  uri: "foundry://party/summary",
  name: "Party Summary",
  description: "Overview of player characters",
  mimeType: "application/json",
  schema: {
    characters: Array<{
      uuid: string,
      name: string,
      class: string,
      level: number,
      hp: { value: number, max: number },
      ac: number,
      abilities: Record<string, number>,
      skills: Record<string, { proficiency: number, total: number }>,
      equipment: Array<{ name: string, equipped: boolean }>
    }>
  }
}
```

### 3. Combat Tracker State
```typescript
{
  uri: "foundry://combat/active",
  name: "Active Combat",
  description: "Current combat encounter state",
  mimeType: "application/json",
  schema: {
    active: boolean,
    round: number,
    turn: number,
    combatants: Array<{
      id: string,
      name: string,
      initiative: number,
      isCurrentTurn: boolean,
      defeated: boolean,
      tokenId: string,
      actorId: string
    }>
  }
}
```

### 4. Recent Activity Log
```typescript
{
  uri: "foundry://activity/recent",
  name: "Recent Activity",
  description: "Recent game events and rolls",
  mimeType: "application/json",
  schema: {
    events: Array<{
      timestamp: string,
      type: "roll" | "combat" | "entity-change",
      actor: string,
      description: string,
      data: any
    }>
  }
}
```

### 5. World Configuration
```typescript
{
  uri: "foundry://world/config",
  name: "World Configuration",
  description: "Game system and world settings",
  mimeType: "application/json",
  schema: {
    system: {
      id: string,
      title: string,
      version: string
    },
    modules: Array<{
      id: string,
      title: string,
      active: boolean
    }>,
    settings: Record<string, any>
  }
}
```

## Context7 Grounding Strategy

### 1. System-Specific Documentation
```typescript
// Load system-specific documentation based on world.system
const systemDocs = {
  "dnd5e": "/context7/systems/dnd5e/",
  "pf2e": "/context7/systems/pf2e/",
  "swade": "/context7/systems/swade/",
  // ... other systems
};
```

### 2. API Reference Integration
```typescript
interface Context7Reference {
  core: {
    actors: string,      // Actor data model
    items: string,       // Item data model
    scenes: string,      // Scene structure
    combat: string,      // Combat system
  },
  system: {
    mechanics: string,   // System-specific rules
    character: string,   // Character creation
    items: string,       // Item types
  },
  examples: {
    macros: string[],    // Example macros
    modules: string[],   // Module patterns
  }
}
```

### 3. Dynamic Documentation Loading
```typescript
class Context7Provider {
  private cache: Map<string, string>;
  
  async getDocumentation(topic: string): Promise<string>;
  async getSystemSpecific(system: string, topic: string): Promise<string>;
  async searchDocumentation(query: string): Promise<SearchResult[]>;
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. **Project Setup**
   - Initialize TypeScript project
   - Configure MCP SDK
   - Set up testing framework
   - Create CI/CD pipeline

2. **WebSocket Client**
   - Implement connection manager
   - Message queue system
   - Reconnection logic
   - Error handling

3. **Basic Entity Tools**
   - Get entity
   - Create entity
   - Update entity
   - Delete entity

4. **Testing Infrastructure**
   - Mock WebSocket server
   - Tool testing framework
   - Integration tests

### Phase 2: Core Features (Week 3-4)
1. **Combat System**
   - All combat tools
   - Initiative tracking
   - Turn management

2. **Dice Rolling**
   - Roll formulas
   - Item usage
   - Roll history

3. **Resource Providers**
   - Scene context
   - Party summary
   - Combat tracker

4. **Caching Layer**
   - Entity cache
   - Scene cache
   - Invalidation logic

### Phase 3: Advanced Features (Week 5-6)
1. **Search & Discovery**
   - Content search
   - Structure browsing
   - Compendium access

2. **Automation Tools**
   - Macro execution
   - Script running
   - Token selection

3. **File Management**
   - Upload/download
   - Directory browsing
   - Asset management

4. **Context7 Integration**
   - Documentation loader
   - System detection
   - Reference caching

### Phase 4: Polish & Optimization (Week 7-8)
1. **Performance**
   - Batch operations
   - Request debouncing
   - Cache optimization

2. **Error Handling**
   - Graceful degradation
   - User-friendly errors
   - Recovery strategies

3. **Documentation**
   - User guide
   - API reference
   - Example prompts

4. **Testing**
   - Load testing
   - Edge cases
   - System compatibility

## Testing Strategy

### 1. Unit Tests
```typescript
describe('EntityTools', () => {
  it('should get entity by UUID', async () => {
    const result = await tools.foundry_get_entity({
      uuid: 'Actor.abc123'
    });
    expect(result).toHaveProperty('name');
  });
});
```

### 2. Integration Tests
```typescript
describe('Combat Flow', () => {
  it('should handle full combat encounter', async () => {
    // Start encounter
    // Add combatants
    // Roll initiative
    // Navigate turns
    // End encounter
  });
});
```

### 3. Mock Server
```typescript
class MockFoundryServer {
  private handlers: Map<string, Handler>;
  
  constructor() {
    this.setupHandlers();
  }
  
  handleMessage(message: any): any {
    const handler = this.handlers.get(message.type);
    return handler ? handler(message) : { error: 'Unknown type' };
  }
}
```

### 4. Performance Tests
```typescript
describe('Performance', () => {
  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() => 
      tools.foundry_get_entity({ uuid: 'Actor.test' })
    );
    const results = await Promise.all(requests);
    expect(results).toHaveLength(100);
  });
});
```

## Use Cases & Examples

### 1. Game Master Assistance
```
User: "What's the current combat situation?"

Claude uses:
- foundry_get_combat_state()
- Resource: foundry://combat/active
- foundry_get_entity() for each combatant

Response: "We're in round 3 of combat. The goblin archer is up next with 
initiative 18. Party status: Fighter at 28/45 HP, Wizard at full health 
but low on spell slots..."
```

### 2. Content Creation
```
User: "Create a magic sword that levels up with the player"

Claude uses:
- foundry_search_content({ query: "sword", types: ["Item"] })
- foundry_create_entity({
    entityType: "Item",
    data: {
      name: "Soulbound Blade",
      type: "weapon",
      system: { /* weapon stats */ }
    }
  })
- foundry_execute_macro() to add leveling script
```

### 3. Combat Automation
```
User: "Start an ambush encounter with 5 goblins"

Claude uses:
- foundry_search_content({ query: "goblin" })
- foundry_create_entity() x5 for goblin tokens
- foundry_start_encounter({
    name: "Goblin Ambush",
    combatants: [/* goblin UUIDs */],
    rollInitiative: "all"
  })
- foundry_run_script() to position goblins
```

### 4. Rules Assistance
```
User: "Can the rogue sneak attack this target?"

Claude uses:
- foundry_get_entity() for rogue
- foundry_get_entity() for target
- foundry_get_scene_info() for positioning
- Context7 reference for sneak attack rules

Response: "Yes, the rogue can sneak attack because:
1. Using a finesse weapon (rapier)
2. Ally is within 5 feet of target
3. Rogue doesn't have disadvantage"
```

### 5. Narrative Enhancement
```
User: "Describe what the party sees in this room"

Claude uses:
- Resource: foundry://scene/current
- foundry_browse_structure() for scene notes
- foundry_get_entity() for visible tokens

Response: "The ancient chamber stretches 40 feet across, dimly lit by 
flickering torches. You see 3 stone sarcophagi along the walls. A 
mysterious figure in robes stands near an altar..."
```

## Security Considerations

### 1. Input Validation
- Validate all UUIDs match expected format
- Sanitize code execution inputs
- Limit file paths to allowed directories
- Validate dice formulas

### 2. Rate Limiting
- Request throttling per tool
- WebSocket message queuing
- Cache to reduce API calls
- Batch operation limits

### 3. Permission Model
- Respect Foundry's permission system
- GM-only operations marked
- Player visibility rules
- Ownership verification

### 4. Error Handling
- Never expose system paths
- Sanitize error messages
- Log security events
- Graceful failure modes

## Configuration

### Environment Variables
```env
# WebSocket Configuration
FOUNDRY_WS_URL=wss://foundryvtt-rest-api-relay.fly.dev
FOUNDRY_API_KEY=your-api-key
FOUNDRY_WORLD_ID=your-world-id

# MCP Server Configuration
MCP_SERVER_NAME=foundry-vtt
MCP_SERVER_PORT=3000

# Caching
CACHE_TTL=300
CACHE_MAX_SIZE=1000

# Logging
LOG_LEVEL=info
LOG_FILE=foundry-mcp.log

# Security
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60
MAX_SCRIPT_LENGTH=10000
```

### Configuration Schema
```typescript
interface MCPConfig {
  server: {
    name: string;
    version: string;
    capabilities: string[];
  };
  foundry: {
    wsUrl: string;
    apiKey: string;
    worldId: string;
    reconnectAttempts: number;
    pingInterval: number;
  };
  cache: {
    ttl: number;
    maxSize: number;
    strategies: Record<string, CacheStrategy>;
  };
  security: {
    rateLimit: RateLimitConfig;
    allowedPaths: string[];
    maxScriptSize: number;
  };
}
```

## Monitoring & Logging

### 1. Metrics
- WebSocket connection status
- Request/response times
- Cache hit rates
- Error frequencies
- Tool usage statistics

### 2. Logging Levels
```typescript
enum LogLevel {
  ERROR = 0,   // Critical errors
  WARN = 1,    // Warnings
  INFO = 2,    // General info
  DEBUG = 3,   // Detailed debug
  TRACE = 4    // Full trace
}
```

### 3. Health Checks
```typescript
interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  components: {
    websocket: ComponentHealth;
    cache: ComponentHealth;
    tools: ComponentHealth;
  };
  uptime: number;
  version: string;
}
```

## Future Enhancements

### 1. Advanced Features
- **Vision & Lighting**: Manage dynamic lighting
- **Audio Integration**: Control music and SFX
- **Weather System**: Dynamic weather effects
- **Time Tracking**: Calendar and time management
- **Campaign Notes**: AI-assisted note taking

### 2. AI Enhancements
- **NPC Personality**: Dynamic NPC responses
- **Quest Generation**: Procedural quest creation
- **Encounter Balancing**: AI-powered CR calculation
- **Loot Generation**: Contextual treasure
- **Narrative Callbacks**: Story continuity tracking

### 3. Integration Extensions
- **Discord Bot**: Share to Discord
- **Stream Overlay**: OBS integration
- **Mobile Companion**: Phone/tablet interface
- **Voice Commands**: Speech recognition
- **AR Features**: Augmented reality support

## Conclusion

This MCP server will provide comprehensive integration between Claude Desktop and Foundry VTT, enabling AI-assisted game mastering, content creation, and gameplay automation. The modular architecture allows for easy extension and system-specific customization while maintaining security and performance.

The implementation follows MCP best practices with proper tool definitions, resource providers, and error handling. The phased approach ensures core functionality is delivered early with advanced features building on a solid foundation.
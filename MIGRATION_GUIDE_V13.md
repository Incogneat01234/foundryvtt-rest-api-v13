# Foundry VTT REST API - Migration Guide to v13

This guide documents the changes made to migrate the Foundry VTT REST API module from v12 to v13, with references to the official Foundry VTT v13 documentation.

## Overview

Foundry VTT v13 introduced significant changes including the ApplicationV2 framework, CSS Layers, and various API improvements. This module has been updated to ensure compatibility with these changes.

## Key Changes Made

### 1. Module Manifest Updates

**File:** `src/module.json`

Updated the compatibility section to target v13:
```json
"compatibility": {
  "minimum": "13",
  "verified": "13"
}
```

**Reference:** [Foundry VTT v13 Release Notes](https://foundryvtt.com/releases/13.346)

### 2. TypeScript Type Definitions

**File:** `package.json`

Updated the Foundry VTT types package to v13:
```json
"@league-of-foundry-developers/foundry-vtt-types": "^13.346.0-beta.20250720141111"
```

This ensures proper TypeScript support for v13 APIs.

**Reference:** [Foundry VTT API Documentation v13](https://foundryvtt.com/api/v13/index.html)

### 3. Document Class Resolution

**File:** `src/ts/utils/document.ts` (new file)

Added a utility function to properly resolve document classes using v13's CONFIG structure:

```typescript
export function getDocumentClass(documentType: string): typeof foundry.abstract.Document | null {
  // In v13, document classes are accessed through CONFIG
  const config = CONFIG as any;
  // ... implementation
}
```

This replaces the previously undefined `getDocumentClass` function and ensures compatibility with v13's document class structure.

**Reference:** [v13 Public API Guidelines](https://foundryvtt.com/api/v13/index.html)

### 4. ApplicationV2 Compatibility

The module's Dialog usage in `src/ts/module.ts` has been reviewed and confirmed to be compatible with v13's ApplicationV2 framework. The simple Dialog constructor pattern used remains valid.

**Reference:** [ApplicationV2 Framework](https://foundryvtt.com/api/v13/classes/foundry.applications.api.ApplicationV2.html)

## API Compatibility Status

### ✅ Compatible APIs

The following APIs used by this module remain compatible with v13:

1. **Core Game Objects**
   - `game.modules` - Module management
   - `game.settings` - Settings registration and management
   - `game.users` - User management
   - `game.world` - World data access
   - `game.combat` - Combat tracking

2. **Document APIs**
   - `fromUuid()` - UUID resolution
   - Document CRUD operations (`create()`, `update()`, `delete()`)
   - `toObject()` - Document serialization
   - `createEmbeddedDocuments()` - Embedded document creation

3. **Canvas APIs**
   - `canvas.tokens` - Token management
   - `canvas.tokens.controlled` - Selected tokens

4. **Hooks**
   - `Hooks.once("init")` - Module initialization
   - `Hooks.once("ready")` - System ready
   - `Hooks.on("createChatMessage")` - Chat message creation
   - `Hooks.on("renderSettingsConfig")` - Settings UI rendering
   - `Hooks.on("userConnected")` - User connection
   - `Hooks.on("userDisconnected")` - User disconnection

5. **Collections**
   - `.contents` - Collection contents array
   - `.size` - Collection size
   - `.entries()` - Collection iteration

## Testing Recommendations

After updating to v13, thoroughly test the following functionality:

1. **WebSocket Connectivity**
   - Verify connection to relay server
   - Test reconnection logic
   - Confirm primary GM detection

2. **Entity Operations**
   - Create, read, update, delete entities
   - Test selected token operations
   - Verify attribute modifications

3. **Search Functionality**
   - Ensure QuickInsert integration works
   - Test search filters
   - Verify result formatting

4. **Roll Detection**
   - Confirm dice roll capture
   - Test roll relay to WebSocket

5. **File System Operations**
   - Test backup operations
   - Verify file uploads/downloads

## Known v13 Changes to Monitor

1. **CSS Layers** - While this module has minimal UI, any custom styles should be tested with v13's CSS layer system.

2. **Theme V2** - The module should automatically adapt to v13's light/dark theme preferences.

3. **Private Methods** - Monitor for any deprecation warnings about private method usage.

## Installation Notes

When upgrading from v12 to v13:

1. Back up your world data before upgrading
2. Update Foundry VTT to v13
3. Install the updated module
4. All modules will be disabled on first v13 launch - re-enable this module
5. Test functionality before production use

## Development Setup

For developers working with this module:

1. Run `npm install` to update dependencies including v13 types
2. Use `npm run build` to compile with v13 type checking
3. Run `npm test` to execute tests

## Additional Resources

- [Foundry VTT v13 API Documentation](https://foundryvtt.com/api/v13/index.html)
- [v13 Migration Guides](https://foundryvtt.com/article/migration/)
- [Foundry VTT Discord #dev-support](https://discord.gg/foundryvtt)

## Conclusion

The migration to v13 has been completed with minimal changes required. The module's architecture was already well-aligned with v13's API structure, requiring only updates to version compatibility, type definitions, and the addition of a missing utility function.
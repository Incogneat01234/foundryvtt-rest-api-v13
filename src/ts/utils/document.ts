/**
 * Utility functions for document operations in Foundry v13
 */
import { ModuleLogger } from "./logger";

/**
 * Get the document class for a given document type
 * @param documentType The type of document (e.g., "Actor", "Item", "Scene")
 * @returns The document class or null if not found
 */
export function getDocumentClass(documentType: string): typeof foundry.abstract.Document | null {
  ModuleLogger.functionEntry('getDocumentClass', { documentType });
  // In v13, document classes are accessed through CONFIG
  const config = CONFIG as any;
  ModuleLogger.debug('Accessing CONFIG for document class lookup');
  
  // Standard document types
  const documentMap: Record<string, string> = {
    "Actor": "Actor",
    "Item": "Item", 
    "Scene": "Scene",
    "JournalEntry": "JournalEntry",
    "Macro": "Macro",
    "Playlist": "Playlist",
    "RollTable": "RollTable",
    "Cards": "Cards",
    "ChatMessage": "ChatMessage",
    "Combat": "Combat",
    "Folder": "Folder",
    "User": "User"
  };

  const configKey = documentMap[documentType];
  ModuleLogger.debug('Document map lookup', { 
    documentType, 
    configKey, 
    hasConfig: !!config[configKey] 
  });
  
  if (!configKey || !config[configKey]) {
    ModuleLogger.warn(`Document class not found for type: ${documentType}`);
    ModuleLogger.functionExit('getDocumentClass', null);
    return null;
  }

  const documentClass = config[configKey].documentClass || null;
  ModuleLogger.debug('Document class found', { 
    className: documentClass?.name 
  });
  ModuleLogger.functionExit('getDocumentClass', documentClass?.name || null);
  return documentClass;
}
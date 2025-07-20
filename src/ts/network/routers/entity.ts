// @ts-nocheck
import { Router } from "./baseRouter";
import { ModuleLogger } from "../../utils/logger";
import { deepSerializeEntity } from "../../utils/serialization";
import { getDocumentClass } from "../../utils/document";

export const router = new Router("entityRouter");

router.addRoute({
  actionType: "get-entity",
  handler: async (data, context) => {
    ModuleLogger.functionEntry('get-entity', data);
    const socketManager = context?.socketManager;
    ModuleLogger.info(`Received entity request:`, data);
    ModuleLogger.debug('Request details', { 
      uuid: data.uuid, 
      selected: data.selected, 
      actor: data.actor,
      requestId: data.requestId 
    });

    try {
      let entity;
      let entityData = [];
      let entityUUID = data.uuid;
      if (data.selected) {
        const controlledTokens = canvas?.tokens?.controlled;
        ModuleLogger.debug('Processing selected tokens', { 
          tokenCount: controlledTokens?.length || 0 
        });
        if (controlledTokens) {
          for (let token of controlledTokens) {
            ModuleLogger.debug('Processing token', { 
              tokenId: token.id, 
              hasActor: !!token.actor 
            });
            if (data.actor) {
              entity = token.actor;
            } else {
              entity = token.document;
            }
            if (entity) {
              entityUUID = entity.uuid;
              ModuleLogger.debug('Serializing entity', { 
                uuid: entityUUID, 
                type: entity.documentName 
              });
              // Use custom deep serialization
              entityData.push(deepSerializeEntity(entity));
            }
          }
        }
      } else {
        ModuleLogger.debug('Fetching entity by UUID', { uuid: data.uuid });
        entity = await fromUuid(data.uuid);
        // Use custom deep serialization
        entityData = entity ? deepSerializeEntity(entity) : null;
        ModuleLogger.debug('Entity fetch result', { 
          found: !!entity, 
          type: entity?.documentName 
        });
      }

      if (!entityData) {
        ModuleLogger.error(`Entity not found: ${data.uuid}`);
        const errorResponse = {
          type: "entity-data",
          requestId: data.requestId,
          uuid: data.uuid,
          error: "Entity not found",
          data: null,
        };
        ModuleLogger.debug('Sending error response', errorResponse);
        socketManager?.send(errorResponse);
        ModuleLogger.functionExit('get-entity', 'entity not found');
        return;
      }

      ModuleLogger.info(`Sending entity data for: ${data.uuid}`);
      ModuleLogger.debug('Entity data size', { 
        dataLength: JSON.stringify(entityData).length,
        isArray: Array.isArray(entityData)
      });

      const response = {
        type: "entity-data",
        requestId: data.requestId,
        uuid: entityUUID,
        data: entityData,
      };
      ModuleLogger.debug('Sending success response', { 
        requestId: response.requestId, 
        uuid: response.uuid 
      });
      socketManager?.send(response);
      ModuleLogger.functionExit('get-entity', 'success');
    } catch (error) {
      ModuleLogger.error(`Error getting entity:`, error);
      ModuleLogger.debug('Error details', { 
        errorName: (error as Error).name,
        errorStack: (error as Error).stack 
      });
      const errorResponse = {
        type: "entity-data",
        requestId: data.requestId,
        uuid: data.uuid,
        error: (error as Error).message,
        data: null,
      };
      socketManager?.send(errorResponse);
      ModuleLogger.functionExit('get-entity', 'error');
    }
  },
});

// Handle entity creation
router.addRoute({
  actionType: "create-entity",
  handler: async (data, context) => {
    ModuleLogger.functionEntry('create-entity', { 
      entityType: data.entityType, 
      folder: data.folder 
    });
    const socketManager = context?.socketManager;
    ModuleLogger.info(`Received create entity request for type: ${data.entityType}`);
    ModuleLogger.debug('Create data', data.data);

    try {
      const DocumentClass = getDocumentClass(data.entityType);
      ModuleLogger.debug('Document class lookup', { 
        entityType: data.entityType, 
        found: !!DocumentClass 
      });
      if (!DocumentClass) {
        throw new Error(`Invalid entity type: ${data.entityType}`);
      }

      const createData = {
        ...data.data,
        folder: data.folder || null
      };

      ModuleLogger.debug('Creating entity with data', createData);
      const entity = await DocumentClass.create(createData);

      if (!entity) {
        throw new Error("Failed to create entity");
      }
      
      ModuleLogger.debug('Entity created successfully', { 
        uuid: entity.uuid, 
        id: entity.id 
      });

      const response = {
        type: "entity-created",
        requestId: data.requestId,
        uuid: entity.uuid,
        entity: entity.toObject()
      };
      ModuleLogger.debug('Sending create response', { 
        requestId: response.requestId, 
        uuid: response.uuid 
      });
      socketManager?.send(response);
      ModuleLogger.functionExit('create-entity', 'success');
    } catch (error) {
      ModuleLogger.error(`Error creating entity:`, error);
      ModuleLogger.debug('Create error details', { 
        errorName: (error as Error).name,
        errorStack: (error as Error).stack 
      });
      socketManager?.send({
        type: "entity-created",
        requestId: data.requestId,
        error: (error as Error).message,
        message: "Failed to create entity"
      });
      ModuleLogger.functionExit('create-entity', 'error');
    }
  }
});

// Handle decrease attribute request
router.addRoute({
  actionType: "decrease-attribute",
  handler: async (data, context) => {
    const socketManager = context?.socketManager;
    ModuleLogger.info(`Received decrease attribute request for attribute: ${data.attribute}, amount: ${data.amount}`);

    try {
      if (!data.uuid && !data.selected) {
        throw new Error("UUID or selected is required");
      }
      if (!data.attribute) throw new Error("Attribute path is required");
      if (typeof data.amount !== 'number') throw new Error("Amount must be a number");

      const entities = [];
      if (data.selected) {
        const controlledTokens = canvas?.tokens?.controlled || [];
        for (const token of controlledTokens) {
          if (token.actor) {
            entities.push(token.actor);
          }
        }
      } else if (data.uuid) {
        const entity = await fromUuid(data.uuid);
        if (entity) {
          entities.push(entity);
        }
      }

      if (entities.length === 0) {
        throw new Error("No entities found to modify");
      }

      const results = [];
      for (const entity of entities) {
        const currentValue = getProperty(entity, data.attribute);
        if (typeof currentValue !== 'number') {
          throw new Error(`Attribute ${data.attribute} is not a number, found: ${typeof currentValue}`);
        }

        const newValue = currentValue - data.amount;
        const updateData: { [key: string]: number } = {};
        updateData[data.attribute] = newValue;

        await entity.update(updateData);

        results.push({
          uuid: (entity as any).uuid,
          attribute: data.attribute,
          oldValue: currentValue,
          newValue: newValue
        });
      }

      socketManager?.send({
        type: "modify-attribute-result",
        requestId: data.requestId,
        results,
        success: true
      });
    } catch (error) {
      ModuleLogger.error(`Error decreasing attribute:`, error);
      socketManager?.send({
        type: "modify-attribute-result",
        requestId: data.requestId,
        success: false,
        error: (error as Error).message
      });
    }
  }
});

// Handle increase attribute request
router.addRoute({
  actionType: "increase-attribute",
  handler: async (data, context) => {
    const socketManager = context?.socketManager;
    ModuleLogger.info(`Received increase attribute request for attribute: ${data.attribute}, amount: ${data.amount}`);

    try {
      if (!data.uuid && !data.selected) {
        throw new Error("UUID or selected is required");
      }
      if (!data.attribute) throw new Error("Attribute path is required");
      if (typeof data.amount !== 'number') throw new Error("Amount must be a number");

      const entities = [];
      if (data.selected) {
        const controlledTokens = canvas?.tokens?.controlled || [];
        for (const token of controlledTokens) {
          if (token.actor) {
            entities.push(token.actor);
          }
        }
      } else if (data.uuid) {
        const entity = await fromUuid(data.uuid);
        if (entity) {
          entities.push(entity);
        }
      }

      if (entities.length === 0) {
        throw new Error("No entities found to modify");
      }

      const results = [];
      for (const entity of entities) {
        const currentValue = getProperty(entity, data.attribute);
        if (typeof currentValue !== 'number') {
          throw new Error(`Attribute ${data.attribute} is not a number, found: ${typeof currentValue}`);
        }

        const newValue = currentValue + data.amount;
        const updateData: { [key: string]: unknown } = {};
        updateData[data.attribute] = newValue;

        await entity.update(updateData);

        results.push({
          uuid: (entity as any).uuid,
          attribute: data.attribute,
          oldValue: currentValue,
          newValue: newValue
        });
      }

      socketManager?.send({
        type: "modify-attribute-result",
        requestId: data.requestId,
        results,
        success: true
      });
    } catch (error) {
      ModuleLogger.error(`Error increasing attribute:`, error);
      socketManager?.send({
        type: "modify-attribute-result",
        requestId: data.requestId,
        success: false,
        error: (error as Error).message
      });
    }
  }
});

// Handle entity update
router.addRoute({
  actionType: "update-entity",
  handler: async (data, context) => {
    const socketManager = context?.socketManager;
    ModuleLogger.info(`Received update entity request for UUID: ${data.uuid}`);

    try {
      let entities = [];
      if (data.uuid) {
        entities.push(await fromUuid(data.uuid));
      } else if (data.selected) {
        const controlledTokens = canvas?.tokens?.controlled;
        if (controlledTokens) {
          for (let token of controlledTokens) {
            if (data.actor) {
              entities.push(token.actor);
            } else {
              entities.push(token.document);
            }
          }
        }
      }

      if (entities.length === 0) {
        throw new Error(`Entity not found: ${data.uuid}`);
      }

      for (let entity of entities) {
        await entity?.update(data.updateData);
      }

      let updatedEntities = [];
      for (let entity of entities) {
        updatedEntities.push(await fromUuid((entity as any).uuid));
      }

      socketManager?.send({
        type: "entity-updated",
        requestId: data.requestId,
        uuid: data.uuid,
        entity: updatedEntities.map(e => e?.toObject())
      });
    } catch (error) {
      ModuleLogger.error(`Error updating entity:`, error);
      socketManager?.send({
        type: "entity-updated",
        requestId: data.requestId,
        uuid: data.uuid,
        error: (error as Error).message,
        message: "Failed to update entity"
      });
    }
  }
});

// Handle entity deletion
router.addRoute({
  actionType: "delete-entity",
  handler: async (data, context) => {
    const socketManager = context?.socketManager;
    ModuleLogger.info(`Received delete entity request for UUID: ${data.uuid}`);

    try {
      let entities = [];
      if (data.uuid) {
        entities.push(await fromUuid(data.uuid));
      } else if (data.selected) {
        const controlledTokens = canvas?.tokens?.controlled;
        if (controlledTokens) {
          for (let token of controlledTokens) {
            if (data.actor) {
              entities.push(token.actor);
            } else {
              entities.push(token.document);
            }
          }
        }
      }

      if (!entities || entities.length === 0) {
        throw new Error(`Entity not found: ${data.uuid}`);
      }

      for (let entity of entities) {
        await entity?.delete();
      }

      socketManager?.send({
        type: "entity-deleted",
        requestId: data.requestId,
        uuid: data.uuid,
        success: true
      });
    } catch (error) {
      ModuleLogger.error(`Error deleting entity:`, error);
      socketManager?.send({
        type: "entity-deleted",
        requestId: data.requestId,
        uuid: data.uuid,
        error: (error as Error).message,
        message: "Failed to delete entity"
      });
    }
  }
});

// Handle kill request (mark token/actor as defeated)
router.addRoute({
  actionType: "kill-entity",
  handler: async (data, context) => {
    const socketManager = context?.socketManager;
    ModuleLogger.info(`Received kill request for UUID: ${data.uuid}`);

    try {
      const entities = [];

      if (data.uuid) {
        const entity = await fromUuid(data.uuid);
        if (entity) {
          entities.push(entity);
        } else {
          throw new Error(`Entity not found: ${data.uuid}`);
        }
      } else if (data.selected) {
        const controlledTokens = canvas?.tokens?.controlled || [];
        for (const token of controlledTokens) {
          if (token.document) {
            entities.push(token.document);
          }
        }
      }

      if (entities.length === 0) {
        throw new Error("No entities found to mark as defeated");
      }

      const results = [];

      for (const entity of entities) {
        let success = false;
        let message = "";

        if (entity.documentName === "Token") {
          const token = entity;
          const actor = (token as any).actor;

          if (!actor) {
            throw new Error("Token has no associated actor");
          }

          const combat = game.combat;
          if (combat) {
            const combatant = combat.combatants.find((c: Combatant) => 
              c.token?.id === token.id && c.token?.parent?.id === token.parent?.id
            );
            
            if (combatant) {
              await combatant.update({ defeated: true });
              ModuleLogger.info(`Marked token as defeated in combat`);
            }
          }

          try {
            if (hasProperty(actor, "system.attributes.hp")) {
              await actor.update({ "system.attributes.hp.value": 0 });
            } 
            else if (hasProperty(actor, "system.health")) {
              await actor.update({ "system.health.value": 0 });
            }
            else if (hasProperty(actor, "system.hp")) {
              await actor.update({ "system.hp.value": 0 });
            }
            else if (hasProperty(actor, "data.attributes.hp")) {
              await actor.update({ "data.attributes.hp.value": 0 });
            }
            ModuleLogger.info(`Set actor HP to 0`);
          } catch (err) {
            ModuleLogger.warn(`Could not set HP to 0: ${err}`);
          }

          try {
            const deadEffect = CONFIG.statusEffects?.find(e => 
              e.id === "dead" || e.id === "unconscious" || e.id === "defeated"
            );
            
            if (deadEffect) {
              await (token as any).toggleActiveEffect(deadEffect);
              ModuleLogger.info(`Added ${deadEffect.id} status effect to token`);
            } else {
              ModuleLogger.warn(`No dead status effect found`);
            }
          } catch (err) {
            ModuleLogger.warn(`Could not apply status effect: ${err}`);
          }

          success = true;
          message = "Token marked as defeated, HP set to 0, and dead effect applied";
        } else if (entity.documentName === "Actor") {
          const actor = entity;
          let tokensUpdated = 0;

          const scenes = game.scenes;
          if (scenes?.viewed) {
            const tokens = scenes.viewed.tokens.filter((t: TokenDocument) => t.actor?.id === actor.id);
            
            for (const token of tokens) {
              try {
                const deadEffect = CONFIG.statusEffects?.find(e => 
                  e.id === "dead" || e.id === "unconscious" || e.id === "defeated"
                );
                
                if (deadEffect) {
                  await (token as any).toggleActiveEffect(deadEffect);
                  tokensUpdated++;
                }
              } catch (err) {
                ModuleLogger.warn(`Could not apply status effect to token: ${err}`);
              }
            }
          }

          const combat = game.combat;
          if (combat) {
            const combatants = combat.combatants.filter((c: Combatant) => c.actor?.id === actor.id);
            
            if (combatants.length > 0) {
              await Promise.all(combatants.map(c => c.update({ defeated: true })));
              ModuleLogger.info(`Marked ${combatants.length} combatants as defeated`);
            }
          }

          try {
            if (hasProperty(actor, "system.attributes.hp")) {
              await actor.update({ "system.attributes.hp.value": 0 });
            } 
            else if (hasProperty(actor, "system.health")) {
              await actor.update({ "system.health.value": 0 });
            }
            else if (hasProperty(actor, "system.hp")) {
              await actor.update({ "system.hp.value": 0 });
            }
            else if (hasProperty(actor, "data.attributes.hp")) {
              await actor.update({ "data.attributes.hp.value": 0 });
            }
            ModuleLogger.info(`Set actor HP to 0`);
          } catch (err) {
            ModuleLogger.warn(`Could not set HP to 0: ${err}`);
          }

          success = true;
          message = `Actor marked as defeated, HP set to 0, and dead effect applied to ${tokensUpdated} tokens`;
        } else {
          throw new Error(`Cannot mark entity type ${entity.documentName} as defeated`);
        }

        results.push({
          uuid: (entity as any).uuid,
          success,
          message
        });
      }

      socketManager?.send({
        type: "kill-entity-result",
        requestId: data.requestId,
        results
      });
    } catch (error) {
      ModuleLogger.error(`Error marking entities as defeated:`, error);
      socketManager?.send({
        type: "kill-entity-result",
        requestId: data.requestId,
        success: false,
        error: (error as Error).message
      });
    }
  }
});

// Handle give item request
router.addRoute({
  actionType: "give-item",
  handler: async (data, context) => {
    const socketManager = context?.socketManager;
    ModuleLogger.info(`Received give item request from ${data.fromUuid} to ${data.toUuid}`);

    try {
      if (!data.toUuid && !data.selected) {
        throw new Error("Target UUID or selected is required");
      }
      if (!data.itemUuid) throw new Error("Item UUID is required");

      let fromEntity: any | null = null;
      if (data.fromUuid) {
        fromEntity = await fromUuid(data.fromUuid);
        
        if (fromEntity?.documentName !== "Actor") {
          throw new Error(`Source entity must be an Actor, got ${fromEntity?.documentName}`);
        }
      }

      if (data.selected) {
        data.toUuid = canvas?.tokens?.controlled[0]?.actor?.uuid;
      }
      const toEntity = await fromUuid(data.toUuid);
      if (!toEntity) throw new Error(`Target entity not found: ${data.toUuid}`);

      if (toEntity.documentName !== "Actor") {
        throw new Error(`Target entity must be an Actor, got ${toEntity.documentName}`);
      }

      const itemEntity = await fromUuid(data.itemUuid);
      if (!itemEntity) throw new Error(`Item not found: ${data.itemUuid}`);

      if (itemEntity.documentName !== "Item") {
        throw new Error(`Entity must be an Item, got ${itemEntity.documentName}`);
      }

      if (data.fromUuid && itemEntity.parent?.id !== fromEntity.id) {
        throw new Error(`Item ${data.itemUuid} does not belong to source actor ${data.fromUuid}`);
      }

      const itemData = itemEntity.toObject();
      delete itemData._id;

      if (data.quantity && typeof data.quantity === 'number') {
        if (itemData.system && itemData.system.quantity) {
          const originalQuantity = itemData.system.quantity;
          itemData.system.quantity = data.quantity;
          if (data.fromUuid) {
            if (data.quantity >= originalQuantity) {
              await itemEntity.delete();
            } else {
              await itemEntity.update({"system.quantity": originalQuantity - data.quantity});
            }
          }
        }
      } else {
        if (data.fromUuid) {
          await itemEntity.delete();
        }
      }

      const newItem = await toEntity.createEmbeddedDocuments("Item", [itemData]);

      socketManager?.send({
        type: "give-item-result",
        requestId: data.requestId,
        fromUuid: data.fromUuid,
        selected: data.selected,
        toUuid: data.toUuid,
        quantity: data.quantity,
        itemUuid: data.itemUuid,
        newItemId: newItem[0].id,
        success: true
      });
    } catch (error) {
      ModuleLogger.error(`Error giving item:`, error);
      socketManager?.send({
        type: "give-item-result",
        requestId: data.requestId,
        selected: data.selected,
        fromUuid: data.fromUuid || "",
        toUuid: data.toUuid || "",
        quantity: data.quantity,
        itemUuid: data.itemUuid || "",
        success: false,
        error: (error as Error).message
      });
    }
  }
});

// overworldMap.js
// Runalis overworld map coordinator.
//
// This file intentionally stays small.
// Most overworld logic has been split into:
//
// - overworldUtils.js
//   Constants, region logic, context creation, factories, noise, helpers.
//
// - overworldTerrain.js
//   Hidden tile generation and seamless visual terrainFeatures.
//
// - overworldEntities.js
//   Objects, resources, props, NPCs, POIs, dungeons, enemies.
//
// - runalisContentExpansion.js
//   Additional authored RPG content layered on top of the base overworld.
//
// This file should remain the single public entry point used by the game.

import { TILE } from './data.js';
import { ACT1_OVERWORLD_DISPLAY_NAME, ACT1_OVERWORLD_TITLE } from './worldNames.js';

import {
  OVERWORLD_W,
  OVERWORLD_H,
  START_TILE_X,
  START_TILE_Y,
  createMapContext,
  createRegionMetadata
} from './overworldUtils.js';

import {
  buildOverworldTerrain,
  createTerrainFeatures
} from './overworldTerrain.js';

import {
  createOverworldObjects,
  createOverworldEnemies
} from './overworldEntities.js';

import {
  applyRunalisContentExpansion
} from './RunalisContentExpansion.js';

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function createOverworldMap() {
  const ctx = createMapContext();

  buildOverworldTerrain(ctx);

  const terrainFeatures = createTerrainFeatures(ctx);
  const objects = createOverworldObjects(ctx);
  const enemies = createOverworldEnemies(ctx);

  // Layer authored RPG content on top of the procedural/modular overworld.
  // This keeps overworldEntities.js from becoming too large while still allowing
  // the world to feel more hand-authored and content-rich.
  applyRunalisContentExpansion(ctx, objects, enemies);

  return {
    mode: 'overworld',
    name: ACT1_OVERWORLD_DISPLAY_NAME,
    regionId: 'hearthmereFrontier',
    actId: 'act1',
    theme: 'hearthmereFrontier',
    width: OVERWORLD_W,
    height: OVERWORLD_H,
    tileSize: TILE,

    // Hidden gameplay grid.
    // Collision, resource placement, dungeon placement, minimap, and interactions
    // can continue using this.
    tiles: ctx.tiles,

    // Seamless visual world layer.
    // terrainRenderer.js draws this instead of rendering obvious square tiles.
    terrainFeatures,

    objects,
    enemies,

    drops: [],
    effects: [],
    combatEffects: [],

    spawn: {
      x: START_TILE_X * TILE,
      y: START_TILE_Y * TILE
    },

    mapMeta: {
      version: 8,
      title: ACT1_OVERWORLD_TITLE,
      description: 'Expanded 4x-area seamless-feature overworld with hidden gameplay tile logic and authored RPG content.',
      regions: createRegionMetadata()
    }
  };
}

// -----------------------------------------------------------------------------
// OPTIONAL DEBUG HELPERS
// -----------------------------------------------------------------------------

export function getOverworldSpawnPoint() {
  return {
    x: START_TILE_X * TILE,
    y: START_TILE_Y * TILE
  };
}

export function getOverworldTileSize() {
  return TILE;
}

export function getOverworldDimensions() {
  return {
    width: OVERWORLD_W,
    height: OVERWORLD_H,
    pixelWidth: OVERWORLD_W * TILE,
    pixelHeight: OVERWORLD_H * TILE
  };
}

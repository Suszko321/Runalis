// Hidden gameplay tiles and visual terrainFeatures remain separate, but share
// one authored geographic source. Ecology noise supplies texture and variation;
// it does not place Act I's roads, waterways, landmarks or escarpments.
import {buildEchorynTerrain,echorynTerrainFeatures} from './echorynLayout.js';

export function buildOverworldTerrain(ctx) {
  return buildEchorynTerrain(ctx);
}

export function createTerrainFeatures(ctx) {
  return echorynTerrainFeatures(ctx);
}

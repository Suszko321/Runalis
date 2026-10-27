// Presentation contract measured from the retained 64 x 80 player cells.
// TILE is 32 world pixels; the retained neutral silhouettes span 63-64 pixels.
export const WORLD_ART_STANDARD = Object.freeze({cellWidth:64,cellHeight:80,
  pixelsPerWorldUnit:1,tilePixels:32,visibleHumanoidHeight:64,actorFootOffset:18,outlinePixels:1,
  lightDirection:'upper left',materialRampSteps:4,sceneryCacheBytes:16*1024*1024});

export function worldObjectDepth(object) {
  // Ground art must stay under feet even when its interaction origin is south.
  if (['editorPath','editorWater'].includes(object.kind) ||
      ['continentCourt','continentFarm','continentStairs','continentBoardwalk'].includes(object.propType) ||
      object.pieceType==='courtyard') return -Infinity;
  return Number.isFinite(object.sortY) ? object.sortY : (Number(object.y)||0)+(object.kind==='npc'?WORLD_ART_STANDARD.actorFootOffset:0);
}

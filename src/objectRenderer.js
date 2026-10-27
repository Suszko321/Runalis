import {drawAuthoredObject} from './worldAtmosphereRenderer.js';
import {drawWorkshopFixture,drawWorkshopWorker} from './workshopArt.js';
import {lootDiscoveryProfile} from './gameplayDiscoveries.js';
import {ITEMS} from './data.js';
import {drawContinentalObject} from './continentArt.js';
import {drawActionStateVisuals,drawCombatProjectiles} from './combatVisualsRenderer.js';
import {drawOrrakaiFixture} from './orrakaiRenderer.js';
import {drawForestKit,drawEchorynMajorPiece,drawEchorynLandmark} from './echorynRenderer.js';
import {objectInInteractionRange} from './interactionRange.js';
// objectRenderer.js
// Runalis object renderer.
//
// Responsibilities:
// - World objects.
// - NPCs.
// - Resource nodes.
// - Campfires / shrines.
// - Dungeon entrances and exits.
// - World drops.
// - Decorative environmental props.
// - Major POI coded assets: Gothic Castle, Demon Lair, Last Dawn.
//
// This module intentionally does NOT render:
// - Terrain tiles.
// - Enemies.
// - Player.
// - Summons.
// - Combat projectiles.
// - Combat effects.
// - Minimap.
// - Floating text.
//
// Updated:
// - Prevents duplicate NPC labels caused by drawHumanActor + objectRenderer labels.
// - Prevents instructor class labels from drawing on top of NPC names.
// - Adds simple label collision avoidance.
// - Hides low-priority campfire labels by default.
// - Supports object.hideLabel, object.forceLabel, and object.labelPriority.

import { drawHumanActor } from './humanRenderer.js?v=20260924b';
import { renameLastDawn, getEnemyNameplate } from './humanoidEnemies.js';
import { drawPropSprite, drawTownPropSprite } from './spriteArt.js';
import {worldObjectDepth} from './worldArtDirection.js';
import {drawNarrativeProp,drawDungeonInteractable} from './propArt.js';
import {drawArchitectureArt,drawEnvironmentProp,drawTownBuildingArt,drawLandmarkArt,drawTownDetailProp} from './environmentArt.js';
import { TILE } from './data.js';
import {
  drawPixelGroundShadow,
  getClassAccentColor,
  getClassVisualPalette,
  steppedSine
} from './visualStyle.js';
import { getEnvironmentVisualProfile } from './environmentVisualStyle.js';
import { getPoiStructureProfile } from './poiStructureArchetypes.js';
import { npcHasQuestInteraction } from './dialogueSystem.js';
import {
  getVisualStatus,
  isDeveloperArtMode,
  shouldRenderVisual,
  VISUAL_STATUS
} from './modelRegistry.js';

// -----------------------------------------------------------------------------
// LABEL STATE
// -----------------------------------------------------------------------------

let labelReservations = [];
let activeEnvironmentProfile = getEnvironmentVisualProfile(null);

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function drawObjects(ctx, world, camera, questActor = null, actorLayers = []) {
  if (!ctx || !world || !camera) return;

  labelReservations = [];
  activeEnvironmentProfile = getEnvironmentVisualProfile(world);

  const objects = (world.objects || []).filter(object => {
    if (!object || object.depleted || object.presentationRetired) return false;
    const p = screen(object, camera);
    return isOnScreen(ctx, p.x, p.y, Math.max(280, Number(object.drawRadius || 0)));
  });

  // Actors and world objects share one foot-depth order. Presentation callbacks
  // keep simulation objects untouched and preserve NPC interaction identities.
  for (const layer of actorLayers) objects.push(layer);
  objects.sort((a, b) => {
    const ay = worldObjectDepth(a);
    const by = worldObjectDepth(b);
    return ay === by ? 0 : ay - by;
  });

  for (const object of objects) {
    if (typeof object.drawActor === 'function') object.drawActor();
    else drawObject(ctx, object, camera, questActor);
  }
}

export function drawObjectDepthOverlays(ctx, world, camera, actors = []) {
  if (!ctx || !world || !camera || !actors.length) return;

  const pieces = (world.objects || []).filter(object => {
    if (!object?.depthOverlay || object.depleted) return false;
    const p = screen(object, camera);
    return isOnScreen(ctx, p.x, p.y, Math.max(280, Number(object.drawRadius || 0)));
  });

  pieces.sort((a, b) => Number(a.depthY || a.y || 0) - Number(b.depthY || b.y || 0));

  for (const object of pieces) {
    if (!actors.some(actor => shouldOverlayActor(object, actor))) continue;

    const p = screen(object, camera);
    ctx.save();
    ctx.globalAlpha = object.depthGhostAlpha || 0.62;
    drawMajorPoiPiece(ctx, object, p.x, p.y);
    ctx.restore();
  }
}

function shouldOverlayActor(object, actor) {
  if (!actor || actor.alive === false || actor.dead || actor.remove) return false;

  const depthY = Number(object.depthY || object.y || 0);
  const width = Math.max(48, Number(object.depthWidth || 120));
  const behindDepth = Math.max(48, Number(object.depthBehind || 150));
  const dx = Math.abs((actor.x || 0) - (object.x || 0));
  const actorY = Number(actor.y || 0);

  return dx <= width / 2 && actorY <= depthY && actorY >= depthY - behindDepth;
}

export function drawWorldDrops(ctx, world, camera) {
  if (!ctx || !world || !camera) return;

  for (const drop of world.drops || []) {
    if (!drop || drop.collected) continue;

    const p = screen(drop, camera);
    if (!isOnScreen(ctx, p.x, p.y, 80)) continue;

    drawDrop(ctx, drop, p.x, p.y);
  }
}

// -----------------------------------------------------------------------------
// OBJECT ROUTER
// -----------------------------------------------------------------------------

function drawObject(ctx, object, camera, questActor = null) {
  // Editor paths store their final geometry directly in point coordinates. Their
  // rotation metadata is kept for inspector/history purposes and must not rotate
  // the already-transformed points a second time at runtime.
  if (object?.kind === 'editorPath') return drawObjectUnrotated(ctx, object, camera, questActor);
  const rotation = Number(object?.rotation || 0);
  if (!rotation) return drawObjectUnrotated(ctx, object, camera, questActor);
  const p = screen(object, camera);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(rotation * Math.PI / 180);
  ctx.translate(-p.x, -p.y);
  drawObjectUnrotated(ctx, object, camera, questActor);
  ctx.restore();
}

function drawObjectUnrotated(ctx, object, camera, questActor = null) {
  if (!object || object.depleted) return;
  if(drawWorkshopFixture(ctx,object,camera))return;
  if (drawContinentalObject(ctx, object, camera, questActor)) return;
  if (drawOrrakaiFixture(ctx, object, camera, questActor)) return;

  if (drawAuthoredObject(ctx, object, camera, questActor)) return;
  const visualStatus = getVisualStatus(object, 'objects');
  const developerArtMode = isDeveloperArtMode();
  if (!shouldRenderVisual(object, 'objects', developerArtMode)) return;

  if (object.kind === 'editorPath') {
    drawRuntimeEditorPath(ctx, object, camera);
    return;
  }

  const p = screen(object, camera);

  if (!isOnScreen(ctx, p.x, p.y, Math.max(240, Number(object.drawRadius || 0)))) return;
  if(object.townStairs){
    drawHouseStairs(ctx,object,p.x,p.y);
    label(ctx,object.name,p.x,p.y-50,{priority:object.labelPriority||8});return;
  }
  if (object.echorynEntrance) {
    const type=object.echorynEntrance;
    if(type==='root')drawForestKit(ctx,10,p.x,p.y,190,165);
    else if(type==='mine')drawForestKit(ctx,15,p.x,p.y,145,132);
    else if(type==='crypt'&&drawEchorynLandmark(ctx,5,p.x,p.y+20,126,149)){}
    else {
      drawNarrativeProp(ctx,{propType:type==='sluice'?'ancientSluice':type==='cellar'?'blockedAlcove':'memorialStone',scale:type==='cellar'?1:1.65},p.x,p.y);
      ctx.save();ctx.fillStyle='#222b26';ctx.fillRect(p.x-22,p.y-9,44,23);
      for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#a39474':'#5c5a49';ctx.fillRect(p.x-22,p.y-8+i*5,44,4);}
      ctx.restore();
    }
    if(!questActor||Math.hypot(object.x-questActor.x,object.y-questActor.y)<180)label(ctx,object.name,p.x,p.y-38,{priority:7});
    return;
  }

  if (object.kind === 'editorWater') {
    drawRuntimeEditorWater(ctx, object, camera);
    return;
  }

  if (/^editor(Trigger|Spawn|Light|Audio|Weather|NavBlocker)$/.test(object.kind || '')) {
    return;
  }

  if (object.kind === 'poiMarker') {
    return;
  }

  if (object.kind === 'npc') {
    drawNpc(ctx, object, camera, questActor);
    return;
  }

  if (object.kind === 'herb') {
    drawHerb(ctx, p.x, p.y);
    return;
  }

  if (['forage', 'bitterroot', 'moonpetal', 'bloodmoss', 'thornsilkVine', 'spiritFern', 'dawnsage', 'redSealPoppy', 'emberleaf', 'lanternMoss'].includes(object.kind)) {
    drawRarePlant(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'ashFruit') {
    drawAshFruit(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'gravecap') {
    drawGravecap(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'ore') {
    drawOre(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'stone') {
    drawOre(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'crystal' || object.kind === 'deepstone') {
    if(!drawArchitectureArt(ctx,4,p.x,p.y+8,38))drawCrystalNode(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'bone') {
    drawBonePile(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'reed' || object.kind === 'riverReed') {
    drawReed(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'fish') {
    drawFishingRipple(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'tree' || object.kind === 'log' || object.kind === 'deadwood' || object.kind === 'rareTree') {
    drawWoodcuttingNode(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'runestone') {
    drawRunestone(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'campfire') {
    drawCampfire(ctx, p.x, p.y);

    if (shouldDrawObjectLabel(object, 'campfire')) {
      label(ctx, object.name, p.x, p.y - 28, {
        priority: object.labelPriority || 1
      });
    }

    return;
  }

  if (object.kind === 'shrine') {
    const profile = drawPoiStructureEntrance(ctx, object, p.x, p.y, { shrine: true });

    if (shouldDrawObjectLabel(object, 'shrine')) {
      label(ctx, object.name, p.x, p.y - profile.labelOffset, {
        priority: object.labelPriority || 3
      });
    }

    return;
  }

  if (object.kind === 'dungeonEntrance') {
    const profile = drawPoiStructureEntrance(ctx, object, p.x, p.y);

    if (shouldDrawObjectLabel(object, 'dungeonEntrance')) {
      label(ctx, object.name || 'Dungeon', p.x, p.y - profile.labelOffset, {
        priority: object.labelPriority || 5
      });
    }

    return;
  }

  if (object.kind === 'dungeonExit') {
    drawDungeonExit(ctx, object, p.x, p.y);

    if (shouldDrawObjectLabel(object, 'dungeonExit')) {
      label(ctx, object.name || 'Exit', p.x, p.y - (object.returnPortal ? 58 : 34), {
        priority: object.labelPriority || 5
      });
    }

    return;
  }

  if (object.kind === 'dungeonStairs') {
    drawTowerStairs(ctx, object, p.x, p.y);
    label(ctx, object.name || (object.direction === 'up' ? 'Stairs Up' : 'Stairs Down'), p.x, p.y - 32, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'dungeonChest') {
    drawRewardChest(ctx, object, p.x, p.y);
    label(ctx, object.claimed ? 'Opened Chest' : object.locked ? object.name || 'Locked Chest' : object.name || 'Dungeon Chest', p.x, p.y - 27, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'dungeonKey') {
    drawDungeonKey(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Dungeon Key', p.x, p.y - 26, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'dungeonDoor') {
    drawDungeonDoor(ctx, object, p.x, p.y);
    label(ctx, object.locked ? object.name || 'Locked Door' : object.openName || object.name || 'Opened Door', p.x, p.y - 34, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'dungeonPuzzle') {
    drawDungeonPuzzle(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Rune Puzzle', p.x, p.y - 31, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'dungeonEvent') {
    drawDungeonEvent(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Dungeon Event', p.x, p.y - 29, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'sideZoneEntrance') {
    const profile = drawPoiStructureEntrance(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Side Zone', p.x, p.y - profile.labelOffset, {
      priority: object.labelPriority || 6
    });
    return;
  }

  if (object.kind === 'sideZoneExit') {
    drawDungeonExit(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Return', p.x, p.y - 34, {
      priority: object.labelPriority || 6
    });
    return;
  }

  if (object.kind === 'towerEntrance') {
    const profile = drawPoiStructureEntrance(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Infinite Tower', p.x, p.y - profile.labelOffset, {
      priority: object.labelPriority || 7
    });
    return;
  }

  if (object.kind === 'towerStairs') {
    drawTowerStairs(ctx, object, p.x, p.y);
    label(ctx, object.locked ? 'Sealed Stairs' : object.name || 'Next Floor', p.x, p.y - 32, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'towerExit') {
    drawDungeonExit(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Exit', p.x, p.y - 34, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'towerRewardChest') {
    drawRewardChest(ctx, object, p.x, p.y);
    label(ctx, object.locked ? 'Sealed Reward' : object.name || 'Reward', p.x, p.y - 27, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'worldCache') {
    if(object.discoveryId){
      if(object.discoveryId==='courier-satchel'||object.discoveryId==='roadless-supply-roll')drawTownSacks(ctx,{...object,scale:.55},p.x,p.y);
      else drawNarrativeProp(ctx,{propType:object.discoveryId==='grave-mason-recess'?'memorialStone':'crate',scale:.65},p.x,p.y);
    }else drawRewardChest(ctx, object, p.x, p.y);
    if(!object.discoveryId||!questActor||Math.hypot(questActor.x-object.x,questActor.y-object.y)<145)label(ctx, object.claimed ? (object.discoveryId?'Recovered Supplies':'Opened Cache') : object.name || 'Hidden Cache', p.x, p.y - 27, {
      priority: object.labelPriority || 5
    });
    return;
  }

  if (object.kind === 'poiInvestigation') {
    const near=!questActor||Math.hypot(questActor.x-object.x,questActor.y-object.y)<105;
    if (object.echorynEvidence) {
      // Evidence is a small physical scene; its interaction accent appears on approach.
      drawNarrativeProp(ctx,{propType:/toy|horse/i.test(object.name)?'childToy':/grave|funeral/i.test(object.name)?'freshGrave':/root|heart/i.test(object.name)?'echoFragment':/water|sluice/i.test(object.name)?'rotIrrigation':/supply|satchel|ledger/i.test(object.name)?'crate':'memorialStone',scale:.65},p.x,p.y);
      if(near){ctx.save();ctx.strokeStyle='#c9b483';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(p.x,p.y+7,18,7,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    } else drawPoiInvestigation(ctx, object, p.x, p.y);
    if (!object.hideLabel || object.echorynEvidence&&near) {
      label(ctx, object.name || 'Investigate', p.x, p.y - 28, {
        priority: object.labelPriority || 7
      });
    }
    return;
  }

  if (object.kind === 'dungeonSetpiece') {
    drawDungeonSetpiece(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'capitalGate') {
    if(!drawTownBuildingArt(ctx,8,p.x,p.y+12,168))drawGothicCastle(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Capital Gate', p.x, p.y - 170, {
      priority: object.labelPriority || 7
    });
    return;
  }

  if (object.kind === 'capitalExit') {
    if (object.id === 'maraHouseDoor') {
      if(drawArchitectureArt(ctx,0,p.x,p.y+14,60)){
        label(ctx,object.name || 'Door to Orrakai',p.x,p.y-58,{priority:8});return;
      }
      // House-scale oak door; retain the original exit trigger and label.
      ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));
      ctx.fillStyle='#191b17';ctx.fillRect(-22,-47,44,58);
      ctx.fillStyle='#73634c';ctx.fillRect(-24,-49,6,62);ctx.fillRect(18,-49,6,62);ctx.fillRect(-24,-49,48,6);
      ctx.fillStyle='#50391f';ctx.fillRect(-17,-42,34,51);
      for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#765331':'#654629';ctx.fillRect(-16+i*6,-41,5,49);}
      ctx.fillStyle='#272720';ctx.fillRect(-16,-31,32,4);ctx.fillRect(-16,-4,32,4);
      ctx.fillStyle='#c99b48';ctx.fillRect(9,-19,3,5);
      ctx.fillStyle='#ac9874';ctx.fillRect(-25,10,50,5);ctx.restore();
      label(ctx,object.name || 'Leave house',p.x,p.y-58,{priority:8});return;
    }
    const profile = drawPoiStructureEntrance(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Town Gate', p.x, p.y - profile.labelOffset, {
      priority: object.labelPriority || 8
    });
    return;
  }

  if (object.kind === 'travelRouteGate' || object.kind === 'travelRouteExit' || object.kind === 'travelRouteReturnGate') {
    const profile = drawPoiStructureEntrance(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Travel Route', p.x, p.y - profile.labelOffset, {
      priority: object.labelPriority || 8
    });
    return;
  }

  if (object.kind === 'marketStall') {
    drawMarketStall(ctx, object, p.x, p.y);
    if (!object.hideLabel) {
      label(ctx, object.name || 'Market', p.x, p.y - Number(object.labelOffset || 24), {
        priority: object.labelPriority || 6
      });
    }
    return;
  }

  if (object.kind === 'blacksmithService') {
    drawServiceShop(ctx, object, p.x, p.y, '#d9ad4f', 'anvil');
    label(ctx, object.name || 'Blacksmith', p.x, p.y - Number(object.labelOffset || 28), {
      priority: object.labelPriority || 6
    });
    return;
  }

  if (object.kind === 'alchemistService') {
    drawServiceShop(ctx, object, p.x, p.y, '#b68cff', 'flask');
    label(ctx, object.name || 'Alchemist', p.x, p.y - Number(object.labelOffset || 28), {
      priority: object.labelPriority || 6
    });
    return;
  }

  if (object.kind === 'guildClerk') {
    drawServiceShop(ctx, object, p.x, p.y, '#66f0ff', 'guild');
    label(ctx, object.name || 'Guild', p.x, p.y - Number(object.labelOffset || 28), {
      priority: object.labelPriority || 6
    });
    return;
  }

  if (object.kind === 'bankService') {
    drawServiceShop(ctx, object, p.x, p.y, '#ffcc66', 'bank');
    label(ctx, object.name || 'Bank', p.x, p.y - Number(object.labelOffset || 28), {
      priority: object.labelPriority || 6
    });
    return;
  }

  if (object.kind === 'classTrainerService') {
    drawServiceShop(ctx, object, p.x, p.y, '#73d18a', 'trainer');
    label(ctx, object.name || 'Class Trainers', p.x, p.y - Number(object.labelOffset || 28), {
      priority: object.labelPriority || 6
    });
    return;
  }

  if (object.kind === 'palaceGate') {
    drawGothicCastle(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Council Hall', p.x, p.y - 72, {
      priority: object.labelPriority || 7
    });
    return;
  }

  if (object.kind === 'arenaGate') {
    drawServiceShop(ctx, object, p.x, p.y, '#ef6f6c', 'arena');
    label(ctx, object.name || 'Arena', p.x, p.y - 28, {
      priority: object.labelPriority || 6
    });
    return;
  }

  if (object.kind === 'noticeBoard') {
    if(!drawArchitectureArt(ctx,5,p.x,p.y+12,62))drawNoticeBoard(ctx, object, p.x, p.y);
    label(ctx, object.name || 'Notice Board', p.x, p.y - Number(object.labelOffset || 58), {
      priority: object.labelPriority || 6
    });
    return;
  }

  if (object.kind === 'majorPoiPiece') {
    drawMajorPoiPiece(ctx, object, p.x, p.y, questActor);
    return;
  }

  if (object.kind === 'gothicCastle') {
    drawGothicCastle(ctx, object, p.x, p.y);

    if (shouldDrawObjectLabel(object, 'gothicCastle')) {
      label(ctx, object.name || 'Castle Veyr', p.x, p.y - 92, {
        priority: object.labelPriority || 6
      });
    }

    return;
  }

  if (object.kind === 'demonLair' || object.kind === 'demonCultLair') {
    drawDemonLair(ctx, object, p.x, p.y);

    if (shouldDrawObjectLabel(object, 'demonLair')) {
      label(ctx, object.name || 'Demon Lair', p.x, p.y - 54, {
        priority: object.labelPriority || 6
      });
    }

    return;
  }

  if (object.kind === 'redSeal') {
    drawRedSeal(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'treeCluster') {
    drawTreeCluster(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'pineCluster') {
    drawPineCluster(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'shrub') {
    drawShrub(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'tallGrassPatch') {
    drawTallGrassPatch(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'stump') {
    drawStump(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'deadRoot') {
    drawDeadRoot(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'graveMarker') {
    drawGraveMarker(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'brokenWall') {
    drawBrokenWall(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'ruinPillar') {
    drawRuinPillar(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'smallBoulder') {
    drawSmallBoulder(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'signpost') {
    drawSignpost(ctx, object, p.x, p.y);
    return;
  }

  if (object.kind === 'townProp') {
    drawTownProp(ctx, object, p.x, p.y);
    return;
  }

  if (developerArtMode || visualStatus.code !== VISUAL_STATUS.READY) {
    drawMissingModel(ctx, object, p.x, p.y, visualStatus);
  }
}

function drawRuntimeEditorPath(ctx, object, camera) {
  const points = Array.isArray(object.points) ? object.points : [];
  if (points.length < 2) return;
  const width = Math.max(4, Number(object.width || 48));
  const stone = object.material === 'stone';
  const trace = () => {
    ctx.beginPath();
    ctx.moveTo(points[0].x - camera.x, points[0].y - camera.y);
    for (let index = 1; index < points.length; index++) ctx.lineTo(points[index].x - camera.x, points[index].y - camera.y);
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  trace();
  ctx.strokeStyle = stone ? '#2b2d31' : '#33251a';
  ctx.lineWidth = width + 12;
  ctx.stroke();
  trace();
  ctx.strokeStyle = stone ? '#625f58' : '#65492f';
  ctx.lineWidth = width;
  ctx.stroke();
  trace();
  ctx.globalAlpha = 0.48;
  ctx.strokeStyle = stone ? '#a49c8c' : '#aa8150';
  ctx.lineWidth = Math.max(2, width * 0.12);
  ctx.setLineDash([Math.max(10, width * 0.55), Math.max(8, width * 0.38)]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.28;
  trace();
  ctx.strokeStyle = '#17130f';
  ctx.lineWidth = Math.max(2, width * 0.08);
  ctx.setLineDash([Math.max(6, width * 0.24), Math.max(16, width * 0.8)]);
  ctx.stroke();
  ctx.restore();
}

function drawRuntimeEditorWater(ctx, object, camera) {
  const width = Math.max(8, Number(object.width || 160));
  const height = Math.max(8, Number(object.height || 100));
  const x = Number(object.x || 0) - camera.x - width / 2;
  const y = Number(object.y || 0) - camera.y - height / 2;
  const contaminated = !!object.rotContamination;
  const t = performance.now() / 1000;
  ctx.save();
  ctx.fillStyle = contaminated ? 'rgba(30,35,28,0.42)' : 'rgba(8,20,29,0.38)';
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2 + 3, width / 2 + 7, height / 2 + 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = contaminated ? 'rgba(65,75,58,0.92)' : 'rgba(25,72,102,0.92)';
  ctx.strokeStyle = contaminated ? '#79805e' : '#548ba6';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + width / 2, y + height / 2, Math.max(4, width / 2 - 7), Math.max(4, height / 2 - 7), 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = contaminated ? '#a09a59' : '#76bbd0';
  poly(ctx, [[x + width * 0.08, y + height * 0.22], [x + width * 0.56, y + height * 0.08], [x + width * 0.38, y + height * 0.48]]);
  ctx.fillStyle = contaminated ? '#343b2c' : '#0d3858';
  poly(ctx, [[x + width * 0.42, y + height * 0.54], [x + width * 0.96, y + height * 0.33], [x + width * 0.76, y + height * 0.88]]);
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = contaminated ? '#b2a867' : '#a5d4df';
  ctx.lineWidth = 2;
  for (let index = 0; index < 3; index++) {
    const rippleY = y + height * (0.32 + index * 0.2) + Math.sin(t * 1.7 + index) * 2;
    ctx.beginPath();
    ctx.ellipse(x + width * (0.36 + index * 0.13), rippleY, width * 0.11, Math.max(2, height * 0.025), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// -----------------------------------------------------------------------------
// NPCS
// -----------------------------------------------------------------------------

export function getNpcRenderActor(npc) {
  const npcStyle = getNpcStyle(npc);
  const visualFactionId = getNpcVisualFaction(npc);
  const professionId = getNpcProfession(npc);
  npc.equipment = npc.equipment || {...npcStyle.equipment};

  return {
    x: npc.x,
    y: npc.y,
    dirX: npc.dirX ?? 0,
    dirY: npc.dirY ?? 1,
    walkTime: npc.walkTime || 0,
    isMoving: !!npc.isMoving,
    classId: npc.classId || null,
    abilityMorphs: npc.abilityMorphs,
    abilityMastery: npc.abilityMastery,
    knownAbilities: npc.knownAbilities,
    visualAction: npc.visualAction,
    combatState: npc.combatState,
    activeChannel: npc.activeChannel,
    id: npc.id,
    npcId: npc.npcId,
    name: npc.name,
    role: npc.role,
    factionId: npc.factionId,
    visualFactionId,
    professionId,
    bodyType: npcStyle.bodyType || 'male',
    equipment: npc.equipment,
    skin: npcStyle.skin,
    hair: npcStyle.hair,
    shirt: npcStyle.shirt,
    pants: npcStyle.pants,
    boots: npcStyle.boots
  };
}

function drawNpc(ctx, npc, camera, questActor = null) {
  const npcStyle = getNpcStyle(npc);
  const npcActor = getNpcRenderActor(npc);
  const { visualFactionId, professionId } = npcActor;

  const p = screen(npc, camera);

  if (npc.instructorType === 'class' || npc.classId) {
    drawInstructorGroundMark(ctx, p.x, p.y, npc.classId);
  }

  if (npc.disposition === 'hostile') {
    drawHostileGroundMark(ctx, p.x, p.y);
  }

  if (npc.disposition === 'fearful' || npc.disposition === 'uncertain') {
    drawUncertainGroundMark(ctx, p.x, p.y);
  }

  // Important:
  // Do NOT pass name here.
  // humanRenderer.js can draw actor names when provided.
  // We draw exactly one NPC label below to prevent duplicated labels.
  drawHumanActor(ctx, npcActor, camera, {
    scale: npcStyle.scale,
    skin: npcStyle.skin,
    hair: npcStyle.hair,
    shirt: npcStyle.shirt,
    pants: npcStyle.pants,
    boots: npcStyle.boots,
    classId: npc.classId || null,
    bodyType: npcStyle.bodyType || 'male',
    visualFactionId,
    professionId,
    role: npc.role
  });
  drawWorkshopWorker(ctx,npc,camera);
  if(npc.simulatedPlayer){drawActionStateVisuals(ctx,npc,camera);drawCombatProjectiles(ctx,npc,camera);}

  const displayName = npc.disposition==='hostile' ? getEnemyNameplate(npc).text : renameLastDawn(getNpcDisplayName(npc));

  if (!npc.hideLabel && (!npc.orrakaiResident || !questActor || Math.hypot(npc.x-questActor.x,npc.y-questActor.y)<190)) {
    label(ctx, displayName, p.x, p.y - 48, {
      priority: npc.labelPriority || 4,
      color: getNpcLabelColor(npc)
    });
  }

  if (!npc.suppressQuestMarker && npcHasQuestInteraction(questActor, npc)) {
    drawQuestMark(ctx, p.x, p.y - 62);
  }
  if(objectInInteractionRange(questActor,npc))drawDialogueReadyIndicator(ctx,p.x,p.y-86);
}

function drawDialogueReadyIndicator(ctx,x,y){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  ctx.shadowColor='#000';ctx.shadowBlur=4;
  ctx.fillStyle='#171b20';ctx.strokeStyle='#e5c87c';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(-13,-8,26,17,4);ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;
  ctx.beginPath();ctx.moveTo(-3,9);ctx.lineTo(-3,14);ctx.lineTo(3,9);
  ctx.fill();ctx.stroke();
  ctx.fillStyle='#f7e6b8';
  for(const offset of [-6,0,6])ctx.fillRect(offset-1,-1,3,3);
  ctx.restore();
}

function getNpcDisplayName(npc) {
  if (!npc) return 'Unknown';

  if (npc.displayName) return npc.displayName;

  // For class instructors, prefer one clean class label.
  // This prevents duplicate class titles like "Gravecaller" + "Gravecaller".
  if (npc.instructorType === 'class' || npc.classId) {
    return npc.name || classShortName(npc.classId);
  }

  return npc.name || 'Unknown';
}

function getNpcLabelColor(npc) {
  if (npc?.disposition === 'hostile') return '#ff7777';
  if (npc?.disposition === 'fearful') return '#d8c7ff';
  if (npc?.disposition === 'uncertain') return '#d8c7ff';
  if (npc?.classId) return '#e8edf5';

  return '#e8edf5';
}

function getNpcStyle(npc) {
  const classPalette = getClassVisualPalette(npc?.classId);
  const visualFactionId = getNpcVisualFaction(npc);

  if (visualFactionId === 'covenantOfLight') {
    return {
      scale: Number(npc.scale || 0.93),
      bodyType: npc.bodyType || 'female',
      skin: npc.skin || '#d7bda2',
      hair: npc.hair || '#5a4737',
      shirt: npc.shirt || '#eee6cf',
      pants: npc.pants || '#8e7b45',
      boots: npc.boots || '#40362a',
      equipment: npc.equipment || { weapon: null, helm: null, chest: null, legs: null, trinket: 'paleRune' }
    };
  }

  if (visualFactionId === 'lastDawn') {
    return {
      scale: Number(npc.scale || 0.94),
      bodyType: npc.bodyType || 'male',
      skin: npc.skin || '#c4aaa0',
      hair: npc.hair || '#2a211f',
      shirt: npc.shirt || '#494044',
      pants: npc.pants || '#292629',
      boots: npc.boots || '#171417',
      equipment: npc.equipment || { weapon: null, helm: 'clothHood', chest: 'patchedTunic', legs: null, trinket: null }
    };
  }

  if (npc.id === 'smith' || npc.id === 'mineDrifter') {
    return {
      scale: 0.92,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: '#2a1a12',
      shirt: '#9b6b3d',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: null,
        helm: null,
        chest: 'patchedTunic',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'warden') {
    return {
      scale: 0.95,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: '#111111',
      shirt: '#d9ad4f',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: null,
        helm: null,
        chest: null,
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'sisterElyra') {
    return {
      scale: 0.92,
      bodyType: 'female',
      skin: '#d7c4ad',
      hair: '#e8edf5',
      shirt: '#5a5363',
      pants: '#2b2630',
      boots: '#2a211b',
      equipment: {
        weapon: null,
        helm: 'clothHood',
        chest: null,
        legs: null,
        trinket: 'paleRune'
      }
    };
  }

  if (npc.id === 'lordVeyrShade') {
    return {
      scale: 0.98,
      bodyType: 'male',
      skin: '#b8b0a8',
      hair: '#e8edf5',
      shirt: '#2b2533',
      pants: '#151015',
      boots: '#111111',
      equipment: {
        weapon: 'graveScythe',
        helm: 'clothHood',
        chest: 'necromancerRobe',
        legs: null,
        trinket: 'paleRune'
      }
    };
  }

  if (npc.id === 'thornboundSeer') {
    return {
      scale: 0.93,
      bodyType: 'female',
      skin: '#d7bda2',
      hair: '#2d2215',
      shirt: '#446b42',
      pants: '#263d2a',
      boots: '#2f2419',
      equipment: {
        weapon: 'rootStaff',
        helm: null,
        chest: 'thornbinderGarb',
        legs: null,
        trinket: 'thornCharm'
      }
    };
  }

  if (npc.id === 'repentantCultist') {
    return {
      scale: 0.92,
      bodyType: 'male',
      skin: '#c4aaa0',
      hair: '#2a1a12',
      shirt: '#3a2225',
      pants: '#211719',
      boots: '#151010',
      equipment: {
        weapon: null,
        helm: 'clothHood',
        chest: 'necromancerRobe',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'emberVeilAcolyte') {
    return {
      scale: 0.95,
      bodyType: 'male',
      skin: '#c4aaa0',
      hair: '#111111',
      shirt: '#5c1f1f',
      pants: '#211719',
      boots: '#151010',
      equipment: {
        weapon: 'graveScythe',
        helm: 'clothHood',
        chest: 'necromancerRobe',
        legs: null,
        trinket: 'paleRune'
      }
    };
  }

  if (npc.id === 'roadlessCaptain') {
    return {
      scale: 0.96,
      bodyType: 'male',
      skin: '#d79b73',
      hair: '#4a2b18',
      shirt: '#5f4733',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: 'hunterBow',
        helm: null,
        chest: 'leatherVest',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'oldTarin') {
    return {
      scale: 0.9,
      bodyType: 'male',
      skin: '#d7bda2',
      hair: '#b8b0a0',
      shirt: '#6d5638',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: 'walkingStick',
        helm: null,
        chest: 'patchedTunic',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'lumenSable') {
    return {
      scale: 0.92,
      bodyType: 'female',
      skin: '#d79b73',
      hair: '#111111',
      shirt: '#3d4f54',
      pants: '#263145',
      boots: '#2a211b',
      equipment: {
        weapon: 'rootStaff',
        helm: null,
        chest: 'battleMageCoat',
        legs: null,
        trinket: 'paleRune'
      }
    };
  }

  if (npc.id === 'sableCartographer') {
    return {
      scale: 0.9,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: '#4a2b18',
      shirt: '#4b5364',
      pants: '#2b2630',
      boots: '#3a2a22',
      equipment: {
        weapon: null,
        helm: null,
        chest: 'patchedTunic',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'mireWidow') {
    return {
      scale: 0.92,
      bodyType: 'female',
      skin: '#b8b0a8',
      hair: '#e8edf5',
      shirt: '#2b2533',
      pants: '#151015',
      boots: '#111111',
      equipment: {
        weapon: 'graveScythe',
        helm: 'clothHood',
        chest: 'necromancerRobe',
        legs: null,
        trinket: 'paleRune'
      }
    };
  }

  if (npc.id === 'fenrickSalt') {
    return {
      scale: 0.92,
      bodyType: 'male',
      skin: '#d79b73',
      hair: '#4a2b18',
      shirt: '#668a55',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: 'hunterBow',
        helm: null,
        chest: 'leatherVest',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'hollowPilgrim') {
    return {
      scale: 0.91,
      bodyType: 'male',
      skin: '#d8c7c7',
      hair: '#111111',
      shirt: '#5a5363',
      pants: '#2b2630',
      boots: '#2a211b',
      equipment: {
        weapon: null,
        helm: 'clothHood',
        chest: 'patchedTunic',
        legs: null,
        trinket: 'paleRune'
      }
    };
  }

  if (npc.id === 'watcherIvo') {
    return {
      scale: 0.92,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: '#111111',
      shirt: '#2b2f38',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: 'hunterBow',
        helm: 'watcherHood',
        chest: 'rogueLeathers',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.classId === 'oathkeeper' || npc.classId === 'templar') {
    return {
      scale: 0.96,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: classPalette.light,
      shirt: classPalette.accent,
      pants: classPalette.shadow,
      boots: classPalette.ink,
      equipment: {
        weapon: 'noviceBlade',
        helm: 'knightHelm',
        chest: 'wardedChest',
        legs: 'ironGreaves',
        trinket: null
      }
    };
  }

  if (npc.classId === 'fellhunter' || npc.classId === 'mercenary') {
    return {
      scale: 0.94,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: '#4a2b18',
      shirt: classPalette.accent,
      pants: classPalette.shadow,
      boots: classPalette.ink,
      equipment: {
        weapon: 'hunterBow',
        helm: null,
        chest: 'leatherVest',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.classId === 'gravecaller' || npc.classId === 'necromancer') {
    return {
      scale: 0.95,
      bodyType: 'male',
      skin: '#d8c7c7',
      hair: '#111111',
      shirt: classPalette.base,
      pants: classPalette.shadow,
      boots: classPalette.ink,
      equipment: {
        weapon: 'graveScythe',
        helm: 'clothHood',
        chest: 'necromancerRobe',
        legs: null,
        trinket: 'paleRune'
      }
    };
  }

  if (npc.classId === 'thornbinder') {
    return {
      scale: 0.95,
      bodyType: 'female',
      skin: '#d7bda2',
      hair: '#2d2215',
      shirt: classPalette.base,
      pants: classPalette.shadow,
      boots: classPalette.ink,
      equipment: {
        weapon: 'rootStaff',
        helm: null,
        chest: 'thornbinderGarb',
        legs: null,
        trinket: 'thornCharm'
      }
    };
  }

  if (npc.classId === 'waverider') {
    return {
      scale: 0.95,
      bodyType: 'female',
      skin: '#ffd1bd',
      hair: '#111111',
      shirt: classPalette.base,
      pants: classPalette.shadow,
      boots: classPalette.ink,
      equipment: {
        weapon: 'tideglassRapier',
        helm: null,
        chest: 'battleMageCoat',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.classId === 'lightbringer') {
    return {
      scale: 0.95,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: classPalette.light,
      shirt: classPalette.accent,
      pants: classPalette.shadow,
      boots: classPalette.ink,
      equipment: {
        weapon: 'crackedDawnlens',
        helm: null,
        chest: 'wardedChest',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'orrakaiMarketVendor') {
    return {
      scale: 0.9,
      bodyType: 'female',
      skin: '#d79b73',
      hair: '#4a2b18',
      shirt: '#b08a5b',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: null,
        helm: null,
        chest: 'patchedTunic',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'orrakaiGuildRunner') {
    return {
      scale: 0.88,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: '#2a1a12',
      shirt: '#4b5364',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: null,
        helm: null,
        chest: 'patchedTunic',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'orrakaiAlchemistApprentice') {
    return {
      scale: 0.88,
      bodyType: 'female',
      skin: '#ffd1bd',
      hair: '#111111',
      shirt: '#5a5363',
      pants: '#2b2630',
      boots: '#2a211b',
      equipment: {
        weapon: null,
        helm: null,
        chest: 'battleMageCoat',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'orrakaiRoadPorter') {
    return {
      scale: 0.9,
      bodyType: 'male',
      skin: '#d79b73',
      hair: '#2a1a12',
      shirt: '#6d5638',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: null,
        helm: null,
        chest: 'leatherVest',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'orrakaiBreadCarrier') {
    return {
      scale: 0.88,
      bodyType: 'female',
      skin: '#ffd1bd',
      hair: '#b56f3f',
      shirt: '#8a6744',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: null,
        helm: null,
        chest: 'patchedTunic',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'orrakaiLampTender') {
    return {
      scale: 0.9,
      bodyType: 'male',
      skin: '#d7bda2',
      hair: '#b8b0a0',
      shirt: '#4f5b50',
      pants: '#263145',
      boots: '#2a211b',
      equipment: {
        weapon: 'walkingStick',
        helm: null,
        chest: 'patchedTunic',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'hunterScout') {
    return {
      scale: 0.92,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: '#4a2b18',
      shirt: '#668a55',
      pants: '#263145',
      boots: '#3a2a22',
      equipment: {
        weapon: 'hunterBow',
        helm: null,
        chest: 'leatherVest',
        legs: null,
        trinket: null
      }
    };
  }

  if (npc.id === 'chapelHermit') {
    return {
      scale: 0.92,
      bodyType: 'male',
      skin: '#d7c4ad',
      hair: '#b8b0a0',
      shirt: '#5a5363',
      pants: '#2b2630',
      boots: '#2a211b',
      equipment: {
        weapon: 'rootStaff',
        helm: 'clothHood',
        chest: null,
        legs: null,
        trinket: null
      }
    };
  }

  return {
    scale: Number(npc.scale || 0.92),
    bodyType: npc.bodyType || 'male',
    skin: npc.skin || '#ffd1bd',
    hair: npc.hair || '#111111',
    shirt: npc.shirt || '#c78f45',
    pants: npc.pants || '#263145',
    boots: npc.boots || '#3a2a22',
    equipment: npc.equipment || {
      weapon: null,
      helm: null,
      chest: null,
      legs: null,
      trinket: null
    }
  };
}

function getNpcVisualFaction(npc) {
  const text = `${npc?.id || ''} ${npc?.npcId || ''} ${npc?.name || ''} ${npc?.role || ''} ${npc?.factionId || ''}`.toLowerCase();
  if (npc?.visualFactionId) return npc.visualFactionId;
  if (/covenant.?of.?light|\bcovenant\b/.test(text)) return 'covenantOfLight';
  if (/last.?dawn|repentantcultist|emberveilacolyte|chapellastdawnremnant/.test(text)) return 'lastDawn';
  if (/roadless|bandit/.test(text)) return 'roadless';
  if (/veyr|gravebound/.test(text)) return 'veyrRemnant';
  return null;
}

function getNpcProfession(npc) {
  const text = `${npc?.id || ''} ${npc?.npcId || ''} ${npc?.name || ''} ${npc?.role || ''}`.toLowerCase();
  if (/smith|forge|miner/.test(text)) return 'smith';
  if (/healer|medic|physician|sister|apothec/.test(text)) return 'healer';
  if (/merchant|vendor|trader|market/.test(text)) return 'merchant';
  if (/guard|warden|watcher|sentinel|captain/.test(text)) return 'guard';
  if (/scholar|scribe|cartograph|clerk|archiv|keeper/.test(text)) return 'scholar';
  if (/porter|carrier|laborer|worker/.test(text)) return 'laborer';
  return null;
}

function drawInstructorGroundMark(ctx, x, y, classId) {
  const color = classColor(classId);

  ctx.save();

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 25, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(x - 18, y + 5);
  ctx.lineTo(x - 7, y + 12);
  ctx.lineTo(x + 8, y + 12);
  ctx.lineTo(x + 18, y + 5);
  ctx.stroke();

  ctx.restore();
}

function drawHostileGroundMark(ctx, x, y) {
  ctx.save();

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#b94a3d';
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 23, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#b94a3d';
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y + 5, 17);

  ctx.restore();
}

function drawUncertainGroundMark(ctx, x, y) {
  ctx.save();

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#b68cff';
  ctx.beginPath();
  ctx.ellipse(x, y + 6, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawQuestMark(ctx, x, y) {
  ctx.save();

  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillText('!', x + 1, y + 1);
  ctx.fillStyle = '#ffcc66';
  ctx.fillText('!', x, y);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// RESOURCE OBJECTS
// -----------------------------------------------------------------------------

function drawHerb(ctx, x, y) {
  if (drawPropSprite(ctx, 12, x, y + 8, .24)) return;
  ctx.fillStyle = '#dd704a';
  leaf(ctx, x, y);

  ctx.fillStyle = '#ffb36f';
  rect(ctx, x - 1, y - 12, 3, 5);
}

function drawRarePlant(ctx, object, x, y) {
  if (drawEnvironmentProp(ctx,/Moss|moss/.test(object.kind)?'gravecap':'shrub',x,y,{scale:.7})) {
    ctx.save();ctx.fillStyle={moonpetal:'#bec7b4',bloodmoss:'#8c5549',dawnsage:'#cfc4a0',redSealPoppy:'#9f5544',emberleaf:'#a38b53'}[object.kind]||'#859462';
    ctx.fillRect(Math.round(x-3),Math.round(y-10),3,2);ctx.fillRect(Math.round(x+3),Math.round(y-13),2,2);ctx.restore();return;
  }
  const color = {
    moonpetal: '#d8e6ff',
    bloodmoss: '#c55353',
    thornsilkVine: '#73d18a',
    spiritFern: '#b68cff',
    dawnsage: '#fff1b8',
    redSealPoppy: '#ef4056',
    bitterroot: '#c58b4d',
    emberleaf: '#e27b3f',
    lanternMoss: '#d9c870'
  }[object.kind] || '#73d18a';

  drawShadow(ctx, x, y + 8, 11, 3);
  ctx.strokeStyle = '#32512f';
  ctx.lineWidth = 2;
  line(ctx, x, y + 8, x, y - 12);
  line(ctx, x - 4, y + 4, x - 10, y - 5);
  line(ctx, x + 4, y + 4, x + 11, y - 6);

  ctx.fillStyle = color;
  leaf(ctx, x - 8, y - 5);
  leaf(ctx, x + 9, y - 6);
  circle(ctx, x, y - 14, object.kind === 'spiritFern' ? 5 : 4);

  if (object.requiredLevel || object.requiredToolTier) {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    circleStroke(ctx, x, y - 6, 16);
    ctx.globalAlpha = 1;
  }
}

function drawAshFruit(ctx, x, y) {
  if(drawEnvironmentProp(ctx,'ashFruit',x,y))return;
  ctx.fillStyle = '#6d4a36';
  leaf(ctx, x, y + 2);

  ctx.fillStyle = '#b84b35';
  circle(ctx, x - 4, y - 8, 4);
  ctx.fillStyle = '#e18148';
  circle(ctx, x + 4, y - 6, 3);
  ctx.fillStyle = '#3b241d';
  rect(ctx, x - 1, y - 14, 2, 5);
}

function drawGravecap(ctx, x, y) {
  if(drawEnvironmentProp(ctx,'gravecap',x,y))return;
  mushroom(ctx, x, y, '#b68cff', '#e2ccff');
}

function drawOre(ctx, x, y) {
  if (drawPropSprite(ctx, 11, x, y + 10, .34)) return;
  rock(ctx, x, y, '#7d8793', '#b6c0ca');
}

function drawCrystalNode(ctx, object, x, y) {
  const color = object.itemId === 'lumenQuartz'
    ? '#fff1b8'
    : object.itemId === 'tideglassCrystal'
      ? '#59d7e8'
      : object.itemId === 'thornstone'
        ? '#73d18a'
        : '#b68cff';

  drawShadow(ctx, x, y + 11, 14, 4);
  ctx.fillStyle = '#343842';
  rock(ctx, x, y + 2, '#56606c', '#8d98a6');

  ctx.fillStyle = color;
  poly(ctx, [
    [x - 4, y + 4],
    [x - 7, y - 9],
    [x - 1, y - 20],
    [x + 6, y - 8],
    [x + 4, y + 5]
  ]);

  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y - 5, 15);
  ctx.globalAlpha = 1;
}

function drawBonePile(ctx, x, y) {
  if(drawEnvironmentProp(ctx,'bone',x,y))return;
  drawShadow(ctx, x, y + 7, 13, 4);

  ctx.strokeStyle = '#d8d0bd';
  ctx.lineWidth = 4;
  line(ctx, x - 10, y + 1, x + 8, y - 5);
  line(ctx, x - 5, y - 4, x + 11, y + 5);

  ctx.fillStyle = '#f0ead8';
  circle(ctx, x - 12, y + 1, 4);
  circle(ctx, x + 10, y - 5, 4);
  circle(ctx, x - 7, y - 4, 3);
  circle(ctx, x + 13, y + 5, 3);
}

function drawReed(ctx, x, y) {
  if(drawEnvironmentProp(ctx,'reed',x,y))return;
  drawShadow(ctx, x, y + 8, 10, 3);

  ctx.strokeStyle = '#426b37';
  ctx.lineWidth = 2;

  line(ctx, x - 5, y + 8, x - 8, y - 12);
  line(ctx, x, y + 8, x + 1, y - 16);
  line(ctx, x + 5, y + 8, x + 8, y - 10);

  ctx.fillStyle = '#b08a44';
  rect(ctx, x - 10, y - 15, 4, 8);
  rect(ctx, x - 1, y - 19, 4, 9);
  rect(ctx, x + 6, y - 13, 4, 7);
}

function drawFishingRipple(ctx, x, y) {
  ctx.save();

  ctx.strokeStyle = 'rgba(180,210,235,0.55)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.ellipse(x, y, 15, 5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 1, 8, 3, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawWoodcuttingNode(ctx, object, x, y) {
  if(object.kind==='log' && drawEnvironmentProp(ctx,'log',x,y,object))return;
  if (object.kind !== 'log' && object.kind !== 'rareTree' && drawPropSprite(ctx, object.kind === 'deadwood' ? 10 : 8, x, y + 12, .46)) return;
  const rare = object.kind === 'rareTree';
  const dead = object.kind === 'deadwood';
  const logOnly = object.kind === 'log';
  const trunk = dead ? '#332820' : rare ? '#4b352c' : '#5d3d26';
  const leafColor = rare ? '#2f6a4a' : dead ? '#3a342c' : '#315f33';

  drawShadow(ctx, x, y + 12, logOnly ? 18 : 14, 5);

  if (logOnly) {
    ctx.fillStyle = trunk;
    rect(ctx, x - 15, y - 4, 30, 10);
    ctx.fillStyle = '#8a5d35';
    rect(ctx, x - 12, y - 2, 24, 2);
    ctx.strokeStyle = '#2a1b14';
    ctx.lineWidth = 2;
    circleStroke(ctx, x - 15, y + 1, 5);
    circleStroke(ctx, x + 15, y + 1, 5);
    return;
  }

  ctx.fillStyle = trunk;
  rect(ctx, x - 5, y - 22, 10, 34);
  ctx.fillStyle = '#7a4d2f';
  rect(ctx, x - 2, y - 20, 3, 27);

  ctx.fillStyle = leafColor;
  circle(ctx, x - 9, y - 27, 10);
  circle(ctx, x + 6, y - 31, 12);
  circle(ctx, x + 13, y - 21, 9);

  if (rare) {
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = object.itemId === 'spiritwoodSplinter' ? '#b68cff' : '#73d18a';
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y - 20, 22);
    ctx.globalAlpha = 1;
  }
}

function drawRunestone(ctx, x, y) {
  if(drawEnvironmentProp(ctx,'runestone',x,y))return;
  drawShadow(ctx, x, y + 10, 11, 4);

  ctx.fillStyle = activeEnvironmentProfile.stone;
  poly(ctx, [
    [x - 8, y + 8],
    [x - 10, y - 13],
    [x - 3, y - 22],
    [x + 8, y - 14],
    [x + 9, y + 8]
  ]);

  ctx.strokeStyle = activeEnvironmentProfile.accent;
  ctx.lineWidth = 2;
  line(ctx, x - 2, y - 13, x + 4, y - 6);
  line(ctx, x + 4, y - 6, x - 1, y + 2);
}

// -----------------------------------------------------------------------------
// MAJOR POI ASSETS
// -----------------------------------------------------------------------------

function drawMajorPoiPiece(ctx, object, x, y, actor=null) {
  if(drawEchorynMajorPiece(ctx,object,x,y,actor))return;
  if(drawNarrativeProp(ctx,object,x,y))return;
  const palette = getMajorPoiPalette(object.majorPoiStyle, object.encounterState);
  const type = object.pieceType;

  const modular={tower:[2,82,116,35],bastion:[2,100,110,35],gatehouse:[3,145,126,40],keep:[4,200,184,66],keepWing:[5,96,112,43],banner:[6,42,65,24],brazier:[7,36,48,20],statue:[8,48,72,14],sealObelisk:[9,52,84,16],barricade:[10,76,56,20]}[type];
  if(modular){
    const [index,w,h,foot]=modular,s=Number(object.scale||1);
    if(drawLandmarkArt(ctx,index,x,y+foot*s,w*s,h*s))return;
  }

  if (type === 'courtyard') {
    drawFortressCourtyard(ctx, object, x, y, palette);
    return;
  }

  if (type === 'wall') {
    drawFortressWall(ctx, object, x, y, palette);
    return;
  }

  if (type === 'tower' || type === 'bastion') {
    drawFortressTower(ctx, object, x, y, palette, type === 'bastion');
    return;
  }

  if (type === 'gatehouse') {
    drawFortressGatehouse(ctx, object, x, y, palette);
    return;
  }

  if (type === 'keep' || type === 'keepWing') {
    drawFortressKeep(ctx, object, x, y, palette, type === 'keepWing');
    return;
  }

  if (type === 'banner') {
    drawFortressBanner(ctx, object, x, y, palette);
    return;
  }

  if (type === 'brazier') {
    drawFortressBrazier(ctx, object, x, y, palette);
    return;
  }

  if (type === 'statue') {
    drawFortressStatue(ctx, object, x, y, palette);
    return;
  }

  if (type === 'sealObelisk') {
    drawSealObelisk(ctx, object, x, y, palette);
    return;
  }

  if (type === 'barricade') {
    drawFortressBarricade(ctx, object, x, y, palette);
    return;
  }

  if (type === 'ruinWall') {
    drawRuinedPoiWall(ctx, object, x, y, palette);
    return;
  }

  if (type === 'column' || type === 'watchPost') {
    drawPoiColumn(ctx, object, x, y, palette, type === 'watchPost');
    return;
  }

  if (type === 'altar' || type === 'mapTable') {
    drawPoiAltar(ctx, object, x, y, palette, type === 'mapTable');
    return;
  }

  if (type === 'machine' || type === 'sealEngine') {
    drawPoiMachine(ctx, object, x, y, palette);
    return;
  }

  if (type === 'cable') {
    drawPoiCable(ctx, object, x, y, palette);
    return;
  }

  if (type === 'crate' || type === 'wagon') {
    drawPoiSupplyProp(ctx, object, x, y, palette, type === 'wagon');
  }
}

function getMajorPoiPalette(style, encounterState = 'hostile') {
  if (style === 'chapel') {
    return applyEncounterPalette({
      ground: '#24231f',
      groundEdge: '#0b0b09',
      dark: '#151619',
      mid: '#44454a',
      light: '#8c8980',
      accent: '#b43232',
      accentBright: '#e1c36a',
      metal: '#6b6160',
      wood: '#44372b'
    }, encounterState);
  }

  if (style === 'frontier') {
    return applyEncounterPalette({
      ground: '#28261f',
      groundEdge: '#0c0b08',
      dark: '#171510',
      mid: '#554936',
      light: '#9c8762',
      accent: '#d9ad4f',
      accentBright: '#f3df9b',
      metal: '#62666b',
      wood: '#604529'
    }, encounterState);
  }

  if (style === 'redSeal') {
    return applyEncounterPalette({
      ground: '#211718',
      groundEdge: '#090506',
      dark: '#110b0d',
      mid: '#3a3033',
      light: '#706469',
      accent: '#d84c42',
      accentBright: '#ff7866',
      metal: '#4d5259',
      wood: '#432323'
    }, encounterState);
  }

  return applyEncounterPalette({
    ground: '#1c1b24',
    groundEdge: '#08080d',
    dark: '#0d0e15',
    mid: '#292b39',
    light: '#666879',
    accent: '#9c75c8',
    accentBright: '#d0b0f0',
    metal: '#4b4e5c',
    wood: '#3e3037'
  }, encounterState);
}

function applyEncounterPalette(palette, encounterState) {
  if (!['gateCleared', 'entranceSecured', 'fullyCleared'].includes(encounterState)) {
    return palette;
  }

  return {
    ...palette,
    accent: '#8ca86b',
    accentBright: '#d8d19a'
  };
}

function drawFortressCourtyard(ctx, object, x, y, p) {
  const width = Math.max(8, Number(object.width || 20)) * TILE;
  const height = Math.max(6, Number(object.height || 14)) * TILE;

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = p.groundEdge;
  rect(ctx, x - width / 2 - 10, y - height / 2 - 8, width + 20, height + 18);
  ctx.fillStyle = p.ground;
  rect(ctx, x - width / 2, y - height / 2, width, height);

  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = p.light;
  ctx.lineWidth = 2;
  for (let sx = x - width / 2 + 28; sx < x + width / 2; sx += 62) {
    line(ctx, sx, y - height / 2 + 8, sx - 18, y + height / 2 - 8);
  }
  for (let sy = y - height / 2 + 28; sy < y + height / 2; sy += 48) {
    line(ctx, x - width / 2 + 10, sy, x + width / 2 - 10, sy + 8);
  }
  ctx.restore();
}

function drawFortressWall(ctx, object, x, y, p) {
  const length = Math.max(2, Number(object.length || 6)) * TILE;
  const horizontal = object.orientation !== 'vertical';
  const width = horizontal ? length : 38;
  const height = horizontal ? 38 : length;

  ctx.save();
  drawShadow(ctx, x, y + height / 2 + 8, width / 2 + 8, 10);

  ctx.fillStyle = p.dark;
  rect(ctx, x - width / 2 - 5, y - height / 2 - 8, width + 10, height + 16);
  ctx.fillStyle = p.mid;
  rect(ctx, x - width / 2, y - height / 2 - 5, width, height + 7);
  ctx.fillStyle = p.light;

  if (horizontal) {
    rect(ctx, x - width / 2, y - height / 2 - 8, width, 8);
    for (let bx = x - width / 2; bx < x + width / 2; bx += 28) {
      rect(ctx, bx, y - height / 2 - 17, 16, 12);
    }
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 2;
    for (let bx = x - width / 2 + 24; bx < x + width / 2; bx += 56) {
      line(ctx, bx, y - 7, bx + 14, y + 7);
    }
  } else {
    rect(ctx, x - width / 2 - 7, y - height / 2, 7, height);
    for (let by = y - height / 2; by < y + height / 2; by += 30) {
      rect(ctx, x - width / 2 - 15, by, 12, 17);
    }
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 2;
    for (let by = y - height / 2 + 24; by < y + height / 2; by += 58) {
      line(ctx, x - 6, by, x + 7, by + 13);
    }
  }

  ctx.restore();
}

function drawFortressTower(ctx, object, x, y, p, bastion = false) {
  const scale = Number(object.scale || 1);
  const width = (bastion ? 76 : 64) * scale;
  const height = (bastion ? 58 : 86) * scale;

  ctx.save();
  drawShadow(ctx, x, y + 15 * scale, width * 0.58, 13 * scale);
  ctx.fillStyle = p.dark;
  rect(ctx, x - width / 2 - 5, y - height / 2 - 8, width + 10, height + 16);
  ctx.fillStyle = p.mid;
  rect(ctx, x - width / 2, y - height / 2, width, height);
  ctx.fillStyle = p.light;
  rect(ctx, x - width / 2 - 5, y - height / 2 - 5, width + 10, 8);

  for (let bx = x - width / 2 - 2; bx < x + width / 2; bx += 19 * scale) {
    rect(ctx, bx, y - height / 2 - 16 * scale, 11 * scale, 13 * scale);
  }

  ctx.fillStyle = p.dark;
  rect(ctx, x - 7 * scale, y - 10 * scale, 14 * scale, 24 * scale);
  ctx.fillStyle = p.accent;
  rect(ctx, x - 3 * scale, y - 25 * scale, 6 * scale, 11 * scale);

  if (!bastion && object.roof === 'spire') {
    ctx.fillStyle = p.dark;
    triangle(ctx, x - width * 0.48, y - height / 2, x, y - height / 2 - 43 * scale, x + width * 0.48, y - height / 2);
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2;
    line(ctx, x, y - height / 2 - 43 * scale, x, y - height / 2 - 58 * scale);
  }
  ctx.restore();
}

function drawFortressGatehouse(ctx, object, x, y, p) {
  const scale = Number(object.scale || 1);
  const width = 148 * scale;
  const height = 82 * scale;

  ctx.save();
  drawShadow(ctx, x, y + 27 * scale, width * 0.55, 16 * scale);
  ctx.fillStyle = p.dark;
  rect(ctx, x - width / 2, y - height / 2, width, height);
  ctx.fillStyle = p.mid;
  rect(ctx, x - width / 2 + 7, y - height / 2 + 5, width - 14, height - 7);
  ctx.fillStyle = p.light;
  rect(ctx, x - width / 2, y - height / 2 - 7, width, 9);
  for (let bx = x - width / 2; bx < x + width / 2; bx += 28 * scale) {
    rect(ctx, bx, y - height / 2 - 19 * scale, 17 * scale, 14 * scale);
  }

  ctx.fillStyle = '#050407';
  poly(ctx, [
    [x - 25 * scale, y + height / 2],
    [x - 25 * scale, y + 2 * scale],
    [x - 15 * scale, y - 18 * scale],
    [x, y - 28 * scale],
    [x + 15 * scale, y - 18 * scale],
    [x + 25 * scale, y + 2 * scale],
    [x + 25 * scale, y + height / 2]
  ]);

  ctx.strokeStyle = p.metal;
  ctx.lineWidth = Math.max(2, 3 * scale);
  for (let gx = x - 19 * scale; gx <= x + 19 * scale; gx += 9 * scale) {
    line(ctx, gx, y - 13 * scale, gx, y + 35 * scale);
  }
  line(ctx, x - 23 * scale, y + 7 * scale, x + 23 * scale, y + 7 * scale);
  line(ctx, x - 23 * scale, y + 22 * scale, x + 23 * scale, y + 22 * scale);

  drawFortressBanner(ctx, { scale: scale * 0.9 }, x - 52 * scale, y - 5 * scale, p);
  drawFortressBanner(ctx, { scale: scale * 0.9 }, x + 52 * scale, y - 5 * scale, p);
  ctx.restore();
}

function drawFortressKeep(ctx, object, x, y, p, wing = false) {
  const scale = Number(object.scale || 1);
  const width = (wing ? 82 : 184) * scale;
  const height = (wing ? 86 : 132) * scale;

  ctx.save();
  drawShadow(ctx, x, y + height * 0.38, width * 0.56, 20 * scale);
  ctx.fillStyle = p.dark;
  rect(ctx, x - width / 2 - 7, y - height / 2 - 8, width + 14, height + 18);
  ctx.fillStyle = p.mid;
  rect(ctx, x - width / 2, y - height / 2, width, height);
  ctx.fillStyle = p.light;
  rect(ctx, x - width / 2 - 4, y - height / 2 - 7, width + 8, 9);

  for (let bx = x - width / 2; bx < x + width / 2; bx += 30 * scale) {
    rect(ctx, bx, y - height / 2 - 19 * scale, 18 * scale, 14 * scale);
  }

  ctx.fillStyle = p.dark;
  rect(ctx, x - 15 * scale, y + 7 * scale, 30 * scale, height * 0.43);
  ctx.fillStyle = p.accent;
  for (let wx = x - width * 0.34; wx <= x + width * 0.34; wx += 42 * scale) {
    rect(ctx, wx - 4 * scale, y - 27 * scale, 8 * scale, 18 * scale);
  }

  if (!wing) {
    drawFortressTower(ctx, { scale: scale * 0.78, roof: object.roof === 'battlement' ? null : 'spire' }, x, y - height * 0.43, p, object.roof === 'battlement');
  }
  ctx.restore();
}

function drawFortressBanner(ctx, object, x, y, p) {
  const scale = Number(object.scale || 1);
  ctx.strokeStyle = p.metal;
  ctx.lineWidth = Math.max(2, 3 * scale);
  line(ctx, x, y - 31 * scale, x, y + 24 * scale);
  ctx.fillStyle = p.accent;
  poly(ctx, [
    [x + 3 * scale, y - 27 * scale],
    [x + 24 * scale, y - 20 * scale],
    [x + 18 * scale, y + 3 * scale],
    [x + 3 * scale, y + 12 * scale]
  ]);
  ctx.fillStyle = p.dark;
  diamond(ctx, x + 12 * scale, y - 9 * scale, 5 * scale);
}

function drawFortressBrazier(ctx, object, x, y, p) {
  const scale = Number(object.scale || 1);
  drawShadow(ctx, x, y + 9 * scale, 13 * scale, 4 * scale);
  ctx.fillStyle = p.metal;
  rect(ctx, x - 11 * scale, y - 1 * scale, 22 * scale, 7 * scale);
  rect(ctx, x - 3 * scale, y + 6 * scale, 6 * scale, 14 * scale);
  ctx.fillStyle = p.accent;
  triangle(ctx, x - 8 * scale, y - 1 * scale, x, y - 25 * scale, x + 8 * scale, y - 1 * scale);
  ctx.fillStyle = p.accentBright;
  triangle(ctx, x - 4 * scale, y - 2 * scale, x + 1 * scale, y - 16 * scale, x + 5 * scale, y - 2 * scale);
}

function drawFortressStatue(ctx, object, x, y, p) {
  const scale = Number(object.scale || 1);
  drawShadow(ctx, x, y + 12 * scale, 16 * scale, 5 * scale);
  ctx.fillStyle = p.dark;
  rect(ctx, x - 15 * scale, y + 2 * scale, 30 * scale, 12 * scale);
  ctx.fillStyle = p.mid;
  poly(ctx, [
    [x - 11 * scale, y + 2 * scale],
    [x - 8 * scale, y - 30 * scale],
    [x, y - 44 * scale],
    [x + 8 * scale, y - 30 * scale],
    [x + 11 * scale, y + 2 * scale]
  ]);
  ctx.fillStyle = p.light;
  circle(ctx, x, y - 47 * scale, 8 * scale);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  line(ctx, x - 8 * scale, y - 22 * scale, x + 9 * scale, y - 6 * scale);
}

function drawSealObelisk(ctx, object, x, y, p) {
  const scale = Number(object.scale || 1);
  const t = performance.now() / 1000;
  const pulse = 0.78 + Math.sin(t * 3) * 0.12;

  drawShadow(ctx, x, y + 16 * scale, 20 * scale, 6 * scale);
  ctx.fillStyle = p.dark;
  poly(ctx, [
    [x - 17 * scale, y + 15 * scale],
    [x - 12 * scale, y - 38 * scale],
    [x, y - 58 * scale],
    [x + 12 * scale, y - 38 * scale],
    [x + 17 * scale, y + 15 * scale]
  ]);
  ctx.fillStyle = p.mid;
  poly(ctx, [
    [x - 9 * scale, y + 8 * scale],
    [x - 6 * scale, y - 33 * scale],
    [x, y - 44 * scale],
    [x + 6 * scale, y - 33 * scale],
    [x + 9 * scale, y + 8 * scale]
  ]);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = p.accentBright;
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y - 19 * scale, 10 * scale);
  line(ctx, x - 7 * scale, y - 26 * scale, x + 7 * scale, y - 12 * scale);
  line(ctx, x + 7 * scale, y - 26 * scale, x - 7 * scale, y - 12 * scale);
  ctx.restore();
}

function drawFortressBarricade(ctx, object, x, y, p) {
  const scale = Number(object.scale || 1);
  const flip = object.orientation === 'diagonalRight' ? -1 : 1;
  drawShadow(ctx, x, y + 7 * scale, 25 * scale, 4 * scale);
  ctx.strokeStyle = p.wood;
  ctx.lineWidth = 7 * scale;
  line(ctx, x - 23 * scale, y + 9 * scale, x + 23 * scale, y - 7 * scale * flip);
  line(ctx, x - 23 * scale, y - 7 * scale * flip, x + 23 * scale, y + 9 * scale);
  ctx.fillStyle = p.metal;
  triangle(ctx, x - 25 * scale, y - 7 * scale, x - 17 * scale, y - 22 * scale, x - 11 * scale, y - 4 * scale);
  triangle(ctx, x + 11 * scale, y - 4 * scale, x + 18 * scale, y - 22 * scale, x + 25 * scale, y - 7 * scale);
}

function drawRuinedPoiWall(ctx, object, x, y, p) {
  drawFortressWall(ctx, { ...object, length: object.length || 5 }, x, y, p);
  ctx.save();
  ctx.fillStyle = p.groundEdge;
  const horizontal = object.orientation !== 'vertical';
  if (horizontal) {
    triangle(ctx, x - 30, y - 24, x - 12, y - 4, x + 3, y - 24);
    triangle(ctx, x + 38, y - 24, x + 50, y - 5, x + 61, y - 24);
  } else {
    triangle(ctx, x - 20, y - 34, x + 3, y - 17, x - 20, y - 2);
  }
  ctx.restore();
}

function drawPoiColumn(ctx, object, x, y, p, watchPost = false) {
  const scale = Number(object.scale || 1);
  drawShadow(ctx, x, y + 12 * scale, 16 * scale, 5 * scale);
  ctx.fillStyle = watchPost ? p.wood : p.dark;
  rect(ctx, x - 10 * scale, y - 42 * scale, 20 * scale, 54 * scale);
  ctx.fillStyle = watchPost ? p.light : p.mid;
  rect(ctx, x - 14 * scale, y - 46 * scale, 28 * scale, 8 * scale);
  rect(ctx, x - 15 * scale, y + 8 * scale, 30 * scale, 7 * scale);
  if (watchPost) {
    ctx.strokeStyle = p.metal;
    ctx.lineWidth = 3;
    line(ctx, x - 20 * scale, y - 47 * scale, x + 20 * scale, y - 47 * scale);
    drawFortressBanner(ctx, { scale: scale * 0.72 }, x + 17 * scale, y - 30 * scale, p);
  }
}

function drawPoiAltar(ctx, object, x, y, p, mapTable = false) {
  const scale = Number(object.scale || 1);
  drawShadow(ctx, x, y + 9 * scale, 25 * scale, 6 * scale);
  ctx.fillStyle = mapTable ? p.wood : p.dark;
  rect(ctx, x - 28 * scale, y - 7 * scale, 56 * scale, 18 * scale);
  ctx.fillStyle = mapTable ? p.light : p.mid;
  rect(ctx, x - 31 * scale, y - 12 * scale, 62 * scale, 8 * scale);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  if (mapTable) {
    line(ctx, x - 19 * scale, y - 8 * scale, x + 17 * scale, y - 8 * scale);
    line(ctx, x - 8 * scale, y - 10 * scale, x + 4 * scale, y - 5 * scale);
  } else {
    circleStroke(ctx, x, y - 8 * scale, 8 * scale);
    line(ctx, x - 6 * scale, y - 14 * scale, x + 6 * scale, y - 2 * scale);
  }
}

function drawPoiMachine(ctx, object, x, y, p) {
  const scale = Number(object.scale || 1);
  const t = performance.now() / 1000;
  drawShadow(ctx, x, y + 12 * scale, 26 * scale, 7 * scale);
  ctx.fillStyle = p.dark;
  rect(ctx, x - 26 * scale, y - 22 * scale, 52 * scale, 34 * scale);
  ctx.fillStyle = p.metal;
  rect(ctx, x - 20 * scale, y - 16 * scale, 40 * scale, 22 * scale);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3;
  circleStroke(ctx, x, y - 5 * scale, (8 + Math.sin(t * 2) * 1.5) * scale);
  line(ctx, x - 21 * scale, y - 17 * scale, x + 20 * scale, y + 6 * scale);
}

function drawPoiCable(ctx, object, x, y, p) {
  const length = Number(object.length || 5) * TILE;
  ctx.save();
  ctx.strokeStyle = p.dark;
  ctx.lineWidth = 8;
  line(ctx, x - length / 2, y, x + length / 2, y);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  line(ctx, x - length / 2, y - 1, x + length / 2, y - 1);
  ctx.restore();
}

function drawPoiSupplyProp(ctx, object, x, y, p, wagon = false) {
  const scale = Number(object.scale || 1);
  drawShadow(ctx, x, y + 10 * scale, wagon ? 34 * scale : 17 * scale, 5 * scale);
  ctx.fillStyle = p.wood;
  rect(ctx, x - (wagon ? 34 : 16) * scale, y - 12 * scale, (wagon ? 68 : 32) * scale, 25 * scale);
  ctx.strokeStyle = p.metal;
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x - (wagon ? 34 : 16) * scale), Math.round(y - 12 * scale), Math.round((wagon ? 68 : 32) * scale), Math.round(25 * scale));
  if (wagon) {
    ctx.fillStyle = p.dark;
    circle(ctx, x - 23 * scale, y + 16 * scale, 9 * scale);
    circle(ctx, x + 23 * scale, y + 16 * scale, 9 * scale);
  }
}

function drawPoiInvestigation(ctx, object, x, y) {
  const color = object.inspected ? '#7e8795' : object.color || '#d9ad4f';
  drawShadow(ctx, x, y + 8, 15, 4);
  ctx.fillStyle = '#1b1b20';
  rect(ctx, x - 14, y - 10, 28, 19);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  circleStroke(ctx, x, y - 2, 8);
  line(ctx, x - 5, y - 7, x + 5, y + 3);
}

function drawDungeonSetpiece(ctx, object, x, y) {
  const style = object.setpieceStyle || 'sealEngine';
  const palette = getMajorPoiPalette(style === 'covenant' ? 'chapel' : 'redSeal');
  if (style === 'ritualStaging') {
    drawPoiAltar(ctx, object, x, y, palette, false);
    return;
  }
  if (style === 'rootConduit') {
    drawPoiCable(ctx, { ...object, length: object.length || 4 }, x, y, palette);
    drawPoiMachine(ctx, { ...object, scale: 0.7 }, x, y - 7, palette);
    return;
  }
  drawPoiMachine(ctx, object, x, y, palette);
}

function drawGothicCastle(ctx, object, x, y) {
  const scale = object.scale || 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  drawShadow(ctx, 0, 26, 56, 13);

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#b68cff';
  circle(ctx, 0, -20, 62);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#12141d';
  rect(ctx, -48, -56, 18, 78);
  rect(ctx, 30, -56, 18, 78);

  ctx.fillStyle = '#222632';
  rect(ctx, -44, -51, 10, 68);
  rect(ctx, 34, -51, 10, 68);

  ctx.fillStyle = '#08090f';
  triangle(ctx, -39, -88, -55, -56, -23, -56);
  triangle(ctx, 39, -88, 23, -56, 55, -56);

  ctx.fillStyle = '#171923';
  rect(ctx, -31, -50, 62, 74);

  ctx.fillStyle = '#252936';
  rect(ctx, -25, -43, 50, 61);

  ctx.fillStyle = '#10121a';
  rect(ctx, -12, -82, 24, 58);

  ctx.fillStyle = '#07080d';
  triangle(ctx, 0, -116, -20, -82, 20, -82);

  ctx.fillStyle = '#0b0c12';
  for (let i = -28; i <= 24; i += 13) {
    rect(ctx, i, -57, 8, 10);
  }

  rect(ctx, -34, -50, 68, 7);

  ctx.fillStyle = '#050509';
  poly(ctx, [
    [-12, 24],
    [-12, -2],
    [-6, -13],
    [0, -17],
    [6, -13],
    [12, -2],
    [12, 24]
  ]);

  ctx.strokeStyle = '#594331';
  ctx.lineWidth = 2;
  line(ctx, 0, -14, 0, 23);

  ctx.fillStyle = '#d9ad4f';
  ctx.globalAlpha = 0.85;
  rect(ctx, -21, -32, 5, 12);
  rect(ctx, 16, -32, 5, 12);
  rect(ctx, -3, -66, 6, 13);
  rect(ctx, -40, -39, 4, 10);
  rect(ctx, 36, -39, 4, 10);

  ctx.fillStyle = '#b68cff';
  ctx.globalAlpha = 0.55;
  rect(ctx, -5, -42, 10, 5);

  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#07080d';
  ctx.lineWidth = 2;
  line(ctx, -22, -6, -12, 6);
  line(ctx, 18, -17, 8, -2);
  line(ctx, -2, -75, 5, -63);

  ctx.strokeStyle = '#555966';
  ctx.globalAlpha = 0.32;
  ctx.lineWidth = 2;
  line(ctx, -27, -42, 25, -42);
  line(ctx, -29, 15, 28, 15);
  line(ctx, -46, -50, -32, -50);
  line(ctx, 32, -50, 46, -50);

  ctx.restore();
}

function drawDemonLair(ctx, object, x, y) {
  const scale = object.scale || 1;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  drawShadow(ctx, 0, 17, 43, 10);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#b94a3d';
  circle(ctx, 0, 0, 48);
  ctx.globalAlpha = 0.12;
  circle(ctx, 0, 0, 66);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#151015';
  poly(ctx, [
    [-42, 19],
    [-35, -10],
    [-20, -31],
    [0, -39],
    [22, -31],
    [37, -8],
    [44, 19]
  ]);

  ctx.fillStyle = '#2b2023';
  poly(ctx, [
    [-35, 17],
    [-28, -7],
    [-16, -23],
    [0, -30],
    [17, -23],
    [29, -6],
    [36, 17]
  ]);

  ctx.fillStyle = '#050203';
  poly(ctx, [
    [-18, 18],
    [-15, -2],
    [-8, -15],
    [0, -20],
    [8, -15],
    [15, -2],
    [18, 18]
  ]);

  ctx.fillStyle = '#3a2828';
  triangle(ctx, -30, -4, -49, -29, -24, -18);
  triangle(ctx, 30, -4, 49, -29, 24, -18);

  ctx.fillStyle = '#5c1f1f';
  triangle(ctx, -31, -8, -42, -23, -26, -16);
  triangle(ctx, 31, -8, 42, -23, 26, -16);

  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#b94a3d';
  poly(ctx, [
    [-8, 17],
    [-7, 0],
    [0, -12],
    [7, 0],
    [8, 17]
  ]);

  ctx.globalAlpha = 1;

  ctx.strokeStyle = '#b94a3d';
  ctx.globalAlpha = 0.46;
  ctx.lineWidth = 2;
  line(ctx, -20, -17, -12, -6);
  line(ctx, 19, -18, 11, -6);
  line(ctx, -6, -30, 1, -22);
  ctx.restore();
}

function drawRedSeal(ctx, object, x, y) {
  const scale = object.scale || 1;
  const t = performance.now() / 1000;
  const pulse = 1 + Math.sin(t * 3.2) * 0.06;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * pulse, scale * pulse);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#b94a3d';
  circle(ctx, 0, 0, 31);

  ctx.globalAlpha = 0.58;
  ctx.strokeStyle = '#b94a3d';
  ctx.lineWidth = 3;
  circleStroke(ctx, 0, 0, 24);

  ctx.globalAlpha = 0.72;
  ctx.strokeStyle = '#ff725f';
  ctx.lineWidth = 2;
  circleStroke(ctx, 0, 0, 15);

  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#ff725f';
  ctx.lineWidth = 2;

  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + t * 0.25;
    const x1 = Math.cos(a) * 7;
    const y1 = Math.sin(a) * 7;
    const x2 = Math.cos(a + Math.PI) * 19;
    const y2 = Math.sin(a + Math.PI) * 19;

    line(ctx, x1, y1, x2, y2);
  }

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffd1bd';
  circle(ctx, 0, 0, 3);

  ctx.restore();
}

// -----------------------------------------------------------------------------
// ENVIRONMENTAL PROPS
// -----------------------------------------------------------------------------

function drawTreeCluster(ctx, object, x, y) {
  const scale = object.scale || 1;
  const seed = hashString(object.id || `${x},${y}`);
  const trunks = [
    [-10, 4, 0.9],
    [7, 1, 1.05],
    [0, -7, 1.15]
  ];

  drawShadow(ctx, x, y + 14 * scale, 24 * scale, 8 * scale);

  for (let i = 0; i < trunks.length; i++) {
    const [ox, oy, s] = trunks[i];
    drawSingleTree(ctx, x + ox * scale, y + oy * scale, scale * s, seed + i);
  }
}

function drawSingleTree(ctx, x, y, scale, seed) {
  if (drawPropSprite(ctx, 8, x, y + 20 * scale, .64 * scale)) return;
  const trunkColor = activeEnvironmentProfile.bark;
  const barkDark = activeEnvironmentProfile.barkDark;
  const leafDark = activeEnvironmentProfile.leafDark;
  const leafMid = activeEnvironmentProfile.leafMid;
  const leafLight = activeEnvironmentProfile.leafLight;

  ctx.fillStyle = barkDark;
  rect(ctx, x - 6 * scale, y - 5 * scale, 12 * scale, 25 * scale);
  ctx.fillStyle = trunkColor;
  rect(ctx, x - 4 * scale, y - 3 * scale, 8 * scale, 22 * scale);

  ctx.fillStyle = barkDark;
  rect(ctx, x - 2 * scale, y + 1 * scale, 2 * scale, 14 * scale);
  triangle(ctx, x - 4 * scale, y + 14 * scale, x - 12 * scale, y + 20 * scale, x - 1 * scale, y + 17 * scale);
  triangle(ctx, x + 3 * scale, y + 13 * scale, x + 12 * scale, y + 20 * scale, x, y + 18 * scale);

  const wobble = (seed % 5) - 2;

  ctx.strokeStyle = activeEnvironmentProfile.barkDark;
  ctx.lineWidth = Math.max(1, 2 * scale);
  line(ctx, x, y - 5 * scale, x - 13 * scale, y - 18 * scale);
  line(ctx, x + 1 * scale, y - 8 * scale, x + 15 * scale, y - 21 * scale);

  ctx.fillStyle = leafDark;
  circle(ctx, x - 9 * scale, y - 18 * scale, 17 * scale);
  circle(ctx, x + 10 * scale, y - 20 * scale, 17 * scale);
  circle(ctx, x + wobble * scale, y - 31 * scale, 19 * scale);

  ctx.fillStyle = leafMid;
  circle(ctx, x - 5 * scale, y - 23 * scale, 12 * scale);
  circle(ctx, x + 7 * scale, y - 25 * scale, 12 * scale);
  circle(ctx, x + 1 * scale, y - 35 * scale, 13 * scale);

  ctx.fillStyle = leafLight;
  ctx.globalAlpha = 0.28;
  circle(ctx, x - 7 * scale, y - 29 * scale, 5 * scale);
  circle(ctx, x + 7 * scale, y - 33 * scale, 4 * scale);
  rect(ctx, x - 15 * scale, y - 18 * scale, 7 * scale, 3 * scale);
  ctx.globalAlpha = 1;
}

function drawPineCluster(ctx, object, x, y) {
  const scale = object.scale || 1;
  drawShadow(ctx, x, y + 16 * scale, 24 * scale, 8 * scale);

  drawSinglePine(ctx, x - 10 * scale, y + 3 * scale, scale * 0.9);
  drawSinglePine(ctx, x + 8 * scale, y + 1 * scale, scale);
  drawSinglePine(ctx, x, y - 8 * scale, scale * 1.12);
}

function drawSinglePine(ctx, x, y, scale) {
  if (drawPropSprite(ctx, 9, x, y + 20 * scale, .66 * scale)) return;
  ctx.fillStyle = activeEnvironmentProfile.barkDark;
  rect(ctx, x - 4 * scale, y - 5 * scale, 8 * scale, 25 * scale);
  ctx.fillStyle = activeEnvironmentProfile.bark;
  rect(ctx, x - 3 * scale, y - 4 * scale, 6 * scale, 23 * scale);

  ctx.fillStyle = activeEnvironmentProfile.leafDark;
  triangle(ctx, x, y - 45 * scale, x - 18 * scale, y - 15 * scale, x + 18 * scale, y - 15 * scale);
  ctx.fillStyle = activeEnvironmentProfile.leafMid;
  triangle(ctx, x, y - 34 * scale, x - 20 * scale, y, x + 20 * scale, y);
  ctx.fillStyle = activeEnvironmentProfile.leafLight;
  triangle(ctx, x, y - 22 * scale, x - 17 * scale, y + 12 * scale, x + 17 * scale, y + 12 * scale);

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  triangle(ctx, x - 1 * scale, y - 41 * scale, x - 10 * scale, y - 19 * scale, x + 1 * scale, y - 20 * scale);
  ctx.globalAlpha = 1;
}

function drawShrub(ctx, object, x, y) {
  if(drawEnvironmentProp(ctx,'shrub',x,y,object))return;
  const scale = object.scale || 1;
  const color = object.dead ? '#4d3435' : activeEnvironmentProfile.leafMid;
  const light = object.dead ? '#7a4b4d' : activeEnvironmentProfile.leafLight;

  drawShadow(ctx, x, y + 8 * scale, 13 * scale, 4 * scale);

  ctx.fillStyle = color;
  circle(ctx, x - 7 * scale, y, 8 * scale);
  circle(ctx, x + 7 * scale, y - 1 * scale, 8 * scale);
  circle(ctx, x, y - 7 * scale, 10 * scale);

  ctx.fillStyle = light;
  ctx.globalAlpha = 0.34;
  circle(ctx, x - 4 * scale, y - 6 * scale, 3 * scale);
  circle(ctx, x + 5 * scale, y - 7 * scale, 3 * scale);
  rect(ctx, x - 11 * scale, y + 1 * scale, 7 * scale, 2 * scale);
  ctx.globalAlpha = 1;
}

function drawTallGrassPatch(ctx, object, x, y) {
  if(drawEnvironmentProp(ctx,'tallGrassPatch',x,y,object))return;
  const scale = object.scale || 1;
  drawShadow(ctx, x, y + 7 * scale, 15 * scale, 3 * scale);

  ctx.strokeStyle = object.dead ? '#6d4c36' : '#47783d';
  ctx.lineWidth = Math.max(1, 2 * scale);

  const blades = [
    [-13, 8, -16],
    [-8, 8, -20],
    [-3, 8, -15],
    [4, 8, -23],
    [10, 8, -17],
    [15, 8, -13]
  ];

  for (const [ox, base, top] of blades) {
    line(ctx, x + ox * scale, y + base * scale, x + (ox + 2) * scale, y + top * scale);
  }

  ctx.fillStyle = object.dead ? '#a17b44' : '#9abf5b';
  rect(ctx, x - 2 * scale, y - 17 * scale, 3 * scale, 5 * scale);
}

function drawStump(ctx, object, x, y) {
  if(drawEnvironmentProp(ctx,'stump',x,y,object))return;
  const scale = object.scale || 1;
  drawShadow(ctx, x, y + 9 * scale, 13 * scale, 4 * scale);

  ctx.fillStyle = '#4b2f1f';
  rect(ctx, x - 9 * scale, y - 11 * scale, 18 * scale, 20 * scale);

  ctx.fillStyle = '#765034';
  ctx.beginPath();
  ctx.ellipse(x, y - 11 * scale, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3a2317';
  ctx.lineWidth = Math.max(1, 2 * scale);
  circleStroke(ctx, x, y - 11 * scale, 5 * scale);

  ctx.fillStyle = '#2d1b12';
  rect(ctx, x - 2 * scale, y - 4 * scale, 3 * scale, 11 * scale);
}

function drawDeadRoot(ctx, object, x, y) {
  if(drawEnvironmentProp(ctx,'deadRoot',x,y,object))return;
  const scale = object.scale || 1;
  drawShadow(ctx, x, y + 8 * scale, 18 * scale, 4 * scale);

  ctx.strokeStyle = activeEnvironmentProfile.barkDark;
  ctx.lineWidth = 5 * scale;
  line(ctx, x - 16 * scale, y + 6 * scale, x, y - 5 * scale);
  line(ctx, x, y - 5 * scale, x + 17 * scale, y + 5 * scale);

  ctx.strokeStyle = activeEnvironmentProfile.bark;
  ctx.lineWidth = 2 * scale;
  line(ctx, x - 12 * scale, y + 5 * scale, x - 20 * scale, y - 3 * scale);
  line(ctx, x + 8 * scale, y + 0, x + 18 * scale, y - 9 * scale);
  line(ctx, x + 1 * scale, y - 4 * scale, x + 4 * scale, y - 20 * scale);
}

function drawGraveMarker(ctx, object, x, y) {
  if(drawEnvironmentProp(ctx,'graveMarker',x,y,object))return;
  const scale = object.scale || 1;
  drawShadow(ctx, x, y + 10 * scale, 10 * scale, 3 * scale);

  const cracked = object.cracked !== false;

  ctx.fillStyle = activeEnvironmentProfile.stoneDark;
  rect(ctx, x - 10 * scale, y - 23 * scale, 20 * scale, 32 * scale);

  ctx.fillStyle = activeEnvironmentProfile.stone;
  rect(ctx, x - 8 * scale, y - 22 * scale, 16 * scale, 29 * scale);

  ctx.beginPath();
  ctx.arc(x, y - 22 * scale, 8 * scale, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = activeEnvironmentProfile.stoneLight;
  rect(ctx, x - 5 * scale, y - 18 * scale, 10 * scale, 3 * scale);
  rect(ctx, x - 2 * scale, y - 19 * scale, 4 * scale, 12 * scale);
  rect(ctx, x - 6 * scale, y - 15 * scale, 12 * scale, 3 * scale);

  if (cracked) {
    ctx.strokeStyle = '#25252d';
    ctx.lineWidth = Math.max(1, 2 * scale);
    line(ctx, x - 1 * scale, y - 20 * scale, x + 3 * scale, y - 9 * scale);
    line(ctx, x + 3 * scale, y - 9 * scale, x - 2 * scale, y + 1 * scale);
  }
}

function drawBrokenWall(ctx, object, x, y) {
  if(drawEnvironmentProp(ctx,'brokenWall',x,y,object))return;
  const scale = object.scale || 1;
  const horizontal = object.orientation !== 'vertical';

  drawShadow(ctx, x, y + 11 * scale, horizontal ? 25 * scale : 10 * scale, 5 * scale);

  ctx.fillStyle = activeEnvironmentProfile.stoneDark;

  if (horizontal) {
    rect(ctx, x - 27 * scale, y - 11 * scale, 54 * scale, 18 * scale);
    rect(ctx, x - 18 * scale, y - 23 * scale, 14 * scale, 12 * scale);
    rect(ctx, x + 8 * scale, y - 20 * scale, 16 * scale, 9 * scale);

    ctx.fillStyle = activeEnvironmentProfile.stoneLight;
    rect(ctx, x - 23 * scale, y - 7 * scale, 12 * scale, 3 * scale);
    rect(ctx, x + 3 * scale, y - 5 * scale, 15 * scale, 3 * scale);
  } else {
    rect(ctx, x - 10 * scale, y - 29 * scale, 19 * scale, 58 * scale);
    rect(ctx, x - 18 * scale, y - 12 * scale, 8 * scale, 15 * scale);
    rect(ctx, x + 9 * scale, y + 7 * scale, 9 * scale, 15 * scale);

    ctx.fillStyle = activeEnvironmentProfile.stoneLight;
    rect(ctx, x - 6 * scale, y - 23 * scale, 3 * scale, 14 * scale);
    rect(ctx, x - 3 * scale, y + 3 * scale, 3 * scale, 18 * scale);
  }

  ctx.strokeStyle = activeEnvironmentProfile.stoneDark;
  ctx.lineWidth = Math.max(1, 2 * scale);

  if (horizontal) {
    line(ctx, x - 24 * scale, y + 6 * scale, x + 24 * scale, y - 5 * scale);
  } else {
    line(ctx, x - 5 * scale, y - 25 * scale, x + 4 * scale, y + 24 * scale);
  }
}

function drawRuinPillar(ctx, object, x, y) {
  if(drawEnvironmentProp(ctx,'ruinPillar',x,y,object))return;
  const scale = object.scale || 1;
  const broken = object.broken !== false;

  drawShadow(ctx, x, y + 13 * scale, 13 * scale, 4 * scale);

  ctx.fillStyle = activeEnvironmentProfile.stoneDark;
  rect(ctx, x - 11 * scale, y - 35 * scale, 22 * scale, 47 * scale);

  ctx.fillStyle = activeEnvironmentProfile.stone;
  rect(ctx, x - 9 * scale, y - 34 * scale, 18 * scale, 43 * scale);

  ctx.fillStyle = activeEnvironmentProfile.stoneLight;
  rect(ctx, x - 12 * scale, y - 38 * scale, 24 * scale, 6 * scale);
  rect(ctx, x - 11 * scale, y + 7 * scale, 22 * scale, 5 * scale);

  ctx.fillStyle = activeEnvironmentProfile.stoneDark;
  rect(ctx, x - 5 * scale, y - 27 * scale, 3 * scale, 26 * scale);
  rect(ctx, x + 4 * scale, y - 27 * scale, 3 * scale, 26 * scale);

  if (broken) {
    ctx.fillStyle = '#2c2e38';
    triangle(ctx, x - 12 * scale, y - 38 * scale, x + 12 * scale, y - 38 * scale, x + 3 * scale, y - 50 * scale);
  }
}

function drawSmallBoulder(ctx, object, x, y) {
  if(drawEnvironmentProp(ctx,'smallBoulder',x,y,object))return;
  const scale = object.scale || 1;
  rock(
    ctx,
    x,
    y,
    object.dark ? activeEnvironmentProfile.stoneDark : activeEnvironmentProfile.stone,
    activeEnvironmentProfile.stoneLight,
    scale
  );
}

function drawSignpost(ctx, object, x, y) {
  if(drawEnvironmentProp(ctx,'signpost',x,y,object))return;
  const scale = object.scale || 1;

  drawShadow(ctx, x, y + 9 * scale, 11 * scale, 3 * scale);

  ctx.fillStyle = '#5a3824';
  rect(ctx, x - 3 * scale, y - 22 * scale, 6 * scale, 31 * scale);

  ctx.fillStyle = '#8a5a32';
  poly(ctx, [
    [x - 3 * scale, y - 20 * scale],
    [x + 20 * scale, y - 20 * scale],
    [x + 25 * scale, y - 14 * scale],
    [x + 20 * scale, y - 8 * scale],
    [x - 3 * scale, y - 8 * scale]
  ]);

  ctx.fillStyle = '#2b1a10';
  rect(ctx, x + 3 * scale, y - 17 * scale, 11 * scale, 2 * scale);
}

function drawTownProp(ctx, object, x, y) {
  if(object.orderBanner)return drawTownBanner(ctx,object,x,y);
  if(drawNarrativeProp(ctx,object,x,y))return;
  if(drawTownDetailProp(ctx,object,x,y))return;
  if (drawTownPropSprite(ctx, object, x, y)) return;
  const type = object.propType;

  if (type === 'buildingFront') return drawTownBuildingFront(ctx, object, x, y);
  if (type === 'roadEdge') return drawTownRoadEdge(ctx, object, x, y);
  if (type === 'roadRuts') return drawTownRoadRuts(ctx, object, x, y);
  if (type === 'lantern') return drawTownLantern(ctx, object, x, y);
  if (type === 'crateStack') return drawTownCrateStack(ctx, object, x, y);
  if (type === 'barrels') return drawTownBarrels(ctx, object, x, y);
  if (type === 'sacks') return drawTownSacks(ctx, object, x, y);
  if (type === 'bench') return drawTownBench(ctx, object, x, y);
  if (type === 'banner') return drawTownBanner(ctx, object, x, y);
  if (type === 'fence') return drawTownFence(ctx, object, x, y);
  if (type === 'well') return drawTownWell(ctx, object, x, y);
  if (type === 'woodPile') return drawTownWoodPile(ctx, object, x, y);
  if (type === 'weaponRack') return drawTownWeaponRack(ctx, object, x, y);
  if (type === 'practiceDummy') return drawTownPracticeDummy(ctx, object, x, y);
  if (type === 'forge') return drawTownForge(ctx, object, x, y);
  if (type === 'anvil') return drawTownAnvil(ctx, object, x, y);
  if (type === 'alchemyTable') return drawTownAlchemyTable(ctx, object, x, y);
  if (type === 'bankChest') return drawTownBankChest(ctx, object, x, y);
  if (type === 'contractTable') return drawTownContractTable(ctx, object, x, y);
  if (type === 'candleCluster') return drawTownCandles(ctx, object, x, y);
  if (type === 'palisade') return drawTownPalisade(ctx, object, x, y);
  if (type === 'bridgeDeck') return drawTownBridgeDeck(ctx, object, x, y);
  if (type === 'guardPost') return drawTownGuardPost(ctx, object, x, y);
  if (type === 'barricade') return drawTownBarricade(ctx, object, x, y);
  if (type === 'supplyWagon') return drawTownSupplyWagon(ctx, object, x, y);
  if (type === 'marketCanopy') return drawTownMarketCanopy(ctx, object, x, y);
  if (type === 'straw') return drawTownStraw(ctx, object, x, y);
  if (type === 'puddle') return drawTownPuddle(ctx, object, x, y);
  if (type === 'chimneySmoke') return drawTownChimneySmoke(ctx, object, x, y);
  if (type === 'laundryLine') return drawTownLaundryLine(ctx, object, x, y);
  if (type === 'noticePapers') return drawTownNoticePapers(ctx, object, x, y);
  if (type === 'herbPlanter') return drawTownHerbPlanter(ctx, object, x, y);
  if (type === 'quarantineTent') return drawQuarantineTent(ctx, object, x, y);
  if (type === 'infirmaryCot') return drawInfirmaryCot(ctx, object, x, y);
  if (type === 'washBasin') return drawWashBasin(ctx, object, x, y);
  if (type === 'plagueMarker') return drawPlagueMarker(ctx, object, x, y);
  if (type === 'purificationBrazier') return drawPurificationBrazier(ctx, object, x, y);
  if (type === 'warningBell') return drawWarningBell(ctx, object, x, y);
  if (type === 'sickWagon') return drawSickWagon(ctx, object, x, y);
  if (type === 'medicineCrates') return drawMedicineCrates(ctx, object, x, y);
  if (type === 'freshGrave') return drawFreshGrave(ctx, object, x, y);
  if (type === 'memorialStone') return drawMemorialStone(ctx, object, x, y);
  if (type === 'burnPit') return drawBurnPit(ctx, object, x, y);
  if (type === 'diseasedOrchardTree') return drawDiseasedOrchardTree(ctx, object, x, y);
  if (type === 'rotIrrigation') return drawRotIrrigation(ctx, object, x, y);
  if (type === 'harvestCart') return drawHarvestCart(ctx, object, x, y);
  if (type === 'childToy') return drawChildToy(ctx, object, x, y);
  if (type === 'prayerRibbons') return drawPrayerRibbons(ctx, object, x, y);
  if (type === 'deadLivestock') return drawDeadLivestock(ctx, object, x, y);
  if (type === 'ancientSluice') return drawAncientSluice(ctx, object, x, y);
  if (type === 'brokenBellTower') return drawBrokenBellTower(ctx, object, x, y);
  if (type === 'brokenStainedGlass') return drawBrokenStainedGlass(ctx, object, x, y);
  if (type === 'avarranOathStone') return drawAvarranOathStone(ctx, object, x, y);
  if (type === 'witnessPlatform') return drawWitnessPlatform(ctx, object, x, y);
  if (type === 'echoFragment') return drawEchoFragment(ctx, object, x, y);
  if (type === 'rotMemorial') return drawRotMemorial(ctx, object, x, y);
  if (type === 'blockedAlcove') return drawBlockedAlcove(ctx, object, x, y);

  drawTownCrateStack(ctx, object, x, y);
}

function drawQuarantineTent(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 13 * s, 34 * s, 7 * s);
  ctx.fillStyle = '#5a4737';
  rect(ctx, x - 38 * s, y - 8 * s, 76 * s, 23 * s);
  ctx.fillStyle = object.color || '#d8d1bd';
  triangle(ctx, x - 43 * s, y - 8 * s, x, y - 48 * s, x + 43 * s, y - 8 * s);
  ctx.fillStyle = '#29241f';
  triangle(ctx, x - 11 * s, y - 8 * s, x, y - 31 * s, x + 11 * s, y - 8 * s);
  ctx.strokeStyle = '#d9ad4f';
  ctx.lineWidth = 3 * s;
  circleStroke(ctx, x, y - 38 * s, 6 * s);
  line(ctx, x - 9 * s, y - 38 * s, x + 9 * s, y - 38 * s);
  line(ctx, x, y - 47 * s, x, y - 29 * s);
}

function drawInfirmaryCot(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 8 * s, 24 * s, 4 * s);
  ctx.fillStyle = '#5a3824'; rect(ctx, x - 29 * s, y - 5 * s, 58 * s, 10 * s);
  ctx.fillStyle = '#ddd5bf'; rect(ctx, x - 25 * s, y - 10 * s, 50 * s, 9 * s);
  ctx.fillStyle = '#eee6cf'; rect(ctx, x - 23 * s, y - 14 * s, 14 * s, 7 * s);
  ctx.fillStyle = '#d9ad4f'; rect(ctx, x + 4 * s, y - 10 * s, 3 * s, 9 * s);
}

function drawWashBasin(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 8 * s, 16 * s, 4 * s);
  ctx.fillStyle = '#6b6f76'; circle(ctx, x, y - 2 * s, 18 * s);
  ctx.fillStyle = '#314f5f'; circle(ctx, x, y - 5 * s, 13 * s);
  ctx.fillStyle = '#eee6cf'; rect(ctx, x + 15 * s, y - 24 * s, 5 * s, 25 * s);
}

function drawPlagueMarker(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  ctx.fillStyle = '#4a3526'; rect(ctx, x - 3 * s, y - 30 * s, 6 * s, 40 * s);
  ctx.fillStyle = '#eee6cf'; rect(ctx, x - 17 * s, y - 32 * s, 34 * s, 23 * s);
  ctx.strokeStyle = '#7a2e35'; ctx.lineWidth = 4 * s;
  line(ctx, x - 10 * s, y - 27 * s, x + 10 * s, y - 14 * s);
  line(ctx, x + 10 * s, y - 27 * s, x - 10 * s, y - 14 * s);
}

function drawPurificationBrazier(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#f3df9b'; circle(ctx, x, y - 18 * s, 30 * s);
  ctx.globalAlpha = 1; ctx.fillStyle = '#5f6368';
  poly(ctx, [[x - 17*s,y - 10*s],[x + 17*s,y - 10*s],[x + 11*s,y + 5*s],[x - 11*s,y + 5*s]]);
  ctx.fillStyle = '#d9ad4f'; triangle(ctx, x - 9*s, y - 11*s, x, y - 35*s, x + 9*s, y - 11*s);
  ctx.fillStyle = '#eee6cf'; circle(ctx, x + 8*s, y - 43*s, 7*s); circle(ctx, x + 13*s, y - 53*s, 5*s); ctx.restore();
}

function drawWarningBell(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  ctx.strokeStyle = '#5a3824'; ctx.lineWidth = 5 * s;
  line(ctx, x - 18*s, y + 10*s, x - 18*s, y - 38*s); line(ctx, x - 18*s, y - 38*s, x + 12*s, y - 38*s);
  ctx.fillStyle = '#b28a3f'; poly(ctx, [[x - 2*s,y - 37*s],[x + 17*s,y - 37*s],[x + 22*s,y - 16*s],[x - 7*s,y - 16*s]]);
  circle(ctx, x + 8*s, y - 13*s, 4*s);
}

function drawSickWagon(ctx, object, x, y) {
  drawTownSupplyWagon(ctx, object, x, y);
  const s = Number(object.scale || 1);
  ctx.fillStyle = object.clean ? '#eee6cf' : '#b9ad94';
  poly(ctx, [[x - 28*s,y - 24*s],[x - 18*s,y - 43*s],[x + 18*s,y - 43*s],[x + 28*s,y - 24*s]]);
  ctx.strokeStyle = '#d9ad4f'; ctx.lineWidth = 3*s; circleStroke(ctx, x, y - 32*s, 6*s);
}

function drawMedicineCrates(ctx, object, x, y) {
  drawTownCrateStack(ctx, object, x, y);
  const s = Number(object.scale || 1);
  ctx.fillStyle = '#eee6cf'; rect(ctx, x - 8*s, y - 19*s, 16*s, 11*s);
  ctx.fillStyle = '#d9ad4f'; rect(ctx, x - 2*s, y - 18*s, 4*s, 9*s); rect(ctx, x - 6*s, y - 15*s, 12*s, 3*s);
}

function drawFreshGrave(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 8*s, 24*s, 6*s);
  ctx.fillStyle = '#33271d'; poly(ctx, [[x - 25*s,y + 5*s],[x - 17*s,y - 6*s],[x + 18*s,y - 6*s],[x + 27*s,y + 5*s]]);
  ctx.fillStyle = '#7c7569'; rect(ctx, x - 8*s, y - 32*s, 16*s, 25*s);
  ctx.fillStyle = '#eee6cf'; rect(ctx, x + 12*s, y - 7*s, 9*s, 3*s);
}

function drawMemorialStone(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 9*s, 20*s, 5*s);
  ctx.fillStyle = '#55575d'; poly(ctx, [[x - 19*s,y + 8*s],[x - 16*s,y - 35*s],[x,y - 48*s],[x + 16*s,y - 35*s],[x + 19*s,y + 8*s]]);
  ctx.strokeStyle = '#d9ad4f'; ctx.lineWidth = 2*s; circleStroke(ctx, x, y - 27*s, 7*s); line(ctx, x - 10*s,y - 13*s,x + 10*s,y - 13*s);
}

function drawBurnPit(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#ef6f2f'; circle(ctx, x, y - 4*s, 34*s);
  ctx.globalAlpha = 1; ctx.fillStyle = '#1b1715'; circle(ctx, x, y + 4*s, 25*s);
  ctx.fillStyle = '#ef6f2f'; triangle(ctx, x - 13*s,y + 2*s,x - 2*s,y - 30*s,x + 5*s,y + 3*s);
  ctx.fillStyle = '#ffcc66'; triangle(ctx, x - 2*s,y + 3*s,x + 11*s,y - 24*s,x + 14*s,y + 3*s);
  ctx.fillStyle = '#8b8178'; circle(ctx, x + 18*s,y - 35*s, 8*s); circle(ctx, x + 24*s,y - 47*s, 6*s); ctx.restore();
}

function drawDiseasedOrchardTree(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const sway = Math.sin(Date.now() / 1700 + Number(object.phase || 0)) * 2.2 * s;
  drawShadow(ctx, x, y + 11*s, 28*s, 7*s);
  ctx.strokeStyle = '#271b19'; ctx.lineWidth = 9*s;
  line(ctx, x, y + 8*s, x + sway, y - 48*s);
  ctx.lineWidth = 5*s;
  line(ctx, x + sway, y - 34*s, x - 25*s + sway, y - 58*s);
  line(ctx, x + sway, y - 42*s, x + 26*s + sway, y - 66*s);
  ctx.fillStyle = object.restored ? '#526a3a' : '#302626';
  for (const [dx, dy, r] of [[-24,-60,15],[4,-66,18],[27,-68,13],[-3,-82,14]]) {
    circle(ctx, x + (dx + sway)*s, y + dy*s, r*s);
  }
  ctx.fillStyle = object.restored ? '#bd5f42' : '#77706a';
  for (const [dx, dy] of [[-17,-59],[9,-62],[28,-70],[-2,-78]]) circle(ctx, x + (dx + sway)*s, y + dy*s, 4*s);
  if (!object.restored) {
    ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = '#a7a0b4';
    circle(ctx, x - 18*s, y - 92*s, 3*s); circle(ctx, x + 14*s, y - 101*s, 2*s); circle(ctx, x + 31*s, y - 87*s, 3*s);
    ctx.restore();
  }
}

function drawRotIrrigation(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const horizontal = object.orientation !== 'vertical';
  const length = Number(object.length || 4) * TILE * s;
  ctx.save(); ctx.globalAlpha = 0.75; ctx.strokeStyle = '#564634'; ctx.lineWidth = 11*s;
  horizontal ? line(ctx, x-length/2,y,x+length/2,y) : line(ctx,x,y-length/2,x,y+length/2);
  ctx.strokeStyle = object.cleansed ? '#466f78' : '#251b28'; ctx.lineWidth = 6*s;
  horizontal ? line(ctx, x-length/2,y,x+length/2,y) : line(ctx,x,y-length/2,x,y+length/2);
  ctx.globalAlpha = 0.35 + Math.sin(Date.now()/650)*0.08; ctx.strokeStyle = object.cleansed ? '#75b1b8' : '#72475e'; ctx.lineWidth = 2*s;
  horizontal ? line(ctx, x-length/2,y-1*s,x+length/2,y-1*s) : line(ctx,x-1*s,y-length/2,x-1*s,y+length/2);
  ctx.restore();
}

function drawHarvestCart(ctx, object, x, y) {
  drawTownSupplyWagon(ctx, { ...object, scale: Number(object.scale || 1) * 0.82 }, x, y);
  const s = Number(object.scale || 1);
  ctx.fillStyle = '#77706a';
  for (const [dx,dy] of [[-16,-22],[-5,-26],[7,-23],[17,-27],[-11,-32],[3,-34]]) circle(ctx,x+dx*s,y+dy*s,4*s);
}

function drawChildToy(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y+5*s, 10*s, 3*s);
  ctx.fillStyle = '#815a3d'; rect(ctx,x-12*s,y-4*s,21*s,8*s);
  ctx.fillStyle = '#b58a58'; circle(ctx,x-8*s,y+5*s,5*s); circle(ctx,x+7*s,y+5*s,5*s);
  rect(ctx,x+4*s,y-14*s,5*s,11*s); triangle(ctx,x+7*s,y-18*s,x+15*s,y-10*s,x+7*s,y-9*s);
}

function drawPrayerRibbons(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  ctx.strokeStyle = '#4b392a'; ctx.lineWidth = 2*s; line(ctx,x-28*s,y-30*s,x+28*s,y-34*s);
  const colors = ['#eee6cf','#d9ad4f','#c9bfa7','#eee6cf'];
  [-20,-7,7,20].forEach((dx,index) => { ctx.fillStyle = colors[index]; poly(ctx,[[x+dx*s,y-33*s],[x+(dx+5)*s,y-34*s],[x+(dx+3)*s,y-13*s],[x+(dx-2)*s,y-17*s]]); });
}

function drawDeadLivestock(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx,x,y+7*s,26*s,6*s);
  ctx.fillStyle = '#4b4038'; ctx.beginPath(); ctx.ellipse(x,y,25*s,13*s,0,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#b6aa96'; ctx.lineWidth = 3*s; line(ctx,x-12*s,y-4*s,x+12*s,y+4*s); line(ctx,x+13*s,y-2*s,x+27*s,y-14*s);
  ctx.fillStyle = '#9b9080'; circle(ctx,x+29*s,y-16*s,8*s);
}

function drawAncientSluice(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx,x,y+10*s,31*s,7*s);
  ctx.fillStyle = '#45484c'; poly(ctx,[[x-33*s,y+8*s],[x-28*s,y-34*s],[x+28*s,y-34*s],[x+33*s,y+8*s]]);
  ctx.fillStyle = '#191d22'; rect(ctx,x-16*s,y-23*s,32*s,31*s);
  ctx.strokeStyle = object.lit ? '#f0d98b' : '#6d7180'; ctx.lineWidth = 2*s; circleStroke(ctx,x,y-25*s,22*s);
  for (let i=0;i<8;i++) { const a=(i/9)*Math.PI*2; circle(ctx,x+Math.cos(a)*22*s,y-25*s+Math.sin(a)*22*s,2.5*s); }
}

function drawBrokenBellTower(ctx, object, x, y) {
  const s=Number(object.scale||1); drawShadow(ctx,x,y+10*s,31*s,8*s);
  ctx.fillStyle='#55545a'; rect(ctx,x-25*s,y-60*s,50*s,68*s);
  ctx.fillStyle='#1a1b20'; rect(ctx,x-13*s,y-48*s,26*s,29*s);
  ctx.fillStyle='#8d7139'; poly(ctx,[[x-10*s,y-43*s],[x+9*s,y-43*s],[x+13*s,y-25*s],[x-14*s,y-25*s]]);
  ctx.strokeStyle='#332820'; ctx.lineWidth=3*s; line(ctx,x,y-60*s,x+21*s,y-80*s); line(ctx,x+21*s,y-80*s,x+31*s,y-70*s);
  ctx.fillStyle='#2d2c31'; triangle(ctx,x-29*s,y-60*s,x-8*s,y-78*s,x+4*s,y-60*s);
}

function drawBrokenStainedGlass(ctx, object, x, y) {
  const s=Number(object.scale||1); ctx.fillStyle='#24252b'; rect(ctx,x-21*s,y-43*s,42*s,47*s);
  ctx.fillStyle='#b87835'; triangle(ctx,x-16*s,y-37*s,x-2*s,y-11*s,x-17*s,y-8*s);
  ctx.fillStyle='#d6a64b'; triangle(ctx,x-11*s,y-39*s,x+15*s,y-34*s,x+2*s,y-13*s);
  ctx.fillStyle='#6e3942'; triangle(ctx,x+16*s,y-29*s,x+17*s,y-5*s,x+4*s,y-10*s);
  ctx.strokeStyle='#18191d'; ctx.lineWidth=3*s; line(ctx,x-20*s,y-5*s,x+20*s,y-40*s); line(ctx,x-18*s,y-30*s,x+18*s,y-7*s);
}

function drawAvarranOathStone(ctx, object, x, y) {
  const s=Number(object.scale||1); drawShadow(ctx,x,y+8*s,25*s,6*s);
  ctx.fillStyle=object.restored?'#7d7156':'#56565a'; poly(ctx,[[x-24*s,y+7*s],[x-20*s,y-44*s],[x,y-55*s],[x+20*s,y-44*s],[x+24*s,y+7*s]]);
  ctx.strokeStyle=object.restored?'#e5b95c':'#987b49'; ctx.lineWidth=3*s;
  line(ctx,x,y-38*s,x,y-16*s); line(ctx,x,y-26*s,x-12*s,y-35*s); line(ctx,x,y-26*s,x+12*s,y-35*s);
  ctx.beginPath(); ctx.arc(x-8*s,y-18*s,10*s,0.2,2.7); ctx.stroke(); ctx.beginPath(); ctx.arc(x+8*s,y-18*s,10*s,0.45,2.95); ctx.stroke();
}

function drawWitnessPlatform(ctx, object, x, y) {
  const s=Number(object.scale||1); drawShadow(ctx,x,y+10*s,37*s,8*s);
  ctx.fillStyle='#5b5448'; poly(ctx,[[x-43*s,y+8*s],[x-34*s,y-9*s],[x+34*s,y-9*s],[x+43*s,y+8*s]]);
  ctx.fillStyle='#866b3e'; rect(ctx,x-34*s,y-13*s,68*s,6*s);
  ctx.fillStyle='#d1aa55'; for(let i=-3;i<=3;i++) rect(ctx,x+i*9*s-2*s,y-11*s,3*s,4*s);
}

function drawEchoFragment(ctx, object, x, y) {
  const s=Number(object.scale||1); const pulse=0.65+Math.sin(Date.now()/520+Number(object.phase||0))*0.18;
  ctx.save(); ctx.globalAlpha=pulse*0.28; ctx.fillStyle=object.color||'#e6c77a'; circle(ctx,x,y-20*s,27*s);
  ctx.globalAlpha=pulse; ctx.strokeStyle=object.color||'#f2d998'; ctx.lineWidth=3*s; circleStroke(ctx,x,y-22*s,10*s);
  line(ctx,x-12*s,y-4*s,x-4*s,y-14*s); line(ctx,x+12*s,y-4*s,x+4*s,y-14*s); ctx.restore();
}

function drawRotMemorial(ctx, object, x, y) {
  const s=Number(object.scale||1); drawFreshGrave(ctx,{...object,scale:s},x,y);
  ctx.strokeStyle='#3c2339'; ctx.lineWidth=5*s; line(ctx,x-19*s,y+2*s,x-4*s,y-22*s); line(ctx,x-4*s,y-22*s,x+16*s,y-9*s);
  ctx.fillStyle='#76526d'; circle(ctx,x-5*s,y-23*s,5*s); circle(ctx,x+15*s,y-10*s,4*s);
}

function drawBlockedAlcove(ctx, object, x, y) {
  const s=Number(object.scale||1); drawShadow(ctx,x,y+9*s,30*s,7*s);
  ctx.fillStyle='#45464b'; rect(ctx,x-32*s,y-47*s,64*s,55*s);
  ctx.fillStyle='#17191d'; ctx.beginPath(); ctx.arc(x,y-24*s,20*s,Math.PI,0); ctx.lineTo(x+20*s,y+5*s); ctx.lineTo(x-20*s,y+5*s); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#8b7650'; ctx.lineWidth=4*s; line(ctx,x-25*s,y-35*s,x+23*s,y-5*s); line(ctx,x-24*s,y-5*s,x+23*s,y-35*s);
}

function drawTownBuildingFront(ctx, object, x, y) {
  const scale = Number(object.scale || 1);
  const width = Math.max(2, Number(object.width || 4)) * TILE * scale;
  const height = Math.max(2, Number(object.height || 2)) * TILE * scale;
  const color = object.color || '#d9ad4f';
  const accent = object.accent || '#9facbf';

  const building={guild:4,smith:1,alchemist:2,bank:5,market:3}[object.service]??0;
  if(drawTownBuildingArt(ctx,building,x,y+height*.2,height*1.1,width+12*scale))return;

  ctx.save();
  drawShadow(ctx, x, y + height * 0.24, width * 0.48, 11 * scale);

  ctx.fillStyle = '#11151a';
  rect(ctx, x - width / 2 - 5 * scale, y - height * 0.55, width + 10 * scale, height * 0.72);

  ctx.fillStyle = '#27232a';
  rect(ctx, x - width / 2, y - height * 0.5, width, height * 0.64);

  ctx.fillStyle = '#3a2a22';
  poly(ctx, [
    [x - width / 2 - 9 * scale, y - height * 0.5],
    [x, y - height * 0.83],
    [x + width / 2 + 9 * scale, y - height * 0.5],
    [x + width / 2, y - height * 0.38],
    [x - width / 2, y - height * 0.38]
  ]);

  ctx.fillStyle = color;
  rect(ctx, x - width * 0.38, y - height * 0.39, width * 0.76, 5 * scale);

  ctx.fillStyle = '#0b0d12';
  rect(ctx, x - 11 * scale, y - height * 0.16, 22 * scale, height * 0.3);

  ctx.fillStyle = accent;
  if (object.service === 'guild') {
    diamond(ctx, x, y - height * 0.28, 9 * scale);
    line(ctx, x - 16 * scale, y - height * 0.24, x - 5 * scale, y - height * 0.32);
    line(ctx, x + 16 * scale, y - height * 0.24, x + 5 * scale, y - height * 0.32);
  } else if (object.service === 'smith') {
    rect(ctx, x - 12 * scale, y - height * 0.3, 24 * scale, 6 * scale);
    rect(ctx, x - 5 * scale, y - height * 0.39, 10 * scale, 9 * scale);
  } else if (object.service === 'alchemist') {
    circle(ctx, x, y - height * 0.3, 9 * scale);
    rect(ctx, x - 4 * scale, y - height * 0.45, 8 * scale, 13 * scale);
  } else if (object.service === 'bank') {
    rect(ctx, x - 16 * scale, y - height * 0.33, 32 * scale, 7 * scale);
    rect(ctx, x - 12 * scale, y - height * 0.22, 24 * scale, 5 * scale);
  } else if (object.service === 'market') {
    rect(ctx, x - 29 * scale, y - height * 0.4, 14 * scale, 11 * scale);
    rect(ctx, x - 5 * scale, y - height * 0.4, 14 * scale, 11 * scale);
    rect(ctx, x + 19 * scale, y - height * 0.4, 14 * scale, 11 * scale);
  } else {
    circleStroke(ctx, x, y - height * 0.3, 11 * scale);
  }

  ctx.restore();
}

function drawTownRoadEdge(ctx, object, x, y) {
  const length = Math.max(2, Number(object.length || 6)) * TILE;
  const horizontal = object.orientation !== 'vertical';

  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = '#78664b';
  ctx.lineWidth = 3;
  if (horizontal) {
    line(ctx, x - length / 2, y, x + length / 2, y);
    for (let sx = x - length / 2; sx <= x + length / 2; sx += 28) {
      rect(ctx, sx, y - 3, 8, 4);
    }
  } else {
    line(ctx, x, y - length / 2, x, y + length / 2);
    for (let sy = y - length / 2; sy <= y + length / 2; sy += 28) {
      rect(ctx, x - 3, sy, 4, 8);
    }
  }
  ctx.restore();
}

function drawTownRoadRuts(ctx, object, x, y) {
  const length = Math.max(2, Number(object.length || 6)) * TILE;
  const horizontal = object.orientation === 'horizontal';

  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = '#201912';
  ctx.lineWidth = 3;
  if (horizontal) {
    line(ctx, x - length / 2, y - 6, x + length / 2, y - 6);
    line(ctx, x - length / 2, y + 8, x + length / 2, y + 8);
  } else {
    line(ctx, x - 7, y - length / 2, x - 7, y + length / 2);
    line(ctx, x + 7, y - length / 2, x + 7, y + length / 2);
  }
  ctx.restore();
}

function drawTownLantern(ctx, object, x, y) {
  const scale = Number(object.scale || 1);
  const glow = object.glow || '#ffcc66';

  ctx.save();
  drawShadow(ctx, x, y + 9 * scale, 8 * scale, 3 * scale);
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = glow;
  circle(ctx, x, y - 20 * scale, 26 * scale);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#3a2618';
  rect(ctx, x - 3 * scale, y - 18 * scale, 6 * scale, 30 * scale);
  ctx.fillStyle = '#2a1a12';
  rect(ctx, x - 7 * scale, y - 27 * scale, 14 * scale, 12 * scale);
  ctx.fillStyle = glow;
  rect(ctx, x - 4 * scale, y - 24 * scale, 8 * scale, 7 * scale);
  ctx.restore();
}

function drawTownCrateStack(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 10 * s, 17 * s, 4 * s);
  ctx.fillStyle = '#5f4733';
  rect(ctx, x - 18 * s, y - 8 * s, 18 * s, 17 * s);
  rect(ctx, x + 1 * s, y - 4 * s, 17 * s, 13 * s);
  ctx.fillStyle = '#8a5a32';
  rect(ctx, x - 10 * s, y - 22 * s, 17 * s, 14 * s);
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 2 * s;
  line(ctx, x - 17 * s, y, x - 1 * s, y);
  line(ctx, x - 9 * s, y - 21 * s, x - 9 * s, y - 9 * s);
}

function drawTownBarrels(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 9 * s, 18 * s, 4 * s);
  for (const [ox, oy] of [[-10, 0], [6, 1], [-1, -10]]) {
    ctx.fillStyle = '#6d3f24';
    rect(ctx, x + ox * s - 7 * s, y + oy * s - 11 * s, 14 * s, 21 * s);
    ctx.strokeStyle = '#2a1a12';
    ctx.lineWidth = 2 * s;
    line(ctx, x + ox * s - 7 * s, y + oy * s - 4 * s, x + ox * s + 7 * s, y + oy * s - 4 * s);
    line(ctx, x + ox * s - 7 * s, y + oy * s + 5 * s, x + ox * s + 7 * s, y + oy * s + 5 * s);
  }
}

function drawTownSacks(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 9 * s, 17 * s, 4 * s);
  const colors = ['#9b7a52', '#b08a5b', object.herbColor || '#806445'];
  [[-10, 1], [4, 0], [-2, -8]].forEach(([ox, oy], index) => {
    ctx.fillStyle = colors[index % colors.length];
    poly(ctx, [
      [x + (ox - 8) * s, y + (oy + 8) * s],
      [x + (ox - 7) * s, y + (oy - 4) * s],
      [x + ox * s, y + (oy - 11) * s],
      [x + (ox + 8) * s, y + (oy - 2) * s],
      [x + (ox + 9) * s, y + (oy + 8) * s]
    ]);
  });
}

function drawTownBench(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const vertical = object.orientation === 'vertical';
  drawShadow(ctx, x, y + 8 * s, vertical ? 6 * s : 22 * s, 3 * s);
  ctx.fillStyle = '#5a3824';
  if (vertical) {
    rect(ctx, x - 5 * s, y - 22 * s, 10 * s, 42 * s);
    rect(ctx, x - 10 * s, y - 16 * s, 20 * s, 5 * s);
    rect(ctx, x - 10 * s, y + 8 * s, 20 * s, 5 * s);
  } else {
    rect(ctx, x - 24 * s, y - 5 * s, 48 * s, 10 * s);
    rect(ctx, x - 17 * s, y - 11 * s, 5 * s, 21 * s);
    rect(ctx, x + 12 * s, y - 11 * s, 5 * s, 21 * s);
  }
}

function drawTownBanner(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const color = object.color || '#d9ad4f';
  ctx.strokeStyle = '#62666b';
  ctx.lineWidth = 3 * s;
  line(ctx, x, y - 34 * s, x, y + 19 * s);
  ctx.fillStyle = color;
  poly(ctx, [
    [x + 3 * s, y - 31 * s],
    [x + 24 * s, y - 25 * s],
    [x + 19 * s, y - 5 * s],
    [x + 3 * s, y + 4 * s]
  ]);
  ctx.fillStyle = '#11151a';
  const cx=x+12*s,cy=y-16*s;
  if(object.symbol==='tree'){poly(ctx,[[cx,cy-7*s],[cx-6*s,cy+2*s],[cx+6*s,cy+2*s]]);ctx.fillRect(cx-s,cy+2*s,2*s,6*s);}
  else if(object.symbol==='shield')poly(ctx,[[cx-5*s,cy-6*s],[cx+5*s,cy-6*s],[cx+4*s,cy+3*s],[cx,cy+7*s],[cx-4*s,cy+3*s]]);
  else if(object.symbol==='open hand'){ctx.fillRect(cx-4*s,cy,8*s,6*s);for(let i=0;i<4;i++)ctx.fillRect(cx+(i*2-4)*s,cy-(i===0?3:6)*s,s,7*s);}
  else if(object.symbol==='lantern'){ctx.fillRect(cx-4*s,cy-4*s,8*s,10*s);ctx.strokeStyle='#11151a';ctx.lineWidth=s;ctx.strokeRect(cx-2*s,cy-7*s,4*s,3*s);ctx.fillStyle=color;ctx.fillRect(cx-s,cy-2*s,2*s,5*s);}
  else diamond(ctx,cx,cy,4*s);
}

function drawTownFence(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const length = Math.max(2, Number(object.length || 5)) * TILE;
  const horizontal = object.orientation !== 'vertical';
  ctx.strokeStyle = '#5a3824';
  ctx.lineWidth = 5 * s;
  if (horizontal) {
    line(ctx, x - length / 2, y, x + length / 2, y);
    for (let px = x - length / 2; px <= x + length / 2; px += 24) rect(ctx, px - 2 * s, y - 13 * s, 5 * s, 26 * s);
  } else {
    line(ctx, x, y - length / 2, x, y + length / 2);
    for (let py = y - length / 2; py <= y + length / 2; py += 24) rect(ctx, x - 13 * s, py - 2 * s, 26 * s, 5 * s);
  }
}

function drawTownWell(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 11 * s, 19 * s, 5 * s);
  ctx.fillStyle = '#3a3d48';
  rect(ctx, x - 19 * s, y - 9 * s, 38 * s, 19 * s);
  ctx.fillStyle = '#62666b';
  rect(ctx, x - 16 * s, y - 14 * s, 32 * s, 7 * s);
  ctx.fillStyle = '#11151a';
  rect(ctx, x - 11 * s, y - 6 * s, 22 * s, 11 * s);
  ctx.strokeStyle = '#5a3824';
  ctx.lineWidth = 3 * s;
  line(ctx, x - 15 * s, y - 15 * s, x - 15 * s, y - 35 * s);
  line(ctx, x + 15 * s, y - 15 * s, x + 15 * s, y - 35 * s);
  line(ctx, x - 18 * s, y - 35 * s, x + 18 * s, y - 35 * s);
}

function drawTownWoodPile(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 9 * s, 19 * s, 4 * s);
  ctx.strokeStyle = '#5a3824';
  ctx.lineWidth = 6 * s;
  line(ctx, x - 22 * s, y + 5 * s, x + 18 * s, y - 6 * s);
  line(ctx, x - 18 * s, y - 3 * s, x + 20 * s, y + 7 * s);
  line(ctx, x - 10 * s, y + 11 * s, x + 24 * s, y - 1 * s);
}

function drawTownWeaponRack(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 9 * s, 17 * s, 4 * s);
  ctx.strokeStyle = '#5a3824';
  ctx.lineWidth = 4 * s;
  line(ctx, x - 18 * s, y - 15 * s, x + 18 * s, y - 15 * s);
  line(ctx, x - 14 * s, y - 25 * s, x - 14 * s, y + 9 * s);
  line(ctx, x + 14 * s, y - 25 * s, x + 14 * s, y + 9 * s);
  ctx.strokeStyle = '#9facbf';
  line(ctx, x - 6 * s, y + 5 * s, x + 8 * s, y - 30 * s);
  line(ctx, x + 5 * s, y + 6 * s, x + 18 * s, y - 23 * s);
  ctx.fillStyle = '#73d18a';
  rect(ctx, x - 20 * s, y - 5 * s, 7 * s, 16 * s);
}

function drawTownPracticeDummy(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 10 * s, 12 * s, 4 * s);
  ctx.fillStyle = '#5a3824';
  rect(ctx, x - 3 * s, y - 30 * s, 6 * s, 40 * s);
  ctx.fillStyle = '#8a5a32';
  circle(ctx, x, y - 35 * s, 8 * s);
  rect(ctx, x - 11 * s, y - 27 * s, 22 * s, 20 * s);
  ctx.strokeStyle = '#d9ad4f';
  ctx.lineWidth = 2 * s;
  line(ctx, x - 9 * s, y - 19 * s, x + 9 * s, y - 19 * s);
}

function drawTownForge(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 12 * s, 22 * s, 5 * s);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ef6f2f';
  circle(ctx, x, y - 10 * s, 33 * s);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#211719';
  rect(ctx, x - 25 * s, y - 16 * s, 50 * s, 28 * s);
  ctx.fillStyle = '#3a3d48';
  rect(ctx, x - 21 * s, y - 23 * s, 42 * s, 9 * s);
  ctx.fillStyle = '#ef6f2f';
  rect(ctx, x - 14 * s, y - 8 * s, 28 * s, 11 * s);
  ctx.fillStyle = '#ffcc66';
  rect(ctx, x - 8 * s, y - 6 * s, 16 * s, 7 * s);
  ctx.restore();
}

function drawTownAnvil(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 10 * s, 18 * s, 4 * s);
  ctx.fillStyle = '#62666b';
  rect(ctx, x - 18 * s, y - 9 * s, 36 * s, 8 * s);
  rect(ctx, x - 7 * s, y - 18 * s, 14 * s, 10 * s);
  ctx.fillStyle = '#3a3d48';
  rect(ctx, x - 9 * s, y, 18 * s, 15 * s);
}

function drawTownAlchemyTable(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 9 * s, 23 * s, 4 * s);
  ctx.fillStyle = '#5a3824';
  rect(ctx, x - 27 * s, y - 7 * s, 54 * s, 15 * s);
  rect(ctx, x - 22 * s, y + 5 * s, 5 * s, 16 * s);
  rect(ctx, x + 17 * s, y + 5 * s, 5 * s, 16 * s);
  ctx.fillStyle = '#b68cff';
  circle(ctx, x - 12 * s, y - 11 * s, 6 * s);
  ctx.fillStyle = '#73d18a';
  circle(ctx, x + 4 * s, y - 12 * s, 5 * s);
  ctx.fillStyle = '#ffcc66';
  rect(ctx, x + 14 * s, y - 18 * s, 8 * s, 12 * s);
}

function drawTownBankChest(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 9 * s, 17 * s, 4 * s);
  ctx.fillStyle = '#3a2618';
  rect(ctx, x - 20 * s, y - 12 * s, 40 * s, 24 * s);
  ctx.fillStyle = '#604529';
  rect(ctx, x - 17 * s, y - 19 * s, 34 * s, 12 * s);
  ctx.strokeStyle = '#d9ad4f';
  ctx.lineWidth = 3 * s;
  ctx.strokeRect(Math.round(x - 20 * s), Math.round(y - 12 * s), Math.round(40 * s), Math.round(24 * s));
  ctx.fillStyle = '#ffcc66';
  rect(ctx, x - 4 * s, y - 3 * s, 8 * s, 8 * s);
}

function drawTownContractTable(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 8 * s, 21 * s, 4 * s);
  ctx.fillStyle = '#5a3824';
  rect(ctx, x - 24 * s, y - 8 * s, 48 * s, 15 * s);
  ctx.fillStyle = '#d8c891';
  rect(ctx, x - 18 * s, y - 13 * s, 12 * s, 8 * s);
  rect(ctx, x - 2 * s, y - 15 * s, 13 * s, 9 * s);
  rect(ctx, x + 12 * s, y - 11 * s, 8 * s, 6 * s);
}

function drawTownCandles(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const glow = object.glow || '#f3df9b';
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = glow;
  circle(ctx, x, y - 9 * s, 22 * s);
  ctx.globalAlpha = 1;
  for (const [ox, h] of [[-9, 10], [0, 14], [9, 8]]) {
    ctx.fillStyle = '#e8edf5';
    rect(ctx, x + ox * s - 2 * s, y - h * s, 4 * s, h * s);
    ctx.fillStyle = glow;
    triangle(ctx, x + ox * s - 3 * s, y - h * s, x + ox * s, y - (h + 8) * s, x + ox * s + 3 * s, y - h * s);
  }
  ctx.restore();
}

function drawTownPalisade(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const length = Math.max(2, Number(object.length || 5)) * TILE;
  const horizontal = object.orientation !== 'vertical';
  ctx.fillStyle = '#4b2f1c';
  if (horizontal) {
    for (let px = x - length / 2; px <= x + length / 2; px += 11 * s) {
      rect(ctx, px, y - 20 * s, 7 * s, 35 * s);
      triangle(ctx, px, y - 20 * s, px + 3.5 * s, y - 30 * s, px + 7 * s, y - 20 * s);
    }
  } else {
    for (let py = y - length / 2; py <= y + length / 2; py += 11 * s) {
      rect(ctx, x - 20 * s, py, 35 * s, 7 * s);
    }
  }
}

function drawTownBridgeDeck(ctx, object, x, y) {
  const width = Math.max(4, Number(object.width || 7)) * TILE;
  const height = Math.max(3, Number(object.height || 4)) * TILE;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#31261c';
  rect(ctx, x - width / 2, y - height / 2, width, height);
  ctx.strokeStyle = '#6d5638';
  ctx.lineWidth = 3;
  for (let py = y - height / 2 + 12; py < y + height / 2; py += 18) {
    line(ctx, x - width / 2 + 8, py, x + width / 2 - 8, py);
  }
  ctx.strokeStyle = '#2a1a12';
  line(ctx, x - width / 2 + 10, y - height / 2, x - width / 2 + 10, y + height / 2);
  line(ctx, x + width / 2 - 10, y - height / 2, x + width / 2 - 10, y + height / 2);
  ctx.restore();
}

function drawTownGuardPost(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 11 * s, 18 * s, 4 * s);
  ctx.fillStyle = '#3a2618';
  rect(ctx, x - 15 * s, y - 8 * s, 30 * s, 20 * s);
  ctx.fillStyle = '#604529';
  triangle(ctx, x - 20 * s, y - 8 * s, x, y - 31 * s, x + 20 * s, y - 8 * s);
  ctx.fillStyle = '#d9ad4f';
  rect(ctx, x - 3 * s, y - 24 * s, 6 * s, 12 * s);
}

function drawTownBarricade(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const flip = object.orientation === 'diagonalRight' ? -1 : 1;
  drawShadow(ctx, x, y + 7 * s, 24 * s, 4 * s);
  ctx.strokeStyle = '#604529';
  ctx.lineWidth = 6 * s;
  line(ctx, x - 22 * s, y + 8 * s, x + 22 * s, y - 7 * s * flip);
  line(ctx, x - 22 * s, y - 7 * s * flip, x + 22 * s, y + 8 * s);
  ctx.fillStyle = '#9facbf';
  triangle(ctx, x - 24 * s, y - 7 * s, x - 17 * s, y - 21 * s, x - 11 * s, y - 4 * s);
  triangle(ctx, x + 11 * s, y - 4 * s, x + 18 * s, y - 21 * s, x + 24 * s, y - 7 * s);
}

function drawTownSupplyWagon(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 11 * s, 29 * s, 5 * s);
  ctx.fillStyle = '#5f4733';
  rect(ctx, x - 32 * s, y - 13 * s, 64 * s, 25 * s);
  ctx.fillStyle = '#8a5a32';
  rect(ctx, x - 22 * s, y - 24 * s, 44 * s, 12 * s);
  ctx.fillStyle = '#1b1511';
  circle(ctx, x - 21 * s, y + 14 * s, 8 * s);
  circle(ctx, x + 21 * s, y + 14 * s, 8 * s);
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 3 * s;
  line(ctx, x + 32 * s, y - 4 * s, x + 48 * s, y - 13 * s);
}

function drawTownMarketCanopy(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const width = Math.max(3, Number(object.width || 5)) * TILE * s;
  const color = object.color || '#d9ad4f';
  const accent = object.accent || '#7a2e35';
  ctx.fillStyle = color;
  rect(ctx, x - width / 2, y - 42 * s, width, 12 * s);
  ctx.fillStyle = accent;
  for (let px = x - width / 2 + 7 * s; px < x + width / 2; px += 25 * s) {
    rect(ctx, px, y - 42 * s, 12 * s, 12 * s);
  }
  ctx.strokeStyle = '#5a3824';
  ctx.lineWidth = 3 * s;
  line(ctx, x - width / 2 + 4 * s, y - 30 * s, x - width / 2 + 4 * s, y - 2 * s);
  line(ctx, x + width / 2 - 4 * s, y - 30 * s, x + width / 2 - 4 * s, y - 2 * s);
}

function drawTownStraw(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#8a6d33';
  for (let index = 0; index < 9; index++) {
    rect(ctx, x - 20 * s + index * 5 * s, y - 3 * s + (index % 3) * 3 * s, 14 * s, 2 * s);
  }
  ctx.restore();
}

function drawTownPuddle(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#14304b';
  ctx.beginPath();
  ctx.ellipse(x, y + 3 * s, 23 * s, 8 * s, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#66f0ff';
  ctx.lineWidth = 2 * s;
  ctx.beginPath();
  ctx.ellipse(x + 3 * s, y + 2 * s, 12 * s, 3 * s, -0.15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawTownChimneySmoke(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const t = performance.now() / 1000 + Number(object.drift || 0);
  const color = object.color || '#9facbf';

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = color;
  for (let index = 0; index < 3; index++) {
    const rise = index * 15 * s;
    const wobble = Math.sin(t * 1.4 + index) * 4 * s;
    circle(ctx, x + wobble, y - 52 * s - rise, (10 - index * 1.8) * s);
  }
  ctx.restore();
}

function drawTownLaundryLine(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const width = Math.max(3, Number(object.width || 4)) * TILE * s;

  ctx.save();
  ctx.strokeStyle = '#5a3824';
  ctx.lineWidth = 3 * s;
  line(ctx, x - width / 2, y - 29 * s, x + width / 2, y - 29 * s);
  rect(ctx, x - width / 2 - 3 * s, y - 42 * s, 6 * s, 45 * s);
  rect(ctx, x + width / 2 - 3 * s, y - 42 * s, 6 * s, 45 * s);
  const cloths = [
    ['#d8c891', -0.28],
    [object.color || '#d9ad4f', 0],
    ['#9facbf', 0.28]
  ];
  for (const [color, offset] of cloths) {
    ctx.fillStyle = color;
    rect(ctx, x + width * offset - 9 * s, y - 27 * s, 18 * s, 18 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    rect(ctx, x + width * offset - 9 * s, y - 10 * s, 18 * s, 3 * s);
  }
  ctx.restore();
}

function drawTownNoticePapers(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  drawShadow(ctx, x, y + 5 * s, 17 * s, 3 * s);
  const papers = [
    [-17, -3, '#d8c891'],
    [-2, 2, '#c7b47c'],
    [12, -4, '#e8dcae']
  ];
  ctx.save();
  for (const [ox, oy, color] of papers) {
    ctx.fillStyle = color;
    rect(ctx, x + ox * s, y + oy * s, 13 * s, 9 * s);
    ctx.strokeStyle = '#6d5638';
    ctx.lineWidth = 1 * s;
    line(ctx, x + (ox + 2) * s, y + (oy + 3) * s, x + (ox + 10) * s, y + (oy + 3) * s);
    line(ctx, x + (ox + 2) * s, y + (oy + 6) * s, x + (ox + 8) * s, y + (oy + 6) * s);
  }
  ctx.restore();
}

function drawTownHerbPlanter(ctx, object, x, y) {
  const s = Number(object.scale || 1);
  const flower = object.flowerColor || '#73d18a';

  drawShadow(ctx, x, y + 8 * s, 18 * s, 4 * s);
  ctx.fillStyle = '#5a3824';
  rect(ctx, x - 20 * s, y - 5 * s, 40 * s, 12 * s);
  ctx.fillStyle = '#2f2419';
  rect(ctx, x - 17 * s, y - 10 * s, 34 * s, 7 * s);
  ctx.fillStyle = '#446b42';
  for (let index = 0; index < 5; index++) {
    const ox = (-14 + index * 7) * s;
    triangle(ctx, x + ox - 3 * s, y - 10 * s, x + ox, y - 22 * s, x + ox + 4 * s, y - 10 * s);
  }
  ctx.fillStyle = flower;
  circle(ctx, x - 8 * s, y - 18 * s, 2.5 * s);
  circle(ctx, x + 10 * s, y - 16 * s, 2.5 * s);
}

// -----------------------------------------------------------------------------
// LANDMARK OBJECTS
// -----------------------------------------------------------------------------

function drawCampfire(ctx, x, y) {
  if(drawEnvironmentProp(ctx,'campfire',x,y))return;
  drawShadow(ctx, x, y + 8, 14, 5);

  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = 4;
  line(ctx, x - 11, y + 9, x + 10, y + 2);
  line(ctx, x - 10, y + 2, x + 11, y + 9);

  ctx.fillStyle = '#ef6f2f';
  triangle(ctx, x - 7, y + 3, x, y - 17, x + 7, y + 3);

  ctx.fillStyle = '#ffcc66';
  triangle(ctx, x - 4, y + 3, x + 1, y - 10, x + 5, y + 3);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffcc66';
  circle(ctx, x, y - 6, 19);
  ctx.restore();
}

function drawPoiStructureEntrance(ctx, object, x, y, options = {}) {
  const profile = getPoiStructureProfile(object);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(profile.scale, profile.scale);

  if (object.structurePresentation === 'anchorOnly') {
    drawInteractionThreshold(ctx, profile, options.shrine);
    ctx.restore();
    return profile;
  }

  if (object.structurePresentation === 'altar') {
    if(!drawArchitectureArt(ctx,3,0,20,70))drawCompactShrine(ctx, profile);
    drawInteractionThreshold(ctx, profile, true);
    ctx.restore();
    return profile;
  }

  drawPoiGroundTreatment(ctx, profile);

  const building={castle:8,fort:9,tower:10,cult:11}[profile.archetype];
  if(building!==undefined && drawTownBuildingArt(ctx,building,0,22,profile.archetype==='castle'?125:110)){
    drawInteractionThreshold(ctx,profile,options.shrine);ctx.restore();return profile;
  }
  const natural={mine:12,hollow:13,cave:14,camp:15}[profile.archetype];
  if(natural!==undefined && drawLandmarkArt(ctx,natural,0,22,110,105)){
    drawInteractionThreshold(ctx,profile,options.shrine);ctx.restore();return profile;
  }

  if(['crypt','ruin','shrine'].includes(profile.archetype) && drawArchitectureArt(ctx,profile.archetype==='shrine'?3:2,0,22,profile.archetype==='shrine'?86:96)){
    drawInteractionThreshold(ctx,profile,options.shrine);ctx.restore();return profile;
  }

  if (profile.archetype === 'castle') drawCastleStructure(ctx, profile);
  else if (profile.archetype === 'fort') drawFortStructure(ctx, profile);
  else if (profile.archetype === 'hollow') drawHollowStructure(ctx, profile);
  else if (profile.archetype === 'cave') drawCaveStructure(ctx, profile);
  else if (profile.archetype === 'mine') drawMineStructure(ctx, profile);
  else if (profile.archetype === 'crypt') drawCryptStructure(ctx, profile);
  else if (profile.archetype === 'shrine') drawShrineStructure(ctx, profile, options.shrine);
  else if (profile.archetype === 'ruin') drawRuinStructure(ctx, profile, options.shrine);
  else if (profile.archetype === 'tower') drawTowerStructure(ctx, profile);
  else if (profile.archetype === 'cult') drawCultStructure(ctx, profile);
  else if (profile.archetype === 'camp') drawCampStructure(ctx, profile);
  else drawGenericStructure(ctx, profile);

  drawInteractionThreshold(ctx, profile, options.shrine);
  ctx.restore();
  return profile;
}

function drawPoiGroundTreatment(ctx, profile) {
  const p = profile.palette;
  const wide = ['castle', 'fort', 'ruin', 'shrine', 'cult'].includes(profile.archetype);
  const rx = wide ? 54 : 46;

  drawShadow(ctx, 0, 24, rx, 12);

  ctx.fillStyle = p.groundEdge;
  poly(ctx, [[-rx, 19], [-rx + 9, -4], [0, -18], [rx - 9, -4], [rx, 19], [0, 35]]);
  ctx.fillStyle = p.ground;
  poly(ctx, [[-rx + 6, 16], [-rx + 13, 0], [0, -12], [rx - 13, 0], [rx - 6, 16], [0, 29]]);

  // A worn approach visually points at the unchanged interaction anchor.
  ctx.fillStyle = p.light;
  ctx.globalAlpha = 0.22;
  poly(ctx, [[-15, 44], [-10, 13], [10, 13], [15, 44]]);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = p.groundEdge;
  ctx.lineWidth = 2;
  line(ctx, -12, 31, 12, 31);
  line(ctx, -11, 24, 11, 24);
  line(ctx, -10, 17, 10, 17);
}

function drawInteractionThreshold(ctx, profile, isShrine = false) {
  const p = profile.palette;

  ctx.fillStyle = p.accent;
  ctx.globalAlpha = 0.9;
  rect(ctx, -10, 14, 20, 3);
  ctx.globalAlpha = 0.26;
  rect(ctx, -14, 18, 28, 3);
  ctx.globalAlpha = 1;

  if (isShrine) {
    ctx.fillStyle = p.dark;
    rect(ctx, -8, 5, 16, 9);
    ctx.fillStyle = p.accent;
    rect(ctx, -3, 1, 6, 8);
  }
}

function drawCompactShrine(ctx, profile) {
  const p = profile.palette;
  drawShadow(ctx, 0, 11, 18, 5);
  ctx.fillStyle = p.groundEdge;
  poly(ctx, [[-20, 11], [-14, -2], [0, -9], [14, -2], [20, 11], [0, 18]]);
  ctx.fillStyle = p.ground;
  poly(ctx, [[-15, 8], [-10, 1], [0, -4], [10, 1], [15, 8], [0, 14]]);
  drawAltarProp(ctx, 0, 4, p);
}

function drawCastleStructure(ctx, profile) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  rect(ctx, -56, -30, 112, 48);
  rect(ctx, -61, -52, 24, 69);
  rect(ctx, 37, -52, 24, 69);

  ctx.fillStyle = p.mid;
  rect(ctx, -53, -25, 106, 37);
  rect(ctx, -57, -48, 16, 58);
  rect(ctx, 41, -48, 16, 58);

  drawBattlements(ctx, -55, -58, 22, p.light);
  drawBattlements(ctx, 39, -58, 22, p.light);
  drawBattlements(ctx, -37, -34, 74, p.light);

  ctx.fillStyle = p.dark;
  poly(ctx, [[-15, 17], [-15, -10], [-8, -23], [0, -28], [8, -23], [15, -10], [15, 17]]);

  drawBanner(ctx, -31, -18, p.accent, p.dark);
  drawBanner(ctx, 31, -18, p.accent, p.dark);
  drawBrazier(ctx, -47, 12, p.accent);
  drawBrazier(ctx, 47, 12, p.accent);
}

function drawFortStructure(ctx, profile) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  rect(ctx, -48, -23, 96, 39);
  rect(ctx, -51, -39, 20, 54);
  rect(ctx, 31, -39, 20, 54);

  ctx.fillStyle = p.mid;
  rect(ctx, -44, -19, 88, 29);
  rect(ctx, -47, -35, 12, 44);
  rect(ctx, 35, -35, 12, 44);
  drawBattlements(ctx, -46, -45, 18, p.light);
  drawBattlements(ctx, 28, -45, 18, p.light);

  ctx.fillStyle = p.dark;
  rect(ctx, -12, -16, 24, 33);
  drawBanner(ctx, 0, -24, p.accent, p.dark);
  drawBrazier(ctx, -36, 12, p.accent);
  drawBrazier(ctx, 36, 12, p.accent);
}

function drawHollowStructure(ctx, profile) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  poly(ctx, [[-35, 17], [-33, -7], [-22, -27], [0, -39], [23, -27], [35, -7], [37, 17]]);
  ctx.fillStyle = '#080d09';
  poly(ctx, [[-18, 17], [-16, -5], [-8, -20], [0, -25], [9, -19], [17, -4], [18, 17]]);

  ctx.strokeStyle = p.wood;
  ctx.lineWidth = 8;
  line(ctx, -34, 15, -24, -21);
  line(ctx, -24, -21, -5, -35);
  line(ctx, 34, 15, 24, -20);
  line(ctx, 24, -20, 5, -35);

  ctx.strokeStyle = p.foliage;
  ctx.lineWidth = 5;
  line(ctx, -29, -10, -42, -24);
  line(ctx, 28, -10, 42, -22);
  line(ctx, -12, -30, 10, -34);

  drawRootProp(ctx, -39, 15, p.wood);
  drawRootProp(ctx, 39, 15, p.wood);
  drawMushroomProp(ctx, -28, 19, p.accent);
  drawMushroomProp(ctx, 29, 19, p.accent);
}

function drawCaveStructure(ctx, profile) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  poly(ctx, [[-40, 18], [-34, -9], [-19, -30], [2, -38], [25, -26], [39, -4], [42, 18]]);
  ctx.fillStyle = p.mid;
  poly(ctx, [[-33, 16], [-29, -7], [-16, -23], [2, -30], [20, -20], [31, -3], [34, 16]]);
  ctx.fillStyle = '#07080b';
  poly(ctx, [[-18, 17], [-16, -3], [-8, -16], [2, -21], [11, -14], [18, -1], [18, 17]]);

  drawRockProp(ctx, -41, 17, p.dark, p.light, 1);
  drawRockProp(ctx, 41, 17, p.dark, p.light, 0.9);
  drawRockProp(ctx, -29, -13, p.mid, p.light, 0.72);
  drawRockProp(ctx, 31, -12, p.mid, p.light, 0.68);
}

function drawMineStructure(ctx, profile) {
  const p = profile.palette;
  drawCaveStructure(ctx, profile);

  ctx.fillStyle = p.wood;
  rect(ctx, -25, -23, 7, 41);
  rect(ctx, 18, -23, 7, 41);
  rect(ctx, -28, -27, 56, 7);

  ctx.strokeStyle = p.light;
  ctx.lineWidth = 2;
  line(ctx, -20, -20, 20, 15);
  line(ctx, 20, -20, -20, 15);

  drawCrateProp(ctx, -37, 16, p.wood, p.light);
  drawMineCartProp(ctx, 34, 18, p);
  ctx.fillStyle = p.accent;
  diamond(ctx, -30, 8, 4);
  diamond(ctx, 28, 8, 3);
}

function drawCryptStructure(ctx, profile) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  rect(ctx, -38, -25, 76, 42);
  triangle(ctx, -43, -25, 0, -50, 43, -25);

  ctx.fillStyle = p.mid;
  rect(ctx, -32, -22, 64, 34);
  triangle(ctx, -35, -24, 0, -43, 35, -24);

  ctx.fillStyle = p.light;
  rect(ctx, -38, -28, 76, 5);
  rect(ctx, -42, 13, 84, 5);

  ctx.fillStyle = p.dark;
  poly(ctx, [[-13, 16], [-13, -7], [-7, -17], [0, -21], [7, -17], [13, -7], [13, 16]]);

  drawGraveProp(ctx, -48, 18, p);
  drawGraveProp(ctx, 48, 18, p);
  drawGraveProp(ctx, -38, 4, p);
  drawGraveProp(ctx, 38, 4, p);
}

function drawShrineStructure(ctx, profile, isShrine) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  poly(ctx, [[-42, 18], [-32, -3], [0, -17], [32, -3], [42, 18], [0, 32]]);
  ctx.fillStyle = p.mid;
  poly(ctx, [[-35, 15], [-27, 0], [0, -11], [27, 0], [35, 15], [0, 26]]);

  drawColumn(ctx, -27, -25, p);
  drawColumn(ctx, 27, -25, p);
  ctx.fillStyle = p.light;
  rect(ctx, -34, -30, 68, 6);

  if (!isShrine) {
    ctx.fillStyle = p.dark;
    poly(ctx, [[-12, 15], [-12, -6], [-6, -15], [0, -19], [6, -15], [12, -6], [12, 15]]);
  } else {
    drawAltarProp(ctx, 0, 9, p);
  }

  drawBrazier(ctx, -36, 15, p.accent);
  drawBrazier(ctx, 36, 15, p.accent);
}

function drawRuinStructure(ctx, profile, isShrine) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  rect(ctx, -44, -14, 20, 31);
  rect(ctx, 24, -26, 20, 43);
  rect(ctx, -24, -23, 48, 8);
  ctx.fillStyle = p.mid;
  rect(ctx, -40, -10, 12, 25);
  rect(ctx, 28, -22, 12, 37);
  rect(ctx, -21, -20, 42, 4);

  drawColumn(ctx, -48, -16, p, true);
  drawColumn(ctx, 48, -30, p, true);
  drawRockProp(ctx, -20, 18, p.dark, p.light, 0.65);
  drawRockProp(ctx, 24, 19, p.dark, p.light, 0.75);

  if (isShrine) drawAltarProp(ctx, 0, 9, p);
  else {
    ctx.fillStyle = p.dark;
    poly(ctx, [[-12, 16], [-11, -4], [-5, -13], [2, -17], [10, -8], [12, 16]]);
  }
}

function drawTowerStructure(ctx, profile) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  poly(ctx, [[-35, 18], [-30, -45], [-21, -70], [21, -70], [30, -45], [35, 18]]);
  ctx.fillStyle = p.mid;
  poly(ctx, [[-27, 14], [-23, -42], [-16, -62], [16, -62], [23, -42], [27, 14]]);
  ctx.fillStyle = p.light;
  rect(ctx, -31, -48, 62, 6);
  rect(ctx, -35, 11, 70, 7);

  ctx.fillStyle = p.dark;
  poly(ctx, [[-12, 15], [-12, -6], [-6, -15], [0, -19], [6, -15], [12, -6], [12, 15]]);

  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2;
  line(ctx, 0, -58, 0, -32);
  line(ctx, -9, -46, 9, -46);
  line(ctx, -7, -35, 7, -35);
  drawButtress(ctx, -35, 15, p);
  drawButtress(ctx, 35, 15, p);
}

function drawCultStructure(ctx, profile) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  poly(ctx, [[-43, 18], [-37, -11], [-23, -34], [0, -46], [24, -34], [38, -10], [44, 18]]);
  ctx.fillStyle = p.mid;
  poly(ctx, [[-34, 16], [-29, -7], [-17, -25], [0, -34], [18, -24], [29, -6], [35, 16]]);
  ctx.fillStyle = '#080405';
  poly(ctx, [[-16, 17], [-14, -4], [-7, -17], [0, -22], [8, -16], [15, -3], [16, 17]]);

  drawSpikeTotem(ctx, -45, 10, p);
  drawSpikeTotem(ctx, 45, 10, p);
  drawBanner(ctx, -27, -13, p.accent, p.dark);
  drawBanner(ctx, 27, -13, p.accent, p.dark);

  ctx.strokeStyle = p.accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  line(ctx, -19, 19, 0, 4);
  line(ctx, 0, 4, 19, 19);
  line(ctx, -12, 21, 12, 21);
  ctx.globalAlpha = 1;
}

function drawCampStructure(ctx, profile) {
  const p = profile.palette;

  drawTentProp(ctx, -24, 8, p);
  drawTentProp(ctx, 25, 10, p);
  drawStakeProp(ctx, -43, 15, p);
  drawStakeProp(ctx, 43, 15, p);
  drawCrateProp(ctx, 0, 10, p.wood, p.light);
  drawBrazier(ctx, 0, -4, p.accent);
}

function drawGenericStructure(ctx, profile) {
  const p = profile.palette;

  ctx.fillStyle = p.dark;
  poly(ctx, [[-31, 17], [-28, -8], [-15, -29], [0, -36], [16, -28], [29, -7], [32, 17]]);
  ctx.fillStyle = p.mid;
  rect(ctx, -33, 12, 66, 7);
  rect(ctx, -29, -9, 8, 26);
  rect(ctx, 21, -9, 8, 26);
  rect(ctx, -22, -31, 44, 7);
  ctx.fillStyle = p.dark;
  poly(ctx, [[-14, 16], [-12, -4], [-6, -15], [0, -19], [7, -14], [13, -3], [14, 16]]);
  drawBrazier(ctx, -29, 14, p.accent);
  drawBrazier(ctx, 29, 14, p.accent);
}

function drawBattlements(ctx, x, y, width, color) {
  ctx.fillStyle = color;
  rect(ctx, x, y, width, 5);
  for (let bx = x; bx < x + width; bx += 9) rect(ctx, bx, y - 6, 5, 7);
}

function drawBanner(ctx, x, y, color, edge) {
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  line(ctx, x, y - 13, x, y + 10);
  ctx.fillStyle = color;
  poly(ctx, [[x + 2, y - 11], [x + 13, y - 7], [x + 9, y + 2], [x + 2, y + 5]]);
}

function drawBrazier(ctx, x, y, color) {
  ctx.fillStyle = '#2a2220';
  rect(ctx, x - 6, y - 2, 12, 5);
  rect(ctx, x - 2, y + 3, 4, 7);
  ctx.fillStyle = color;
  triangle(ctx, x - 4, y - 2, x, y - 14, x + 4, y - 2);
}

function drawRootProp(ctx, x, y, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  line(ctx, x, y, x - 9, y + 8);
  line(ctx, x, y, x + 10, y + 7);
  line(ctx, x, y - 2, x + 3, y - 17);
}

function drawMushroomProp(ctx, x, y, color) {
  ctx.fillStyle = '#d7d0b9';
  rect(ctx, x - 1, y - 5, 3, 7);
  ctx.fillStyle = color;
  triangle(ctx, x - 5, y - 5, x, y - 10, x + 5, y - 5);
}

function drawRockProp(ctx, x, y, dark, light, scale = 1) {
  ctx.fillStyle = dark;
  poly(ctx, [[x - 10 * scale, y + 5 * scale], [x - 8 * scale, y - 6 * scale], [x, y - 12 * scale], [x + 10 * scale, y - 3 * scale], [x + 11 * scale, y + 5 * scale]]);
  ctx.fillStyle = light;
  poly(ctx, [[x - 6 * scale, y - 5 * scale], [x, y - 9 * scale], [x + 5 * scale, y - 4 * scale], [x, y - 2 * scale]]);
}

function drawCrateProp(ctx, x, y, wood, light) {
  ctx.fillStyle = wood;
  rect(ctx, x - 8, y - 9, 16, 14);
  ctx.strokeStyle = light;
  ctx.lineWidth = 2;
  line(ctx, x - 7, y - 8, x + 7, y + 4);
  line(ctx, x + 7, y - 8, x - 7, y + 4);
}

function drawMineCartProp(ctx, x, y, p) {
  ctx.fillStyle = p.wood;
  poly(ctx, [[x - 12, y - 10], [x + 12, y - 10], [x + 8, y + 1], [x - 8, y + 1]]);
  ctx.fillStyle = p.accent;
  diamond(ctx, x - 4, y - 11, 3);
  diamond(ctx, x + 4, y - 12, 3);
  ctx.fillStyle = p.dark;
  circle(ctx, x - 7, y + 4, 3);
  circle(ctx, x + 7, y + 4, 3);
}

function drawGraveProp(ctx, x, y, p) {
  ctx.fillStyle = p.dark;
  rect(ctx, x - 7, y - 14, 14, 18);
  ctx.fillStyle = p.mid;
  rect(ctx, x - 5, y - 12, 10, 14);
  ctx.strokeStyle = p.light;
  ctx.lineWidth = 2;
  line(ctx, x - 3, y - 6, x + 3, y - 6);
  line(ctx, x, y - 10, x, y - 2);
}

function drawColumn(ctx, x, y, p, broken = false) {
  const height = broken ? 28 : 43;
  ctx.fillStyle = p.dark;
  rect(ctx, x - 7, y, 14, height);
  ctx.fillStyle = p.mid;
  rect(ctx, x - 4, y + 3, 8, height - 4);
  ctx.fillStyle = p.light;
  rect(ctx, x - 9, y - 4, 18, 5);
  rect(ctx, x - 9, y + height - 1, 18, 5);
  if (broken) {
    ctx.fillStyle = p.dark;
    triangle(ctx, x - 8, y - 4, x + 8, y - 4, x + 2, y - 11);
  }
}

function drawAltarProp(ctx, x, y, p) {
  ctx.fillStyle = p.dark;
  rect(ctx, x - 13, y - 7, 26, 14);
  ctx.fillStyle = p.mid;
  rect(ctx, x - 10, y - 12, 20, 6);
  ctx.fillStyle = p.accent;
  rect(ctx, x - 3, y - 16, 6, 8);
}

function drawButtress(ctx, x, y, p) {
  ctx.fillStyle = p.dark;
  triangle(ctx, x - 8, y + 2, x, y - 28, x + 8, y + 2);
  ctx.fillStyle = p.mid;
  triangle(ctx, x - 4, y, x, y - 19, x + 4, y);
}

function drawSpikeTotem(ctx, x, y, p) {
  ctx.strokeStyle = p.wood;
  ctx.lineWidth = 4;
  line(ctx, x, y + 7, x, y - 22);
  line(ctx, x, y - 15, x - 10, y - 25);
  line(ctx, x, y - 15, x + 10, y - 25);
  ctx.fillStyle = p.accent;
  diamond(ctx, x, y - 14, 4);
}

function drawTentProp(ctx, x, y, p) {
  ctx.fillStyle = p.dark;
  triangle(ctx, x - 18, y + 4, x, y - 22, x + 18, y + 4);
  ctx.fillStyle = p.mid;
  triangle(ctx, x - 12, y + 2, x, y - 17, x, y + 2);
  ctx.strokeStyle = p.light;
  ctx.lineWidth = 2;
  line(ctx, x, y - 21, x, y + 4);
}

function drawStakeProp(ctx, x, y, p) {
  ctx.strokeStyle = p.wood;
  ctx.lineWidth = 4;
  line(ctx, x, y + 5, x, y - 18);
  ctx.fillStyle = p.accent;
  triangle(ctx, x - 5, y - 17, x, y - 26, x + 5, y - 17);
}

function drawDungeonExit(ctx, object, x, y) {
  if(drawDungeonInteractable(ctx,object,x,y))return;
  drawShadow(ctx, x, y + 12, 20, 6);

  ctx.fillStyle = '#343c46';
  rect(ctx, x - 18, y - 16, 36, 30);

  ctx.fillStyle = object.locked ? '#2a1725' : '#1b2a20';
  rect(ctx, x - 10, y - 7, 20, 21);

  ctx.strokeStyle = object.locked ? '#b68cff' : '#73d18a';
  ctx.lineWidth = 3;
  line(ctx, x - 14, y - 18, x + 14, y - 18);
  line(ctx, x - 14, y - 18, x - 18, y + 14);
  line(ctx, x + 14, y - 18, x + 18, y + 14);
}

function drawMissingModel(ctx, object, x, y, visualStatus) {
  // Missing art is never allowed to masquerade as a production prop. This
  // unmistakable marker is visible only while Developer Mode is active.
  const size = 11;
  drawShadow(ctx, x, y + 9, 13, 4);
  ctx.save();
  ctx.fillStyle = '#ff2bd6';
  rect(ctx, x - size, y - size, size, size);
  rect(ctx, x, y, size, size);
  ctx.fillStyle = '#171018';
  rect(ctx, x, y - size, size, size);
  rect(ctx, x - size, y, size, size);
  ctx.strokeStyle = '#fff0fb';
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x - size), Math.round(y - size), size * 2, size * 2);
  ctx.restore();
  label(ctx, `MISSING: ${visualStatus?.modelId || object?.kind || object?.id || 'model'}`, x, y - 19, {
    priority: 99,
    color: '#ff8bea'
  });
}

// -----------------------------------------------------------------------------
// DROPS
// -----------------------------------------------------------------------------

function drawDrop(ctx, drop, x, y) {
  const dropTime = drop.age || performance.now() / 1000;
  const bob = steppedSine(dropTime, 4, 2, 8, drop.bobTimer || 0);
  const discovery=lootDiscoveryProfile(drop.itemId||drop.item);
  const color = discovery?.color||rarityColor(drop.rarity);
  const important = isImportantDrop(drop);
  const t = performance.now() / 1000;

  drawShadow(ctx, x, y + 7, 8, 3);

  ctx.save();

  if (important) {
    ctx.globalAlpha = 0.14 + Math.sin(t * 4) * 0.03;
    ctx.fillStyle = color;
    rect(ctx, x - 2, y - 44 + bob, 4, 42);

    ctx.globalAlpha = 0.28;
    circle(ctx, x, y - 4 + bob, 19);
  }

  ctx.fillStyle = color;
  ctx.globalAlpha = 1;
  if(discovery?.kind==='scroll'){
    ctx.fillStyle='#d4c8a8';rect(ctx,x-5,y-8+bob,10,12);ctx.strokeStyle=color;ctx.strokeRect(Math.round(x-5),Math.round(y-8+bob),10,12);line(ctx,x-2,y-4+bob,x+3,y-4+bob);line(ctx,x-2,y+bob,x+2,y+bob);
  }else diamond(ctx, x, y - 2 + bob, important ? 9 : 7);

  ctx.globalAlpha = important ? 0.55 : 0.35;
  ctx.fillStyle = color;
  circle(ctx, x, y - 2 + bob, important ? 15 : 11);

  if (important) {
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y - 2 + bob, 18 + Math.sin(t * 5) * 2);
  }

  ctx.restore();

  if (drop.ownerLabel || important || discovery) {
    label(ctx, `${drop.ownerLabel || ''} ${discovery?`${drop.name||ITEMS[drop.itemId||drop.item]?.name||'Discovery'} · ${discovery.label}`:importantDropLabel(drop)}`.trim(), x, y - 22 + bob, {
      priority: important ? 5 : 3
    });
  }
}

function drawHouseStairs(ctx,object,x,y){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  ctx.fillStyle='#201b17';ctx.fillRect(-22,-21,45,48);
  for(let i=0;i<6;i++){
    ctx.fillStyle=i%2?'#775a3e':'#634a33';ctx.fillRect(-19+i*3,17-i*7,34-i*2,7);
    ctx.fillStyle='#b18c5d';ctx.fillRect(-19+i*3,17-i*7,34-i*2,2);
  }
  ctx.strokeStyle='#a38158';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-23,20);ctx.lineTo(-6,-24);ctx.moveTo(20,20);ctx.lineTo(27,-24);ctx.stroke();
  ctx.fillStyle='#e2cca1';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(object.direction==='up'?'↑':'↓',-8,-12);ctx.restore();
}

function drawTowerStairs(ctx, object, x, y) {
  if(drawDungeonInteractable(ctx,object,x,y))return;
  drawShadow(ctx, x, y + 9, 18, 5);

  ctx.fillStyle = object.locked ? '#4b5364' : '#66f0ff';
  rect(ctx, x - 17, y + 4, 34, 5);
  rect(ctx, x - 12, y - 3, 29, 5);
  rect(ctx, x - 7, y - 10, 24, 5);

  ctx.strokeStyle = '#101620';
  ctx.lineWidth = 2;
  line(ctx, x - 17, y + 4, x + 17, y + 4);
  line(ctx, x - 12, y - 3, x + 17, y - 3);
  line(ctx, x - 7, y - 10, x + 17, y - 10);
}

function drawRewardChest(ctx, object, x, y) {
  if (drawPropSprite(ctx, object.claimed ? 15 : 14, x, y + 10, .34)) {
    if (object.locked) {
      ctx.save();ctx.fillStyle='#171a1b';ctx.fillRect(x-5,y-8,10,11);
      ctx.strokeStyle='#e4c475';ctx.lineWidth=2;ctx.strokeRect(x-4,y-8,8,9);
      ctx.beginPath();ctx.arc(x,y-10,3,Math.PI,0);ctx.stroke();ctx.restore();
    }
    return;
  }
  drawShadow(ctx, x, y + 8, 14, 4);

  ctx.fillStyle = object.claimed ? '#3c3440' : object.locked ? '#4b5364' : '#7b4f2a';
  rect(ctx, x - 15, y - 6, 30, 17);

  ctx.fillStyle = object.locked ? '#9facbf' : '#d9ad4f';
  rect(ctx, x - 16, y - 9, 32, 7);
  rect(ctx, x - 2, y - 9, 4, 20);

  ctx.strokeStyle = '#15100c';
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x - 15), Math.round(y - 8), 30, 19);
}

function drawDungeonKey(ctx, object, x, y) {
  if(drawDungeonInteractable(ctx,object,x,y))return;
  drawShadow(ctx, x, y + 8, 10, 3);

  const t = performance.now() / 1000;
  const bob = Math.sin(t * 3.4 + (object.x || 0) * 0.01) * 2;

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.strokeStyle = '#ffcc66';
  ctx.lineWidth = 3;
  circleStroke(ctx, -4, -5, 6);
  line(ctx, 1, -1, 13, 8);
  line(ctx, 8, 4, 8, 10);
  line(ctx, 12, 7, 12, 12);

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#fff1b8';
  ctx.lineWidth = 1;
  circleStroke(ctx, -4, -5, 10);
  ctx.restore();
}

function drawDungeonDoor(ctx, object, x, y) {
  if(drawDungeonInteractable(ctx,object,x,y))return;
  drawShadow(ctx, x, y + 13, 18, 5);

  ctx.fillStyle = object.locked ? '#211827' : '#1d271f';
  rect(ctx, x - 18, y - 22, 36, 42);

  ctx.fillStyle = object.locked ? '#4b5364' : '#314436';
  rect(ctx, x - 14, y - 18, 28, 36);

  ctx.strokeStyle = object.locked ? '#b68cff' : '#73d18a';
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x - 14), Math.round(y - 18), 28, 36);

  ctx.fillStyle = object.locked ? '#ffcc66' : '#9facbf';
  circle(ctx, x + 8, y + 1, 3);

  if (object.locked) {
    rect(ctx, x - 5, y - 3, 10, 9);
    ctx.strokeStyle = '#ffcc66';
    ctx.lineWidth = 2;
    circleStroke(ctx, x, y - 4, 6);
  }
}

function drawDungeonPuzzle(ctx, object, x, y) {
  if(drawDungeonInteractable(ctx,object,x,y))return;
  drawShadow(ctx, x, y + 10, 19, 5);

  const solved = !!object.solved;
  const color = solved ? '#73d18a' : object.markerColor || '#66f0ff';
  const t = performance.now() / 1000;
  const bob = solved ? 0 : Math.sin(t * 3.2 + (object.x || 0) * 0.01) * 2;
  const progress = Math.max(0, Math.min(1, Number(object.progress || 0) / Math.max(1, Number(object.requiredSteps || 3))));

  ctx.save();
  ctx.translate(x, y + bob);

  ctx.globalAlpha = solved ? 0.26 : 0.18;
  ctx.fillStyle = color;
  circle(ctx, 0, 0, 24);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(18, -2);
  ctx.lineTo(0, 14);
  ctx.lineTo(-18, -2);
  ctx.closePath();
  ctx.stroke();
  circleStroke(ctx, 0, -2, 8);

  ctx.fillStyle = color;
  rect(ctx, -13, 16, 26 * progress, 3);
  rect(ctx, -2, -20, 4, 8);
  rect(ctx, -2, 11, 4, 8);
  rect(ctx, -20, -4, 8, 4);
  rect(ctx, 12, -4, 8, 4);

  if (solved) {
    ctx.fillStyle = '#fff1b8';
    diamond(ctx, 0, -2, 5);
  }

  ctx.restore();
}

function drawDungeonEvent(ctx, object, x, y) {
  if(drawDungeonInteractable(ctx,object,x,y))return;
  drawShadow(ctx, x, y + 9, 18, 5);

  const triggered = !!object.triggered;
  const color = triggered ? '#4b5364' : object.markerColor || '#ef6f6c';
  const t = performance.now() / 1000;

  ctx.save();
  ctx.globalAlpha = triggered ? 0.38 : 0.72 + Math.sin(t * 4) * 0.08;
  ctx.strokeStyle = color;
  ctx.lineWidth = triggered ? 2 : 3;
  circleStroke(ctx, x, y, 17);
  circleStroke(ctx, x, y, 9);
  line(ctx, x - 13, y - 13, x + 13, y + 13);
  line(ctx, x + 13, y - 13, x - 13, y + 13);

  ctx.globalAlpha = triggered ? 0.2 : 0.45;
  ctx.fillStyle = color;
  diamond(ctx, x, y, 6);
  ctx.restore();
}

function drawMarketStall(ctx, object, x, y) {
  if(drawTownBuildingArt(ctx,3,x,y+15,62))return;
  drawShadow(ctx, x, y + 11, 18, 5);

  ctx.fillStyle = '#5f4733';
  rect(ctx, x - 18, y - 1, 36, 18);

  ctx.fillStyle = '#d9ad4f';
  rect(ctx, x - 22, y - 13, 44, 10);

  ctx.fillStyle = '#7a2e35';
  rect(ctx, x - 18, y - 13, 8, 10);
  rect(ctx, x - 2, y - 13, 8, 10);
  rect(ctx, x + 14, y - 13, 8, 10);

  ctx.fillStyle = '#73d18a';
  circle(ctx, x - 8, y + 3, 4);
  ctx.fillStyle = '#ffcc66';
  circle(ctx, x + 6, y + 3, 4);
}

function drawNoticeBoard(ctx, object, x, y) {
  drawShadow(ctx, x, y + 12, 12, 4);

  ctx.fillStyle = '#3a2618';
  rect(ctx, x - 3, y - 1, 6, 23);

  ctx.fillStyle = '#6d5638';
  rect(ctx, x - 17, y - 20, 34, 22);

  ctx.fillStyle = '#d8c891';
  rect(ctx, x - 12, y - 16, 10, 8);
  rect(ctx, x + 3, y - 14, 9, 7);

  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x - 17), Math.round(y - 20), 34, 22);
}

function drawServiceShop(ctx, object, x, y, color = '#d9ad4f', icon = 'shop') {
  const building={anvil:1,flask:2,guild:4,bank:5,trainer:6,arena:7,shop:0}[icon];
  if(building!==undefined && drawTownBuildingArt(ctx,building,x,y+16,78))return;
  drawShadow(ctx, x, y + 12, 17, 5);

  ctx.fillStyle = '#2b2530';
  rect(ctx, x - 17, y - 8, 34, 24);

  ctx.fillStyle = color;
  rect(ctx, x - 20, y - 17, 40, 10);

  ctx.fillStyle = '#11151a';
  rect(ctx, x - 12, y + 1, 24, 15);

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(Math.round(x - 17), Math.round(y - 8), 34, 24);

  ctx.fillStyle = color;

  if (icon === 'anvil') {
    rect(ctx, x - 9, y - 1, 18, 5);
    rect(ctx, x - 4, y - 7, 8, 6);
  } else if (icon === 'flask') {
    circle(ctx, x, y + 1, 7);
    rect(ctx, x - 3, y - 10, 6, 9);
  } else if (icon === 'guild') {
    diamond(ctx, x, y - 2, 8);
  } else if (icon === 'bank') {
    rect(ctx, x - 10, y + 2, 20, 4);
    rect(ctx, x - 8, y - 5, 4, 8);
    rect(ctx, x - 1, y - 5, 4, 8);
    rect(ctx, x + 6, y - 5, 4, 8);
  } else if (icon === 'trainer') {
    line(ctx, x - 8, y + 5, x + 8, y - 8);
    line(ctx, x + 4, y - 8, x + 11, y - 8);
  } else if (icon === 'trail') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    line(ctx, x - 10, y + 7, x - 2, y - 1);
    line(ctx, x - 2, y - 1, x + 5, y + 5);
    line(ctx, x + 5, y + 5, x + 12, y - 6);
    ctx.fillStyle = color;
    circle(ctx, x + 13, y - 7, 4);
  } else if (icon === 'arena') {
    circleStroke(ctx, x, y - 2, 9);
    line(ctx, x - 8, y + 7, x + 8, y - 11);
  } else {
    rect(ctx, x - 6, y - 4, 12, 10);
  }
}

// -----------------------------------------------------------------------------
// SHARED SMALL ASSET HELPERS
// -----------------------------------------------------------------------------

function leaf(ctx, x, y) {
  drawShadow(ctx, x, y + 8, 8, 3);

  ctx.beginPath();
  ctx.ellipse(x - 4, y - 3, 5, 10, -0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(x + 4, y - 5, 5, 10, 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(x, y - 9, 5, 10, 0, 0, Math.PI * 2);
  ctx.fill();
}

function mushroom(ctx, x, y, capColor = '#b68cff', stemColor = '#e2ccff') {
  drawShadow(ctx, x, y + 8, 9, 3);

  ctx.fillStyle = stemColor;
  rect(ctx, x - 3, y - 2, 6, 10);

  ctx.fillStyle = capColor;
  ctx.beginPath();
  ctx.ellipse(x, y - 4, 10, 6, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  rect(ctx, x - 5, y - 7, 3, 2);
  rect(ctx, x + 3, y - 6, 2, 2);
}

function rock(ctx, x, y, base = '#7d8793', light = '#b6c0ca', scale = 1) {
  drawShadow(ctx, x, y + 9 * scale, 12 * scale, 4 * scale);

  ctx.fillStyle = base;
  poly(ctx, [
    [x - 12 * scale, y + 8 * scale],
    [x - 8 * scale, y - 5 * scale],
    [x + 2 * scale, y - 10 * scale],
    [x + 12 * scale, y - 2 * scale],
    [x + 9 * scale, y + 9 * scale]
  ]);

  ctx.fillStyle = light;
  poly(ctx, [
    [x - 6 * scale, y - 4 * scale],
    [x + 1 * scale, y - 8 * scale],
    [x + 5 * scale, y - 3 * scale],
    [x - 2 * scale, y]
  ]);
}

// -----------------------------------------------------------------------------
// LABELS / COLORS
// -----------------------------------------------------------------------------

function shouldDrawObjectLabel(object, kind) {
  if (!object) return false;
  if (object.hideLabel) return false;
  if (object.forceLabel) return true;

  // Campfires are useful, but if every campfire label is always visible,
  // they overlap important POI/dungeon names constantly.
  if (kind === 'campfire') return false;

  // Decorative objects never get labels.
  if (
    kind === 'treeCluster' ||
    kind === 'pineCluster' ||
    kind === 'shrub' ||
    kind === 'tallGrassPatch' ||
    kind === 'stump' ||
    kind === 'deadRoot' ||
    kind === 'graveMarker' ||
    kind === 'brokenWall' ||
    kind === 'ruinPillar' ||
    kind === 'smallBoulder' ||
    kind === 'signpost'
  ) {
    return false;
  }

  return true;
}

function label(ctx, text, x, y, options = {}) {
  if (!text) return;

  const safeText = String(text);
  const font = options.font || 'bold 12px sans-serif';
  const color = options.color || '#e8edf5';
  const priority = Number(options.priority || 1);

  ctx.save();

  ctx.font = font;
  ctx.textAlign = 'center';

  const metrics = ctx.measureText(safeText);
  const width = Math.max(22, metrics.width + 10);
  const height = 15;

  const reserved = reserveLabelSlot(x, y, width, height, priority);

  ctx.fillStyle = 'rgba(0,0,0,.75)';
  ctx.fillText(safeText, reserved.x + 1, reserved.y + 1);

  ctx.fillStyle = color;
  ctx.fillText(safeText, reserved.x, reserved.y);

  ctx.restore();
}

function reserveLabelSlot(x, y, width, height, priority) {
  let slot = {
    x,
    y,
    w: width,
    h: height,
    priority
  };

  // Try moving upward first, then slightly downward if needed.
  const offsets = [0, -14, -28, -42, 14, 28];

  for (const offset of offsets) {
    const candidate = {
      x,
      y: y + offset,
      w: width,
      h: height,
      priority
    };

    if (!labelCollides(candidate)) {
      labelReservations.push(candidate);
      return candidate;
    }
  }

  // If everything collides, still return the highest upward offset.
  slot.y = y - 42;
  labelReservations.push(slot);
  return slot;
}

function labelCollides(candidate) {
  const a = labelRect(candidate);

  for (const existing of labelReservations) {
    const b = labelRect(existing);

    if (rectsOverlap(a, b)) {
      return true;
    }
  }

  return false;
}

function labelRect(labelData) {
  return {
    left: labelData.x - labelData.w / 2,
    right: labelData.x + labelData.w / 2,
    top: labelData.y - labelData.h + 2,
    bottom: labelData.y + 4
  };
}

function rectsOverlap(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function classColor(classId) {
  return getClassAccentColor(classId);
}

function classShortName(classId) {
  if (classId === 'oathkeeper' || classId === 'templar') return 'Oathkeeper';
  if (classId === 'fellhunter' || classId === 'mercenary') return 'Fellhunter';
  if (classId === 'gravecaller' || classId === 'necromancer') return 'Gravecaller';
  if (classId === 'thornbinder') return 'Thornbinder';
  if (classId === 'eldritch') return 'Eldritch';

  return 'Instructor';
}

function rarityColor(rarity) {
  if (rarity === 'common') return '#d9ad4f';
  if (rarity === 'uncommon') return '#73d18a';
  if (rarity === 'rare') return '#6fa8ef';
  if (rarity === 'occult') return '#b68cff';
  if (rarity === 'relic') return '#ffcc66';
  if (rarity === 'legendary') return '#ffcc66';
  if (rarity === 'epic') return '#b68cff';
  if (rarity === 'mythic') return '#ff7ac8';
  if (rarity === 'ancient') return '#66f0ff';

  return '#e8edf5';
}

function isImportantDrop(drop) {
  return ['rare', 'occult', 'epic', 'relic', 'legendary', 'mythic', 'ancient'].includes(drop?.rarity);
}

function importantDropLabel(drop) {
  if (!isImportantDrop(drop)) return '';
  return drop.name || 'Loot';
}

// -----------------------------------------------------------------------------
// LOW-LEVEL DRAWING
// -----------------------------------------------------------------------------

function screen(object, camera) {
  return {
    x: object.x - camera.x,
    y: object.y - camera.y
  };
}

function isOnScreen(ctx, x, y, margin = 60) {
  return (
    x >= -margin &&
    y >= -margin &&
    x <= ctx.canvas.width + margin &&
    y <= ctx.canvas.height + margin
  );
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.fill();
}

function circleStroke(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2);
  ctx.stroke();
}

function line(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
}

function triangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.lineTo(Math.round(x3), Math.round(y3));
  ctx.closePath();
  ctx.fill();
}

function rect(ctx, x, y, w, h) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function poly(ctx, points) {
  if (!points?.length) return;

  ctx.beginPath();
  ctx.moveTo(Math.round(points[0][0]), Math.round(points[0][1]));

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(Math.round(points[i][0]), Math.round(points[i][1]));
  }

  ctx.closePath();
  ctx.fill();
}

function diamond(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(Math.round(x), Math.round(y - r));
  ctx.lineTo(Math.round(x + r), Math.round(y));
  ctx.lineTo(Math.round(x), Math.round(y + r));
  ctx.lineTo(Math.round(x - r), Math.round(y));
  ctx.closePath();
  ctx.fill();
}

function drawShadow(ctx, x, y, rx, ry) {
  drawPixelGroundShadow(ctx, x, y, rx, ry, {
    alpha: 0.82
  });
}

function hashString(str) {
  let h = 2166136261;

  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

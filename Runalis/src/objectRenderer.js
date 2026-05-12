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
// - Major POI coded assets: Gothic Castle, Demon Lair, Red Seal.
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

import { drawHumanActor } from './humanRenderer.js';

// -----------------------------------------------------------------------------
// LABEL STATE
// -----------------------------------------------------------------------------

let labelReservations = [];

// -----------------------------------------------------------------------------
// PUBLIC API
// -----------------------------------------------------------------------------

export function drawObjects(ctx, world, camera) {
  if (!ctx || !world || !camera) return;

  labelReservations = [];

  const objects = [...(world.objects || [])];

  // Draw lower / background-ish objects first, then tall objects.
  objects.sort((a, b) => {
    const ay = a?.y || 0;
    const by = b?.y || 0;
    return ay - by;
  });

  for (const object of objects) {
    drawObject(ctx, object, camera);
  }
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

function drawObject(ctx, object, camera) {
  if (!object || object.depleted) return;

  const p = screen(object, camera);

  if (!isOnScreen(ctx, p.x, p.y, 240)) return;

  if (object.kind === 'npc') {
    drawNpc(ctx, object, camera);
    return;
  }

  if (object.kind === 'herb') {
    drawHerb(ctx, p.x, p.y);
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

  if (object.kind === 'bone') {
    drawBonePile(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'reed') {
    drawReed(ctx, p.x, p.y);
    return;
  }

  if (object.kind === 'fish') {
    drawFishingRipple(ctx, p.x, p.y);
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
    drawShrine(ctx, p.x, p.y);

    if (shouldDrawObjectLabel(object, 'shrine')) {
      label(ctx, object.name, p.x, p.y - 31, {
        priority: object.labelPriority || 3
      });
    }

    return;
  }

  if (object.kind === 'dungeonEntrance') {
    drawDungeonEntrance(ctx, object, p.x, p.y);

    if (shouldDrawObjectLabel(object, 'dungeonEntrance')) {
      label(ctx, object.name || 'Dungeon', p.x, p.y - 39, {
        priority: object.labelPriority || 5
      });
    }

    return;
  }

  if (object.kind === 'dungeonExit') {
    drawDungeonExit(ctx, object, p.x, p.y);

    if (shouldDrawObjectLabel(object, 'dungeonExit')) {
      label(ctx, object.name || 'Exit', p.x, p.y - 34, {
        priority: object.labelPriority || 5
      });
    }

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

  if (object.kind === 'demonLair') {
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

  drawUnknownObject(ctx, object, p.x, p.y);
}

// -----------------------------------------------------------------------------
// NPCS
// -----------------------------------------------------------------------------

function drawNpc(ctx, npc, camera) {
  const npcStyle = getNpcStyle(npc);

  const npcActor = {
    x: npc.x,
    y: npc.y,
    dirX: npc.dirX ?? 0,
    dirY: npc.dirY ?? 1,
    classId: npc.classId || null,
    equipment: npcStyle.equipment,
    skin: npcStyle.skin,
    hair: npcStyle.hair,
    shirt: npcStyle.shirt,
    pants: npcStyle.pants,
    boots: npcStyle.boots
  };

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
    bodyType: npcStyle.bodyType || 'male'
  });

  const displayName = getNpcDisplayName(npc);

  if (!npc.hideLabel) {
    label(ctx, displayName, p.x, p.y - 48, {
      priority: npc.labelPriority || 4,
      color: getNpcLabelColor(npc)
    });
  }

  if (npc.role === 'questGiver') {
    drawQuestMark(ctx, p.x, p.y - 62);
  }
}

function getNpcDisplayName(npc) {
  if (!npc) return 'Unknown';

  if (npc.displayName) return npc.displayName;

  // For class instructors, prefer one clean class label.
  // This prevents "Necromancer" + "Necromancer" and "Thornbinder" + "Thornbinder".
  if (npc.instructorType === 'class' || npc.classId) {
    return npc.name || classShortName(npc.classId);
  }

  return npc.name || 'Unknown';
}

function getNpcLabelColor(npc) {
  if (npc?.disposition === 'hostile') return '#ff9a8a';
  if (npc?.disposition === 'fearful') return '#d8c7ff';
  if (npc?.disposition === 'uncertain') return '#d8c7ff';
  if (npc?.classId) return '#e8edf5';

  return '#e8edf5';
}

function getNpcStyle(npc) {
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

  if (npc.classId === 'templar') {
    return {
      scale: 0.96,
      bodyType: 'male',
      skin: '#ffd1bd',
      hair: '#d8c891',
      shirt: '#d9ad4f',
      pants: '#44352a',
      boots: '#3a2a22',
      equipment: {
        weapon: 'noviceBlade',
        helm: 'knightHelm',
        chest: 'wardedChest',
        legs: 'ironGreaves',
        trinket: null
      }
    };
  }

  if (npc.classId === 'mercenary') {
    return {
      scale: 0.94,
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

  if (npc.classId === 'necromancer') {
    return {
      scale: 0.95,
      bodyType: 'male',
      skin: '#d8c7c7',
      hair: '#111111',
      shirt: '#482f55',
      pants: '#211d20',
      boots: '#151015',
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
    scale: 0.92,
    bodyType: 'male',
    skin: '#ffd1bd',
    hair: '#111111',
    shirt: '#c78f45',
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
  ctx.fillStyle = '#dd704a';
  leaf(ctx, x, y);

  ctx.fillStyle = '#ffb36f';
  rect(ctx, x - 1, y - 12, 3, 5);
}

function drawGravecap(ctx, x, y) {
  mushroom(ctx, x, y, '#b68cff', '#e2ccff');
}

function drawOre(ctx, x, y) {
  rock(ctx, x, y, '#7d8793', '#b6c0ca');
}

function drawBonePile(ctx, x, y) {
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

function drawRunestone(ctx, x, y) {
  drawShadow(ctx, x, y + 10, 11, 4);

  ctx.fillStyle = '#56606b';
  poly(ctx, [
    [x - 8, y + 8],
    [x - 10, y - 13],
    [x - 3, y - 22],
    [x + 8, y - 14],
    [x + 9, y + 8]
  ]);

  ctx.strokeStyle = '#b68cff';
  ctx.lineWidth = 2;
  line(ctx, x - 2, y - 13, x + 4, y - 6);
  line(ctx, x + 4, y - 6, x - 1, y + 2);
}

// -----------------------------------------------------------------------------
// MAJOR POI ASSETS
// -----------------------------------------------------------------------------

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
  const trunkColor = '#4b2f1f';
  const barkDark = '#2d1b12';
  const leafDark = '#18391f';
  const leafMid = '#24552d';
  const leafLight = '#3f7a3e';

  ctx.fillStyle = trunkColor;
  rect(ctx, x - 4 * scale, y - 3 * scale, 8 * scale, 22 * scale);

  ctx.fillStyle = barkDark;
  rect(ctx, x - 2 * scale, y + 1 * scale, 2 * scale, 14 * scale);

  const wobble = (seed % 5) - 2;

  ctx.fillStyle = leafDark;
  circle(ctx, x - 7 * scale, y - 19 * scale, 15 * scale);
  circle(ctx, x + 8 * scale, y - 20 * scale, 15 * scale);
  circle(ctx, x + wobble * scale, y - 30 * scale, 17 * scale);

  ctx.fillStyle = leafMid;
  circle(ctx, x - 5 * scale, y - 23 * scale, 12 * scale);
  circle(ctx, x + 7 * scale, y - 25 * scale, 12 * scale);
  circle(ctx, x + 1 * scale, y - 35 * scale, 13 * scale);

  ctx.fillStyle = leafLight;
  ctx.globalAlpha = 0.28;
  circle(ctx, x - 7 * scale, y - 29 * scale, 5 * scale);
  circle(ctx, x + 7 * scale, y - 33 * scale, 4 * scale);
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
  ctx.fillStyle = '#4b2f1f';
  rect(ctx, x - 3 * scale, y - 4 * scale, 6 * scale, 23 * scale);

  ctx.fillStyle = '#17321f';
  triangle(ctx, x, y - 45 * scale, x - 18 * scale, y - 15 * scale, x + 18 * scale, y - 15 * scale);
  ctx.fillStyle = '#1f4528';
  triangle(ctx, x, y - 34 * scale, x - 20 * scale, y, x + 20 * scale, y);
  ctx.fillStyle = '#285b32';
  triangle(ctx, x, y - 22 * scale, x - 17 * scale, y + 12 * scale, x + 17 * scale, y + 12 * scale);
}

function drawShrub(ctx, object, x, y) {
  const scale = object.scale || 1;
  const color = object.dead ? '#4d3435' : '#2e5b32';
  const light = object.dead ? '#7a4b4d' : '#4f8742';

  drawShadow(ctx, x, y + 8 * scale, 13 * scale, 4 * scale);

  ctx.fillStyle = color;
  circle(ctx, x - 7 * scale, y, 8 * scale);
  circle(ctx, x + 7 * scale, y - 1 * scale, 8 * scale);
  circle(ctx, x, y - 7 * scale, 10 * scale);

  ctx.fillStyle = light;
  ctx.globalAlpha = 0.34;
  circle(ctx, x - 4 * scale, y - 6 * scale, 3 * scale);
  circle(ctx, x + 5 * scale, y - 7 * scale, 3 * scale);
  ctx.globalAlpha = 1;
}

function drawTallGrassPatch(ctx, object, x, y) {
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
  const scale = object.scale || 1;
  drawShadow(ctx, x, y + 8 * scale, 18 * scale, 4 * scale);

  ctx.strokeStyle = '#2b1c19';
  ctx.lineWidth = 5 * scale;
  line(ctx, x - 16 * scale, y + 6 * scale, x, y - 5 * scale);
  line(ctx, x, y - 5 * scale, x + 17 * scale, y + 5 * scale);

  ctx.strokeStyle = '#5a3830';
  ctx.lineWidth = 2 * scale;
  line(ctx, x - 12 * scale, y + 5 * scale, x - 20 * scale, y - 3 * scale);
  line(ctx, x + 8 * scale, y + 0, x + 18 * scale, y - 9 * scale);
  line(ctx, x + 1 * scale, y - 4 * scale, x + 4 * scale, y - 20 * scale);
}

function drawGraveMarker(ctx, object, x, y) {
  const scale = object.scale || 1;
  drawShadow(ctx, x, y + 10 * scale, 10 * scale, 3 * scale);

  const cracked = object.cracked !== false;

  ctx.fillStyle = '#5a5a63';
  rect(ctx, x - 8 * scale, y - 22 * scale, 16 * scale, 29 * scale);

  ctx.beginPath();
  ctx.arc(x, y - 22 * scale, 8 * scale, Math.PI, 0);
  ctx.fill();

  ctx.fillStyle = '#777782';
  rect(ctx, x - 5 * scale, y - 18 * scale, 10 * scale, 3 * scale);

  if (cracked) {
    ctx.strokeStyle = '#25252d';
    ctx.lineWidth = Math.max(1, 2 * scale);
    line(ctx, x - 1 * scale, y - 20 * scale, x + 3 * scale, y - 9 * scale);
    line(ctx, x + 3 * scale, y - 9 * scale, x - 2 * scale, y + 1 * scale);
  }
}

function drawBrokenWall(ctx, object, x, y) {
  const scale = object.scale || 1;
  const horizontal = object.orientation !== 'vertical';

  drawShadow(ctx, x, y + 11 * scale, horizontal ? 25 * scale : 10 * scale, 5 * scale);

  ctx.fillStyle = '#3c3e49';

  if (horizontal) {
    rect(ctx, x - 27 * scale, y - 11 * scale, 54 * scale, 18 * scale);
    rect(ctx, x - 18 * scale, y - 23 * scale, 14 * scale, 12 * scale);
    rect(ctx, x + 8 * scale, y - 20 * scale, 16 * scale, 9 * scale);

    ctx.fillStyle = '#555966';
    rect(ctx, x - 23 * scale, y - 7 * scale, 12 * scale, 3 * scale);
    rect(ctx, x + 3 * scale, y - 5 * scale, 15 * scale, 3 * scale);
  } else {
    rect(ctx, x - 10 * scale, y - 29 * scale, 19 * scale, 58 * scale);
    rect(ctx, x - 18 * scale, y - 12 * scale, 8 * scale, 15 * scale);
    rect(ctx, x + 9 * scale, y + 7 * scale, 9 * scale, 15 * scale);

    ctx.fillStyle = '#555966';
    rect(ctx, x - 6 * scale, y - 23 * scale, 3 * scale, 14 * scale);
    rect(ctx, x - 3 * scale, y + 3 * scale, 3 * scale, 18 * scale);
  }

  ctx.strokeStyle = '#1c1d24';
  ctx.lineWidth = Math.max(1, 2 * scale);

  if (horizontal) {
    line(ctx, x - 24 * scale, y + 6 * scale, x + 24 * scale, y - 5 * scale);
  } else {
    line(ctx, x - 5 * scale, y - 25 * scale, x + 4 * scale, y + 24 * scale);
  }
}

function drawRuinPillar(ctx, object, x, y) {
  const scale = object.scale || 1;
  const broken = object.broken !== false;

  drawShadow(ctx, x, y + 13 * scale, 13 * scale, 4 * scale);

  ctx.fillStyle = '#494b57';
  rect(ctx, x - 9 * scale, y - 34 * scale, 18 * scale, 43 * scale);

  ctx.fillStyle = '#626674';
  rect(ctx, x - 12 * scale, y - 38 * scale, 24 * scale, 6 * scale);
  rect(ctx, x - 11 * scale, y + 7 * scale, 22 * scale, 5 * scale);

  ctx.fillStyle = '#2a2b34';
  rect(ctx, x - 5 * scale, y - 27 * scale, 3 * scale, 26 * scale);
  rect(ctx, x + 4 * scale, y - 27 * scale, 3 * scale, 26 * scale);

  if (broken) {
    ctx.fillStyle = '#2c2e38';
    triangle(ctx, x - 12 * scale, y - 38 * scale, x + 12 * scale, y - 38 * scale, x + 3 * scale, y - 50 * scale);
  }
}

function drawSmallBoulder(ctx, object, x, y) {
  const scale = object.scale || 1;
  rock(ctx, x, y, object.dark ? '#4a4e58' : '#6a707b', object.dark ? '#757c89' : '#a5acb8', scale);
}

function drawSignpost(ctx, object, x, y) {
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

// -----------------------------------------------------------------------------
// LANDMARK OBJECTS
// -----------------------------------------------------------------------------

function drawCampfire(ctx, x, y) {
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

function drawShrine(ctx, x, y) {
  drawShadow(ctx, x, y + 14, 18, 5);

  ctx.fillStyle = '#56535c';
  rect(ctx, x - 13, y - 9, 26, 22);

  ctx.fillStyle = '#77717f';
  rect(ctx, x - 10, y - 16, 20, 7);

  ctx.fillStyle = '#2b2533';
  rect(ctx, x - 5, y - 3, 10, 12);

  ctx.strokeStyle = '#b68cff';
  ctx.lineWidth = 2;
  line(ctx, x - 4, y - 20, x + 4, y - 20);
  line(ctx, x, y - 24, x, y - 15);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#b68cff';
  circle(ctx, x, y - 7, 24);
  ctx.restore();
}

function drawDungeonEntrance(ctx, object, x, y) {
  drawShadow(ctx, x, y + 16, 26, 8);

  const themeColor = getDungeonThemeColor(object.theme);

  ctx.fillStyle = '#17141c';
  poly(ctx, [
    [x - 23, y + 18],
    [x - 20, y - 8],
    [x - 9, y - 24],
    [x + 9, y - 24],
    [x + 21, y - 7],
    [x + 24, y + 18]
  ]);

  ctx.fillStyle = '#4b4652';
  rect(ctx, x - 25, y + 14, 50, 8);
  rect(ctx, x - 21, y - 7, 7, 24);
  rect(ctx, x + 14, y - 7, 7, 24);
  rect(ctx, x - 16, y - 25, 32, 7);

  ctx.fillStyle = '#0a0810';
  poly(ctx, [
    [x - 13, y + 16],
    [x - 11, y - 5],
    [x - 4, y - 14],
    [x + 4, y - 14],
    [x + 11, y - 5],
    [x + 13, y + 16]
  ]);

  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2;
  line(ctx, x - 11, y - 14, x + 11, y - 14);
  line(ctx, x - 8, y - 8, x + 8, y - 8);

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = themeColor;
  circle(ctx, x, y - 2, 23);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1;
  circleStroke(ctx, x, y - 2, 28);
  ctx.restore();
}

function drawDungeonExit(ctx, object, x, y) {
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

function drawUnknownObject(ctx, object, x, y) {
  drawShadow(ctx, x, y + 7, 10, 3);

  ctx.fillStyle = '#9facbf';
  diamond(ctx, x, y, 8);

  if (object.name && !object.hideLabel) {
    label(ctx, object.name, x, y - 18, {
      priority: object.labelPriority || 1
    });
  }
}

// -----------------------------------------------------------------------------
// DROPS
// -----------------------------------------------------------------------------

function drawDrop(ctx, drop, x, y) {
  const bob = Math.sin((drop.bobTimer || 0) + (drop.age || performance.now() / 1000) * 4) * 2;
  const color = rarityColor(drop.rarity);

  drawShadow(ctx, x, y + 7, 8, 3);

  ctx.save();

  ctx.fillStyle = color;
  diamond(ctx, x, y - 2 + bob, 7);

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = color;
  circle(ctx, x, y - 2 + bob, 11);

  ctx.restore();
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
  if (classId === 'templar') return '#ffcc66';
  if (classId === 'mercenary') return '#73d18a';
  if (classId === 'necromancer') return '#b68cff';
  if (classId === 'thornbinder') return '#6fae72';

  return '#d9ad4f';
}

function classShortName(classId) {
  if (classId === 'templar') return 'Templar';
  if (classId === 'mercenary') return 'Mercenary';
  if (classId === 'necromancer') return 'Necromancer';
  if (classId === 'thornbinder') return 'Thornbinder';

  return 'Instructor';
}

function rarityColor(rarity) {
  if (rarity === 'common') return '#d9ad4f';
  if (rarity === 'uncommon') return '#73d18a';
  if (rarity === 'rare') return '#6fa8ef';
  if (rarity === 'occult') return '#b68cff';
  if (rarity === 'relic') return '#ffcc66';
  if (rarity === 'legendary') return '#ffcc66';

  return '#e8edf5';
}

function getDungeonThemeColor(theme) {
  if (theme === 'thorn') return '#73d18a';
  if (theme === 'mine') return '#d9ad4f';
  if (theme === 'ruin') return '#9facbf';
  if (theme === 'grave') return '#b68cff';
  if (theme === 'demon') return '#b94a3d';

  return '#b68cff';
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
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(Math.round(x), Math.round(y), rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function hashString(str) {
  let h = 2166136261;

  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}
// oldWellSystem.js
// Focused quest layer for Mercy in Orrakai's lower-road encounter. The authored
// world state is reconstructed from host quest progress so saves never need to
// serialize overworld enemies or protected evidence items.

import { TILE } from './data.js';
import { makeEnemy, makeObject } from './overworldUtils.js';
import { applyStoryFlags, getStoryFlag } from './storyProgress.js';

export const OLD_WELL_POI_ID = 'oldWellRitualSite';
export const OLD_WELL_TILE = Object.freeze({ x: 53, y: 67 });

const ENCOUNTERS = [
  { id: 'oldWellPlagueAnimal', kind: 'ashWolf', name: 'Plague-Touched Hound', x: 44, y: 57, hp: 52, damage: 6, speed: 54, range: 27, rate: 1.18 },
  { id: 'oldWellLastDawnFighter', kind: 'roadlessBandit', name: 'Last Dawn Fighter', x: 51, y: 66, hp: 76, damage: 7, speed: 48, range: 30, rate: 1.12 },
  // Keep the legacy encounter ID so existing kill progress remains valid.
  { id: 'oldWellLastDawnRitualist', kind: 'basicBeast', name: 'Blighted Beast', x: 55, y: 65, hp: 108, damage: 8, speed: 41, range: 32, rate: 1.65, noSummons: true }
];

export function updateOldWellQuest(game) {
  if (!game?.player || game.world?.mode !== 'overworld') return false;
  const quest = game.player.quests?.active?.mercy_in_orrakai || null;
  const stageId = quest?.currentStageId || null;

  ensureOldWellWorldLayer(game.world);
  updateClueAvailability(game, stageId);

  if (stageId === 'investigateOldWell') {
    ensureEncounterEnemies(game, quest);
    updateEncounterCompletion(game, quest);
  } else {
    removeQuestEncounterEnemies(game.world);
  }

  // Legacy or interrupted saves that already reached the return stage must
  // never lose the evidence required to continue.
  if (stageId === 'returnOldWellEvidence' && !getStoryFlag(game.player, 'mercy.brokenLanternHeld') && !getStoryFlag(game.player, 'mercy.evidenceReported')) {
    applyStoryFlags(game.player, ['mercy.brokenLanternAcquired', 'mercy.brokenLanternHeld']);
  }

  return true;
}

function ensureOldWellWorldLayer(world) {
  if (world.oldWellQuestLayerApplied) return;
  world.oldWellQuestLayerApplied = true;

  carveLowerRoad(world, { x: 17, y: 35 }, { x: OLD_WELL_TILE.x, y: OLD_WELL_TILE.y });
  const objects = world.objects || (world.objects = []);
  const add = object => {
    if (!objects.some(existing => existing.id === object.id)) objects.push(object);
  };

  add(makeObject('signpost', 'lowerRoadSign', 'Lower Road', 20, 38, {
    forceLabel: true, labelPriority: 8,
    talk: 'Lower Road — Old Well — Echoryn Forest'
  }));
  add(makeObject('signpost', 'oldWellRoadSign', 'Old Well', 40, 55, {
    forceLabel: true, labelPriority: 8,
    talk: 'Old Well: follow the damaged fence toward the forest edge.'
  }));
  add(prop('oldWellRuinedCart', 'woodPile', 37, 52, { scale: 1.2 }));
  add(prop('oldWellBoundaryStones', 'roadRuts', 42, 57, { orientation: 'diagonal', length: 7 }));
  add(prop('oldWellStructure', 'stoneMarker', OLD_WELL_TILE.x, OLD_WELL_TILE.y, {
    scale: 1.65, forceLabel: true, hideLabel: false, labelPriority: 9,
    name: 'Old Well', poiId: OLD_WELL_POI_ID
  }));
  add(prop('oldWellRitualGlow', 'lantern', 54, 67, { glow: '#a74638', scale: 0.75 }));

  for (let index = 0; index < 7; index++) {
    add(prop(`oldWellDeadRoot-${index}`, 'deadRoot', 43 + index * 2, 59 + index, {
      scale: 0.7 + (index % 3) * 0.12
    }));
  }

  add(clue('oldWellRedWax', 'Red Wax Seals', 52, 67,
    'Red wax has been pressed into the cracks between the stones. The seal bears the divided-sun mark used by the Order of the Last Dawn.',
    ['mercy.oldWellRedWaxInspected']));
  add(clue('oldWellBurnedCloth', 'Burned White-and-Gold Cloth', 54, 66,
    'The cloth has been burned almost beyond recognition. A narrow strip still carries white-and-gold stitching.',
    ['mercy.oldWellBurnedClothInspected']));
  add(clue('oldWellRitualMarking', 'Half-Finished Ritual Marking', 53, 68,
    'The circle is incomplete. Several markings have been cut through or disturbed, as though the ritual ended suddenly.',
    ['mercy.oldWellRitualInspected']));
  add(clue('oldWellPatrolEvidence', 'Missing Patrol Evidence', 55, 68,
    'Boot prints and blood lead away from the well, but no body remains.',
    ['mercy.oldWellPatrolEvidenceInspected']));
  add(clue('oldWellBrokenLantern', 'Broken Covenant Lantern', 54, 69,
    'Caught between the dead beast’s damaged ribs and a torn leather satchel is a white-and-gold Covenant lantern. The protective glass is shattered; its carrying strap is torn through. Despite the scorch marks, the metal feels strangely cold.',
    ['mercy.brokenLanternAcquired', 'mercy.brokenLanternHeld'], {
      questItemName: 'Broken Covenant Lantern',
      color: '#f6df88'
    }));
}

function ensureEncounterEnemies(game, quest) {
  const objectives = quest.objectives || [];
  game.world.enemies = game.world.enemies || [];

  for (const definition of ENCOUNTERS) {
    const objective = objectives.find(entry => entry.type === 'kill' && entry.enemyId === definition.id);
    if (!objective || Number(objective.current || 0) >= Number(objective.required || 1)) continue;
    if (game.world.enemies.some(enemy => enemy.id === definition.id && !enemy.remove)) continue;

    const homeX = definition.x * TILE + TILE / 2;
    const homeY = definition.y * TILE + TILE / 2;
    game.world.enemies.push(makeEnemy(definition.kind, definition.id, definition.name, definition.x, definition.y, {
      tier: 1, hp: definition.hp, maxHp: definition.hp, damage: definition.damage,
      speed: definition.speed, attackRange: definition.range, attackRate: definition.rate,
      aggroRange: 245, xp: 18, factionId: 'lastDawn', questEncounter: 'oldWell',
      noRespawn: true, homeGuard: true, homeX, homeY, homeRadius: TILE * 7,
      leashRange: TILE * 9, telegraphScale: 1.15, recoveryScale: 1.15,
      specialCooldown: definition.noSummons ? Number.POSITIVE_INFINITY : undefined
    }));
  }

  const approachDistance = Math.hypot(
    game.player.x - (ENCOUNTERS[0].x * TILE + TILE / 2),
    game.player.y - (ENCOUNTERS[0].y * TILE + TILE / 2)
  );
  if (approachDistance <= TILE * 12 && !getStoryFlag(game.player, 'mercy.oldWellEncounterStarted')) {
    applyStoryFlags(game.player, ['mercy.oldWellEncounterStarted']);
    game.log?.('The lower road falls quiet. Something moves among the diseased roots ahead.');
  }
}

function updateEncounterCompletion(game, quest) {
  const killObjectives = (quest.objectives || []).filter(objective => objective.type === 'kill');
  const cleared = killObjectives.length === ENCOUNTERS.length && killObjectives.every(objective =>
    Number(objective.current || 0) >= Number(objective.required || 1)
  );
  if (!cleared || getStoryFlag(game.player, 'mercy.oldWellEncounterCleared')) return;
  applyStoryFlags(game.player, ['mercy.oldWellEncounterCleared']);
  game.log?.('The fighting ends. Red wax and a damaged ritual circle remain around the Old Well.');
}

function updateClueAvailability(game, stageId) {
  const encounterCleared = getStoryFlag(game.player, 'mercy.oldWellEncounterCleared');
  const beastDefeated=game.player.campaignKills?.oldWellLastDawnRitualist||game.player.quests?.active?.mercy_in_orrakai?.objectives?.some(o=>o.enemyId==='oldWellLastDawnRitualist'&&o.current>=o.required);
  const recovery=game.player.mercyLanternRecoveryPoint;
  for (const object of game.world.objects || []) {
    if (object.poiId !== OLD_WELL_POI_ID || object.kind !== 'poiInvestigation') continue;
    const isLantern = object.id === 'oldWellBrokenLantern';
    if(isLantern&&recovery){object.x=recovery.x;object.y=recovery.y;}
    object.interactable = stageId === 'investigateOldWell' && (isLantern ? beastDefeated&&!getStoryFlag(game.player,'mercy.brokenLanternAcquired') : encounterCleared);
    object.hideLabel = !object.interactable;
  }
}

function removeQuestEncounterEnemies(world) {
  world.enemies = (world.enemies || []).filter(enemy => enemy.questEncounter !== 'oldWell');
}

function carveLowerRoad(world, from, to) {
  if (!Array.isArray(world.tiles)) return;
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
  for (let step = 0; step <= steps; step++) {
    const t = step / Math.max(1, steps);
    const cx = Math.round(from.x + (to.x - from.x) * t);
    const cy = Math.round(from.y + (to.y - from.y) * t);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const tile = world.tiles[cy + oy]?.[cx + ox];
      if (!tile) continue;
      tile.biome = Math.abs(ox) + Math.abs(oy) <= 1 ? 'path' : 'grass';
      tile.passable = true;
    }
  }
}

function clue(id, name, tileX, tileY, message, storyFlags, extra = {}) {
  return makeObject('poiInvestigation', id, name, tileX, tileY, {
    poiId: OLD_WELL_POI_ID, clueId: id, clueCategory: 'physical', message,
    reviewMessage: `You have already recorded what ${name.toLowerCase()} can prove.`,
    storyFlags, interactable: false, hideLabel: true, labelPriority: 8, r: 19,
    ...extra
  });
}

function prop(id, propType, tileX, tileY, extra = {}) {
  return makeObject('townProp', id, extra.name || propType, tileX, tileY, {
    propType, decorative: true, interactable: false, hideLabel: true,
    drawRadius: 180, ...extra
  });
}

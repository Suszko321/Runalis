// gameInteraction.js
// Runalis interaction system.
//
// Responsibilities:
// - nearest object lookup
// - interact routing
// - NPC talk routing
// - class selection
// - starter class gear
// - class ability unlock refresh
// - harvesting / fishing
// - campfire / shrine
// - dungeon entry / exit routing
// - Castle Veyr / large POI interaction routing
//
// main.js should call these functions with the active game instance.

import {
  addItem,
  removeItem,
  countItem,
  gainXp,
  awakenSpirit,
  migratePlayer
} from './player.js';

import { ITEMS } from './data.js';

import {
  addFloatingText,
  addLootText,
  addQuestText,
  addStatusText,
  addSpiritText
} from './floatingText.js';

import { renderUI, getFirstOathStage } from './ui.js';

import {
  enterDungeon as enterDungeonSystem,
  exitDungeon as exitDungeonSystem
} from './dungeonSystem.js';

import {
  openDialogue,
  ensurePlayerDialogueAndQuestState,
  markCollectObjective
} from './dialogueSystem.js';

import { getPoi } from './worldContent.js';

// -----------------------------------------------------------------------------
// CLASS DATA
// -----------------------------------------------------------------------------

export const CLASS_STARTER_GEAR = {
  templar: {
    weapon: 'noviceBlade',
    helm: 'knightHelm',
    chest: 'knightChest',
    legs: 'ironGreaves',
    trinket: null
  },

  mercenary: {
    weapon: 'hunterBow',
    helm: null,
    chest: 'leatherVest',
    legs: 'roughLegwraps',
    trinket: null
  },

  necromancer: {
    weapon: 'graveScythe',
    helm: 'necromancerHood',
    chest: 'necromancerRobe',
    legs: null,
    trinket: 'paleRune'
  },

  thornbinder: {
    weapon: 'rootStaff',
    helm: null,
    chest: 'thornbinderGarb',
    legs: null,
    trinket: 'thornCharm'
  }
};

export const CLASS_Q_ABILITIES = {
  templar: 'heavyCut',
  mercenary: 'quickShot',
  necromancer: 'graveSpark',
  thornbinder: 'vineWhip'
};

export const CLASS_R_ABILITIES = {
  templar: 'cleavingStep',
  mercenary: 'markedArrow',
  necromancer: 'summonLich',
  thornbinder: 'summonThornbeast'
};

export const CLASS_R_UNLOCK_LEVEL = 8;

// -----------------------------------------------------------------------------
// PUBLIC INTERACTION API
// -----------------------------------------------------------------------------

export function interact(game) {
  const nearest = nearestObject(game, 50);

  if (!nearest) {
    game.log('Nothing close enough to interact with.');
    return;
  }

  switch (nearest.kind) {
    case 'npc':
      talk(game, nearest);
      return;

    case 'herb':
      harvest(game, nearest, 'emberleaf', 'foraging', 12);
      return;

    case 'gravecap':
      harvest(game, nearest, 'gravecap', 'foraging', 15);
      return;

    case 'reed':
      harvest(game, nearest, 'riverReed', 'foraging', 10);
      return;

    case 'ore':
      harvest(game, nearest, 'ironOre', 'mining', 18);
      return;

    case 'bone':
      harvest(game, nearest, 'boneShard', 'mining', 14);
      return;

    case 'fish':
      fish(game, nearest);
      return;

    case 'runestone':
      harvest(game, nearest, 'paleEssence', 'runecraft', 18);
      return;

    case 'campfire':
      campfire(game, nearest);
      return;

    case 'shrine':
      shrine(game, nearest);
      return;

    case 'dungeonEntrance':
      enterDungeon(game, nearest);
      return;

    case 'dungeonExit':
      exitDungeon(game, nearest);
      return;

    case 'gothicCastle':
    case 'castle':
    case 'castleVeyr':
      enterCastleVeyr(game, nearest);
      return;

    case 'demonCultLair':
    case 'cultLair':
      enterDemonCultLair(game, nearest);
      return;

    default:
      if (nearest.poiId) {
        const poi = getPoi(nearest.poiId);

        if (isCastleVeyrPoi(nearest)) {
          enterCastleVeyr(game, nearest);
          return;
        }

        game.log(poi?.description || `${nearest.name || 'This place'} is worth remembering.`);
        return;
      }

      game.log(`You do not know how to use ${nearest.name || 'this'}.`);
  }
}

export function nearestObject(game, range = 50) {
  let best = null;
  let bestDistance = Infinity;

  for (const object of game.world.objects || []) {
    if (!object || object.depleted) continue;

    const objectRadius = object.r || object.radius || 0;
    const effectiveRange = range + objectRadius;

    const d = Math.hypot(object.x - game.player.x, object.y - game.player.y);

    if (d < effectiveRange && d < bestDistance) {
      best = object;
      bestDistance = d;
    }
  }

  return best;
}

// -----------------------------------------------------------------------------
// NPC TALK / CLASS CHOICE
// -----------------------------------------------------------------------------

export function talk(game, npc) {
  const player = game.player;

  migratePlayer(player);
  ensurePlayerDialogueAndQuestState(player);

  if (npc.instructorType === 'class') {
    chooseClass(game, npc.classId);
    return;
  }

  if (npc.dialogueId || npc.npcId) {
    const opened = openDialogue(game.dialogue, npc, player, game.world);

    if (opened) {
      renderUI(game.player, game.logLines, game);
      return;
    }
  }

  if (npc.id === 'warden') {
    talkWarden(game);
    return;
  }

  if (npc.id === 'smith') {
    talkSmith(game);
    return;
  }

  game.log(npc.talk || `${npc.name} has nothing to say.`);
}

export function talkWarden(game) {
  const player = game.player;

  if (player.quest.firstOath === 0) {
    player.quest.firstOath = 1;

    game.log('Quest started: First Oath of Runalis.');
    game.log('Warden Mael: "No one is born ready here. Prove you can gather, endure, and fight if needed."');

    addQuestText(player, 'Quest Started', {
      ttl: 1.3,
      size: 15
    });

    return;
  }

  const stage = getFirstOathStage(player);

  if (stage.stage === 3) {
    removeItem(player, 'emberleaf', 3);
    removeItem(player, 'ironOre', 2);

    player.quest.firstOath = 3;
    player.gold += 18;

    gainXp(player, 'renown', 45, game.log);

    game.log('Quest complete: First Oath of Runalis.');
    game.log('Warden Mael: "Good. You are not ready, but you are less likely to die uselessly."');

    game.shake(5, 0.14);

    addQuestText(player, 'Quest Complete', {
      ttl: 1.5,
      size: 16
    });

    return;
  }

  game.log(stage.text);
}

export function talkSmith(game) {
  game.log('Mara the Smith: "Bring me ore and coin, and I can keep you alive a little longer."');

  addStatusText(game.player, 'Smith', {
    color: '#d9ad4f'
  });
}

export function chooseClass(game, classId) {
  const player = game.player;

  migratePlayer(player);

  if (player.classId) {
    game.log(`You already follow the path of the ${player.className}.`);
    return;
  }

  const classNames = {
    templar: 'Templar',
    mercenary: 'Mercenary',
    necromancer: 'Necromancer',
    thornbinder: 'Thornbinder'
  };

  const classSkills = {
    templar: 'blade',
    mercenary: 'archery',
    necromancer: 'spirit',
    thornbinder: 'warding'
  };

  const chosenName = classNames[classId];
  const chosenSkill = classSkills[classId];

  if (!chosenName || !chosenSkill) {
    game.log('That instructor cannot train you yet.');
    return;
  }

  player.classId = classId;
  player.className = chosenName;
  player.classSkill = chosenSkill;
  player.classXpMultiplier = 1.5;

  player.loadout = player.loadout || {};
  player.loadout.primarySkill = chosenSkill;
  player.loadout.abilitySlots = player.loadout.abilitySlots || [null, null, null, null];

  while (player.loadout.abilitySlots.length < 4) {
    player.loadout.abilitySlots.push(null);
  }

  player.unlockedAbilities = player.unlockedAbilities || [];

  const qAbility = CLASS_Q_ABILITIES[classId];
  const rAbility = CLASS_R_ABILITIES[classId];

  if (qAbility) {
    if (!player.unlockedAbilities.includes(qAbility)) {
      player.unlockedAbilities.push(qAbility);
    }

    player.loadout.abilitySlots[0] = qAbility;
  }

  if (rAbility) {
    const classSkillLevel = player.skillState?.skills?.[chosenSkill]?.level || 1;

    if (classSkillLevel >= CLASS_R_UNLOCK_LEVEL) {
      if (!player.unlockedAbilities.includes(rAbility)) {
        player.unlockedAbilities.push(rAbility);
      }

      player.loadout.abilitySlots[1] = rAbility;
    } else {
      player.loadout.abilitySlots[1] = null;
    }
  }

  if (classId === 'necromancer') {
    player.spiritAwakened = true;
    player.maxSpirit = Math.max(player.maxSpirit, 35);
    player.spirit = Math.max(player.spirit, 35);
  }

  const grantedGear = grantClassStarterGear(game, classId);

  migratePlayer(player);
  refreshClassAbilityUnlocks(game);

  game.log(`You chose the path of the ${chosenName}.`);
  game.log(`${skillLabel(chosenSkill)} XP is now boosted by 50%.`);

  if (qAbility) {
    game.log(`${abilityName(qAbility)} unlocked.`);
  }

  if (grantedGear.length) {
    game.log(`Class gear equipped: ${grantedGear.join(', ')}.`);
  }

  game.shake(6, 0.18);

  addQuestText(player, `${chosenName} Chosen`, {
    ttl: 1.5,
    size: 16,
    color: getClassColor(classId)
  });

  if (grantedGear.length) {
    addLootText(player, 'Class Gear Equipped', {
      ttl: 1.1,
      color: getClassColor(classId),
      offsetY: -88
    });
  }

  renderUI(game.player, game.logLines, game);

  if (typeof game.renderPauseDevTools === 'function') {
    game.renderPauseDevTools();
  }
}

export function refreshClassAbilityUnlocks(game) {
  const player = game.player;

  migratePlayer(player);

  if (!player.classId || !player.classSkill) return;

  const qAbility = CLASS_Q_ABILITIES[player.classId];
  const rAbility = CLASS_R_ABILITIES[player.classId];

  player.unlockedAbilities = player.unlockedAbilities || [];
  player.loadout = player.loadout || {};
  player.loadout.abilitySlots = player.loadout.abilitySlots || [null, null, null, null];

  while (player.loadout.abilitySlots.length < 4) {
    player.loadout.abilitySlots.push(null);
  }

  if (qAbility && !player.unlockedAbilities.includes(qAbility)) {
    player.unlockedAbilities.push(qAbility);
  }

  if (qAbility && !player.loadout.abilitySlots[0]) {
    player.loadout.abilitySlots[0] = qAbility;
  }

  const classSkillLevel = player.skillState?.skills?.[player.classSkill]?.level || 1;

  if (rAbility && classSkillLevel >= CLASS_R_UNLOCK_LEVEL) {
    if (!player.unlockedAbilities.includes(rAbility)) {
      player.unlockedAbilities.push(rAbility);
      game.log(`${abilityName(rAbility)} unlocked.`);
    }

    if (!player.loadout.abilitySlots[1]) {
      player.loadout.abilitySlots[1] = rAbility;
    }
  }
}

export function grantClassStarterGear(game, classId) {
  const player = game.player;
  const gear = CLASS_STARTER_GEAR[classId];

  if (!gear) return [];

  const equipped = [];

  for (const [slot, itemId] of Object.entries(gear)) {
    if (!itemId) continue;

    const item = ITEMS[itemId];

    if (!item) {
      game.log(`Missing class gear item: ${itemId}.`);
      continue;
    }

    addItem(player, itemId, 1);

    player.equipment = player.equipment || {};
    player.equipment[slot] = itemId;

    equipped.push(item.name || itemId);
  }

  return equipped;
}

// -----------------------------------------------------------------------------
// HARVESTING / GATHERING
// -----------------------------------------------------------------------------

export function harvest(game, object, itemId, skillId, xp) {
  const item = ITEMS[itemId];

  if (!item) {
    game.log(`Missing item definition: ${itemId}`);
    return;
  }

  addItem(game.player, itemId, 1);
  markCollectObjective(game.player, itemId, 1);
  gainXp(game.player, skillId, xp, game.log);

  object.depleted = true;
  object.respawn = object.respawnTime || 14;

  game.log(`Obtained ${item.name}.`);

  addLootText(game.player, item.name, {
    color: getItemFloatingColor(itemId)
  });
}

export function fish(game, object) {
  const caught = Math.random() < 0.85 ? 'riverfish' : 'silverfin';

  harvest(game, object, caught, 'fishing', caught === 'silverfin' ? 24 : 14);
}

// -----------------------------------------------------------------------------
// CAMPFIRES / SHRINES
// -----------------------------------------------------------------------------

export function campfire(game) {
  const player = game.player;

  player.hp = Math.min(player.maxHp, player.hp + 35);
  player.stamina = Math.min(player.maxStamina, player.stamina + 45);

  if (player.spiritAwakened) {
    player.spirit = Math.min(player.maxSpirit, player.spirit + 20);
  }

  game.log('You rest by the campfire.');

  addStatusText(player, 'Rested', {
    color: '#ffcc66'
  });
}

export function shrine(game) {
  const player = game.player;

  if (player.spiritAwakened) {
    player.spirit = player.maxSpirit;
    game.log('The shrine hums. Your spirit is restored.');

    addSpiritText(player, 'Spirit Restored', {
      ttl: 1.2,
      size: 14
    });

    return;
  }

  if (countItem(player, 'gravecap') >= 2 && countItem(player, 'boneShard') >= 1) {
    removeItem(player, 'gravecap', 2);
    removeItem(player, 'boneShard', 1);

    awakenSpirit(player, game.log);
    gainXp(player, 'spirit', 55, game.log);
    gainXp(player, 'renown', 25, game.log);

    game.log('The Hungry Shrine accepts the offering and brands your spirit.');

    game.shake(8, 0.22);

    addSpiritText(player, 'Spirit Awakened', {
      ttl: 1.5,
      size: 16
    });
  } else {
    game.log('The shrine wants Gravecap x2 and Bone Shard x1.');

    addStatusText(player, 'Offering needed', {
      color: '#9facbf'
    });
  }
}

// -----------------------------------------------------------------------------
// DUNGEONS / POI INTERIORS
// -----------------------------------------------------------------------------

export function enterDungeon(game, entrance) {
  const entered = enterDungeonSystem(game, entrance);

  if (entered) {
    renderUI(game.player, game.logLines, game);

    if (typeof game.renderPauseDevTools === 'function') {
      game.renderPauseDevTools();
    }
  }
}

export function exitDungeon(game, exit) {
  const exited = exitDungeonSystem(game, exit);

  if (exited) {
    renderUI(game.player, game.logLines, game);

    if (typeof game.renderPauseDevTools === 'function') {
      game.renderPauseDevTools();
    }
  }
}

export function enterCastleVeyr(game, castle) {
  if (!castle) {
    game.log('There is no entrance here.');
    return;
  }

  const entrance = {
    ...castle,
    kind: 'dungeonEntrance',
    id: castle.id || 'castleVeyrEntrance',
    name: castle.name || 'Castle Veyr',
    dungeonId: castle.dungeonId || 'castleVeyr',
    theme: castle.theme || 'grave',
    tier: castle.tier || 2,
    depth: castle.depth || 1,
    locked: false,
    r: castle.r || castle.radius || 72
  };

  game.log('You enter Castle Veyr.');

  enterDungeon(game, entrance);
}

export function enterDemonCultLair(game, lair) {
  if (!lair) {
    game.log('There is no entrance here.');
    return;
  }

  const entrance = {
    ...lair,
    kind: 'dungeonEntrance',
    id: lair.id || 'demonCultLairEntrance',
    name: lair.name || 'Demon Cultist Lair',
    dungeonId: lair.dungeonId || 'demonCultLair',
    theme: lair.theme || 'cult',
    tier: lair.tier || 2,
    depth: lair.depth || 1,
    locked: false,
    r: lair.r || lair.radius || 58
  };

  game.log(`You enter ${entrance.name}.`);

  enterDungeon(game, entrance);
}

// -----------------------------------------------------------------------------
// SMALL HELPERS
// -----------------------------------------------------------------------------

function isCastleVeyrPoi(object) {
  const id = String(object?.id || '').toLowerCase();
  const name = String(object?.name || '').toLowerCase();
  const poiId = String(object?.poiId || '').toLowerCase();
  const dungeonId = String(object?.dungeonId || '').toLowerCase();

  return (
    id.includes('castleveyr') ||
    id.includes('castle_veyr') ||
    id.includes('castle-veyr') ||
    name.includes('castle veyr') ||
    poiId.includes('castleveyr') ||
    poiId.includes('castle_veyr') ||
    poiId.includes('castle-veyr') ||
    dungeonId.includes('castleveyr') ||
    dungeonId.includes('castle_veyr') ||
    dungeonId.includes('castle-veyr')
  );
}

export function getItemFloatingColor(itemId) {
  const rarity = ITEMS[itemId]?.rarity;

  if (rarity === 'common') return '#d9ad4f';
  if (rarity === 'uncommon') return '#73d18a';
  if (rarity === 'rare') return '#6fa8ef';
  if (rarity === 'occult') return '#b68cff';
  if (rarity === 'relic') return '#d9ad4f';
  if (rarity === 'legendary') return '#ffcc66';

  return '#d9ad4f';
}

export function getClassColor(classId) {
  if (classId === 'templar') return '#ffcc66';
  if (classId === 'mercenary') return '#73d18a';
  if (classId === 'necromancer') return '#b68cff';
  if (classId === 'thornbinder') return '#6fae72';

  return '#d9ad4f';
}

export function skillLabel(skillId) {
  if (skillId === 'blade') return 'Blade';
  if (skillId === 'archery') return 'Archery';
  if (skillId === 'spirit') return 'Spirit';
  if (skillId === 'warding') return 'Warding';
  if (skillId === 'foraging') return 'Foraging';
  if (skillId === 'mining') return 'Mining';
  if (skillId === 'fishing') return 'Fishing';
  if (skillId === 'crafting') return 'Crafting';
  if (skillId === 'cooking') return 'Cooking';
  if (skillId === 'runecraft') return 'Runecraft';
  if (skillId === 'renown') return 'Renown';

  return String(skillId || 'Unknown');
}

export function abilityName(abilityId) {
  if (abilityId === 'heavyCut') return 'Heavy Cut';
  if (abilityId === 'quickShot') return 'Quick Shot';
  if (abilityId === 'graveSpark') return 'Grave Spark';
  if (abilityId === 'vineWhip') return 'Vine Whip';
  if (abilityId === 'cleavingStep') return 'Cleaving Step';
  if (abilityId === 'markedArrow') return 'Marked Arrow';
  if (abilityId === 'summonLich') return 'Summon Lich';
  if (abilityId === 'summonThornbeast') return 'Summon Thornbeast';

  return String(abilityId || 'Ability');
}
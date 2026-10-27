import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';
import {handleCampaignInteraction} from './act1CampaignRuntime.js';
import {CAMPFIRE_RECIPES} from './workshopAccess.js';
import {prepareDiscoveryClaim,rememberDiscoveryClaim,announceLootDiscovery} from './gameplayDiscoveries.js';
import {filterChestEquipment,rollRegionalMythical} from './regionalLootSystem.js';
import {isClassAvailable} from './classData.js';
import { openMarketShop } from './shopSystem.js';
import {discoverStone,investigateSecret,regionalHarvest,rememberHarvest,localizeHarvestBonuses,soundWorldRelic} from './worldExploration.js';
import {objectInInteractionRange,INTERACTION_RANGE} from './interactionRange.js';
import {hasLineOfSight} from './world.js';
// gameInteraction.js
// Runalis interaction system.
//
// Responsibilities:
// - nearest object lookup
// - interact routing
// - NPC talk routing
// - class selection
// - starter class weapons
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

import {
  CLASS_SKILL_TREE_LOCKS,
  normalizeSkillTreeState
} from './skillTreeSystem.js';

import { ITEMS } from './data.js';
import {
  assignAbilityToSlot,
  unlockActiveAbility
} from './abilityLoadoutSystem.js';

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
  exitDungeon as exitDungeonSystem,
  transitionDungeonFloor,
  collectDungeonKey,
  unlockDungeonDoor,
  activateDungeonPuzzle,
  triggerDungeonEvent
} from './dungeonSystem.js';

import {
  openDialogue,
  ensurePlayerDialogueAndQuestState,
  getQuestOwner,
  markPartyCollectObjective,
  markPartyPoiInvestigationObjective,
  startQuest,
  recordPartyPoiDiscovery
} from './dialogueSystem.js';
import {
  poiContentConditionsMatch,
  recordPoiClue
} from './poiStateSystem.js';

import { getPoi } from './worldContent.js';
import { ACT1_OVERWORLD_DISPLAY_NAME, normalizePlayerFacingWorldName } from './worldNames.js';
import { applyStoryFlags } from './storyProgress.js';

import {
  enterTower,
  exitTower,
  claimTowerReward,
  updateTowerState
} from './towerSystem.js';

import {
  enterSideZone,
  exitSideZone
} from './sideZoneSystem.js';

import {
  enterCapitalHub,
  useHubService,
  useMarket as useHubMarket
} from './hubSystem.js';

import {
  startTravelRoute,
  completeTravelRoute,
  returnAlongRoute
} from './travelSystem.js';

import {
  getSkillLevel
} from './skills.js';

import {
  playSfx
} from './audioSystem.js';

import {
  SURVIVAL_TOOLS,
  addWorldSkillEffect,
  getHarvestToolBonus,
  startFishingMiniGame
} from './survivalSkills.js';

import {
  applyClassStoryChoice,
  ensureActQuest
} from './storyRuntime.js';

import {
  craftRecipe,
  getRecipeCraftStatus
} from './craftingSystem.js';

import {
  createEnemyArchetype
} from './enemyBehaviors.js';
import {
  getCoopEnemyScalingPlayerCount,
  getScaledEnemyCount
} from './coopEnemyScaling.js';
import { playPoiThresholdEffect } from './poiPresentationSystem.js';
import { recordPoiCacheClaim } from './poiEncounterSystem.js';
import { leaveMaraHouse } from './act1OpeningSystem.js';

// -----------------------------------------------------------------------------
// CLASS DATA
// -----------------------------------------------------------------------------

export const CLASS_STARTER_GEAR = {
  classless: {
    weapon: 'noviceBlade'
  },

  oathkeeper: {
    weapon: 'oathkeepersMace',
    trinket: 'crackedVowShield'
  },

  fellhunter: {
    weapon: 'hunterBow'
  },

  mercenary: {
    weapon: 'hunterBow'
  },

  gravecaller: {
    weapon: 'graveScythe'
  },

  necromancer: {
    weapon: 'graveScythe'
  },

  thornbinder: {
    weapon: 'rootStaff'
  },

  waverider: {
    weapon: 'tideglassRapier'
  },

  hydromancer: {
    weapon: 'tideglassRapier'
  },

  lightbringer: {
    weapon: 'crackedDawnlens'
  },

  eldritch: {
    weapon: 'eldritchConduit'
  }
};

export const CLASS_Q_ABILITIES = {
  classless: null,
  oathkeeper: 'oathkeeperOathStrike',
  templar: 'oathkeeperOathStrike',
  fellhunter: 'fellhunterThrowingDaggers',
  mercenary: 'fellhunterThrowingDaggers',
  gravecaller: 'graveSpark',
  necromancer: 'graveSpark',
  thornbinder: 'thornbinderThornLash',
  waverider: 'hydromancerWaterTorrent',
  hydromancer: 'hydromancerWaterTorrent',
  lightbringer: 'lightbringerGleamBolt',
  eldritch: 'voidstepBurst'
};

function normalizeClassId(classId) {
  if (classId === 'templar') return 'oathkeeper';
  if (classId === 'necromancer') return 'gravecaller';
  if (classId === 'hydromancer') return 'waverider';
  if (classId === 'mercenary') return 'fellhunter';
  return classId;
}

// -----------------------------------------------------------------------------
// PUBLIC INTERACTION API
// -----------------------------------------------------------------------------

export function interact(game) {
  const nearest = nearestObject(game, INTERACTION_RANGE);

  if (!nearest) {
    game.log('Nothing close enough to interact with.');
    return;
  }

  if (handleCampaignInteraction(game,nearest)) return;

  switch (nearest.kind) {
    case 'worldRelic':
      soundWorldRelic(game,nearest);
      return;
    case 'navStone':
      discoverStone(game, nearest);
      game.log('Nav Stone: open the world map to choose a discovered destination. One field ration per journey.');
      return;
    case 'worldSecret':
      investigateSecret(game, nearest);
      return;
    case 'npc':
      if (nearest.skillMerchant) { openMarketShop(game,nearest); return; }
      talk(game, nearest);
      return;

    case 'herb':
    case 'emberleaf':
      harvest(game, nearest, nearest.itemId || 'emberleaf', 'foraging', 12);
      return;

    case 'gravecap':
      harvest(game, nearest, nearest.itemId || 'gravecap', 'foraging', nearest.xp || 15);
      return;

    case 'ashFruit':
      harvest(game, nearest, nearest.itemId || 'ashFruit', 'foraging', nearest.xp || 18);
      return;

    case 'lanternMoss':
      harvest(game, nearest, nearest.itemId || 'lanternMoss', 'foraging', nearest.xp || 18);
      return;

    case 'forage':
    case 'bitterroot':
    case 'moonpetal':
    case 'bloodmoss':
    case 'thornsilkVine':
    case 'spiritFern':
    case 'dawnsage':
    case 'redSealPoppy':
      harvest(game, nearest, nearest.itemId || nearest.kind, 'foraging', nearest.xp || 20);
      return;

    case 'reed':
    case 'riverReed':
      harvest(game, nearest, nearest.itemId || 'riverReed', 'foraging', nearest.xp || 10);
      return;

    case 'ore':
      harvest(game, nearest, nearest.itemId || 'ironOre', 'mining', nearest.xp || 18);
      return;

    case 'stone':
    case 'crystal':
    case 'deepstone':
      harvest(game, nearest, nearest.itemId || 'fieldstone', 'mining', nearest.xp || 18);
      return;

    case 'bone':
      harvest(game, nearest, nearest.itemId || 'boneShard', 'mining', nearest.xp || 14);
      return;

    case 'tree':
    case 'log':
    case 'deadwood':
    case 'rareTree':
      harvest(game, nearest, nearest.itemId || 'echorynSoftwood', 'woodcutting', nearest.xp || 16);
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

    case 'dungeonStairs':
      if (transitionDungeonFloor(game, nearest)) {
        playSfx('dungeon', { volume: 0.78, throttle: 0.15 });
        renderInteractionUI(game);
      }
      return;

    case 'dungeonKey':
      if (collectDungeonKey(game, nearest)) {
        playSfx('loot', { volume: 0.82, throttle: 0.08 });
        renderInteractionUI(game);
      }
      return;

    case 'dungeonDoor':
      if (unlockDungeonDoor(game, nearest)) {
        playSfx('quest', { volume: 0.65, throttle: 0.1 });
        renderInteractionUI(game);
      }
      return;

    case 'dungeonPuzzle':
      if (activateDungeonPuzzle(game, nearest)) {
        playSfx('shrine', { volume: 0.68, throttle: 0.1 });
        renderInteractionUI(game);
      }
      return;

    case 'dungeonEvent':
      if (triggerDungeonEvent(game, nearest)) {
        playSfx('bossWindup', { volume: 0.55, throttle: 0.12 });
        renderInteractionUI(game);
      }
      return;

    case 'dungeonChest':
      claimDungeonChest(game, nearest);
      renderInteractionUI(game);
      return;

    case 'sideZoneEntrance':
      enterSideZone(game, nearest);
      renderInteractionUI(game);
      return;

    case 'sideZoneExit':
      exitSideZone(game);
      renderInteractionUI(game);
      return;

    case 'towerEntrance':
      enterTower(game, 1, nearest);
      return;

    case 'towerStairs':
      updateTowerState(game.hostGame || game);
      if (nearest.locked) {
        game.log('The stairs are sealed until the floor is clear.');
        return;
      }
      enterTower(game, (game.world?.floor || game.player?.tower?.currentFloor || 1) + 1, {
        infiniteDungeonRegionId: game.world?.infiniteDungeonRegionId || game.world?.regionId
      });
      return;

    case 'towerExit':
      exitTower(game);
      return;

    case 'towerRewardChest':
      claimTowerReward(game, nearest);
      renderUI(game.player, game.logLines, game);
      return;

    case 'worldCache':
      if(nearest.locked&&nearest.encounterEvent){game.log('Defeat the nearby encounter guards to claim these supplies.');return;}
      claimWorldCache(game, nearest);
      renderUI(game.player, game.logLines, game);
      return;

    case 'poiInvestigation':
      inspectPoiEvidence(game, nearest);
      return;

    case 'capitalGate':
      enterCapitalHub(game,nearest);
      return;

    case 'travelRouteGate':
      playPoiThresholdEffect(game, nearest, 'travel');
      startTravelRoute(game, nearest.routeId);
      renderInteractionUI(game);
      return;

    case 'travelRouteExit':
      completeTravelRoute(game, nearest.routeId);
      renderInteractionUI(game);
      return;

    case 'travelRouteReturnGate':
      returnAlongRoute(game, nearest.routeId);
      renderInteractionUI(game);
      return;

    case 'capitalExit':
      if (game.world?.mode === 'maraHouse') {
        leaveMaraHouse(game);
        renderInteractionUI(game);
        return;
      }
    case 'blacksmithService':
    case 'alchemistService':
    case 'guildClerk':
    case 'bankService':
    case 'classTrainerService':
    case 'palaceGate':
    case 'arenaGate':
      useHubService(game, nearest);
      renderUI(game.player, game.logLines, game);
      return;

    case 'marketStall':
      marketStall(game, nearest);
      return;

    case 'noticeBoard':
      noticeBoard(game, nearest);
      return;

    case 'signpost':
      game.log(nearest.talk || `${nearest.name || 'Signpost'} points along the road.`);
      addStatusText(game.player, nearest.name || 'Signpost', { color: '#d9ad4f' });
      return;

    case 'gothicCastle':
    case 'castle':
    case 'castleVeyr':
      enterCastleVeyr(game, nearest);
      return;

    case 'demonCultLair':
    case 'cultLair':
    case 'demonLair':
      enterDemonCultLair(game, nearest);
      return;

    default:
      if (nearest.poiId) {
        const poi = getPoi(nearest.poiId);

        if (isCastleVeyrPoi(nearest)) {
          enterCastleVeyr(game, nearest);
          return;
        }

        recordPartyPoiDiscovery(game.player, nearest.poiId, poi?.name || nearest.name || nearest.poiId);
        game.log(poi?.description || `${nearest.name || 'This place'} is worth remembering.`);
        return;
      }

      game.log(`You do not know how to use ${nearest.name || 'this'}.`);
  }
}

export function nearestObject(game, range = INTERACTION_RANGE) {
  let best = null;
  let bestDistance = Infinity;
  let bestPriority = -Infinity;

  for (const object of game.world.objects || []) {
    if (!object || object.depleted) continue;
    if (object.interactable === false) continue;

    const d = Math.hypot(object.x - game.player.x, object.y - game.player.y);
    const priority = getInteractionPriority(object);

    if (
      objectInInteractionRange(game.player,object,range) &&
      (!game.world.orrakaiRevision || hasLineOfSight(game.world,game.player.x,game.player.y,object.x,object.y)) &&
      (d < bestDistance - 1 || (Math.abs(d - bestDistance) <= 8 && priority > bestPriority))
    ) {
      best = object;
      bestDistance = d;
      bestPriority = priority;
    }
  }

  return best;
}

function getInteractionPriority(object) {
  if (!object) return 0;
  if (object.kind === 'npc') return 80;
  if (object.kind === 'poiInvestigation') return 62;
  if (object.kind === 'dungeonKey' || object.kind === 'dungeonChest' || object.kind === 'dungeonDoor' || object.kind === 'dungeonPuzzle' || object.kind === 'dungeonEvent') return 60;
  if (object.kind === 'dungeonEntrance') return 55;
  if (object.kind === 'sideZoneEntrance' || object.kind === 'sideZoneExit' || object.kind === 'towerEntrance' || object.kind === 'towerStairs' || object.kind === 'towerExit' || object.kind === 'dungeonStairs') return 54;
  if (object.kind === 'capitalExit') return 52;
  if (object.kind === 'capitalGate' || object.kind === 'travelRouteGate' || object.kind === 'travelRouteExit' || object.kind === 'travelRouteReturnGate') return 50;
  if (['marketStall', 'blacksmithService', 'alchemistService', 'guildClerk', 'bankService', 'classTrainerService', 'arenaGate', 'noticeBoard'].includes(object.kind)) return 44;
  if (object.kind === 'signpost') return 28;
  if (object.poiId || object.decorative) return 25;
  return 35;
}

// -----------------------------------------------------------------------------
// NPC TALK / CLASS CHOICE
// -----------------------------------------------------------------------------

export function talk(game, npc) {
  const actor = game.player;
  const questPlayer = getQuestOwner(actor);
  const storyPlayer = questPlayer || actor;
  (game.hostGame || game).setUiOwner?.(actor);

  migratePlayer(actor);
  if (storyPlayer && storyPlayer !== actor) migratePlayer(storyPlayer);

  ensureActQuest(storyPlayer, 'act1');
  ensurePlayerDialogueAndQuestState(storyPlayer);
  ensurePlayerDialogueAndQuestState(actor);

  if (npc.instructorType === 'class') {
    if (npc.dialogueId || npc.npcId) {
      const opened = openDialogue(game.dialogue, npc, actor, game.world);

      if (opened) {
        renderUI(game.player, game.logLines, game);
        return;
      }
    }

    game.log(`${npc.name || 'Trainer'}: Class paths are chosen when a character is created. I can still teach, quest, and explain the road ahead.`);
    return;
  }

  if (npc.dialogueId || npc.npcId) {
    const opened = openDialogue(game.dialogue, npc, actor, game.world);

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

    safeShake(game, 5, 0.14);

    addQuestText(player, 'Quest Complete', {
      ttl: 1.5,
      size: 16
    });

    return;
  }

  game.log(stage.text);
}

export function talkSmith(game) {
  game.log('Mara the Smith: "Bring your gear, materials and coin to my forge in Orrakai."');

  addStatusText(game.player, 'Smith', {
    color: '#d9ad4f'
  });
}

export function unlockCapitalHub(game) {
  const player = game.player;
  player.discoveredLocations = player.discoveredLocations || {};
  player.discoveredLocations.orrakai = {
    id: 'orrakai',
    name: 'Orrakai',
    discoveredAt: Date.now()
  };
  player.discoveredLocations.capitalPrototype = {
    id: 'capitalPrototype',
    name: 'Orrakai',
    discoveredAt: Date.now()
  };

  player.capitalUnlocked = true;
  player.tower = player.tower || {};
  player.tower.unlocked = true;

  game.log('Orrakai is marked on your map. Its south gate returns to Act I roads; its north gate checks the Frontier Road expedition.');
  game.log('Orrakai services unlocked: market, bank, blacksmith, alchemist, notice board, shrine, training yard, and Infinite Tower access.');

  addQuestText(player, 'Orrakai Unlocked', {
    color: '#ffcc66',
    ttl: 1.4,
    size: 16
  });
}

export function marketStall(game, stall = null) {
  if (stall?.skillMerchant) { openMarketShop(game,stall); return; }
  useHubMarket(game);
}

export function noticeBoard(game, board = null) {
  if (board?.talk) {
    game.log(board.talk);
    game.log('Use the Frontier Road Gate itself to check the exact supplies still missing.');
    addStatusText(game.player, 'Expedition Requirements Posted', {
      color: '#d9ad4f'
    });
    return;
  }

  game.log('Notice Board: Orrakai services are inside town. Use the south gate for Act I roads and the north gate for the Frontier Road expedition.');
  game.log('Guild payouts: Veyr Warden proof, Blighted Elk bounty, Malakar kill proof, and Tower floor 10 milestone.');
  addStatusText(game.player, 'Notice Board Updated', {
    color: '#66f0ff'
  });
}

export function claimWorldCache(game, cache) {
  if(game?.player&&cache&&!prepareDiscoveryClaim(game,cache))return false;
  if (!game?.player || !cache || cache.claimed || cache.locked) return false;

  const rewards = Array.isArray(cache.rewards) && cache.rewards.length
    ? cache.rewards
    : generateWorldCacheRewards(game, cache);

  cache.claimed = true;
  // A recovered journal stays interactable for rereading; the claim ledger and
  // claimed flag still prevent any second inventory payout.
  cache.depleted = !(cache.discoveryId&&cache.discoveryJournal);
  const tunedCacheRewards=filterChestEquipment(rewards,cache);
  const rareGear=rollRegionalMythical(cache,game.world,Math.random,'cache');if(rareGear)tunedCacheRewards.push([rareGear.item,1]);
  recordPoiCacheClaim(getQuestOwner(game.player) || game.player, cache);

  for (const reward of tunedCacheRewards) {
    const itemId = Array.isArray(reward) ? reward[0] : reward?.itemId;
    const qty = Math.max(1, Number(Array.isArray(reward) ? reward[1] : reward?.qty || 1));
    if (!itemId) continue;

    addItem(game.player, itemId, qty);
    announceLootDiscovery(game.player,itemId,game.world,game.log);
    markPartyCollectObjective(game.player, itemId, qty);
    addLootText(game.player, `${ITEMS[itemId]?.name || itemId} x${qty}`, {
      color: cache.color || '#ffcc66',
      ttl: 1.15
    });
  }

  const skill = cache.skill || 'renown';
  const xp = Math.max(0, Number(cache.xp ?? 18));
  if (xp > 0) {
    gainXp(game.player, skill, xp, game.log);
  }

  if (cache.cursed) {
    triggerCacheAmbush(game, cache);
  }

  game.log(cache.message || `${cache.name || 'Cache'} opened.`);
  rememberDiscoveryClaim(game,cache);
  playSfx('chest', { volume: 0.9, throttle: 0.08 });
  return true;
}

function claimDungeonChest(game, chest) {
  if (!game?.player || !chest) return false;

  if (chest.claimed || chest.depleted) {
    game.log(`${chest.name || 'Chest'} is already open.`);
    return false;
  }

  const dungeonState = game.world?.dungeonState || null;
  if (chest.locked) {
    if (chest.chestType === 'boss') {
      game.log('The boss chest is sealed until the dungeon boss falls.');
      addStatusText(game.player, 'Sealed', { color: '#b68cff' });
      return false;
    }

    if (chest.requiredKeyId && !dungeonState?.collectedKeys?.[chest.requiredKeyId]) {
      game.log(`Requires ${chest.keyName || 'a dungeon key'}.`);
      addStatusText(game.player, 'Key Required', { color: '#9facbf' });
      return false;
    }

    chest.locked = false;
  }

  const rewards = Array.isArray(chest.rewards) && chest.rewards.length
    ? chest.rewards
    : generateDungeonChestFallbackRewards(game, chest);

  chest.claimed = true;
  chest.depleted = true;
  const tunedRewards=filterChestEquipment(rewards,chest);
  const mythical=rollRegionalMythical(chest,game.world,Math.random,'chest');if(mythical)tunedRewards.push([mythical.item,1]);

  if (dungeonState) {
    dungeonState.openedChests = dungeonState.openedChests || {};
    dungeonState.openedChests[chest.id] = true;
  }

  for (const reward of tunedRewards) {
    const itemId = Array.isArray(reward) ? reward[0] : reward?.itemId;
    const qty = Math.max(1, Number(Array.isArray(reward) ? reward[1] : reward?.qty || 1));
    if (!itemId || !ITEMS[itemId]) continue;

    addItem(game.player, itemId, qty);
    markPartyCollectObjective(game.player, itemId, qty);
    addLootText(game.player, `${ITEMS[itemId]?.name || itemId} x${qty}`, {
      color: chest.chestType === 'boss' ? '#ffcc66' : chest.chestType === 'locked' ? '#b68cff' : '#d9ad4f',
      ttl: 1.1
    });
  }

  const xp = Math.max(0, Number(chest.xp || (chest.chestType === 'boss' ? 90 : 24)));
  if (xp > 0) {
    gainXp(game.player, 'renown', xp, game.log);
  }

  game.log(`${chest.name || 'Dungeon Chest'} opened.`);
  playSfx('chest', { volume: chest.chestType === 'boss' ? 1 : 0.86, throttle: 0.08 });
  return true;
}

function generateWorldCacheRewards(game, cache) {
  const text = `${cache?.id || ''} ${cache?.name || ''} ${cache?.poiId || ''} ${game?.world?.poiId || ''} ${game?.world?.name || ''}`.toLowerCase();
  const rewards = [];

  pushRewardEntry(rewards, 'ashCoin', cache?.rare ? 22 : 14);
  pushRewardEntry(rewards, 'ironScrap', cache?.rare ? 3 : 2);

  if (/thorn|briar|grove|forest/.test(text)) {
    pushRewardEntry(rewards, 'briarRoot', 2);
    pushChanceRewardEntry(rewards, 0.35, 'livingBark', 1);
    pushChanceRewardEntry(rewards, 0.18, 'thornCharm', 1);
  } else if (/veyr|castle|noble|watcher/.test(text)) {
    pushRewardEntry(rewards, 'veyrSigil', 1);
    pushChanceRewardEntry(rewards, 0.35, 'veyrglassShard', 1);
    pushChanceRewardEntry(rewards, 0.16, 'veyrSilkMantle', 1);
  } else if (/seal|demon|cult|red/.test(text)) {
    pushRewardEntry(rewards, 'cultAsh', 2);
    pushChanceRewardEntry(rewards, 0.34, 'redSealFragment', 1);
    pushChanceRewardEntry(rewards, 0.14, 'redGlassIchor', 1);
  } else if (/river|water|marsh|tide/.test(text)) {
    pushRewardEntry(rewards, 'riverReed', 3);
    pushChanceRewardEntry(rewards, 0.32, 'waterglassDrop', 1);
    pushChanceRewardEntry(rewards, 0.12, 'waterSaintCharm', 1);
  } else if (/chapel|holy|light|dawn|reliquary/.test(text)) {
    pushRewardEntry(rewards, 'lanternMoss', 2);
    pushChanceRewardEntry(rewards, 0.32, 'radiantSplinter', 1);
    pushChanceRewardEntry(rewards, 0.12, 'dawncarverLens', 1);
  } else {
    pushRewardEntry(rewards, 'boneShard', 2);
    pushChanceRewardEntry(rewards, 0.28, 'gravecap', 1);
    pushChanceRewardEntry(rewards, 0.14, 'patchedRoadLeathers', 1);
  }

  if (cache?.cursed) {
    pushRewardEntry(rewards, 'shadowResidue', 1);
    pushChanceRewardEntry(rewards, 0.25, 'paleRune', 1);
  }

  return rewards;
}

function generateDungeonChestFallbackRewards(game, chest) {
  const type = chest?.chestType || 'normal';
  const text = `${chest?.id || ''} ${chest?.name || ''} ${game?.world?.dungeonId || ''} ${game?.world?.poiId || ''} ${game?.world?.theme || ''}`.toLowerCase();
  const rewards = [];
  const profile = getFallbackRewardProfile(text);

  if (type === 'boss') {
    pushRewardEntry(rewards, 'bossCore', 1);
    pushRewardEntry(rewards, 'ashCoin', 36);
    pushRewardEntry(rewards, 'dungeonRelicShard', 2);
    pushRewardEntry(rewards, profile.rareMaterial, 2);
    pushRewardEntry(rewards, profile.bossGear, 1);
    pushChanceRewardEntry(rewards, 0.32, profile.legendaryGear, 1);
  } else if (type === 'locked') {
    pushRewardEntry(rewards, 'ashCoin', 24);
    pushRewardEntry(rewards, profile.rareMaterial, 2);
    pushRewardEntry(rewards, 'dungeonRelicShard', 1);
    pushRewardEntry(rewards, profile.lockedGear, 1);
    pushChanceRewardEntry(rewards, 0.28, profile.rareGear, 1);
  } else if (type === 'side') {
    pushRewardEntry(rewards, 'ashCoin', 18);
    pushRewardEntry(rewards, profile.commonMaterial, 3);
    pushRewardEntry(rewards, profile.rareMaterial, 1);
    pushChanceRewardEntry(rewards, 0.24, profile.commonGear, 1);
  } else {
    pushRewardEntry(rewards, 'ashCoin', 12);
    pushRewardEntry(rewards, 'ironScrap', 2);
    pushRewardEntry(rewards, profile.commonMaterial, 2);
    pushChanceRewardEntry(rewards, 0.2, profile.commonGear, 1);
  }

  return rewards;
}

function getFallbackRewardProfile(text) {
  if (/veyr|castle|noble/.test(text)) {
    return {
      commonMaterial: 'boneShard',
      rareMaterial: 'veyrglassShard',
      commonGear: 'graveclothGreaves',
      rareGear: 'veyrSilkMantle',
      lockedGear: 'veyrCourtCoat',
      bossGear: 'veyrGraveLens',
      legendaryGear: 'veyrglassBlade'
    };
  }

  if (/seal|demon|cult|red/.test(text)) {
    return {
      commonMaterial: 'cultAsh',
      rareMaterial: 'redSealFragment',
      commonGear: 'cultistMantle',
      rareGear: 'redSealRing',
      lockedGear: 'sealglassPrism',
      bossGear: 'redSealConductor',
      legendaryGear: 'demonseedScythe'
    };
  }

  if (/thorn|briar|root|grove|forest/.test(text)) {
    return {
      commonMaterial: 'gravecap',
      rareMaterial: 'briarRoot',
      commonGear: 'thornCharm',
      rareGear: 'thornhookStaff',
      lockedGear: 'thornCharm',
      bossGear: 'heartrootStaff',
      legendaryGear: 'blackbriarCrown'
    };
  }

  if (/holy|light|dawn|chapel|reliquary/.test(text)) {
    return {
      commonMaterial: 'paleEssence',
      rareMaterial: 'radiantSplinter',
      commonGear: 'pilgrimsFocus',
      rareGear: 'dawncarverLens',
      lockedGear: 'sealglassPrism',
      bossGear: 'sunfractureGauntlet',
      legendaryGear: 'everdawnCarver'
    };
  }

  return {
    commonMaterial: 'boneShard',
    rareMaterial: 'paleEssence',
    commonGear: 'patchedRoadLeathers',
    rareGear: 'graveScythe',
    lockedGear: 'moonlitReliquary',
    bossGear: 'moonlitReliquary',
    legendaryGear: 'orrakaiFoundersSignet'
  };
}

function pushRewardEntry(rewards, itemId, qty = 1) {
  const item = ITEMS[itemId];
  if (!item) return;

  const safeQty = Math.max(1, Math.floor(Number(qty || 1)));

  if (item.stack) {
    const existing = rewards.find(reward => {
      const existingId = Array.isArray(reward) ? reward[0] : reward?.itemId;
      return existingId === itemId;
    });

    if (existing) {
      if (Array.isArray(existing)) {
        existing[1] = Math.max(1, Number(existing[1] || 1)) + safeQty;
      } else {
        existing.qty = Math.max(1, Number(existing.qty || 1)) + safeQty;
      }
      return;
    }
  }

  rewards.push([itemId, safeQty]);
}

function pushChanceRewardEntry(rewards, chance, itemId, qty = 1) {
  if (Math.random() <= Math.max(0, Math.min(1, Number(chance || 0)))) {
    pushRewardEntry(rewards, itemId, qty);
  }
}

function inspectPoiEvidence(game, evidence) {
  if (!game?.player || !evidence) return;

  const player = game.player;
  const poiId = evidence.poiId || 'world';
  const clueId = evidence.clueId || evidence.id;
  const owner = getQuestOwner(player);
  const result = recordPoiClue(player, poiId, clueId, {
    name: evidence.name,
    category: evidence.clueCategory || 'physical'
  });

  if (owner && owner !== player) {
    recordPoiClue(owner, poiId, clueId, {
      name: evidence.name,
      category: evidence.clueCategory || 'physical'
    });
  }

  evidence.inspected = true;
  if (evidence.poiId) {
    recordPartyPoiDiscovery(player, evidence.poiId, evidence.name || evidence.poiId);
  }

  if (evidence.startsQuest) startQuest(player, evidence.startsQuest);
  if (result.added) {
    if (Array.isArray(evidence.storyFlags)) {
      applyStoryFlags(player, evidence.storyFlags);
      if (owner && owner !== player) applyStoryFlags(owner, evidence.storyFlags);
    }
    markPartyPoiInvestigationObjective(player, poiId, clueId);
    grantEvidenceRewards(game, evidence);
    emitEvidenceCompanionReaction(game, evidence, result.state);
    if (evidence.questItemName) {
      addLootText(player, `Quest Item Acquired: ${evidence.questItemName}`, {
        color: evidence.color || '#f6df88', ttl: 1.8
      });
    }
  }

  const insight = (evidence.identityInsights || []).find(entry => poiContentConditionsMatch(entry, player));
  const message = result.added
    ? `${evidence.message || `${evidence.name || 'The evidence'} reveals another piece of the truth.`}${insight?.message ? ` ${insight.message}` : ''}`
    : (evidence.reviewMessage || `You have already recorded what ${evidence.name || 'this evidence'} can prove.`);

  game.log(message);
  addStatusText(player, result.added ? (evidence.name || 'Investigation Updated') : 'Evidence Reviewed', {
    color: evidence.color || '#d9ad4f',
    ttl: 1.1
  });
  playSfx('quest', { volume: 0.68, throttle: 0.12 });
}

function grantEvidenceRewards(game, evidence) {
  for (const reward of evidence.discoveryRewards?.items || []) {
    const [itemId, amount = 1] = Array.isArray(reward) ? reward : [reward.itemId, reward.qty || 1];
    if (!itemId) continue;
    addItem(game.player, itemId, amount);
    markPartyCollectObjective(game.player, itemId, amount);
    addLootText(game.player, `${ITEMS[itemId]?.name || itemId} x${amount}`, {
      color: evidence.color || '#d9ad4f'
    });
  }

  for (const [skillId, amount] of Object.entries(evidence.discoveryRewards?.xp || {})) {
    gainXp(game.player, skillId, Number(amount || 0), game.log);
  }
}

function emitEvidenceCompanionReaction(game, evidence, poiState) {
  const reactions = evidence.companionReactions || {};
  const aliases = { mara: 'mara', bram: 'bram', dusk: 'dusk', elian: 'elian' };
  poiState.reactions = poiState.reactions || {};

  for (const [id, text] of Object.entries(reactions)) {
    const companion = game.player.companions?.[aliases[id] || id];
    const reactionId = `${evidence.clueId || evidence.id}:${id}`;
    if (!companion?.introduced || poiState.reactions[reactionId]) continue;
    poiState.reactions[reactionId] = true;
    game.log(text);
  }
}

function triggerCacheAmbush(game, cache) {
  const world = game?.world;
  if (!world || cache.ambushTriggered) return;

  cache.ambushTriggered = true;
  world.enemies = world.enemies || [];

  const tier = Math.max(1, Number(cache.ambushTier || 2));
  const kinds = cache.ambushKinds || ['cultist', 'stalkerWolf', 'exploder'];
  const playerCount = getCoopEnemyScalingPlayerCount(game.player);
  const spawnCount = getScaledEnemyCount(kinds.length, playerCount, {
    cap: 8
  });

  for (let index = 0; index < spawnCount; index++) {
    const angle = index / spawnCount * Math.PI * 2;
    const x = cache.x + Math.cos(angle) * 86;
    const y = cache.y + Math.sin(angle) * 86;
    world.enemies.push(createEnemyArchetype(kinds[index % kinds.length], null, x / 32, y / 32, {
      tier,
      awakened: true,
      alerted: true,
      aggro: 3.5
    }));
  }

  addStatusText(game.player, 'Cursed Cache: Ambush', {
    color: '#ef6f6c',
    ttl: 1.2,
    size: 14
  });
  game.log('The cache was bait. Corrupted hunters close in.');
}

export function chooseClass(game, classId) {
  const player = game.player;

  migratePlayer(player);
  classId = normalizeClassId(classId);

  if(!isClassAvailable(classId)){game.log('That class is currently unavailable.');return false;}

  if (player.classId) {
    game.log(`${player.name || 'This character'} already follows the path of the ${player.className}.`);
    return;
  }

  const classNames = {
    classless: 'Classless',
    oathkeeper: 'Oathkeeper',
    fellhunter: 'Fellhunter',
    gravecaller: 'Gravecaller',
    thornbinder: 'Thornbinder',
    waverider: 'Waverider',
    lightbringer: 'Lightbringer',
    eldritch: 'Eldritch'
  };

  const classSkills = {
    classless: null,
    oathkeeper: 'blade',
    fellhunter: 'archery',
    gravecaller: 'spirit',
    thornbinder: 'warding',
    waverider: 'warding',
    lightbringer: 'spirit',
    eldritch: 'spirit'
  };

  const chosenName = classNames[classId];
  const chosenSkill = classSkills[classId];

  if (!chosenName || (!chosenSkill && classId !== 'classless')) {
    game.log('That instructor cannot train you yet.');
    return;
  }

  player.classId = classId;
  player.className = chosenName;
  player.classSkill = chosenSkill;
  player.classXpMultiplier = classId === 'classless' ? 1 : 1.5;
  player.skillTree = normalizeSkillTreeState(player) || {
    version: 2,
    spent: {}
  };
  if (classId === 'classless') {
    delete player.skillTree.lockedClassId;
    delete player.skillTree.lockedTree;
  } else {
    player.skillTree.lockedClassId = classId;
    player.skillTree.lockedTree = CLASS_SKILL_TREE_LOCKS[classId] || chosenSkill;
  }

  player.loadout = player.loadout || {};
  if (chosenSkill) {
    player.loadout.primarySkill = chosenSkill;
  }
  player.loadout.abilitySlots = player.loadout.abilitySlots || [null, null, null, null];

  while (player.loadout.abilitySlots.length < HOTBAR_SLOT_COUNT) {
    player.loadout.abilitySlots.push(null);
  }

  player.unlockedAbilities = player.unlockedAbilities || [];

  if (classId === 'gravecaller' || classId === 'oathkeeper' || classId === 'thornbinder' || classId === 'waverider' || classId === 'lightbringer' || classId === 'eldritch') {
    player.spiritAwakened = true;
  }

  const qAbility = CLASS_Q_ABILITIES[classId];

  if (qAbility) {
    player.loadout.abilitySlots = [null, null, null, null];
    unlockActiveAbility(player, qAbility, { autoAssignEmpty: false });
    assignAbilityToSlot(player, 0, qAbility);

    // Gravecallers are summoners from the moment the class is chosen. The
    // Commander expands this rite; Lichbound later unlocks Summon Lich separately.
    if (classId === 'gravecaller') {
      unlockActiveAbility(player, 'summonLich', { autoAssignEmpty: false });
      assignAbilityToSlot(player, 1, 'summonLich');
    }
  } else if (classId === 'classless') {
    player.loadout.abilitySlots = [null, null, null, null];
  }

  if (classId === 'gravecaller' || classId === 'oathkeeper' || classId === 'thornbinder' || classId === 'waverider' || classId === 'lightbringer' || classId === 'eldritch') {
    const startingSpirit = classId === 'eldritch'
      ? 44
      : classId === 'waverider'
        ? 40
        : classId === 'lightbringer'
          ? 42
          : classId === 'oathkeeper'
            ? 38
            : classId === 'thornbinder'
              ? 36
              : 35;
    player.maxSpirit = Math.max(player.maxSpirit || 0, startingSpirit);
    player.spirit = Math.max(player.spirit || 0, startingSpirit);
  }

  const grantedGear = grantClassStarterGear(game, classId);

  migratePlayer(player);
  applyClassStoryChoice(player, classId, game.log);
  refreshClassAbilityUnlocks(game);

  if (classId === 'classless') {
    game.log(`${player.name || 'You'} chose to remain Classless.`);
    game.log('No class abilities, class tree, class passive, special resource, or XP bonus were granted.');
  } else {
    game.log(`${player.name || 'You'} chose the path of the ${chosenName}.`);
    game.log(`${skillLabel(chosenSkill)} XP is now boosted by 50%.`);
  }

  if (qAbility) {
    game.log(`${abilityName(qAbility)} unlocked.`);
  }

  if (classId === 'gravecaller') {
    game.log('Raise the Bound Dead unlocked. It raises one skeletal henchman. Mastery unlocks specter and lesser knight forms; Commander of the Dead raises three.');
  }

  if (grantedGear.length) {
    game.log(`Class weapon equipped: ${grantedGear.join(', ')}.`);
  }

  safeShake(game, 6, 0.18);
  playSfx('quest', { volume: 0.9, throttle: 0.08 });

  addQuestText(player, `${chosenName} Chosen`, {
    ttl: 1.5,
    size: 16,
    color: getClassColor(classId)
  });

  if (grantedGear.length) {
    addLootText(player, 'Class Weapon Equipped', {
      ttl: 1.1,
      color: getClassColor(classId),
      offsetY: -88
    });
  }

  renderUI(game.player, game.logLines, game);

  if (typeof game.renderPauseMenu === 'function') {
    game.renderPauseMenu();
  }
}

export function refreshClassAbilityUnlocks(game) {
  const player = game.player;

  migratePlayer(player);

  if (!player.classId || !player.classSkill) {
    if (player.classId === 'classless') {
      player.loadout = player.loadout || {};
      player.loadout.abilitySlots = [null, null, null, null];
    }
    return;
  }

  const qAbility = CLASS_Q_ABILITIES[player.classId];

  player.unlockedAbilities = player.unlockedAbilities || [];
  player.loadout = player.loadout || {};
  player.loadout.abilitySlots = player.loadout.abilitySlots || [null, null, null, null];

  while (player.loadout.abilitySlots.length < HOTBAR_SLOT_COUNT) {
    player.loadout.abilitySlots.push(null);
  }

  if (qAbility && !player.unlockedAbilities.includes(qAbility)) {
    unlockActiveAbility(player, qAbility, { autoAssignEmpty: false });
  }

  if (qAbility && !player.loadout.abilitySlots.includes(qAbility) && !player.loadout.abilitySlots.some(Boolean)) {
    assignAbilityToSlot(player, 0, qAbility);
  }

  if (player.classId === 'gravecaller') {
    const summonAbility = 'summonLich';
    if (!player.unlockedAbilities.includes(summonAbility)) {
      unlockActiveAbility(player, summonAbility, { autoAssignEmpty: false });
    }

    if (!player.loadout.abilitySlots.includes(summonAbility)) {
      const preferredSlot = !player.loadout.abilitySlots[1]
        ? 1
        : player.loadout.abilitySlots.findIndex(slot => !slot);
      if (preferredSlot >= 0) assignAbilityToSlot(player, preferredSlot, summonAbility);
    }
  }
}

function grantOathkeeperStarterLoadout(player, { assignDefaults = false } = {}) {
  const starterAbilities = [
    'oathkeeperOathStrike'
  ];

  player.oathkeeper = player.oathkeeper && typeof player.oathkeeper === 'object'
    ? player.oathkeeper
    : {};

  starterAbilities.forEach((abilityId, index) => {
    unlockActiveAbility(player, abilityId, { autoAssignEmpty: false });
    if (assignDefaults || !player.loadout.abilitySlots[index]) {
      assignAbilityToSlot(player, index, abilityId);
    }
  });
}

function grantThornbinderStarterLoadout(player, { assignDefaults = false } = {}) {
  const starterAbilities = [
    'thornbinderThornLash'
  ];

  player.thornbinder = player.thornbinder && typeof player.thornbinder === 'object'
    ? player.thornbinder
    : {};

  for (const abilityId of starterAbilities) {
    unlockActiveAbility(player, abilityId, { autoAssignEmpty: assignDefaults });
  }

  if (assignDefaults) {
    player.loadout = player.loadout || {};
    player.loadout.abilitySlots = [starterAbilities[0] || null, null, null, null];
  }
}

function grantLightbringerStarterLoadout(player, { assignDefaults = false } = {}) {
  const starterAbilities = [
    'lightbringerGleamBolt'
  ];

  player.lightbringer = player.lightbringer && typeof player.lightbringer === 'object'
    ? player.lightbringer
    : {};
  const rawLumens = Number(player.lightbringer.lumens || 0);
  const rawProgress = Number(player.lightbringer.lumenProgress || 0);
  player.lightbringer.maxLumens = 3;
  player.lightbringer.lumens = Math.max(0, Math.min(3, Math.floor(Number.isFinite(rawLumens) ? rawLumens : 0)));
  player.lightbringer.lumenProgress = Math.max(0, Math.min(2.999, Number.isFinite(rawProgress) ? rawProgress : 0));

  starterAbilities.forEach((abilityId, index) => {
    unlockActiveAbility(player, abilityId, { autoAssignEmpty: false });
    if (assignDefaults || !player.loadout.abilitySlots[index]) {
      assignAbilityToSlot(player, index, abilityId);
    }
  });
}

function grantFellhunterStarterLoadout(player, { assignDefaults = false } = {}) {
  const starterAbilities = [
    'fellhunterThrowingDaggers'
  ];

  player.fellhunter = player.fellhunter && typeof player.fellhunter === 'object'
    ? player.fellhunter
    : {};

  for (const abilityId of starterAbilities) {
    unlockActiveAbility(player, abilityId, { autoAssignEmpty: assignDefaults });
  }

  if (assignDefaults) {
    player.loadout = player.loadout || {};
    player.loadout.abilitySlots = [starterAbilities[0] || null, null, null, null];
  }
}

export function grantClassStarterGear(game, classId) {
  const player = game.player;
  classId = normalizeClassId(classId);
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

    const equipSlot = item.slot || slot;
    if (!['weapon', 'helm', 'chest', 'legs', 'trinket', 'armour', 'armor', 'charm'].includes(equipSlot)) {
      continue;
    }

    addItem(player, itemId, 1);

    player.equipment = player.equipment || {};
    player.equipment[equipSlot === 'armor' ? 'armour' : equipSlot] = itemId;

    equipped.push(item.name || itemId);
  }

  return equipped;
}

// -----------------------------------------------------------------------------
// HARVESTING / GATHERING
// -----------------------------------------------------------------------------

export function harvest(game, object, itemId, skillId, xp) {
  if(!object||object.depleted)return;
  const item = ITEMS[itemId];

  if (!item) {
    game.log(`Missing item definition: ${itemId}`);
    return;
  }

  const skillLevel = getSkillLevel(game.player.skillState, skillId);
  const access = getHarvestAccess(game.player, object, skillId, skillLevel);
  if (!access.ok) {
    game.log(access.reason);
    addStatusText(game.player, access.status || 'Tool Required', {
      color: '#d9ad4f',
      ttl: 1.05
    });
    return;
  }

  const harvestResult = getHarvestResult(itemId, skillId, skillLevel, game.player);
  harvestResult.bonusItems=localizeHarvestBonuses(game.world,object,skillId,harvestResult.bonusItems);
  harvestResult.bonusItems.push(...regionalHarvest(game.world, object, skillId));
  const totalXp = Math.ceil((xp || 0) * harvestResult.xpMultiplier);

  addItem(game.player, itemId, harvestResult.qty);
  markPartyCollectObjective(game.player, itemId, harvestResult.qty);
  gainXp(game.player, skillId, totalXp, game.log);
  const newSkillLevel = getSkillLevel(game.player.skillState, skillId);
  addStatusText(game.player, `${skillLabel(skillId)} +${totalXp} XP`, {
    color: skillId === 'runecraft' ? '#b68cff' : '#ffcc66',
    ttl: 0.9
  });
  if (newSkillLevel > skillLevel) {
    addQuestText(game.player, `${skillLabel(skillId)} Level ${newSkillLevel}`, {
      color: '#ffcc66',
      ttl: 1.35,
      size: 15
    });
  }

  for (const bonus of harvestResult.bonusItems) {
    if (!ITEMS[bonus.id]) continue;
    addItem(game.player, bonus.id, bonus.qty);
    markPartyCollectObjective(game.player, bonus.id, bonus.qty);
  }

  object.depleted = true;
  object.respawn = Math.max(300, (object.respawnTime || 420) * harvestResult.respawnMultiplier);
  rememberHarvest(game, object);
  if(object.discoveryId)announceLootDiscovery(game.player,itemId,game.world,game.log);
  addWorldSkillEffect(game, getWorldSkillEffectKind(skillId), game.player, object, {
    color: getItemFloatingColor(itemId),
    text: item.name,
    ttl: skillId === 'mining' ? 0.72 : 0.55
  });

  const bonusText = harvestResult.bonusItems.length
    ? ` Bonus: ${harvestResult.bonusItems.map(b => `${ITEMS[b.id]?.name || b.id} x${b.qty}`).join(', ')}.`
    : '';

  const toolText = harvestResult.toolLabel
    ? ` (${harvestResult.toolLabel} +${harvestResult.toolYieldBonus} yield)`
    : harvestResult.toolHint
      ? ` (${harvestResult.toolHint})`
      : '';
  game.log(`Obtained ${item.name} x${harvestResult.qty}${toolText}.${bonusText}`);
  playSfx(skillId === 'mining' ? 'mining' : skillId === 'fishing' ? 'fish' : 'harvest', {
    volume: harvestResult.bonusItems.length ? 0.95 : 0.75,
    throttle: 0.08
  });

  addLootText(game.player, harvestResult.qty > 1 ? `${item.name} x${harvestResult.qty}` : item.name, {
    color: getItemFloatingColor(itemId)
  });

  for (const bonus of harvestResult.bonusItems) {
    addLootText(game.player, ITEMS[bonus.id]?.name || bonus.id, {
      color: getItemFloatingColor(bonus.id),
      offsetY: -64
    });
  }
}

export function fish(game, object) {
  startFishingMiniGame(game, object);
}

function getHarvestResult(itemId, skillId, skillLevel, player = null) {
  const level = Math.max(1, Number(skillLevel || 1));
  const tool = getHarvestToolBonus(player, skillId);
  const baseQty =
    level >= 10 && Math.random() < 0.28 ? 3 :
    level >= 5 && Math.random() < 0.38 ? 2 :
    1;
  const qty = baseQty + tool.yieldBonus + (tool.hasTool && level >= 12 && Math.random() < 0.18 ? 1 : 0);

  const bonusItems = [];

  if (skillId === 'mining' && Math.random() < Math.min(0.55, 0.04 + level * 0.005 + tool.rareChanceBonus)) {
    bonusItems.push({ id: level >= 5 && Math.random() < 0.35 ? 'blackironOre' : 'ironScrap', qty: level >= 10 ? 2 : 1 });
  }

  if (skillId === 'mining' && tool.hasTool && level >= 6 && Math.random() < Math.min(0.28, 0.04 + level * 0.004 + tool.rareChanceBonus)) {
    const pool = ['arcaneDust', 'tideglassCrystal', 'lumenQuartz', 'thornstone'];
    bonusItems.push({ id: pool[Math.floor(Math.random() * pool.length)] || 'arcaneDust', qty: 1 });
  }

  if (skillId === 'mining' && tool.tier >= 3 && level >= 10 && Math.random() < Math.min(0.18, 0.035 + level * 0.003)) {
    bonusItems.push({ id: Math.random() < 0.5 ? 'deepstone' : 'hollowGem', qty: 1 });
  }

  if (skillId === 'foraging' && Math.random() < Math.min(0.42, 0.025 + level * 0.004 + tool.rareChanceBonus * 0.7)) {
    const pool = itemId === 'gravecap' && level >= 5
      ? ['paleEssence', 'spiritFern', 'moonpetal']
      : ['orrakaiMint', 'echorynGreenleaf', 'bitterroot', 'fieldRations'];
    bonusItems.push({ id: pool[Math.floor(Math.random() * pool.length)] || 'fieldRations', qty: 1 });
  }

  if (skillId === 'foraging' && tool.hasTool && level >= 8 && Math.random() < Math.min(0.24, 0.025 + level * 0.002)) {
    const rarePool = ['briarRoot', 'bloodmoss', 'thornsilkVine', 'ashrose', 'dawnsage'];
    bonusItems.push({ id: rarePool[Math.floor(Math.random() * rarePool.length)] || 'briarRoot', qty: 1 });
  }

  if (skillId === 'woodcutting' && Math.random() < Math.min(0.5, 0.05 + level * 0.006 + tool.rareChanceBonus)) {
    bonusItems.push({ id: Math.random() < 0.55 ? 'amberResin' : 'sturdyHardwood', qty: level >= 10 ? 2 : 1 });
  }

  if (skillId === 'woodcutting' && tool.hasTool && level >= 6 && Math.random() < Math.min(0.32, 0.035 + level * 0.004 + tool.rareChanceBonus)) {
    const pool = ['ashwoodLog', 'thornwoodBranch', 'ironwoodCore', 'spiritwoodSplinter'];
    bonusItems.push({ id: pool[Math.floor(Math.random() * pool.length)] || 'ashwoodLog', qty: 1 });
  }

  if (skillId === 'woodcutting' && tool.tier >= 3 && level >= 10 && Math.random() < Math.min(0.16, 0.025 + level * 0.002)) {
    bonusItems.push({ id: Math.random() < 0.55 ? 'briarheartTimber' : 'blackSap', qty: 1 });
  }

  if (skillId === 'runecraft' && level >= 18 && Math.random() < Math.min(0.35, 0.08 + level * 0.004 + tool.rareChanceBonus)) {
    bonusItems.push({ id: 'arcaneDust', qty: 1 });
  }

  if (skillId === 'fishing' && level >= 25 && itemId === 'riverfish' && Math.random() < 0.18) {
    bonusItems.push({ id: 'silverfin', qty: 1 });
  }

  return {
    qty,
    bonusItems,
    toolLabel: tool.label,
    toolYieldBonus: tool.yieldBonus,
    toolHint: !tool.hasTool && SURVIVAL_TOOLS[skillId] ? `${SURVIVAL_TOOLS[skillId].name} would improve this` : '',
    xpMultiplier: (1 + Math.min(0.45, level * 0.006)) * tool.xpMultiplier,
    respawnMultiplier: Math.max(0.55, (1 - Math.min(0.25, level * 0.003)) * tool.respawnMultiplier)
  };
}

function getWorldSkillEffectKind(skillId) {
  if (skillId === 'mining') return 'miningStrike';
  if (skillId === 'fishing') return 'fishingSplash';
  if (skillId === 'runecraft') return 'runecraftGather';
  if (skillId === 'woodcutting') return 'woodcuttingChop';
  return 'forageSweep';
}

function getHarvestAccess(player, object, skillId, skillLevel) {
  const requiredLevel = Math.max(1, Number(object?.requiredLevel || 1));
  if (skillLevel < requiredLevel) {
    return {
      ok: false,
      reason: `${skillLabel(skillId)} level ${requiredLevel} required.`,
      status: `Requires Level ${requiredLevel}`
    };
  }

  const requiredToolTier = Math.max(0, Number(object?.requiredToolTier || 0));
  if (requiredToolTier > 0) {
    const tool = getHarvestToolBonus(player, skillId);
    if (Number(tool.tier || 0) < requiredToolTier) {
      return {
        ok: false,
        reason: `${object.name || 'That node'} requires a better ${skillLabel(skillId)} tool.`,
        status: 'Better Tool Required'
      };
    }
  }

  return { ok: true };
}

// -----------------------------------------------------------------------------
// CAMPFIRES / SHRINES
// -----------------------------------------------------------------------------

export function campfire(game, object = null) {
  const player = game.player;
  const beforeHp = Number(player.hp || 0);
  const beforeStamina = Number(player.stamina || 0);

  player.hp = Math.min(player.maxHp, player.hp + 35);
  player.stamina = Math.min(player.maxStamina, player.stamina + 45);

  if (player.spiritAwakened) {
    player.spirit = Math.min(player.maxSpirit, player.spirit + 20);
  }

  player.flags = player.flags || {};
  player.flags.campPreparedUntil = Date.now() + 10 * 60 * 1000;

  const campRecipeIds = CAMPFIRE_RECIPES;
  const recipeId = campRecipeIds.find(id => getRecipeCraftStatus(player, id).ok);
  const cooked = recipeId ? craftRecipe(player, recipeId, game, { source: 'campfire',station:object||(game.world.objects||[]).find(o=>o.kind==='campfire'&&objectInInteractionRange(player,o)) }) : false;
  player.lastSafeLocation = {
    worldMode: game.world?.mode || 'overworld',
    worldName: normalizePlayerFacingWorldName(game.world?.name || player.currentZone, ACT1_OVERWORLD_DISPLAY_NAME),
    regionId: game.world?.regionId || null,
    x: Number(player.x || object?.x || 11 * 32),
    y: Number(player.y || object?.y || 27 * 32),
    recordedAt: Date.now(),
    reason: 'campfire'
  };

  const restoredHp = Math.max(0, Math.round(player.hp - beforeHp));
  const restoredStamina = Math.max(0, Math.round(player.stamina - beforeStamina));
  game.log(`You rest by the campfire. Restored ${restoredHp} HP and ${restoredStamina} stamina. Camp preparation improves stamina recovery for 10 minutes.`);

  if (!cooked) {
    game.log('Campfire: bring raw fish, riverfish and reeds, or stew ingredients to cook a travel meal.');
  }

  playSfx('campfire', { volume: 0.82, throttle: 0.1 });

  addStatusText(player, 'Camp Prepared: Stamina Recovery +15%', {
    color: '#ffcc66',
    ttl: 1.35
  });
}

export function shrine(game) {
  const player = game.player;

  if (player.spiritAwakened) {
    player.spirit = player.maxSpirit;
    game.log('The shrine hums. Your spirit is restored.');
    playSfx('shrine', { volume: 0.9, throttle: 0.12 });

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
    playSfx('shrine', { volume: 1, throttle: 0.12 });

    safeShake(game, 8, 0.22);

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
  playPoiThresholdEffect(game, entrance, 'dungeon');
  const entered = enterDungeonSystem(game, entrance);

  if (entered) {
    const renderGame = getInteractionRenderGame(game);
    playSfx('dungeon', { volume: 0.95, throttle: 0.15 });
    renderUI(renderGame.player, renderGame.logLines, renderGame);

    if (typeof renderGame.renderPauseMenu === 'function') {
      renderGame.renderPauseMenu();
    }
  }
}

export function exitDungeon(game, exit) {
  const exited = exitDungeonSystem(game, exit);

  if (exited) {
    const renderGame = getInteractionRenderGame(game);
    playSfx('quest', { volume: 0.72, throttle: 0.15 });
    renderUI(renderGame.player, renderGame.logLines, renderGame);

    if (typeof renderGame.renderPauseMenu === 'function') {
      renderGame.renderPauseMenu();
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
    theme: castle.theme || 'ruin',
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
    name: lair.name || 'Last Dawn Reliquary',
    dungeonId: lair.dungeonId || 'demonCultLair',
    theme: lair.theme || 'demon',
    tier: lair.tier || 5,
    depth: lair.depth || 3,
    locked: false,
    r: lair.r || lair.radius || 58
  };

  game.log(`You enter ${entrance.name}.`);

  enterDungeon(game, entrance);
}

// -----------------------------------------------------------------------------
// SMALL HELPERS
// -----------------------------------------------------------------------------

function safeShake(game, strength = 6, duration = 0.18) {
  if (!game) return;

  if (typeof game.shake === 'function') {
    game.shake(strength, duration);
    return;
  }

  if (typeof game.cameraShake === 'function') {
    game.cameraShake(strength, duration);
    return;
  }

  if (typeof game.addScreenShake === 'function') {
    game.addScreenShake(strength, duration);
    return;
  }

  if (game.camera && typeof game.camera.shake === 'function') {
    game.camera.shake(strength, duration);
    return;
  }

  // No screen shake system exists. This should never break gameplay.
}

function getInteractionRenderGame(game) {
  return game?.player ? game : game?.hostGame;
}

function renderInteractionUI(game) {
  const renderGame = getInteractionRenderGame(game);

  if (renderGame?.player) {
    renderUI(renderGame.player, renderGame.logLines, renderGame);
  }
}

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
  if (rarity === 'mythic') return '#ff7ac8';
  if (rarity === 'ancient') return '#66f0ff';

  return '#d9ad4f';
}

export function getClassColor(classId) {
  classId = normalizeClassId(classId);
  if (classId === 'classless') return '#9facbf';
  if (classId === 'oathkeeper') return '#ffcc66';
  if (classId === 'fellhunter') return '#ef8b58';
  if (classId === 'gravecaller') return '#b68cff';
  if (classId === 'thornbinder') return '#6fae72';
  if (classId === 'waverider') return '#59d7e8';
  if (classId === 'lightbringer') return '#fff1b8';
  if (classId === 'eldritch') return '#ef4056';

  return '#d9ad4f';
}

export function skillLabel(skillId) {
  if (skillId === 'blade') return 'Blade';
  if (skillId === 'archery') return 'Archery';
  if (skillId === 'spirit') return 'Spirit';
  if (skillId === 'warding') return 'Warding';
  if (skillId === 'hydromancy') return 'Hydromancy';
  if (skillId === 'lightbringer') return 'Lightbringer';
  if (skillId === 'foraging') return 'Foraging';
  if (skillId === 'mining') return 'Mining';
  if (skillId === 'fishing') return 'Fishing';
  if (skillId === 'woodcutting') return 'Woodcutting';
  if (skillId === 'crafting') return 'Crafting';
  if (skillId === 'cooking') return 'Cooking';
  if (skillId === 'runecraft') return 'Runecraft';
  if (skillId === 'renown') return 'Renown';

  return String(skillId || 'Unknown');
}

export function abilityName(abilityId) {
  if (abilityId === 'oathkeeperOathStrike' || abilityId === 'heavyCut') return 'Oath Strike';
  if (abilityId === 'oathkeeperBastionBash' || abilityId === 'aegisBreaker') return 'Bastion Bash';
  if (abilityId === 'oathkeeperDivineLeap' || abilityId === 'cleavingStep') return 'Divine Leap';
  if (abilityId === 'oathkeeperJudgmentSmite' || abilityId === 'radiantSmite') return 'Judgment Smite';
  if (abilityId === 'oathkeeperConsecratedGround') return 'Consecrated Ground';
  if (abilityId === 'oathkeeperBulwarkOfLight') return 'Bulwark of Light';
  if (abilityId === 'oathkeeperLastRite') return 'Last Rite';
  if (abilityId === 'oathkeeperHeavenbreakerJudgment') return 'Heavenbreaker Judgment';
  if (abilityId === 'quickShot' || abilityId === 'fellhunterThrowingDaggers') return 'Throwing Daggers';
  if (abilityId === 'fellhunterPracticalStrike') return 'Practical Strike';
  if (abilityId === 'fellhunterBearTrap' || abilityId === 'snareTrap') return 'Bear Trap';
  if (abilityId === 'fellhunterCaltrops') return 'Caltrops';
  if (abilityId === 'fellhunterBombToss') return 'Bomb Toss';
  if (abilityId === 'fellhunterGrapplingHook') return 'Grappling Hook';
  if (abilityId === 'fellhunterFlamingArrowVolley' || abilityId === 'arrowVolley') return 'Flaming Arrow Volley';
  if (abilityId === 'fellhunterSmokeBomb' || abilityId === 'smokeBomb') return 'Smoke Bomb';
  if (abilityId === 'fellhunterMarkedShot' || abilityId === 'markedArrow') return 'Marked Shot';
  if (abilityId === 'fellhunterKillZone') return 'Kill Zone';
  if (abilityId === 'graveSpark') return 'Grave Spark';
  if (abilityId === 'thornbinderThornLash' || abilityId === 'vineWhip') return 'Thorn Lash';
  if (abilityId === 'thornbinderBriarHook') return 'Briar Hook';
  if (abilityId === 'thornbinderBramblePatch' || abilityId === 'thornPatch') return 'Bramble Patch';
  if (abilityId === 'thornbinderRosebiteBurst') return 'Rosebite Burst';
  if (abilityId === 'thornbinderLivingBriar' || abilityId === 'wildBloom') return 'Living Briar';
  if (abilityId === 'thornbinderRootPrison' || abilityId === 'brambleSnare') return 'Root Prison';
  if (abilityId === 'thornbinderSummonThornlings' || abilityId === 'summonThornbeast') return 'Summon Thornlings';
  if (abilityId === 'thornbinderSummonElderThornbeast') return 'Summon Elder Thornbeast';
  if (abilityId === 'summonLich') return 'Raise the Bound Dead';
  if (abilityId === 'lightbringerGleamBolt') return 'Gleam Bolt';
  if (abilityId === 'lightbringerHaloBrand') return 'Halo Brand';
  if (abilityId === 'lightbringerRayOfRebuke') return 'Ray of Rebuke';
  if (abilityId === 'lightbringerPrismGuard') return 'Prism Guard';
  if (abilityId === 'lightbringerDawncarver') return 'Dawncarver';
  if (abilityId === 'lightbringerSolarVerdict') return 'Solar Verdict';
  if (abilityId === 'lightbringerHaloAegis') return 'Halo Aegis';
  if (abilityId === 'lightbringerFirstSunrise') return 'The First Sunrise';

  return String(abilityId || 'Ability');
}

import {rememberRepeatableInstance} from './instanceEncounterMemory.js';
import {resetFailedDungeonArena} from './dungeonArenaSystem.js';
import {dressWorld} from './worldAuthorship.js';
import {reconstructOrrakai, migrateOrrakaiPosition,ensureRootRetortAccess,ensureArenSmithIdentity,ensureOrrakaiStoryNpcPositions,ensureOrrakaiSouthGate} from './orrakaiLayout.js';
import {migrateEchorynPosition} from './echorynLayout.js';
import {isClassAvailable} from './classData.js';
// hubSystem.js
// Orrakai town hub and RPG services.

import { TILE, WORLD_W, WORLD_H } from './data.js';
import { createWorld, findNearestActorPassablePoint } from './world.js';
import { createOverworldReturnState, restoreOverworldFromState,rememberDungeonRun } from './dungeonSystem.js';
import { captureContinentalState, restoreContinentalState } from './continentPersistence.js';
import { CONTINENT_VERSION } from './continentDefinition.js';
import { addItem, removeItem, countItem, gainXp } from './player.js';
import { addLootText, addQuestText, addStatusText } from './floatingText.js';
import { openMarketShop } from './shopSystem.js';
import {openDialogue} from './dialogueSystem.js';
import {workshopAccessStatus} from './workshopAccess.js';
import { enterPvpArena, returnFromPvpArena } from './pvpArenaSystem.js';
import { cancelActiveAbilityCharge, cancelActiveHeavyAttackCharge } from './combat.js';
import { ACT1_OVERWORLD_DISPLAY_NAME, normalizePlayerFacingWorldName } from './worldNames.js';
import { applyPublishedWorldOverride } from './developerWorldPersistence.js';

const ORRAKAI_DISCOVERY_ID = 'orrakai';
const LEGACY_CAPITAL_DISCOVERY_ID = 'capitalPrototype';

export function enterCapitalHub(game, entrance = null) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;

  if (!hostGame?.player || !hostGame?.world) return false;
  if(hostGame.world.mode==='pvpArena')return returnFromPvpArena(game);

  if (hostGame.world.mode === 'capital') {
    hostGame.log?.('You are already inside Orrakai.');
    return false;
  }

  rememberDungeonRun(hostGame,{failed:true});
  if(hostGame.world.mode==='tower')resetFailedDungeonArena(hostGame.world);
  rememberRepeatableInstance(hostGame,{failed:true});
  const surface = ['overworld','travelRoute'].includes(hostGame.world.mode);
  captureContinentalState(hostGame);
  // A map return always leads to Orrakai's south approach, even from a remote
  // expedition. Legacy postern returns also use the South Gate now.
  const surfaceWorld = surface ? hostGame.world : createWorld({spawnRegionId:'hearthmereFrontier'});
  const gate = entrance?.gateId!=='east'&&entrance || surfaceCapitalGate(surfaceWorld, 'south');
  const gateId = 'south';
  hostGame.capitalReturnWorld = surfaceWorld.continentId === 'runalis' ? surfaceWorld : null;
  hostGame.overworldState = createOverworldReturnState({...hostGame,world:surfaceWorld}, gate || {x:surfaceWorld.spawn.x,y:surfaceWorld.spawn.y});
  Object.assign(hostGame.overworldState, {
    gateId, entranceId:gate?.id || null,
    regionId:gate?.sourceRegionId || 'hearthmereFrontier',
    returnPoint:surfaceGateArrival(surfaceWorld, gate, gateId)
  });

  const hub = createCapitalHubWorld();

  hostGame.world = hub;
  hostGame.player.currentZone = hub.name;
  hostGame.player.capitalUnlocked = true;
  hostGame.player.discoveredLocations = hostGame.player.discoveredLocations || {};
  hostGame.player.discoveredLocations[ORRAKAI_DISCOVERY_ID] = {
    id: ORRAKAI_DISCOVERY_ID,
    name: hub.name,
    discoveredAt: Date.now()
  };
  hostGame.player.discoveredLocations[LEGACY_CAPITAL_DISCOVERY_ID] = {
    id: LEGACY_CAPITAL_DISCOVERY_ID,
    name: hub.name,
    discoveredAt: Date.now()
  };
  hostGame.player.lastSafeLocation = {
    worldMode: hub.mode,
    worldName: hub.name,
    regionId: hub.regionId || null,
    x: hub.spawn.x,
    y: hub.spawn.y,
    recordedAt: Date.now(),
    reason: 'orrakaiTown'
  };

  hostGame.player.x = hub.spawn.x;
  hostGame.player.y = hub.spawn.y;
  migrateOrrakaiPosition(hub, hostGame.player);
  const interior = hub.objects.find(o=>o.kind==='capitalExit' && o.gateId===gateId);
  const interiorArrival = {x:interior.x,y:interior.y-TILE*1.5};
  Object.assign(hostGame.player,findNearestActorPassablePoint(hub,interiorArrival.x,interiorArrival.y,12));
  hostGame.player.currentPosition={x:hostGame.player.x,y:hostGame.player.y};
  hostGame.player.dirX = 0;
  hostGame.player.dirY = -1;

  clearPartyTravelCombatState(hostGame);
  placePartyNearHost(hostGame);

  hostGame.camera.x = hostGame.player.x - hostGame.canvas.width / 2;
  hostGame.camera.y = hostGame.player.y - hostGame.canvas.height / 2;

  hostGame.log?.('Entered Orrakai.');
  addQuestText(actor || hostGame.player, 'Orrakai', {
    color: '#ffcc66',
    ttl: 1.35,
    size: 16
  });

  return true;
}

export function exitCapitalHub(game, exit = null) {
  const hostGame = getWorldTransitionGame(game);
  const actor = game?.player || hostGame?.player;

  if (!hostGame?.player || hostGame.world?.mode !== 'capital') return false;

  const state = hostGame.overworldState || {};

  hostGame.world = hostGame.capitalReturnWorld?.continentId==='runalis'
    ? hostGame.capitalReturnWorld : restoreOverworldFromState(state);
  const gateId = 'south';
  const gate = surfaceCapitalGate(hostGame.world,gateId);
  const arrival = surfaceGateArrival(hostGame.world,gate,gateId);
  hostGame.world.continentRuntime?.activate?.([arrival],hostGame.player,true);
  restoreContinentalState(hostGame);
  const returnPoint = findNearestActorPassablePoint(hostGame.world, arrival.x, arrival.y, 12);

  hostGame.player.x = returnPoint.x;
  hostGame.player.y = returnPoint.y;
  migrateEchorynPosition(hostGame.world,hostGame.player);
  hostGame.player.currentPosition={x:hostGame.player.x,y:hostGame.player.y};
  hostGame.player.dirX=0;
  hostGame.player.dirY=1;
  hostGame.player.currentZone = hostGame.world.name;
  clearPartyTravelCombatState(hostGame);
  placePartyNearHost(hostGame);
  hostGame.world.continentRuntime?.activate?.([hostGame.player,...(hostGame.player.coop?.players||[])],hostGame.player,true);
  hostGame.world.continentRuntime?.update?.(hostGame,0);
  hostGame.camera = {
    x: hostGame.player.x - hostGame.canvas.width / 2,
    y: hostGame.player.y - hostGame.canvas.height / 2
  };
  hostGame.overworldState = null;
  hostGame.capitalReturnWorld = null;

  hostGame.log?.('You pass beneath Orrakai’s South Gate onto the Nav Stone road.');
  addStatusText(actor || hostGame.player, 'South Road', {
    color: '#73d18a'
  });

  return true;
}

function surfaceCapitalGate(world, gateId) {
  return world.continentRuntime?.findObject?.('capital-gate-prototype') || world.objects?.find(o=>o.kind==='capitalGate'&&o.gateId!=='east');
}

function surfaceGateArrival(world, gate, gateId) {
  return gate ? {x:gate.x,y:gate.y+TILE*1.35} : {...world.spawn};
}

function getWorldTransitionGame(game) {
  return game?.hostGame || game;
}

function placePartyNearHost(game) {
  const host = game?.player;
  if (!host) return;

  const allies = Array.isArray(host.coop?.players)
    ? host.coop.players.filter(ally => ally && ally.active !== false)
    : [];
  const offsets = [
    { x: -TILE, y: 0 },
    { x: TILE, y: 0 },
    { x: 0, y: TILE }
  ];

  for (let i = 0; i < allies.length; i++) {
    const ally = allies[i];
    const offset = offsets[i] || { x: (i - 1) * TILE, y: TILE };

    Object.assign(ally,findNearestActorPassablePoint(game.world,host.x+offset.x,host.y+offset.y,12));
    ally.currentPosition={x:ally.x,y:ally.y};
    ally.dirX = host.dirX;
    ally.dirY = host.dirY;
    ally.currentZone = host.currentZone;
  }
}

function clearPartyTravelCombatState(game) {
  const host = game?.player;
  if (!host) return;

  const party = [
    host,
    ...(Array.isArray(host.coop?.players)
      ? host.coop.players.filter(ally => ally && ally.active !== false)
      : [])
  ];

  for (const actor of party) {
    cancelActiveAbilityCharge(actor);
    cancelActiveHeavyAttackCharge(actor, game.world);

    const combat = actor.combatState && typeof actor.combatState === 'object'
      ? actor.combatState
      : null;

    if (combat) {
      combat.attacking = false;
      combat.comboStep = 0;
      combat.hitTargets = [];
      combat.projectiles = [];
      combat.attackLungeRemaining = 0;
    }

    actor.traps = [];
  }

  if (game.input) {
    game.input.attackHeld = false;
    game.input.attackPressed = false;
    game.input.attackReleased = false;
    game.input.dashPressed = false;
  }
}

export function createCapitalHubWorld(options = {}) {
  const tiles = createCapitalTiles();

  const world = {
    mode: 'capital',
    name: 'Orrakai',
    townId: ORRAKAI_DISCOVERY_ID,
    safeZone: true,
    regionId: 'hearthmereFrontier',
    actId: 'act1',
    width: tiles[0]?.length || WORLD_W,
    height: tiles.length || WORLD_H,
    tileSize: TILE,
    tiles,
    objects: createCapitalObjects(),
    enemies: [],
    drops: [],
    effects: [],
    combatEffects: [],
    spawn: {
      x: 36 * TILE,
      y: 39 * TILE
    }
  };

  dressWorld(world);
  reconstructOrrakai(world);
  if (!options.skipPublishedOverride) applyPublishedWorldOverride(world);
  ensureArenSmithIdentity(world);
  ensureRootRetortAccess(world);
  ensureOrrakaiStoryNpcPositions(world);
  ensureOrrakaiSouthGate(world);
  return world;
}

export function useHubService(game, object) {
  if (!game?.player || !object) return false;

  switch (object.kind) {
    case 'capitalExit':
      return exitCapitalHub(game, object);

    case 'marketStall':
      return useMarket(game);

    case 'blacksmithService':
      return useBlacksmith(game);

    case 'alchemistService':
      return useAlchemist(game);

    case 'guildClerk':
      return useGuildClerk(game);

    case 'bankService':
      return useBank(game);

    case 'classTrainerService':
      return useClassTrainerService(game);

    case 'palaceGate':
      game.log?.('The palace council hall is locked for a later story chapter.');
      addStatusText(game.player, 'Palace Locked', { color: '#9facbf' });
      return true;

    case 'arenaGate':
      if ((game.hostGame || game).world?.mode === 'pvpArena') {
        const arenaState = (game.hostGame || game).world?.pvpArena?.state;
        if (arenaState !== 'active' && arenaState !== 'countdown') {
          return returnFromPvpArena(game);
        }
        game.log?.('Arena Master: finish the match before leaving the arena.');
        addStatusText(game.player, 'Match Active', { color: '#ef6f6c' });
        return true;
      }
      return enterPvpArena(game, object);

    default:
      return false;
  }
}

export function useMarket(game) {
  const player = game.player;
  player.flags = player.flags || {};

  if (!player.flags.capitalMarketIntro) {
    player.flags.capitalMarketIntro = true;
    game.log?.('Orrakai Market: tools, tackle, rations, tonics, and upgrade goods. Choose what keeps you alive on the road.');
    addItem(player, 'fieldRations', 1);
    addLootText(player, 'Field Rations', { color: '#d9ad4f' });
  }

  return openMarketShop(game);
}

export function useBlacksmith(game) {
  const npc=game.world?.objects?.find(o=>o.workshopService==='blacksmith');
  return npc?openDialogue(game.dialogue,npc,game.player,game.world):false;
}
export function supplyBlacksmithMaterials(game){
  if(!workshopAccessStatus(game.player,'blacksmith').ok)return false;
  const player = game.player;

  if (countItem(player, 'ironOre') >= 2) {
    removeItem(player, 'ironOre', 2);
    addItem(player, 'ironScrap', 3);
    gainXp(player, 'mining', 22, game.log);
    game.log?.('Blacksmith: refined Iron Ore x2 into Iron Scrap x3.');
    addLootText(player, 'Iron Scrap x3', { color: '#d9ad4f' });
    return true;
  }

  if ((player.gold || 0) >= 18) {
    player.gold -= 18;
    addItem(player, 'ironScrap', 3);
    game.log?.('Mara supplied Iron Scrap x3 for 18 gold. Choose a piece at the forge to upgrade it.');
    addLootText(player, 'Iron Scrap x3', { color: '#d9ad4f' });
    return true;
  }

  player.flags = player.flags || {};
  if (!player.flags.capitalBlacksmithIntroScrap) {
    player.flags.capitalBlacksmithIntroScrap = true;
    addItem(player, 'ironScrap', 1);
    game.log?.('Blacksmith: first lesson is free. Iron Scrap x1 added. Bring Iron Ore or gold for more.');
    addLootText(player, 'Iron Scrap x1', { color: '#d9ad4f' });
    return true;
  }

  game.log?.('Blacksmith: bring Iron Ore x2 or 18 gold for upgrade scrap.');
  addStatusText(player, 'Need Ore or Gold', { color: '#9facbf' });
  return false;
}

export function useAlchemist(game) {
  const player = game.player;

  if (countItem(player, 'gravecap') >= 1 && countItem(player, 'paleEssence') >= 1) {
    removeItem(player, 'gravecap', 1);
    removeItem(player, 'paleEssence', 1);
    addItem(player, 'shrineTonic', 1);
    gainXp(player, 'cooking', 20, game.log);
    game.log?.('Oren Fenwick: brewed Shrine Tonic from Gravecap and Pale Essence.');
    addLootText(player, 'Shrine Tonic', { color: '#b68cff' });
    return true;
  }

  if ((player.gold || 0) >= 8) {
    player.gold -= 8;
    addItem(player, 'fieldRations', 1);
    game.log?.('Oren Fenwick: sold a travel restorative for 8 gold.');
    addLootText(player, 'Field Rations', { color: '#d9ad4f' });
    return true;
  }

  game.log?.('Oren Fenwick: bring Gravecap + Pale Essence, or 8 gold for a basic restorative.');
  addStatusText(player, 'Oren Needs Reagents', { color: '#b68cff' });
  return true;
}

export function useMaraApothecary(game,npc){
  if(game?.world?.mode!=='capital'||!game.player||!(game.player.hp>0)||!npc?.apothecaryService||
    !game.world.objects.includes(npc)||Math.hypot(game.player.x-npc.x,game.player.y-npc.y)>80)return false;
  return useAlchemist(game);
}

export function useGuildClerk(game) {
  const player = game.player;
  player.guildBounties = player.guildBounties || {};
  player.flags = player.flags || {};

  if (!player.flags.capitalGuildStoryBriefing) {
    player.flags.capitalGuildStoryBriefing = true;
    player.capitalUnlocked = true;
    player.tower = player.tower || {};
    player.tower.unlocked = true;
    game.log?.('Guild Clerk: Orrakai is the last safe town before the frontier hardens. Castle Veyr woke last night, and the council wants the road kept open anyway.');
    game.log?.('Use the town gates: south returns to Act I roads, north checks the Frontier Road expedition requirements.');
    addQuestText(player, 'Main Routes Marked', { color: '#ffcc66' });
    return true;
  }

  if (player.bossKills?.theVeyrWarden && !player.guildBounties.veyrWardenPaid) {
    player.guildBounties.veyrWardenPaid = true;
    player.gold += 160;
    addItem(player, 'veyrglassShard', 2);
    game.log?.('Guild Clerk: Castle Veyr proof accepted. 160 gold and Veyrglass Shard x2.');
    addLootText(player, 'Veyr Bounty Paid', { color: '#66f0ff' });
    return true;
  }

  if (!player.guildBounties.hollowElkPosted) {
    player.guildBounties.hollowElkPosted = true;
    game.log?.('Guild Clerk: bounty posted - The Blighted Elk stalks Mirror Grove.');
    addQuestText(player, 'Bounty: The Blighted Elk', { color: '#73d18a' });
    return true;
  }

  if (player.bossKills?.theHollowElk && !player.guildBounties.hollowElkPaid) {
    player.guildBounties.hollowElkPaid = true;
    player.gold += 120;
    addItem(player, 'briarRoot', 3);
    game.log?.('Guild Clerk: Blighted Elk bounty paid. 120 gold and Briar Root x3.');
    addLootText(player, 'Bounty Paid', { color: '#73d18a' });
    return true;
  }

  if ((player.tower?.highestFloor || 0) >= 10 && !player.guildBounties.tower10Paid) {
    player.guildBounties.tower10Paid = true;
    player.gold += 90;
    addItem(player, 'towerFragment', 1);
    game.log?.('Guild Clerk: Tower floor 10 milestone recorded. 90 gold and Tower Fragment x1.');
    addLootText(player, 'Tower Milestone Paid', { color: '#66f0ff' });
    return true;
  }

  if (player.bossKills?.malakarSolgateDemonLord && !player.guildBounties.redSealPaid) {
    player.guildBounties.redSealPaid = true;
    player.gold += 300;
    addItem(player, 'bossCore', 1);
    game.log?.('Guild Clerk: Malakar is dead? Then the council owes the frontier more than coin. Take 300 gold and a Boss Core.');
    addLootText(player, 'Last Dawn Bounty Paid', { color: '#ef6f6c' });
    return true;
  }

  if ((player.story?.flags?.act1Complete || player.story?.act1Complete) && countItem(player, 'pilgrimRoadPermit') <= 0) {
    addItem(player, 'pilgrimRoadPermit', 1);
    game.log?.('Guild Clerk: the Pilgrim Road permit is approved. Gather 320 field rations and 750 gold before departure.');
    addLootText(player, 'Pilgrim Road Permit', { color: '#ffcc66' });
    return true;
  }

  if ((player.story?.flags?.act2Complete || player.story?.act2Complete) && countItem(player, 'severedCausewayChart') <= 0) {
    addItem(player, 'severedCausewayChart', 1);
    addItem(player, 'lightstormWard', 1);
    game.log?.('Guild Clerk: take the Severed Causeway chart and a first lightstorm ward. You will need 520 rations, 1800 gold, and 3 wards to leave ordered territory.');
    addLootText(player, 'Causeway Chart', { color: '#b68cff' });
    return true;
  }

    game.log?.('Guild Clerk: current postings are Castle Veyr proof, The Blighted Elk bounty, Malakar kill proof, and Tower floor 10.');
    game.log?.('Orrakai services are consolidated here: market, bank, smith, alchemist, shrine, training yard, and the Frontier Road gate.');
  addStatusText(player, 'Guild Notices Updated', { color: '#66f0ff' });
  return true;
}

export function useBank(game) {
  const player = game.player;
  player.storage = player.storage || {
    goldReserve: 0,
    materialsStored: 0
  };

  const deposit = Math.min(25, Math.max(0, Number(player.gold || 0)));
  if (deposit > 0) {
    player.gold -= deposit;
    player.storage.goldReserve += deposit;
    game.log?.(`Bank: stored ${deposit} gold. Reserve: ${player.storage.goldReserve}.`);
    addStatusText(player, 'Gold Stored', { color: '#d9ad4f' });
    return true;
  }

  if (player.storage.goldReserve > 0) {
    const withdraw = Math.min(25, player.storage.goldReserve);
    player.storage.goldReserve -= withdraw;
    player.gold += withdraw;
    game.log?.(`Bank: withdrew ${withdraw} gold.`);
    addStatusText(player, 'Gold Withdrawn', { color: '#d9ad4f' });
    return true;
  }

  game.log?.('Bank: no gold to store yet.');
  return true;
}

export function useClassTrainerService(game) {
  const player = game.player;

  if (!player.classId) {
    game.log?.('Training Yard: choose a class in character creation first, then return here for class practice.');
    addStatusText(player, 'Choose Class First', { color: '#9facbf' });
    return true;
  }

  if (!player.classSkill) {
    game.log?.('Training Yard: Classless characters have no class practice. Improve through weapons, gear, crafting, and survival.');
    addStatusText(player, 'No Class Training', { color: '#9facbf' });
    return true;
  }

  gainXp(player, player.classSkill, 30, game.log);
  game.log?.(`Training Yard: ${player.className} practice complete. Class skill XP gained.`);
  addQuestText(player, 'Training Complete', { color: '#ffcc66' });
  return true;
}

function createCapitalTiles() {
  const tiles = [];

  for (let y = 0; y < WORLD_H; y++) {
    const row = [];

    for (let x = 0; x < WORLD_W; x++) {
      const border = x <= 1 || y <= 1 || x >= WORLD_W - 2 || y >= WORLD_H - 2;
      const townWall =
        (x >= 4 && x <= 67 && (y === 5 || y === 43)) ||
        (y >= 5 && y <= 43 && (x === 4 || x === 67));
      const northGateOpening = x >= 33 && x <= 39 && y <= 6;
      const southGateOpening = x >= 33 && x <= 39 && y >= 42;

      row.push({
        biome: border || (townWall && !northGateOpening && !southGateOpening) ? 'wall' : 'grass',
        variant: (x * 3 + y * 5) % 2
      });
    }

    tiles.push(row);
  }

  setTownRect(tiles, 33, 5, 39, 43, 'path');
  setTownRect(tiles, 10, 22, 63, 27, 'path');
  setTownRect(tiles, 23, 15, 48, 31, 'ruin');
  setTownRect(tiles, 27, 18, 45, 29, 'path');
  setTownRect(tiles, 10, 18, 25, 30, 'ruin');
  setTownRect(tiles, 13, 21, 24, 27, 'path');
  setTownRect(tiles, 48, 15, 64, 32, 'ruin');
  setTownRect(tiles, 50, 18, 62, 29, 'path');
  setTownRect(tiles, 12, 33, 26, 40, 'grass');
  setTownRect(tiles, 16, 34, 24, 39, 'ruin');
  setTownRect(tiles, 44, 33, 62, 40, 'ruin');
  setTownRect(tiles, 47, 34, 59, 39, 'path');
  setTownRect(tiles, 28, 8, 44, 15, 'ruin');
  setTownRect(tiles, 31, 9, 41, 14, 'path');
  setTownRect(tiles, 31, 40, 41, 43, 'path');
  setTownRect(tiles, 31, 5, 41, 8, 'path');
  setTownRect(tiles, 5, 22, 8, 28, 'path');
  setTownRect(tiles, 64, 22, 66, 28, 'path');
  setTownCircle(tiles, 36, 24, 8, 'path');
  setTownCircle(tiles, 36, 24, 5, 'ruin');
  setTownRect(tiles, 29, 20, 43, 28, 'path');

  return tiles;
}

function createCapitalObjects() {
  return [
    hubObject('capitalExit', 'orrakaiSouthGate', 'South Town Gate', 36, 42, {
      gateId: 'south',
      r: 30,
      forceLabel: true,
      labelPriority: 10,
      structureArchetype: 'fort',
      structureVariant: 'rural',
      structureImportance: 'major',
      talk: 'Pass beneath Orrakai’s south arch onto the relief road. Follow the paving to the Nav Stone, then onward into Echoryn Forest.'
    }),
    hubObject('travelRouteGate', 'orrakaiFrontierRoadGate', 'Frontier Road North Gate', 36, 7, {
      r: 34,
      forceLabel: true,
      labelPriority: 10,
      routeId: 'pilgrimRoad',
      poiId: 'pilgrimRoadGate',
      structureArchetype: 'fort',
      structureVariant: 'rural',
      structureImportance: 'major',
      talk: 'Beyond this gate, Orrakai ends. The Pilgrim Road opens when the expedition requirements are met.'
    }),
    hubObject('guildClerk', 'orrakaiGuildClerk', 'Adventurer Guild', 36, 16, {
      r: 20,
      forceLabel: true,
      labelOffset: 34
    }),
    hubObject('noticeBoard', 'orrakaiNoticeBoard', 'Notice Board', 31, 22, {
      r: 18,
      forceLabel: true,
      labelOffset: 31,
      talk: 'Orrakai Notice Board: market, bank, smith, alchemist, shrine, training yard, and the Frontier Road gate are all inside town.'
    }),
    hubObject('noticeBoard', 'orrakaiFrontierRoadBoard', 'Frontier Requirements', 42, 11, {
      r: 17,
      forceLabel: true,
      labelPriority: 8,
      labelOffset: 30,
      talk: 'Frontier Requirements: complete Act I, carry a Pilgrim Road permit, pack field rations, bring gold, and make sure companions are ready.'
    }),
    hubObject('marketStall', 'orrakaiMarket', 'Orrakai Market', 17, 24, {
      r: 20,
      forceLabel: true,
      labelOffset: 29
    }),
    hubObject('bankService', 'orrakaiBank', 'Storage Bank', 25, 26, {
      r: 20,
      forceLabel: true,
      labelOffset: 33
    }),
    hubObject('blacksmithService', 'orrakaiBlacksmith', 'Blacksmith', 52, 23, {
      r: 20,
      forceLabel: true,
      labelOffset: 34
    }),
    hubObject('alchemistService', 'orrakaiAlchemist', 'Root & Retort Medicines', 52, 31, {
      r: 20,
      forceLabel: true,
      labelOffset: 34
    }),
    hubObject('classTrainerService', 'orrakaiTrainingYard', 'Training Yard', 57, 18, {
      r: 20,
      forceLabel: true,
      labelOffset: 34
    }),
    hubObject('arenaGate', 'orrakaiPvpArena', 'PvP Arena', 62, 18, {
      r: 22,
      forceLabel: true,
      labelOffset: 34,
      talk: 'Arena Master: local players can settle duels here. Two or more joined players are required.'
    }),
    hubObject('shrine', 'orrakaiWeatheredShrine', 'Weathered Shrine', 19, 37, { r: 18, forceLabel: true }),
    hubObject('campfire', 'orrakaiTownHearth', 'Town Hearth', 36, 28, { r: 18 }),
    hubObject('towerEntrance', 'orrakaiTrialTower', 'Infinite Tower', 59, 37, {
      r: 24,
      forceLabel: true,
      poiId: 'infiniteTower',
      infiniteDungeonRegionId: 'hearthmereFrontier',
      structureArchetype: 'tower',
      structureVariant: 'haunted',
      structureImportance: 'named'
    }),
    hubObject('npc', 'warden', 'Warden Mael', 38, 20, {
      npcId: 'wardenMael',
      dialogueId: 'wardenMaelIntro',
      factionId: 'outpost',
      disposition: 'friendly',
      role: 'questGiver',
      shirt: '#59616a',
      pants: '#413d37',
      boots: '#282521',
      dirX: -1,
      dirY: 1,
      talk: 'Warden Mael: "Orrakai holds because everyone who leaves comes back with something useful."'
    }),
    hubObject('townProp', 'maelFieldTable', 'Mael\'s Field Table', 39, 20, {
      propType: 'crateStack', decorative: true, interactable: false, hideLabel: true, scale: 0.9
    }),
    hubObject('townProp', 'maelTravelBag', 'Mael\'s Travel Bag', 40, 21, {
      propType: 'sacks', decorative: true, interactable: false, hideLabel: true, scale: 0.72
    }),
    hubObject('npc', 'orrakaiSickVillagerObject', 'Sick Villager', 27, 19, {
      npcId: 'orrakaiSickVillager', dialogueId: 'orrakaiSickVillagerAid', deferTalkObjective: true,
      factionId: 'orrakai', disposition: 'friendly', dirX: 1, dirY: 0, shirt: '#827668', pants: '#4b443d'
    }),
    hubObject('npc', 'orrakaiWellStoresAttendantObject', 'Well Stores Attendant', 23, 27, {
      npcId: 'orrakaiWellStoresAttendant', dialogueId: 'orrakaiWellStoresAid', deferTalkObjective: true,
      factionId: 'orrakai', disposition: 'friendly', dirX: 1, dirY: 0, shirt: '#697e88', pants: '#443f39'
    }),
    hubObject('npc', 'orrakaiWaterDistributionObject', 'Covenant Water Steward', 29, 20, {
      npcId: 'orrakaiWaterDistribution', dialogueId: 'orrakaiWaterDistributionAid', deferTalkObjective: true,
      factionId: 'covenantOfLight', disposition: 'friendly', dirX: -1, dirY: 0, shirt: '#eee6cf', pants: '#8e7b45'
    }),
    hubObject('npc', 'orrakaiLowerGateGuardObject', 'Lower Gate Guard', 34, 39, {
      npcId: 'orrakaiLowerGateGuard', dialogueId: 'orrakaiLowerGateGuardAid', deferTalkObjective: true,
      factionId: 'orrakai', disposition: 'friendly', role: 'guard', dirX: 0, dirY: 1, shirt: '#526172', pants: '#343a43'
    }),
    hubObject('npc', 'orrakaiRefugeeParentObject', 'Displaced Farmer', 20, 35, {
      npcId: 'orrakaiRefugeeParent', dialogueId: 'orrakaiRefugeeFamilyAid', deferTalkObjective: true,
      factionId: 'orrakai', disposition: 'friendly', dirX: 1, dirY: 0, shirt: '#735c49', pants: '#40372f'
    }),
    hubObject('npc', 'lightwardenCaelenObject', 'Cardinal Callworth', 23, 35, {
      npcId: 'lightwardenCaelen', dialogueId: 'lightwardenCaelenMilestone', deferTalkObjective: true,
      factionId: 'covenantOfLight', disposition: 'friendly', role: 'questGiver', dirX: -1, dirY: 0,
      shirt: '#f1ead4', pants: '#9a7d3f', labelPriority: 10
    }),
    hubObject('npc', 'covenantHealingRiteObject', 'Covenant Healing Rite', 25, 36, {
      npcId: 'covenantHealingRite', dialogueId: 'covenantHealingRiteMilestone', deferTalkObjective: true,
      factionId: 'covenantOfLight', disposition: 'friendly', role: 'questGiver', dirX: -1, dirY: 0,
      shirt: '#fff4d6', pants: '#a88742', labelPriority: 10
    }),
    hubObject('townProp', 'caelenReliefBanner', 'Covenant Relief Banner', 24, 34, {
      propType: 'banner', decorative: true, interactable: false, hideLabel: true, color: '#eee6cf', accent: '#d9ad4f'
    }),
    hubObject('townProp', 'caelenReliefLantern', 'Covenant Relief Lantern', 26, 35, {
      propType: 'lantern', decorative: true, interactable: false, hideLabel: true, glow: '#f6df88'
    }),
    hubObject('npc', 'plagueTentAttendant', 'Covenant Attendant', 31, 19, {
      factionId: 'covenantOfLight', disposition: 'friendly', ambientWander: true,
      wanderRadiusTiles: 1.4, wanderSpeed: 13, wanderPauseMin: 1.8, wanderPauseMax: 4.2,
      shirt: '#e8e1cf', pants: '#887743', hideLabel: true,
      talk: 'Covenant Attendant: "Keep the clean seals separate from the returned cups."'
    }),
    hubObject('npc', 'refugeeReliefWorker', 'Relief Worker', 21, 36, {
      factionId: 'orrakai', disposition: 'friendly', ambientWander: true,
      wanderRadiusTiles: 1.2, wanderSpeed: 12, wanderPauseMin: 2.1, wanderPauseMax: 4.8,
      shirt: '#807364', pants: '#403a34', hideLabel: true,
      talk: 'Relief Worker: "Bread first, then blankets. Keep the chapel path clear."'
    }),
    hubObject('townProp', 'refugeeBedrolls', 'Refugee Bedrolls', 19, 35, { propType: 'sacks', decorative: true, interactable: false, hideLabel: true }),
    hubObject('townProp', 'refugeeCartDebris', 'Damaged Refugee Cart', 18, 34, { propType: 'woodPile', decorative: true, interactable: false, hideLabel: true }),
    hubObject('townProp', 'plagueTentSupplies', 'Plague Tent Supplies', 28, 18, { propType: 'crateStack', decorative: true, interactable: false, hideLabel: true }),
    hubObject('npc', 'smith', 'Aren the Smith', 55, 24, {
      bodyType: 'male',
      npcId: 'maraSmith',
      dialogueId: 'maraSmithIntro',
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: -1,
      dirY: 0,
      talk: 'Aren the Smith: "The forge is inside town now. Bring ore, coin, or anything worth repairing."'
    }),
    hubObject('npc', 'templarTrainer', 'Sister Elian', 22, 36, {
      instructorType: 'class',
      classId: 'oathkeeper',
      npcId: 'sisterElian',
      companionId: 'elian',
      dialogueId: 'elianTrainerDialogue',
      factionId: 'covenantOfLight',
      disposition: 'friendly',
      dirX: -1,
      dirY: 0,
      talk: 'Sister Elian: "A blade is not a weapon until it is bound to protection."'
    }),
    hubObject('npc', 'mercenaryTrainer', 'Bram', 42, 25, {
      instructorType: 'class',
      classId: 'fellhunter',
      npcId: 'bram',
      companionId: 'bram',
      dialogueId: 'bramTrainerDialogue',
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: -1,
      dirY: 0,
      talk: 'Bram: "Distance is not cowardice. It is leverage."'
    }),
    hubObject('npc', 'necromancerTrainer', 'Kaelen Dusk', 30, 26, {
      instructorType: 'class',
      classId: 'gravecaller',
      npcId: 'kaelenDusk',
      companionId: 'dusk',
      dialogueId: 'duskTrainerDialogue',
      factionId: 'gravecallers',
      disposition: 'neutral',
      dirX: 1,
      dirY: -1,
      talk: 'Kaelen Dusk: "The dead do not sleep. They wait to be asked."'
    }),
    hubObject('npc', 'waveriderTrainer', 'Tideglass Mentor', 56, 32, {
      classId: 'waverider',
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: 0,
      dirY: -1,
      talk: 'Tideglass Mentor: "Move with the water. If you stand still, the road decides for you."'
    }),
    ...(isClassAvailable('lightbringer')?[hubObject('npc', 'lightbringerTrainer', 'Dawnlens Acolyte', 60, 32, {
      classId: 'lightbringer',
      factionId: 'covenantOfLight',
      disposition: 'friendly',
      dirX: 0,
      dirY: -1,
      talk: 'Dawnlens Acolyte: "A steady beam is a promise. Point it only where you mean to cut."'
    })]:[]),
    hubObject('npc', 'frontierRoadQuartermaster', 'Frontier Quartermaster', 31, 10, {
      factionId: 'outpost',
      disposition: 'friendly',
      role: 'roadGuide',
      dirX: 1,
      dirY: 0,
      talk: 'Quartermaster: "The north gate checks permit, coin, and rations. Press against the gate itself when you are ready."'
    }),
    hubObject('npc', 'frontierRoadWatch', 'Road Watch', 41, 9, {
      factionId: 'outpost',
      disposition: 'friendly',
      role: 'guard',
      dirX: -1,
      dirY: 1,
      talk: 'Road Watch: "Past the bridge, Orrakai stops being able to save you. Check the requirements board first."'
    }),
    hubObject('npc', 'orrakaiBanker', 'Bank Clerk', 24, 28, {
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: 1,
      dirY: 0,
      talk: 'Bank Clerk: "Store gold before you test the road. Orrakai is safer than your pockets."'
    }),
    hubObject('npc', 'orrakaiMarketVendor', 'Market Vendor', 16, 25, {
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: 1,
      dirY: 0,
      hideLabel: true,
      interactable: false,
      ambientWander: true,
      wanderRadiusTiles: 2.2,
      wanderSpeed: 16,
      wanderPauseMin: 1.4,
      wanderPauseMax: 3.6
    }),
    hubObject('npc', 'orrakaiGuildRunner', 'Guild Runner', 34, 23, {
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: -1,
      dirY: 0,
      hideLabel: true,
      interactable: false,
      ambientWander: true,
      wanderRadiusTiles: 4,
      wanderSpeed: 24,
      wanderPauseMin: 0.4,
      wanderPauseMax: 1.8
    }),
    hubObject('npc', 'orrakaiAlchemistApprentice', 'Apothecary Assistant', 53, 31, {
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: -1,
      dirY: -1,
      hideLabel: true,
      interactable: false,
      ambientWander: true,
      wanderRadiusTiles: 2.5,
      wanderSpeed: 18,
      wanderPauseMin: 1.0,
      wanderPauseMax: 2.8
    }),
    hubObject('npc', 'orrakaiRoadPorter', 'Road Porter', 45, 12, {
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: -1,
      dirY: 1,
      hideLabel: true,
      interactable: false,
      ambientWander: true,
      wanderRadiusTiles: 3.2,
      wanderSpeed: 20,
      wanderPauseMin: 0.8,
      wanderPauseMax: 2.4
    }),
    hubObject('npc', 'orrakaiBreadCarrier', 'Bread Carrier', 28, 30, {
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: 1,
      dirY: -1,
      hideLabel: true,
      interactable: false,
      ambientWander: true,
      wanderRadiusTiles: 3,
      wanderSpeed: 17,
      wanderPauseMin: 1.2,
      wanderPauseMax: 3.2
    }),
    hubObject('npc', 'orrakaiLampTender', 'Lamp Tender', 43, 19, {
      factionId: 'outpost',
      disposition: 'friendly',
      dirX: -1,
      dirY: 0,
      hideLabel: true,
      interactable: false,
      ambientWander: true,
      wanderRadiusTiles: 3.5,
      wanderSpeed: 19,
      wanderPauseMin: 0.9,
      wanderPauseMax: 2.6
    }),
    hubObject('npc', 'covenantPhysician', 'Covenant Physician', 12, 34, {
      npcId: 'covenantPhysician', factionId: 'covenantOfLight', disposition: 'friendly', role: 'physician',
      shirt: '#eee6cf', pants: '#8e7b45',
      equipment: { weapon: null, helm: null, chest: null, legs: null, trinket: 'paleRune' },
      ambientWander: true, wanderRadiusTiles: 2.2, wanderSpeed: 16, wanderPauseMin: 0.8, wanderPauseMax: 2.1,
      talk: 'Covenant Physician: "Your fever broke on the second night. The road took the others before our wagon reached them."'
    }),
    hubObject('npc', 'covenantReliefSister', 'Relief Sister Anet', 46, 13, {
      npcId: 'covenantReliefSister', factionId: 'covenantOfLight', disposition: 'friendly', role: 'reliefWorker',
      shirt: '#f1ead8', pants: '#9c8744',
      ambientWander: true, wanderRadiusTiles: 2.8, wanderSpeed: 19, wanderPauseMin: 0.7, wanderPauseMax: 2,
      talk: 'Sister Anet: "White bundles are medicine. Gold cord means clean water. Red cord means do not open it inside the wall."'
    }),
    hubObject('npc', 'covenantPeacekeeper', 'Covenant Peacekeeper', 16, 31, {
      npcId: 'covenantPeacekeeper', factionId: 'covenantOfLight', disposition: 'friendly', role: 'quarantineGuard',
      shirt: '#e8e1ca', pants: '#776a42',
      equipment: { weapon: 'wardenBlade', helm: null, chest: 'wardedChest', legs: null, trinket: null },
      talk: 'Peacekeeper: "The rope protects the market from the tents, and the tents from frightened people in the market. Please keep the lane clear."'
    }),
    hubObject('npc', 'maskedOrrakaiChild', 'Masked Child', 10, 37, {
      npcId: 'maskedOrrakaiChild', factionId: 'orrakaiCivilians', disposition: 'friendly', role: 'civilian',
      scale: 0.76, shirt: '#8b765d', pants: '#4b4540',
      talk: 'Masked Child: "One bell means medicine. Two means a wagon. Three means we shut the flap and wait."'
    }),
    hubObject('npc', 'orrakaiGraveTender', 'Grave Tender Osric', 10, 13, {
      npcId: 'orrakaiGraveTender', factionId: 'covenantOfLight', disposition: 'friendly', role: 'funeraryRelief',
      shirt: '#ded7c4', pants: '#6f6342',
      ambientWander: true, wanderRadiusTiles: 2, wanderSpeed: 13, wanderPauseMin: 1.5, wanderPauseMax: 3.8,
      talk: 'Osric: "The Covenant records every name, even when the family cannot cross quarantine to speak it."'
    }),
    hubObject('npc', 'covenantTeacher', 'Covenant Teacher', 24, 16, {
      npcId: 'covenantTeacher', factionId: 'covenantOfLight', disposition: 'friendly', role: 'teacher',
      shirt: '#f2ead5', pants: '#887741', bodyType: 'male',
      talk: 'Covenant Teacher: "Lessons continue during quarantine. Children deserve a future tense even when adults are afraid to use one."'
    }),
    hubObject('npc', 'covenantHistorian', 'Covenant Field Historian', 47, 17, {
      npcId: 'covenantHistorian', factionId: 'covenantOfLight', disposition: 'friendly', role: 'historian',
      shirt: '#e7dfcb', pants: '#9b8748', bodyType: 'male',
      talk: 'Field Historian: "The Last Dawn burns recent records but steals the oldest pages. Destruction is not their only purpose."'
    }),
    hubObject('npc', 'covenantEnvoy', 'Covenant Envoy', 31, 18, {
      npcId: 'covenantEnvoy', factionId: 'covenantOfLight', disposition: 'friendly', role: 'diplomat',
      shirt: '#f5edd9', pants: '#b09748',
      talk: 'Covenant Envoy: "The river camps will accept Orrakai physicians if our peacekeepers remain outside. Trust is another supply line."'
    }),
    hubObject('poiInvestigation', 'orrakaiCaravanMemorial', 'Roadside Memorial', 14, 15, {
      r: 18, message: 'Fresh ribbons list the caravan dead. Your name appears in a different hand beneath the word RECOVERED.', labelPriority: 6
    }),
    hubObject('poiInvestigation', 'orrakaiBurnedLedger', 'Burned Relief Ledger', 48, 15, {
      r: 18, message: 'A recovered ledger records three Last Dawn attacks on medicine wagons. Only pages naming Divine Age cargo were burned.', labelPriority: 6
    }),
    ...createOrrakaiTownDressing()
  ];
}

function setTownRect(tiles, x1, y1, x2, y2, biome) {
  for (let y = Math.max(0, y1); y <= Math.min(tiles.length - 1, y2); y++) {
    for (let x = Math.max(0, x1); x <= Math.min((tiles[y]?.length || 1) - 1, x2); x++) {
      tiles[y][x] = {
        ...tiles[y][x],
        biome
      };
    }
  }
}

function setTownCircle(tiles, centerX, centerY, radius, biome) {
  const radiusSq = radius * radius;

  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 > radiusSq) continue;
      if (!tiles[y]?.[x]) continue;

      tiles[y][x] = {
        ...tiles[y][x],
        biome
      };
    }
  }
}

function createOrrakaiTownDressing() {
  return [
    townProp('orrakaiMainRoadRuts1', 'roadRuts', 36, 35, { orientation: 'vertical', length: 8, sortY: 0 }),
    townProp('orrakaiMainRoadRuts2', 'roadRuts', 36, 19, { orientation: 'vertical', length: 8, sortY: 0 }),
    townProp('orrakaiMarketRoadRuts', 'roadRuts', 21, 25, { orientation: 'horizontal', length: 8, sortY: 0 }),
    townProp('orrakaiCraftRoadRuts', 'roadRuts', 52, 25, { orientation: 'horizontal', length: 8, sortY: 0 }),
    townProp('orrakaiSquareEdgeNorth', 'roadEdge', 36, 19, { orientation: 'horizontal', length: 14, sortY: 0 }),
    townProp('orrakaiSquareEdgeSouth', 'roadEdge', 36, 29, { orientation: 'horizontal', length: 14, sortY: 0 }),
    townProp('orrakaiSquareEdgeWest', 'roadEdge', 28, 24, { orientation: 'vertical', length: 9, sortY: 0 }),
    townProp('orrakaiSquareEdgeEast', 'roadEdge', 44, 24, { orientation: 'vertical', length: 9, sortY: 0 }),
    townProp('orrakaiGuildHallFront', 'buildingFront', 36, 14, {
      service: 'guild',
      width: 5,
      height: 3,
      color: '#66f0ff',
      accent: '#d9ad4f',
      sortY: 13 * TILE
    }),
    townProp('orrakaiGuildSmoke', 'chimneySmoke', 38, 13, { drift: 0.2, color: '#9facbf' }),
    townProp('orrakaiMarketFront', 'buildingFront', 17, 22, {
      service: 'market',
      width: 5,
      height: 2,
      color: '#d9ad4f',
      accent: '#7a2e35',
      sortY: 21 * TILE
    }),
    townProp('orrakaiMarketLaundry', 'laundryLine', 22, 22, { width: 4, color: '#d9ad4f' }),
    townProp('orrakaiBankFront', 'buildingFront', 25, 24, {
      service: 'bank',
      width: 3,
      height: 2,
      color: '#ffcc66',
      accent: '#9facbf',
      sortY: 23 * TILE
    }),
    townProp('orrakaiSmithFront', 'buildingFront', 52, 21, {
      service: 'smith',
      width: 4,
      height: 2,
      color: '#ef6f2f',
      accent: '#d9ad4f',
      sortY: 20 * TILE
    }),
    townProp('orrakaiForgeSmoke', 'chimneySmoke', 50, 20, { drift: 0.7, color: '#9facbf' }),
    townProp('orrakaiAlchemyFront', 'buildingFront', 52, 29, {
      service: 'alchemist',
      width: 4,
      height: 2,
      color: '#b68cff',
      accent: '#73d18a',
      sortY: 28 * TILE
    }),
    townProp('orrakaiAlchemySteam', 'chimneySmoke', 51, 29, { drift: 1.1, color: '#b68cff', scale: 0.72 }),
    townProp('orrakaiTrainingFenceNorth', 'fence', 57, 16, { orientation: 'horizontal', length: 8 }),
    townProp('orrakaiTrainingFenceEast', 'fence', 63, 22, { orientation: 'vertical', length: 7 }),
    townProp('orrakaiTrainingBanner1', 'banner', 53, 17, { color: '#73d18a' }),
    townProp('orrakaiTrainingBanner2', 'banner', 61, 17, { color: '#66f0ff' }),
    townProp('orrakaiPracticeDummy1', 'practiceDummy', 54, 20, { scale: 0.95 }),
    townProp('orrakaiPracticeDummy2', 'practiceDummy', 60, 20, { scale: 0.95 }),
    townProp('orrakaiWeaponRack', 'weaponRack', 58, 23, { scale: 0.95 }),
    townProp('orrakaiGuildContracts', 'contractTable', 32, 19, { scale: 0.95 }),
    townProp('orrakaiNoticePapers', 'noticePapers', 30, 23, { scale: 0.85 }),
    townProp('orrakaiGuildCrates', 'crateStack', 40, 16, { scale: 0.85 }),
    townProp('orrakaiSquareBenchWest', 'bench', 32, 25, { orientation: 'horizontal' }),
    townProp('orrakaiSquareBenchEast', 'bench', 40, 26, { orientation: 'horizontal' }),
    townProp('orrakaiSquareLantern1', 'lantern', 32, 20, { glow: '#ffcc66' }),
    townProp('orrakaiSquareLantern2', 'lantern', 41, 20, { glow: '#ffcc66' }),
    townProp('orrakaiSquareLantern3', 'lantern', 32, 29, { glow: '#ffcc66' }),
    townProp('orrakaiSquareLantern4', 'lantern', 41, 29, { glow: '#ffcc66' }),
    townProp('orrakaiTownWell', 'well', 36, 25, { scale: 0.85 }),
    townProp('orrakaiMarketCrates1', 'crateStack', 14, 23, { scale: 0.9 }),
    townProp('orrakaiMarketSacks', 'sacks', 19, 27, { scale: 0.9 }),
    townProp('orrakaiMarketBarrels', 'barrels', 21, 23, { scale: 0.85 }),
    townProp('orrakaiMarketPlanter', 'herbPlanter', 12, 25, { scale: 0.8 }),
    townProp('orrakaiMarketCanopy', 'marketCanopy', 17, 22, { width: 5, color: '#d9ad4f', accent: '#7a2e35' }),
    townProp('orrakaiBankChest', 'bankChest', 26, 28, { scale: 0.95 }),
    townProp('orrakaiBankCrates', 'crateStack', 23, 24, { scale: 0.8 }),
    townProp('orrakaiForge', 'forge', 50, 24, { scale: 1 }),
    townProp('orrakaiAnvil', 'anvil', 54, 27, { scale: 0.9 }),
    townProp('orrakaiWoodPile', 'woodPile', 49, 21, { scale: 0.85 }),
    townProp('orrakaiToolRack', 'weaponRack', 56, 22, { scale: 0.8 }),
    townProp('orrakaiAlchemyTable', 'alchemyTable', 50, 32, { scale: 0.95 }),
    townProp('orrakaiHerbBundles', 'sacks', 55, 31, { scale: 0.75, herbColor: '#73d18a' }),
    townProp('orrakaiAlchemyPlanter', 'herbPlanter', 56, 30, { scale: 0.78 }),
    townProp('orrakaiAlchemyLantern', 'lantern', 54, 29, { glow: '#b68cff' }),
    townProp('orrakaiShrineCandles1', 'candleCluster', 17, 36, { glow: '#f3df9b' }),
    townProp('orrakaiShrineCandles2', 'candleCluster', 21, 38, { glow: '#f3df9b' }),
    townProp('orrakaiShrinePlanter', 'herbPlanter', 16, 39, { scale: 0.78, flowerColor: '#e8edf5' }),
    townProp('orrakaiShrineBench', 'bench', 18, 39, { orientation: 'horizontal' }),
    townProp('orrakaiShrineFence', 'fence', 23, 36, { orientation: 'vertical', length: 5 }),
    townProp('orrakaiSouthGatePalisadeLeft', 'palisade', 29, 42, { orientation: 'horizontal', length: 5 }),
    townProp('orrakaiSouthGatePalisadeRight', 'palisade', 43, 42, { orientation: 'horizontal', length: 5 }),
    townProp('orrakaiSouthGuardPostLeft', 'guardPost', 31, 40, { scale: 0.85 }),
    townProp('orrakaiSouthGuardPostRight', 'guardPost', 41, 40, { scale: 0.85 }),
    townProp('orrakaiSouthLanternLeft', 'lantern', 33, 41, { glow: '#ffcc66' }),
    townProp('orrakaiSouthLanternRight', 'lantern', 39, 41, { glow: '#ffcc66' }),
    townProp('orrakaiNorthBridgeDeck', 'bridgeDeck', 36, 6, { width: 8, height: 4, sortY: 4 * TILE }),
    townProp('orrakaiNorthGateBarricadeLeft', 'barricade', 31, 8, { orientation: 'diagonalLeft' }),
    townProp('orrakaiNorthGateBarricadeRight', 'barricade', 41, 8, { orientation: 'diagonalRight' }),
    townProp('orrakaiNorthGuardPostLeft', 'guardPost', 29, 7, { scale: 0.95 }),
    townProp('orrakaiNorthGuardPostRight', 'guardPost', 43, 7, { scale: 0.95 }),
    townProp('orrakaiNorthSupplyWagon', 'supplyWagon', 44, 13, { scale: 0.85 }),
    townProp('orrakaiNorthCrates', 'crateStack', 32, 12, { scale: 0.85 }),
    townProp('orrakaiNorthBannerLeft', 'banner', 32, 7, { color: '#d9ad4f' }),
    townProp('orrakaiNorthBannerRight', 'banner', 40, 7, { color: '#d9ad4f' }),
    townProp('orrakaiNorthBrazierLeft', 'lantern', 34, 8, { glow: '#d9ad4f', scale: 1.1 }),
    townProp('orrakaiNorthBrazierRight', 'lantern', 38, 8, { glow: '#d9ad4f', scale: 1.1 }),
    townProp('orrakaiStrawMarket', 'straw', 20, 25, { scale: 0.9 }),
    townProp('orrakaiStrawSmith', 'straw', 53, 25, { scale: 0.8 }),
    townProp('orrakaiRoadPuddle', 'puddle', 36, 33, { scale: 0.75 }),
    townProp('orrakaiQuarantineTent1', 'quarantineTent', 8, 33, { scale: 1.05, color: '#d8d1bd' }),
    townProp('orrakaiQuarantineTent2', 'quarantineTent', 12, 38, { scale: 0.92, color: '#cfc6b1' }),
    townProp('orrakaiInfirmaryCot1', 'infirmaryCot', 10, 34, { scale: 0.9 }),
    townProp('orrakaiInfirmaryCot2', 'infirmaryCot', 14, 36, { scale: 0.85 }),
    townProp('orrakaiWashBasin', 'washBasin', 15, 33, { scale: 0.9 }),
    townProp('orrakaiQuarantineMarker1', 'plagueMarker', 16, 32, { scale: 1.05 }),
    townProp('orrakaiQuarantineMarker2', 'plagueMarker', 7, 39, { scale: 0.9 }),
    townProp('orrakaiQuarantineBarricade1', 'barricade', 16, 34, { orientation: 'diagonalLeft', scale: 0.85 }),
    townProp('orrakaiQuarantineBarricade2', 'barricade', 8, 40, { orientation: 'diagonalRight', scale: 0.85 }),
    townProp('orrakaiPurificationBrazier1', 'purificationBrazier', 17, 34, { scale: 0.95 }),
    townProp('orrakaiPurificationBrazier2', 'purificationBrazier', 9, 39, { scale: 0.9 }),
    townProp('orrakaiWarningBell', 'warningBell', 17, 31, { scale: 1.05 }),
    townProp('orrakaiSickWagon', 'sickWagon', 14, 40, { scale: 0.9 }),
    townProp('orrakaiMedicineCrates', 'medicineCrates', 47, 13, { scale: 0.9 }),
    townProp('orrakaiReliefWagon', 'sickWagon', 49, 11, { scale: 0.88, clean: true }),
    townProp('orrakaiReliefBrazier', 'purificationBrazier', 46, 15, { scale: 0.88 }),
    townProp('orrakaiFreshGrave1', 'freshGrave', 8, 11, { scale: 0.92 }),
    townProp('orrakaiFreshGrave2', 'freshGrave', 11, 10, { scale: 0.92 }),
    townProp('orrakaiFreshGrave3', 'freshGrave', 13, 12, { scale: 0.92 }),
    townProp('orrakaiMemorialStone', 'memorialStone', 11, 15, { scale: 1.1 }),
    townProp('orrakaiMemorialCandles', 'candleCluster', 13, 15, { glow: '#f3df9b', scale: 0.82 }),
    townProp('orrakaiBurnPit', 'burnPit', 6, 18, { scale: 1.05 }),
    townProp('orrakaiTeacherTable', 'contractTable', 23, 17, { scale: 0.78 }),
    townProp('orrakaiHistorianPapers', 'noticePapers', 46, 18, { scale: 0.82 }),
    hubObject('signpost', 'orrakaiNorthSign', 'Frontier Road', 34, 10, {
      scale: 0.9,
      talk: 'North: Frontier Road. South: Echoryn Forest.'
    }),
    hubObject('signpost', 'orrakaiSouthSign', 'South Road', 38, 40, {
      scale: 0.9,
      talk: 'South Town Gate: return to Echoryn Forest.'
    }),
    hubObject('brokenWall', 'orrakaiWestWall1', 'Old Town Wall', 8, 17, { scale: 0.9 }),
    hubObject('brokenWall', 'orrakaiEastWall1', 'Old Town Wall', 64, 31, { scale: 0.9, orientation: 'vertical' }),
    hubObject('ruinPillar', 'orrakaiGuildPillar1', 'Guild Pillar', 29, 10, { scale: 0.8 }),
    hubObject('ruinPillar', 'orrakaiGuildPillar2', 'Guild Pillar', 43, 10, { scale: 0.8 }),
    hubObject('treeCluster', 'orrakaiShrineTree1', 'Shrine Tree', 14, 36, { scale: 0.82 }),
    hubObject('shrub', 'orrakaiShrub1', 'Shrub', 23, 35, { scale: 0.82 }),
    hubObject('shrub', 'orrakaiShrub2', 'Shrub', 15, 40, { scale: 0.78 }),
    hubObject('smallBoulder', 'orrakaiBoulder1', 'Small Boulder', 46, 39, { scale: 0.72 }),
    hubObject('smallBoulder', 'orrakaiBoulder2', 'Small Boulder', 62, 16, { scale: 0.7 }),
    hubObject('graveMarker', 'orrakaiMemorial1', 'Road Memorial', 21, 39, { scale: 0.76 }),
    hubObject('marketStall', 'orrakaiFoodStall', 'Ration Stall', 14, 27, {
      r: 16,
      labelPriority: 5,
      hideLabel: true
    })
  ];
}

function townProp(id, propType, tileX, tileY, extra = {}) {
  return hubObject('townProp', id, propType, tileX, tileY, {
    r: 0,
    propType,
    decorative: true,
    interactable: false,
    hideLabel: true,
    labelPriority: 0,
    drawRadius: 180,
    ...extra
  });
}

function travelToOverworldPoint(game, tileX, tileY, labelText, logText) {
  if (!game?.player) return false;

  const state = game.overworldState || {};
  captureContinentalState(game);
  game.world=game.capitalReturnWorld || restoreOverworldFromState(state);
  restoreContinentalState(game);

  game.player.x = tileX * TILE + TILE / 2;
  game.player.y = tileY * TILE + TILE / 2;
  game.world.continentRuntime?.refresh?.(game);
  Object.assign(game.player,findNearestActorPassablePoint(game.world,game.player.x,game.player.y,12));
  game.player.currentZone = game.world.name;
  game.player.discoveredLocations = game.player.discoveredLocations || {};
  game.player.discoveredLocations.mirrorGroveTrail = {
    id: 'mirrorGroveTrail',
    name: labelText,
    discoveredAt: Date.now()
  };

  game.camera.x = game.player.x - game.canvas.width / 2;
  game.camera.y = game.player.y - game.canvas.height / 2;
  game.overworldState = null;
  game.capitalReturnWorld = null;

  game.log?.(logText || `Travelled to ${labelText}.`);
  addQuestText(game.player, labelText, {
    color: '#73d18a',
    ttl: 1.25
  });

  return true;
}

function hubObject(kind, id, name, tileX, tileY, extra = {}) {
  return {
    id,
    kind,
    name,
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    r: extra.r || 16,
    labelPriority: 7,
    ...extra
  };
}

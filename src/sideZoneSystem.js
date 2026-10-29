// sideZoneSystem.js
// Lightweight optional procedural zones. Only the active zone exists in memory;
// persistent state is limited to small visit/clear records on the host player.

import {rememberRepeatableInstance,restoreRepeatableInstance} from './instanceEncounterMemory.js';
import {requestPartyEntry} from './partyEntrySystem.js';
import {createBlightedGrove,beginBlightedGrove,updateBlightedGrove,isBlightedGrove} from './blightedGrove.js';
import {initializeDungeonArena,resetFailedDungeonArena} from './dungeonArenaSystem.js';
import { TILE } from './data.js';
import { addItem, gainXp } from './player.js';
import { createDungeonWorld, createOverworldReturnState, restoreOverworldFromState } from './dungeonSystem.js';
import {migrateEchorynPosition} from './echorynLayout.js';
import { addLootText, addQuestText, addStatusText } from './floatingText.js';
import { getCoopEnemyScalingPlayerCount } from './coopEnemyScaling.js';
import {restoreContinentalState} from './continentPersistence.js';
import {findNearestActorPassablePoint} from './world.js';

const SIDE_ZONE_DEFINITIONS = {
  hollowGrove: {
    name: 'Blighted Grove',
    theme: 'thorn',
    tier: 1,
    reward: ['emberleaf', 3]
  },
  abandonedMine: {
    name: 'Abandoned Mine',
    theme: 'ruin',
    tier: 2,
    reward: ['ironScrap', 4]
  },
  ashenFarmstead: {
    name: 'Ashen Farmstead',
    theme: 'demon',
    tier: 2,
    reward: ['fieldRations', 4]
  },
  graveyardCellar: {
    name: 'Graveyard Cellar',
    theme: 'grave',
    tier: 2,
    reward: ['graveAsh', 2]
  },
  failedPurificationSite: {
    name: 'Failed Purification Site',
    theme: 'holy',
    tier: 4,
    reward: ['arcaneDust', 3]
  },
  confessionVault: {
    name: 'Confession Vault',
    theme: 'holy',
    tier: 5,
    reward: ['veyrglassShard', 1]
  },
  choirReliquary: {
    name: 'Choir Reliquary',
    theme: 'holy',
    tier: 5,
    reward: ['towerFragment', 1]
  },
  lightstormScar: {
    name: 'Lightstorm Scar',
    theme: 'cosmic',
    tier: 7,
    reward: ['towerFragment', 2]
  },
  namelessVault: {
    name: 'Nameless Vault',
    theme: 'cosmic',
    tier: 8,
    reward: ['veyrglassShard', 2]
  },
  worldrootRift: {
    name: 'Worldroot Rift',
    theme: 'cosmic',
    tier: 9,
    reward: ['bossCore', 1]
  }
};

export function enterSideZone(game, entrance = {}, options = {}) {
  const hostGame = game?.hostGame || game;
  const actor = game?.player || hostGame?.player;
  if (!hostGame?.player || !hostGame?.world || hostGame.world.mode === 'sideZone') return false;

  const type = entrance.sideZoneType || entrance.zoneType || 'hollowGrove';
  const definition = SIDE_ZONE_DEFINITIONS[type] || SIDE_ZONE_DEFINITIONS.hollowGrove;
  if (!options.partyEntryCommitted && !requestPartyEntry(hostGame, {
    key: `sideZone:${entrance.id || type}`, title: entrance.name || definition.name,
    initiator: actor, commit: () => enterSideZone(game, entrance, {partyEntryCommitted: true})
  })) return false;
  const regionId = entrance.sourceRegionId || entrance.regionId || hostGame.world.regionId || hostGame.player.regions?.currentRegionId || 'hearthmereFrontier';
  const seed = entrance.seed || `${regionId}-${type}-${entrance.id || 'entrance'}`;

  hostGame.overworldState = createOverworldReturnState(hostGame, entrance);
  const zone = createProceduralSideZoneWorld({
    type,
    regionId,
    seed,
    name: entrance.name || definition.name,
    theme: entrance.theme || definition.theme,
    tier: entrance.tier || definition.tier,
    playerCount: getCoopEnemyScalingPlayerCount(hostGame.player)
  });

  restoreRepeatableInstance(zone,hostGame.player);
  if(isBlightedGrove(zone))initializeDungeonArena(zone);
  hostGame.world = zone;
  placeHostAndParty(hostGame, zone.spawn);
  recordSideZoneVisit(hostGame.player, regionId, type);
  if(isBlightedGrove(zone))beginBlightedGrove(hostGame);
  hostGame.log?.(`Entered ${zone.name}. Defeated rooms remain cleared until its next expedition cycle.`);
  addQuestText(actor || hostGame.player, zone.name, { color: '#73d18a', ttl: 1.4, size: 16 });
  return true;
}

export function exitSideZone(game) {
  const hostGame = game?.hostGame || game;
  const actor = game?.player || hostGame?.player;
  if (!hostGame?.player || hostGame.world?.mode !== 'sideZone' || !hostGame.overworldState) return false;
  const party=[hostGame.player,...(hostGame.player.coop?.players||[]).filter(a=>a.active!==false)];
  if(isBlightedGrove(hostGame.world)&&hostGame.world.bossArena?.phase==='active'&&party.some(p=>p.hp>0)){hostGame.log?.('The crownward roots are sealed. Defeat the Mother of Briars or fall with your party.');return false;}
  if(isBlightedGrove(hostGame.world)&&party.every(p=>p.hp<=0))resetFailedDungeonArena(hostGame.world);

  rememberRepeatableInstance(hostGame);
  hostGame.world = restoreOverworldFromState(hostGame.overworldState);
  const requested = hostGame.overworldState.returnPoint || hostGame.world.spawn || {x:11*TILE,y:27*TILE};
  hostGame.world.continentRuntime?.activate?.([requested],hostGame.player);
  restoreContinentalState(hostGame);
  const returnPoint = findNearestActorPassablePoint(hostGame.world,requested.x,requested.y,12);
  placeHostAndParty(hostGame, returnPoint);
  migrateEchorynPosition(hostGame.world,hostGame.player);
  hostGame.camera = {x:hostGame.player.x-(hostGame.canvas?.width||960)/2,y:hostGame.player.y-(hostGame.canvas?.height||600)/2};
  hostGame.overworldState = null;
  hostGame.log?.(`Returned to ${hostGame.world.name}.`);
  addStatusText(actor || hostGame.player, 'Returned from Side Zone', { color: '#73d18a', ttl: 1.1 });
  return true;
}

export function updateSideZoneState(game) {
  updateBlightedGrove(game);
  const world = game?.world;
  const player = game?.player;
  if (!world || world.mode !== 'sideZone' || !player || world.cleared) return;

  const living = (world.enemies || []).some(enemy => enemy && !enemy.dead && enemy.hp > 0 && !enemy.remove);
  if (living) return;

  world.cleared = true;
  const definition = SIDE_ZONE_DEFINITIONS[world.sideZoneType] || SIDE_ZONE_DEFINITIONS.hollowGrove;
  const state = getSideZoneState(player, world.regionId, world.sideZoneType);
  state.clears += 1;
  state.lastClearedAt = Date.now();

  gainXp(player, 'renown', 25 + Number(world.tier || 1) * 8, game.log);
  if (!state.firstClearRewardClaimed) {
    addItem(player, definition.reward[0], definition.reward[1]);
    state.firstClearRewardClaimed = true;
    addLootText(player, `${definition.reward[0]} x${definition.reward[1]}`, { color: '#d9ad4f' });
  }

  game.log?.(`${world.name} cleared. Its resources and threats will return on a future expedition.`);
  addQuestText(player, `${world.name} Cleared`, { color: '#73d18a', ttl: 1.35 });
}

export function createProceduralSideZoneWorld(options = {}) {
  const type = options.type || 'hollowGrove';
  if(type==='hollowGrove'&&(!options.regionId||options.regionId==='hearthmereFrontier'))return createBlightedGrove(options);
  const definition = SIDE_ZONE_DEFINITIONS[type] || SIDE_ZONE_DEFINITIONS.hollowGrove;
  const regionId = options.regionId || 'hearthmereFrontier';
  const world = createDungeonWorld({
    dungeonId: `sideZone-${regionId}-${type}`,
    entranceId: `sideZone-${type}`,
    name: options.name || definition.name,
    seed: options.seed || `${regionId}-${type}`,
    theme: options.theme || definition.theme,
    tier: options.tier || definition.tier,
    depth: 1,
    playerCount: options.playerCount || 1
  });

  world.mode = 'sideZone';
  world.regionId = regionId;
  world.sideZoneType = type;
  world.sideZoneSeed = options.seed || `${regionId}-${type}`;
  world.cleared = false;
  world.objects = (world.objects || []).map(object => {
    if (object.kind !== 'dungeonExit') return object;
    return {
      ...object,
      id: 'sideZoneExit',
      kind: 'sideZoneExit',
      name: 'Return to the Region',
      locked: false
    };
  });
  world.enemies = (world.enemies || []).map(enemy => enemy?.isBoss ? {
    ...enemy,
    isBoss: false,
    isDungeonMainBoss:false,arenaDormant:false,arenaId:null,
    miniBoss: true,
    bossId: null,
    bossType: null,
    bossName: null,
    name: `${definition.name} Warden`
  } : enemy);

  world.bossArena=null;world.arenaBarriers=[];world.arenaGates=[];
  return world;
}

function recordSideZoneVisit(player, regionId, type) {
  const state = getSideZoneState(player, regionId, type);
  state.visits += 1;
  state.lastVisitedAt = Date.now();
}

function getSideZoneState(player, regionId, type) {
  player.sideZones = player.sideZones && typeof player.sideZones === 'object' ? player.sideZones : {};
  player.sideZones[regionId] = player.sideZones[regionId] && typeof player.sideZones[regionId] === 'object'
    ? player.sideZones[regionId]
    : {};
  player.sideZones[regionId][type] = {
    visits: 0,
    clears: 0,
    firstClearRewardClaimed: false,
    ...(player.sideZones[regionId][type] || {})
  };
  return player.sideZones[regionId][type];
}

function placeHostAndParty(game, point) {
  const host = game.player;
  host.x = point.x;
  host.y = point.y;
  host.dirX = 0;
  host.dirY = 1;
  host.currentZone = game.world.name;
  const allies = (host.coop?.players || []).filter(ally => ally && ally.active !== false && ally.joined !== false);
  const offsets = [{ x: -TILE, y: 0 }, { x: TILE, y: 0 }, { x: 0, y: TILE }];

  allies.forEach((ally, index) => {
    const offset = offsets[index] || { x: 0, y: TILE };
    const arrival=findNearestActorPassablePoint(game.world,host.x+offset.x,host.y+offset.y,12);
    ally.x = arrival.x;
    ally.y = arrival.y;
    ally.dirX = 0;
    ally.dirY = 1;
    ally.currentZone = host.currentZone;
  });

  if (game.camera && game.canvas) {
    game.camera.x = host.x - game.canvas.width / 2;
    game.camera.y = host.y - game.canvas.height / 2;
  }
}

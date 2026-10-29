import {rememberRepeatableInstance,restoreRepeatableInstance} from './instanceEncounterMemory.js';
import {requestPartyEntry} from './partyEntrySystem.js';
import {configureEncounterEnemy} from './encounterData.js';
import {CONTINENT_REGIONS} from './continentDefinition.js';
import {initializeDungeonArena,resetFailedDungeonArena} from './dungeonArenaSystem.js';
import {rollRegionalMythical} from './regionalLootSystem.js';
import {dressWorld} from './worldAuthorship.js';
// towerSystem.js
// Infinite Tower foundation: generated encounter floors, milestone exits,
// reward chest, and highest-floor persistence.

import { TILE, WORLD_W, WORLD_H } from './data.js';
import { addItem } from './player.js';
import { addLootText, addQuestText, addStatusText } from './floatingText.js';
import { playSfx } from './audioSystem.js';
import { getRegionInfiniteDungeon } from './regionData.js';
import { createOverworldReturnState, restoreOverworldFromState } from './dungeonSystem.js';
import {migrateEchorynPosition} from './echorynLayout.js';
import {restoreContinentalState} from './continentPersistence.js';
import {findNearestActorPassablePoint} from './world.js';
import { applyEnemyStrengthScaling } from './enemyScaling.js';
import {
  applyCoopAggroRange,
  applyCoopBossHealthScaling,
  getCoopEnemyScalingPlayerCount,
  getScaledEnemyCount
} from './coopEnemyScaling.js';

export function enterTower(game, floor = 1, entrance = null, options = {}) {
  const hostGame = game?.hostGame || game;
  const actor = game?.player || hostGame?.player;
  if (!hostGame?.player || !hostGame?.world) return false;
  if (hostGame.world.mode === 'tower' && hostGame.world.bossArena?.phase === 'active') {
    hostGame.log?.('The boss arena is sealed.'); return false;
  }
  if (hostGame.world.mode !== 'tower' && !options.partyEntryCommitted && !requestPartyEntry(hostGame, {
    key: `tower:${entrance?.id || floor}`, title: entrance?.name || 'the Infinite Dungeon', initiator: actor,
    commit: () => enterTower(game, floor, entrance, {partyEntryCommitted: true})
  })) return false;

  if (hostGame.world.mode !== 'tower') {
    hostGame.overworldState = createOverworldReturnState(hostGame, entrance || {
      x: actor?.x || hostGame.player.x,
      y: actor?.y || hostGame.player.y
    });
  }

  const regionId = resolveInfiniteDungeonRegion(hostGame, entrance);
  const safeFloor = Math.max(1, Math.floor(floor || 1));
  const tower = createTowerFloorWorld(safeFloor, hostGame.player, regionId);
  const regionState = getRegionalDungeonState(hostGame.player, regionId);
  if(hostGame.world.mode==='tower')rememberRepeatableInstance(hostGame);
  restoreRepeatableInstance(tower,hostGame.player);initializeDungeonArena(tower);

  hostGame.world = tower;
  regionState.unlocked = true;
  regionState.currentFloor = safeFloor;
  hostGame.player.tower = hostGame.player.tower || {};
  hostGame.player.tower.unlocked = true;
  hostGame.player.tower.currentFloor = safeFloor;

  hostGame.player.x = tower.spawn.x;
  hostGame.player.y = tower.spawn.y;
  hostGame.player.dirX = 0;
  hostGame.player.dirY = 1;
  hostGame.player.currentZone = tower.name;
  placePartyNearHost(hostGame);

  hostGame.camera.x = hostGame.player.x - hostGame.canvas.width / 2;
  hostGame.camera.y = hostGame.player.y - hostGame.canvas.height / 2;

  hostGame.log?.(`Entered ${tower.infiniteDungeonName} floor ${safeFloor}. Only this floor is active.`);
  playSfx('dungeon', { volume: 0.82, throttle: 0.12 });
  addQuestText(actor || hostGame.player, `${tower.infiniteDungeonName}: Floor ${safeFloor}`, {
    color: getRegionDungeonColor(regionId),
    ttl: 1.35,
    size: 16
  });

  return true;
}

export function exitTower(game,options={}) {
  const hostGame = game?.hostGame || game;
  const actor = game?.player || hostGame?.player;
  if (!hostGame?.player || hostGame.world?.mode !== 'tower') return false;

  if(hostGame.world.bossArena?.phase==='active'&&!options.force){hostGame.log?.('The boss arena is sealed.');return false;}
  if(options.force)resetFailedDungeonArena(hostGame.world);
  rememberRepeatableInstance(hostGame,{failed:!!options.force});
  const regionId = hostGame.world.infiniteDungeonRegionId || 'hearthmereFrontier';
  const regionState = getRegionalDungeonState(hostGame.player, regionId);

  hostGame.world = restoreOverworldFromState(hostGame.overworldState);
  const requested = hostGame.overworldState?.returnPoint || hostGame.world.spawn || {x:18*TILE,y:29*TILE};
  hostGame.world.continentRuntime?.activate?.([requested],hostGame.player);
  restoreContinentalState(hostGame);
  const returnPoint = findNearestActorPassablePoint(hostGame.world,requested.x,requested.y,12);

  hostGame.player.x = returnPoint.x;
  hostGame.player.y = returnPoint.y;
  hostGame.player.dirX = 0;
  hostGame.player.dirY = 1;
  migrateEchorynPosition(hostGame.world,hostGame.player);
  hostGame.player.currentZone = hostGame.world.name;
  regionState.currentFloor = 0;
  hostGame.player.tower = hostGame.player.tower || {};
  hostGame.player.tower.currentFloor = 0;
  placePartyNearHost(hostGame);
  hostGame.camera = hostGame.overworldState?.camera || {
    x: hostGame.player.x - hostGame.canvas.width / 2,
    y: hostGame.player.y - hostGame.canvas.height / 2
  };
  hostGame.overworldState = null;

  hostGame.log?.('You leave the infinite dungeon.');
  playSfx('quest', { volume: 0.7, throttle: 0.12 });
  addStatusText(actor || hostGame.player, 'Returned from Infinite Dungeon', {
    color: '#73d18a',
    ttl: 1.1
  });

  return true;
}

export function updateTowerState(game) {
  const world = game?.world;
  if (!world || world.mode !== 'tower') return;

  const living = (world.enemies || []).filter(enemy => {
    return enemy && !enemy.dead && enemy.alive !== false && enemy.hp > 0 && !enemy.remove && !(world.floorType==='boss'&&(enemy.summonedByBoss||enemy.summonedBy));
  });

  if (living.length > 0) return;

  for (const object of world.objects || []) {
    if (object.kind === 'towerRewardChest' || object.kind === 'towerStairs' || object.kind === 'towerExit') {
      object.locked = false;
    }
  }

  // Treasure floors and restored cleared floors still need their locks synced.
  // Only the first clear should award progress or play the clear notification.
  if (world.cleared) return;
  world.cleared = true;
  if(world.floorType==='boss'&&!world.objects.some(o=>o.id==='towerBossReturnPortal')){const center=world.bossRoomCenter||world.spawn;const point=findNearestActorPassablePoint(world,center.x,center.y+64,12);world.objects.push({id:'towerBossReturnPortal',kind:'towerExit',name:'Return to Overworld',...point,r:24,locked:false,returnPortal:true});}

  const floor = world.floor || 1;
  const regionId = world.infiniteDungeonRegionId || 'hearthmereFrontier';
  const regionState = getRegionalDungeonState(game.player, regionId);
  const previousHighest = regionState.highestFloor || 0;
  regionState.highestFloor = Math.max(previousHighest, floor);
  game.player.tower = game.player.tower || {};
  game.player.tower.highestFloor = Math.max(game.player.tower.highestFloor || 0, floor);

  game.log?.(`${world.infiniteDungeonName || 'Infinite dungeon'} floor ${floor} cleared.`);
  playSfx('quest', { volume: 0.82, throttle: 0.12 });
  addQuestText(game.player, previousHighest < floor ? `New Highest Floor: ${floor}` : `Floor ${floor} Cleared`, {
    color: getRegionDungeonColor(regionId),
    ttl: 1.35
  });
}

export function claimTowerReward(game, chest) {
  if (!game?.player || !chest || chest.claimed) return false;
  if (chest.locked) {
    game.log?.('The reward chest is sealed until the floor is clear.');
    return false;
  }

  const floor = game.world?.floor || 1;
  const regionId = game.world?.infiniteDungeonRegionId || 'hearthmereFrontier';
  const reward = getRegionFloorReward(regionId, floor);

  addItem(game.player, reward[0], reward[1]);
  // Repeatable floors supply the existing currency and upgrade materials.
  game.player.gold+=Math.min(150,18+floor*3);
  if(floor>=11)addItem(game.player,'arcaneDust',2+Math.min(8,Math.floor(floor/10)));
  if(floor>=16&&floor%5===0)addItem(game.player,'towerFragment',1+Math.floor(floor/25));
  if(floor%5===0){const mythical=rollRegionalMythical({chestType:'boss',name:game.world?.name},game.world,Math.random,'chest');if(mythical)addItem(game.player,mythical.item,1);}
  chest.claimed = true;
  chest.depleted = true;
  playSfx('chest', { volume: 0.9, throttle: 0.08 });

  const label = `${rewardName(reward[0])} x${reward[1]}`;
  game.log?.(`Tower reward: ${label}.`);
  addLootText(game.player, label, {
    color: floor % 10 === 0 ? '#ff7ac8' : '#66f0ff',
    ttl: 1.35
  });

  return true;
}

export function createTowerFloorWorld(floor, player, regionId = 'hearthmereFrontier') {
  const tiles = createTowerTiles();
  const floorType = getTowerFloorType(floor);
  const modifier = getTowerModifier(floor);
  const playerCount = getCoopEnemyScalingPlayerCount(player);
  const enemies = createTowerEnemies(floor, floorType, modifier, regionId, playerCount);
  const identity = getRegionInfiniteDungeon(regionId);

  const world = {
    mode: 'tower',
    name: `${identity.name} Floor ${floor}`,
    infiniteDungeonName: identity.name,
    infiniteDungeonId: identity.id,
    infiniteDungeonRegionId: regionId,
    regionId,
    theme: identity.theme,
    floor,
    floorType,
    modifier,
    width:tiles[0].length,
    height:tiles.length,
    rooms:[floorType==='boss'?{id:'tower-arena',role:'boss',x:17,y:10,w:46,h:27,cx:40,cy:23}:{id:'tower-hall',x:7,y:8,w:59,h:31,cx:36,cy:23}],
    tiles,
    objects: createTowerObjects(floor).map(object => enemies.length === 0
      ? { ...object, locked: false } : object),
    enemies,
    drops: [],
    effects: [],
    combatEffects: [],
    cleared: enemies.length === 0,
    spawn: {
      x: 11 * TILE,
      y: 27 * TILE
    }
  };
  if(floorType==='boss'){for(let y=9;y<=37;y++)for(let x=16;x<=63;x++)if((x===16||x===63||y===9||y===37)&&!(x===16&&y>=22&&y<=25))world.tiles[y][x]={biome:'wall',passable:false};}
  const base=CONTINENT_REGIONS.find(r=>r.id===regionId)?.levels[0]||1;
  const level=base+Math.max(0,Math.floor(floor)-1);
  for(const e of world.enemies)configureEncounterEnemy(e,{id:`${regionId}:tower:${floor}`,levels:[level,level+2],eliteChance:.12,rareChance:.03,championChance:.006},`${regionId}:${floor}:${e.id}`,{dungeon:true});
  if(floorType==='boss')world.bossRoomCenter={x:40*TILE,y:23*TILE};
  initializeDungeonArena(world);
  return dressWorld(world);
}

function createTowerTiles() {
  const tiles = [];

  for (let y = 0; y < WORLD_H; y++) {
    const row = [];

    for (let x = 0; x < WORLD_W; x++) {
      const inArena = x >= 6 && x <= 66 && y >= 7 && y <= 40;
      const inner = x >= 9 && x <= 63 && y >= 10 && y <= 37;

      row.push({
        biome: inArena ? (inner ? 'ruin' : 'path') : 'wall',
        variant: (x + y) % 2
      });
    }

    tiles.push(row);
  }

  return tiles;
}

function createTowerObjects(floor) {
  const milestone = floor % 5 === 0;

  return [
    {
      id: 'towerExit',
      kind: 'towerExit',
      name: milestone ? 'Milestone Exit' : 'Emergency Exit',
      x: 11 * TILE,
      y: 31 * TILE,
      r: 22,
      locked: false
    },
    {
      id: 'towerRewardChest',
      kind: 'towerRewardChest',
      name: 'Tower Reward',
      x: 36 * TILE,
      y: 17 * TILE,
      r: 20,
      locked: true,
      claimed: false
    },
    {
      id: 'towerStairs',
      kind: 'towerStairs',
      name: 'Next Floor',
      x: 61 * TILE,
      y: 27 * TILE,
      r: 24,
      locked: true
    }
  ];
}

function createTowerEnemies(floor, floorType, modifier, regionId, playerCount = 1) {
  if (floorType === 'treasure') return [];

  const tier = 1 + Math.floor(floor / 4);
  const baseCount = floorType === 'elite' ? 3 : floorType === 'boss' ? 1 : Math.min(16, 8 + Math.floor(floor / 4));
  const count = floorType === 'boss'
    ? baseCount
    : getScaledEnemyCount(baseCount, playerCount, {
        cap: floorType === 'elite' ? 8 : 14
      });
  const regionalKinds = getRegionDungeonKinds(regionId);
  const kinds = floorType === 'boss'
    ? regionalKinds.slice(-3)
    : regionalKinds;
  const eliteModifiers = ['burning', 'frozen', 'vampiric', 'armoured', 'swift', 'poisoned'];

  const enemies = [];

  for (let i = 0; i < count; i++) {
    const kind = kinds[(floor + i) % kinds.length];
    const boss = floorType === 'boss';
    const elite = floorType === 'elite' || i === 0 && floor % 5 === 0;
    const hp = Math.floor((boss ? 220 : elite ? 120 : 54) * (1 + floor * 0.12));
    const damage = Math.floor((boss ? 18 : elite ? 13 : 7) * (1 + floor * 0.06));

    enemies.push(applyCoopBossHealthScaling(applyCoopAggroRange(applyEnemyStrengthScaling({
      id: `tower-${floor}-${kind}-${i}`,
      kind,
      name: boss ? `${getRegionInfiniteDungeon(regionId).name} Warden ${floor}` : elite ? `Elite ${prettyKind(kind)}` : prettyKind(kind),
      x: (24 + (i % 4) * 8) * TILE,
      y: (19 + Math.floor(i / 4) * 8) * TILE,
      r: boss ? 20 : elite ? 17 : 14,
      radius: boss ? 20 : elite ? 17 : 14,
      hp,
      maxHp: hp,
      damage,
      dmg: damage,
      xp: Math.floor(26 + floor * 8),
      speed: getTowerEnemySpeed(kind, modifier),
      aggroRange: 520,
      attackRange: boss ? 32 : 26,
      attackRate: modifier === 'swarm' ? 0.88 : 1.05,
      attackCooldown: 0,
      isBoss: boss,
      bossName: boss ? `${getRegionInfiniteDungeon(regionId).name} Warden ${floor}` : null,
      elite,
      eliteModifier: elite || boss ? eliteModifiers[(floor + i) % eliteModifiers.length] : null,
      towerFloor: floor,
      infiniteDungeonRegionId: regionId,
      towerModifier: modifier,
      dead: false,
      remove: false
    })), playerCount));
  }

  return enemies;
}

function getTowerFloorType(floor) {
  if (floor % 10 === 0) return 'boss';
  if (floor % 5 === 0) return 'elite';
  if (floor % 7 === 0) return 'treasure';
  return 'combat';
}

function getTowerModifier(floor) {
  const modifiers = ['none', 'bloodMoon', 'withered', 'ironTrial', 'swarm', 'hunter', 'cursed'];
  return modifiers[floor % modifiers.length];
}

function getTowerEnemySpeed(kind, modifier) {
  const base =
    kind === 'stalkerWolf' ? 86 :
    kind === 'exploder' ? 90 :
    kind === 'wraith' ? 74 :
    kind === 'archer' ? 64 :
    kind === 'cultist' ? 52 :
    kind === 'gravePriest' ? 44 :
    kind === 'brute' ? 36 :
    kind === 'shieldKnight' ? 42 :
    kind === 'ashWolf' ? 82 :
    kind === 'gravebound' ? 44 :
    kind === 'veyrWraith' ? 68 :
    62;
  return modifier === 'hunter' ? base * 1.15 : base;
}

function prettyKind(kind) {
  if (kind === 'basicBeast') return 'Blighted Beast';
  if (kind === 'stalkerWolf') return 'Stalker Wolf';
  if (kind === 'shieldKnight') return 'Shield Knight';
  if (kind === 'archer') return 'Tower Archer';
  if (kind === 'cultist') return 'Tower Cultist';
  if (kind === 'gravePriest') return 'Grave Priest';
  if (kind === 'brute') return 'Iron Brute';
  if (kind === 'wraith') return 'Phasing Wraith';
  if (kind === 'exploder') return 'Volatile Husk';
  if (kind === 'ashWolf') return 'Ash Wolf';
  if (kind === 'gravebound') return 'Gravebound';
  if (kind === 'roadlessBandit') return 'Roadless Bandit';
  if (kind === 'veyrWraith') return 'Veyr Wraith';
  return 'Blighted Corpse';
}

function rewardName(itemId) {
  if (itemId === 'towerFragment') return 'Tower Fragment';
  if (itemId === 'arcaneDust') return 'Arcane Dust';
  if (itemId === 'ironScrap') return 'Iron Scrap';
  if (itemId === 'graveAsh') return 'Grave Ash';
  if (itemId === 'paleEssence') return 'Pale Essence';
  if (itemId === 'veyrglassShard') return 'Veyrglass Shard';
  if (itemId === 'bossCore') return 'Boss Core';
  return itemId;
}

function resolveInfiniteDungeonRegion(game, entrance) {
  return entrance?.infiniteDungeonRegionId ||
    entrance?.sourceRegionId ||
    entrance?.regionId ||
    game?.world?.infiniteDungeonRegionId ||
    game?.world?.regionId ||
    game?.player?.regions?.currentRegionId ||
    'hearthmereFrontier';
}

function getRegionalDungeonState(player, regionId) {
  player.infiniteDungeons = player.infiniteDungeons && typeof player.infiniteDungeons === 'object'
    ? player.infiniteDungeons
    : {};
  player.infiniteDungeons[regionId] = {
    unlocked: regionId === 'hearthmereFrontier',
    highestFloor: 0,
    currentFloor: 0,
    rewardsClaimed: {},
    ...(player.infiniteDungeons[regionId] || {})
  };
  return player.infiniteDungeons[regionId];
}

function getRegionDungeonKinds(regionId) {
  if (regionId === 'aureateMarches') {
    return ['shieldKnight', 'cultist', 'archer', 'gravePriest', 'wraith', 'brute', 'exploder'];
  }

  if (regionId === 'ascensionWastes') {
    return ['wraith', 'shieldKnight', 'cultist', 'exploder', 'brute', 'wraith', 'shieldKnight'];
  }

  return ['basicBeast', 'stalkerWolf', 'cultist', 'gravePriest', 'wraith', 'brute', 'exploder'];
}

function getRegionFloorReward(regionId, floor) {
  if (regionId === 'ascensionWastes') {
    return floor % 10 === 0
      ? ['bossCore', 1]
      : floor % 5 === 0
        ? ['veyrglassShard', 2]
        : ['towerFragment', 2 + Math.floor(floor / 5)];
  }

  if (regionId === 'aureateMarches') {
    return floor % 10 === 0
      ? ['towerFragment', 2]
      : floor % 5 === 0
        ? ['veyrglassShard', 1]
        : ['arcaneDust', 2 + Math.floor(floor / 5)];
  }

  return floor % 10 === 0
    ? ['paleEssence', 3]
    : floor % 5 === 0
      ? ['graveAsh', 3]
      : ['ironScrap', 2 + Math.floor(floor / 3)];
}

function getRegionDungeonColor(regionId) {
  if (regionId === 'aureateMarches') return '#ffcc66';
  if (regionId === 'ascensionWastes') return '#b68cff';
  return '#66f0ff';
}

function placePartyNearHost(game) {
  const host = game?.player;
  if (!host) return;
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
}

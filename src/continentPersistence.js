// Sparse gameplay mutations only. Authored geography and scenery are rebuilt.
// Stable entity IDs, rather than chunk residency, own persistent state.
import {protectNavSanctuary} from './navStoneSanctuary.js';
import {scaleEnemyStats} from './overworldUtils.js';
const objectBaselines = new WeakMap();
const OBJECT_FLAGS = ['depleted', 'claimed', 'remove', 'removed', 'locked', 'opened', 'activated', 'completed', 'looted', 'triggered', 'eventTriggered', 'rewardClaimed'];
const ENEMY_FLAGS = ['dead', 'remove', 'enemyWorldLootGenerated', 'enemyEquipmentLootRolled', 'deathHandled', 'bossRewardClaimed', 'defeatRewardClaimed'];
const DROP_FIELDS = ['id', 'itemId', 'item', 'qty', 'quantity', 'name', 'rarity', 'upgradeTier', 'legendary', 'ownerSlot', 'ownerLabel', 'playerSpecific', 'x', 'y', 'ttl', 'sourceRegionId'];
const GENERATED_FIELDS = ['id', 'kind', 'archetype', 'name', 'x', 'y', 'homeX', 'homeY', 'r', 'radius', 'tier', 'level', 'combatLevel', 'hp', 'maxHp', 'damage', 'dmg', 'xp', 'baseCombatXp', 'speed', 'aggroRange', 'attackRange', 'attackRate', 'attackCooldown', 'originalAggroRange', 'baseAggroRange', 'dead', 'remove', 'alive', 'elite', 'isElite', 'eliteModifier', 'scale', 'guardRole', 'encounterAllegiance', 'controlledMinion', 'visualFactionId', 'enemyVisualFactionInferred', 'humanEquipmentVersion', 'runalisEnemyBalanceVersion', 'runalisStrengthScaled', 'runalisCoopAggroVersion', 'sourceRegionId', 'dynamicEncounter', 'dynamicEncounterId', 'temporaryEncounter', 'spawnedAt', 'despawnAfter', 'npcId', 'classId', 'simulatedPlayer', 'disposition', 'role', 'factionId', 'ambientWander', 'wanderRadiusTiles', 'wanderSpeed', 'wanderPauseMin', 'wanderPauseMax', 'shirt', 'pants', 'boots', 'talk', 'labelPriority', 'enemyWorldLootGenerated', 'enemyEquipmentLootRolled'];
const MAX_GENERATED = 192;
GENERATED_FIELDS.push('encounterStatsVersion','encounterTier','encounterRegion','rewardSeed','populationAreaId','populationCycle','populationNextAt','encounterEvent','eliteInitialized','locked','completed','rewardSuppressed','summonedBy','summonedByBoss');
GENERATED_FIELDS.push('deathHandled','eliteHealRemaining');
GENERATED_FIELDS.push('fastCombatVersion');
GENERATED_FIELDS.push('stamina','maxStamina','spirit','maxSpirit','subclassId');
const PERSISTENT_OBJECT_KINDS = new Set(['npc', 'navStone', 'worldSecret', 'worldRelic', 'worldChest', 'worldCache', 'chest', 'cache', 'supplyCache', 'poiInvestigation', 'dungeonEntrance', 'sideZoneEntrance', 'towerEntrance', 'travelRouteEntrance', 'travelRouteExit', 'travelCheckpoint', 'dungeonDoor', 'event', 'worldEvent', 'herb', 'reed', 'gravecap', 'bone', 'ore', 'rock', 'tree', 'log', 'deadwood', 'rareTree', 'fish', 'runestone', 'ashFruit', 'lanternMoss', 'bell']);
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const finite = value => Number.isFinite(Number(value));
const safeId = value => typeof value === 'string' && value.length > 0 && value.length <= 240 && !['__proto__', 'prototype', 'constructor'].includes(value);

export function continentalMemory(player) {
  if (!player) return null;
  player.worldMemory ||= {};
  const source = record(player.worldMemory.continent);
  source.version = 1;
  source.entities = record(source.entities);
  source.drops = record(source.drops);
  source.events = record(source.events);
  source.generated = record(source.generated);
  player.worldMemory.continent = source;
  return source;
}

function activePopulationMember(memory,id){return Object.values(memory.events).some(e=>e.status==='active'&&(e.memberIds||[]).includes(id));}
function elapsed(player) { return Math.max(0, Number(player?.worldMemory?.elapsed) || 0); }
function meaningfulObject(entity) {
  return entity && safeId(entity.id) && (PERSISTENT_OBJECT_KINDS.has(entity.kind) || entity.persistent || entity.questCritical || entity.eventId || entity.rewards || entity.reward || entity.itemId && !entity.decorative);
}
function baseline(entity) {
  let initial = objectBaselines.get(entity);
  if (!initial) {
    initial = {};
    for (const key of OBJECT_FLAGS) initial[key] = entity[key];
    for (const key of ['eventState', 'rewardState']) if (entity[key] != null) initial[key] = JSON.stringify(entity[key]);
    objectBaselines.set(entity, initial);
  }
  return initial;
}
function cleanSmallState(value, depth = 0) {
  if (value == null || ['string', 'boolean'].includes(typeof value)) return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (depth > 4 || typeof value !== 'object') return undefined;
  if (Array.isArray(value)) return value.slice(0, 100).map(v => cleanSmallState(v, depth + 1));
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (!safeId(key)) continue;
    const clean = cleanSmallState(item, depth + 1);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}
function entitiesIn(world, kind) {
  const runtime = world?.continentRuntime;
  const entries = [...(world?.[kind] || [])];
  if (runtime?.chunks instanceof Map) for (const chunk of runtime.chunks.values()) entries.push(...(chunk?.[kind] || []));
  const all = runtime?.[kind === 'enemies' ? 'allEnemies' : 'allObjects'];
  if (Array.isArray(all)) entries.push(...all);
  else if (all instanceof Map) entries.push(...all.values());
  const ids = new Set();
  return [...new Set(entries)].filter(entity => {
    if (!entity || ids.has(entity.id)) return false;
    ids.add(entity.id); return true;
  });
}

export function captureContinentalState(game) {
  const host = game?.hostGame || game, world = host?.world, player = host?.player;
  if (!player || world?.continentId !== 'runalis' || !world.continentRuntime) return null;
  const memory = continentalMemory(player), now = elapsed(player);
  const party=[player,...(player.coop?.players || []).filter(actor=>actor?.active!==false)];
  for (const [id, snapshot] of Object.entries(memory.generated)) if (Number(snapshot.expiresAt) <= now) delete memory.generated[id];
  for (const [id, state] of Object.entries(memory.entities)) if (state.retireAt != null && Number(state.retireAt) <= now&&!activePopulationMember(memory,id)) delete memory.entities[id];
  for (const entity of entitiesIn(world, 'enemies')) {
    if (!safeId(entity.id)) continue;
    const state = {kind: 'enemy'};
    const dead = entity.dead || entity.remove || entity.alive === false || Number(entity.hp) <= 0;
    if (dead) { state.dead = true; state.remove = true; state.hp = 0; state.alive = false; }
    if(dead&&memory.entities[entity.id]?.respawnAt)state.respawnAt=memory.entities[entity.id].respawnAt;
    if(entity.eliteHealRemaining!=null)state.eliteHealRemaining=entity.eliteHealRemaining;
    if (!dead && finite(entity.hp) && Number(entity.hp) < Number(entity.maxHp)) state.hp = Math.max(0, Number(entity.hp));
    for (const key of ENEMY_FLAGS) if (entity[key] === true) state[key] = true;
    if (Object.keys(state).length > 1) {
      if (finite(entity.x) && finite(entity.y)) { state.x = Number(entity.x); state.y = Number(entity.y); }
      if (entity.sourceRegionId) state.sourceRegionId = entity.sourceRegionId;
      if (entity.dynamicEncounter || entity.temporaryEncounter) {
        state.retireAt = (Math.floor(now / 720) + 1) * 720;
        if (dead&&entity.deathHandled) delete memory.generated[entity.id];
      }
      memory.entities[entity.id] = state;
    } else delete memory.entities[entity.id];
    if (!dead||!entity.deathHandled) captureGenerated(entity, memory, now, 'enemy',party);
  }
  for (const entity of entitiesIn(world, 'objects')) {
    captureGenerated(entity, memory, now, 'object',party);
    if (!meaningfulObject(entity)) continue;
    const initial = baseline(entity), state = {kind: 'object'};
    for (const key of OBJECT_FLAGS) {
      if (typeof entity[key] === 'boolean' && entity[key] !== initial[key]) state[key] = entity[key];
    }
    // Harvest timers already have their own stable, region-specific ledger.
    // This expiry also covers authored reward objects using the same depleted flag.
    if (entity.depleted && Number(entity.respawn) > 0) {
      const harvestKey=`overworld:${entity.sourceRegionId || world.regionId}:${entity.id}`;
      const remembered=Number(player.worldMemory?.harvests?.[harvestKey]);
      const prior=Number(memory.entities[entity.id]?.respawnAt);
      state.respawnAt = remembered > 0 ? remembered : prior > 0 ? Math.min(prior,now+Number(entity.respawn)) : now+Number(entity.respawn);
    }
    for (const key of ['eventState', 'rewardState']) {
      if (entity[key] != null && JSON.stringify(entity[key]) !== initial[key]) state[key] = cleanSmallState(entity[key]);
    }
    if (Object.keys(state).length > 1) {
      if (entity.sourceRegionId) state.sourceRegionId = entity.sourceRegionId;
      if (entity.dynamicEncounter || entity.temporaryEncounter) state.retireAt = (Math.floor(now / 720) + 1) * 720;
      memory.entities[entity.id] = state;
    } else delete memory.entities[entity.id];
  }
  const drops = [...(world.drops || [])];
  if (world.continentRuntime.chunks instanceof Map) for (const chunk of world.continentRuntime.chunks.values()) drops.push(...(chunk?.drops || []));
  for (const drop of new Set(drops)) {
    if (!drop || !safeId(drop.id)) continue;
    const knownExpiry = memory.drops[drop.id]?.expiresAt;
    if (knownExpiry != null && Number(knownExpiry) <= now) {
      drop.collected = true;
      delete memory.drops[drop.id];
      continue;
    }
    if (drop.collected || drop.remove || Number(drop.ttl) > 0 && Number(drop.age || 0) >= Number(drop.ttl)) {
      delete memory.drops[drop.id]; continue;
    }
    const saved = {};
    for (const key of DROP_FIELDS) if (drop[key] != null && ['string', 'number', 'boolean'].includes(typeof drop[key])) saved[key] = drop[key];
    if (!finite(saved.x) || !finite(saved.y) || !(saved.itemId || saved.item)) continue;
    const previousExpiry = memory.drops[drop.id]?.expiresAt;
    saved.expiresAt = Number(drop.ttl) > 0 ? now + Math.max(0, Number(drop.ttl) - Number(drop.age || 0)) : null;
    if (previousExpiry != null && saved.expiresAt != null) saved.expiresAt=Math.min(Number(previousExpiry),saved.expiresAt);
    memory.drops[drop.id] = saved;
  }
  for (const [id, drop] of Object.entries(memory.drops)) if (drop.expiresAt != null && drop.expiresAt <= now) delete memory.drops[id];
  return memory;
}

function captureGenerated(entity, memory, now, kind, party=[]) {
  if (!entity || !safeId(entity.id) || !(entity.dynamicEncounter || entity.temporaryEncounter)) return;
  const pendingDeath=kind==='enemy'&&(entity.dead||entity.hp===0)&&!entity.deathHandled;
  if (!pendingDeath&&(entity.remove || entity.dead || entity.depleted || entity.hp === 0)) { delete memory.generated[entity.id]; return; }
  let expiresAt = Number(entity.spawnedAt || 0) + Number(entity.despawnAfter || 240);
  // The existing activity spawner retains overdue encounters while nearby.
  // Preserve that encounter when saving mid-fight; it can retire after leaving.
  if (expiresAt <= now && party.some(actor=>Math.hypot(Number(actor.x||0)-Number(entity.x||0),Number(actor.y||0)-Number(entity.y||0))<=94*32)) expiresAt=now+1;
  if (expiresAt <= now) { delete memory.generated[entity.id]; return; }
  if (!memory.generated[entity.id] && Object.keys(memory.generated).length >= MAX_GENERATED) return;
  const snapshot = {entityType: kind, expiresAt};
  for (const key of GENERATED_FIELDS) if (entity[key] != null && ['string', 'number', 'boolean'].includes(typeof entity[key])) snapshot[key] = entity[key];
  for (const key of ['equipment', 'appearance','eliteModifiers','patrolRoute','rewards']) if (entity[key]) snapshot[key] = cleanSmallState(entity[key]);
  memory.generated[entity.id] = snapshot;
}

export function continentalGeneratedEntities(player, kind = 'enemy', bounds = null) {
  const memory = continentalMemory(player), now = elapsed(player), result = [];
  for (const [id, saved] of Object.entries(memory?.generated || {})) {
    if (!safeId(id) || Number(saved.expiresAt) <= now) { delete memory.generated[id]; continue; }
    if (saved.entityType !== kind || !finite(saved.x) || !finite(saved.y)) continue;
    if (bounds && (saved.x < bounds.minX || saved.y < bounds.minY || saved.x >= bounds.maxX || saved.y >= bounds.maxY)) continue;
    const entity = {...saved};
    if(kind==='enemy'&&saved.dynamicEncounterId&&!saved.fastCombatVersion&&!saved.simulatedPlayer){
      // Legacy patrol saves baked in combat tempo but lost its applied flag.
      // Rebuild only tempo from the patrol's authored kind/tier, never HP/loot.
      const authored=scaleEnemyStats(saved.kind,saved.tier||1);
      const legacyElite=!saved.encounterStatsVersion&&saved.eliteInitialized?({swift:1.25,blink:1.12,charger:1.18,fleeing:1.38}[saved.eliteModifier]||1):1;
      entity.speed=authored.speed*1.28*legacyElite;
      entity.attackRate=Math.max(.35,authored.attackRate*.78);
      entity.fastCombatVersion=1;
    }
    delete entity.entityType; delete entity.expiresAt;
    if (saved.equipment) entity.equipment = {...saved.equipment};
    for(const key of ['appearance','eliteModifiers','patrolRoute','rewards'])if(saved[key])entity[key]=cleanSmallState(saved[key]);
    result.push(applyContinentalEntityState(entity, player, kind));
  }
  return result;
}

export function continentalEncounterSuppressed(player, id) {
  const state = continentalMemory(player)?.entities[id];
  return !!(state?.dead && (state.retireAt == null || Number(state.retireAt) > elapsed(player)));
}

// Call on freshly hydrated chunk entities, before exposing them to gameplay.
export function applyContinentalEntityState(entity, player, kind = 'object') {
  if (!entity || !safeId(entity.id)) return entity;
  if (kind !== 'enemy' && kind !== 'enemies') baseline(entity);
  const memory = continentalMemory(player);
  const state = memory?.entities[entity.id];
  if (!state) return entity;
  if (state.retireAt != null && Number(state.retireAt) <= elapsed(player)&&!activePopulationMember(memory,entity.id)) { delete memory.entities[entity.id]; return entity; }
  const isEnemy = kind === 'enemy' || kind === 'enemies' || state.kind === 'enemy';
  for (const key of isEnemy ? [...ENEMY_FLAGS, 'alive', 'hp', 'x', 'y','eliteHealRemaining'] : OBJECT_FLAGS) {
    if (Object.prototype.hasOwnProperty.call(state, key)) entity[key] = state[key];
  }
  if (isEnemy && state.dead) { entity.hp = 0; entity.dead = true; entity.remove = true; entity.alive = false; }
  if (!isEnemy) {
    if (Number(state.respawnAt) > elapsed(player)) { entity.depleted = true; entity.respawn = Number(state.respawnAt) - elapsed(player); }
    else if (state.respawnAt != null) { entity.depleted = false; entity.respawn = 0; }
    for (const key of ['eventState', 'rewardState']) if (state[key] != null) entity[key] = cleanSmallState(state[key]);
  }
  return entity;
}

export function continentalDrops(player, bounds = null) {
  const memory = continentalMemory(player), now = elapsed(player), result = [];
  for (const [id, saved] of Object.entries(memory?.drops || {})) {
    if (!safeId(id) || !finite(saved.x) || !finite(saved.y)) continue;
    if (saved.expiresAt != null && Number(saved.expiresAt) <= now) { delete memory.drops[id]; continue; }
    if (bounds && (saved.x < bounds.minX || saved.y < bounds.minY || saved.x >= bounds.maxX || saved.y >= bounds.maxY)) continue;
    const drop = {...saved, collected: false, age: saved.expiresAt == null ? 0 : Math.max(0, Number(saved.ttl || 0) - (Number(saved.expiresAt) - now))};
    delete drop.expiresAt;
    result.push(drop);
  }
  return result;
}

export function restoreContinentalState(game) {
  const host = game?.hostGame || game, world = host?.world, player = host?.player;
  if (!player || world?.continentId !== 'runalis' || !world.continentRuntime) return false;
  continentalMemory(player);
  for (const entity of entitiesIn(world, 'enemies')) {applyContinentalEntityState(entity, player, 'enemy');protectNavSanctuary(world,entity);}
  for (const entity of entitiesIn(world, 'objects')) applyContinentalEntityState(entity, player, 'object');
  const ids = new Set((world.drops || []).map(drop => drop.id));
  world.drops ||= [];
  for (const drop of continentalDrops(player)) if (!ids.has(drop.id)) { world.drops.push(drop); ids.add(drop.id); }
  return true;
}

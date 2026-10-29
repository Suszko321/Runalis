import {encounterRng} from './encounterData.js';
import {rollRegionalMythical} from './regionalLootSystem.js';
import {rollGameplayEnemyLoot,announceLootDiscovery,lootDiscoveryProfile} from './gameplayDiscoveries.js';
import {isTieredEquipment} from './equipmentProgressionSystem.js';
// lootSystem.js
// Player-specific world loot drops and pickup handling.

import { ENEMY_ITEM_DROP_RATE_SCALAR, ITEMS, RARITY, rollEnemyLoot } from './data.js';
import {rollEnemyCollectible} from './enemyEquipmentLoot.js';
import { addItem } from './player.js';
import { addLootText } from './floatingText.js';
import { findNearestActorPassablePoint, isActorPositionPassable, isPassable } from './world.js';
import { markPartyCollectObjective } from './dialogueSystem.js';
import {
  announceLegendaryPickup,
  rollLegendaryBossDrop
} from './legendarySystem.js';

const PICKUP_RADIUS = 34;

export function createEnemyLootDrops(enemy, partyLeader, world) {
  if (!enemy || !world || enemy.rewardSuppressed || enemy.summonedBy || enemy.summonedByBoss) return [];
  if(enemy.enemyWorldLootGenerated)return [];
  enemy.enemyWorldLootGenerated=true;

  const owner = chooseLootOwner(enemy, partyLeader);
  const ownerSlot = owner?.slot || owner?.playerNumber || 1;
  const ownerLabel = ownerSlot === 2 ? 'P2' : 'P1';
  const rng=enemy.rewardSeed?encounterRng(enemy.rewardSeed):Math.random;
  const drops = rollEnemyLootSafe(enemy, world,rng).filter(drop=>!enemy.orchardCustodian||drop.item!=='orrakaiFoundersSignet');
  drops.push(...rollPoiLoot(enemy,rng));
  const legendaryDrop = rollLegendaryBossDrop(enemy,rng);
  if (legendaryDrop) drops.push(legendaryDrop);
  const mythical=rollRegionalMythical(enemy,world,rng);if(mythical)drops.push(mythical);
  const collectible=rollEnemyCollectible(enemy,world,rng);
  if(collectible&&!drops.some(drop=>drop.item===collectible.item))drops.push(collectible);
  for(const extra of rollGameplayEnemyLoot(enemy,owner,world,enemy.rewardSeed?encounterRng(`${enemy.rewardSeed}:discoveries`):rng))
    if(!ITEMS[extra.item]?.learnsAbility||!drops.some(drop=>drop.item===extra.item))drops.push(extra);

  world.drops = Array.isArray(world.drops) ? world.drops : [];

  const created = drops.map((drop, index) => {
    const item = ITEMS[drop.item];
    const angle = (index / Math.max(1, drops.length)) * Math.PI * 2;
    const distance = 14 + index * 5;
    const point = findReachableDropPoint(world, owner, enemy, angle, distance);

    return {
      id: `drop-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      itemId: drop.item,
      item: drop.item,
      qty: Math.max(1, Number(drop.qty || 1)),
      quantity: Math.max(1, Number(drop.qty || 1)),
      name: item?.name || drop.item,
      rarity: item?.rarity || 'common',
      discoveryType:lootDiscoveryProfile(drop.item)?.kind||null,
      ...(isTieredEquipment(item)?{upgradeTier:1}:{}),
      legendary: Boolean(drop.legendary || item?.rarity === 'legendary'),
      ownerSlot,
      ownerLabel,
      playerSpecific: true,
      x: point.x,
      y: point.y,
      age: 0,
      ttl: 90,
      collected: false
    };
  });

  world.drops.push(...created);
  return created;
}

function rollPoiLoot(enemy,rng=Math.random) {
  const profile = enemy?.poiLootProfile || enemy?.majorPoiId;
  if (!profile) return [];

  const elite = Boolean(enemy.isBoss || enemy.namedExteriorElite || enemy.eliteModifier);
  const drops = [];

  if (profile === 'castleVeyr') {
    if (rollPoiDrop(elite ? 1 : 0.28,rng)) drops.push({ item: 'veyrSigil', qty: 1 });
    if (rollPoiDrop(elite ? 0.38 : 0.1,rng)) drops.push({ item: 'veyrglassShard', qty: 1 });
    if (rollPoiDrop(0.22,rng)) drops.push({ item: 'paleEssence', qty: elite ? 2 : 1 });
  }

  if (profile === 'redSealKeep') {
    if (rollPoiDrop(elite ? 1 : 0.32,rng)) drops.push({ item: 'redSealFragment', qty: 1 });
    if (rollPoiDrop(0.34,rng)) drops.push({ item: 'cultAsh', qty: elite ? 2 : 1 });
    if (rollPoiDrop(0.2,rng)) drops.push({ item: 'ironScrap', qty: elite ? 2 : 1 });
  }

  return drops;
}

function rollPoiDrop(chance,rng=Math.random) {
  return rng() < Math.max(0, Math.min(1, Number(chance || 0) * ENEMY_ITEM_DROP_RATE_SCALAR));
}

export function updateWorldLootPickups(world, partyLeader, dt, log) {
  if (!world?.drops?.length || !partyLeader) return;

  const party = getPartyMembers(partyLeader);

  for (const drop of world.drops) {
    if (!drop || drop.collected) continue;

    drop.age = (drop.age || 0) + dt;

    if (drop.ttl && drop.age > drop.ttl) {
      drop.collected = true;
      continue;
    }

    const owner = party.find(member => {
      const slot = member?.slot || member?.playerNumber || 1;
      return slot === (drop.ownerSlot || 1);
    });

    if (!owner) continue;

    const distance = Math.hypot((owner.x || 0) - drop.x, (owner.y || 0) - drop.y);
    if (distance > PICKUP_RADIUS) continue;

    const itemId = drop.itemId || drop.item;
    const qty = drop.qty || drop.quantity || 1;
    addItem(owner, itemId, qty);
    markPartyCollectObjective(owner, itemId, qty);
    announceLootDiscovery(owner,itemId,world,log);
    drop.collected = true;

    const rarity = RARITY[drop.rarity];
    const itemName = drop.name || ITEMS[drop.itemId || drop.item]?.name || drop.itemId || drop.item;

    log?.(`${owner.name || drop.ownerLabel || 'Player'} obtained ${drop.qty || 1}x ${itemName}.`);

    addLootText(owner, itemName, {
      color: rarity?.color || '#d9ad4f',
      ttl: drop.rarity === 'rare' || drop.rarity === 'occult' || drop.rarity === 'epic' || drop.rarity === 'relic' || drop.rarity === 'legendary' || drop.rarity === 'mythic' || drop.rarity === 'ancient'
        ? 1.45
        : 1.05,
      important: drop.rarity === 'epic' || drop.rarity === 'relic' || drop.rarity === 'legendary' || drop.rarity === 'mythic' || drop.rarity === 'ancient'
    });

    if (drop.legendary || drop.rarity === 'legendary' || drop.rarity === 'mythic' || drop.rarity === 'ancient') {
      announceLegendaryPickup(owner, itemName);
      log?.(`LEGENDARY ACQUIRED: ${owner.name || drop.ownerLabel || 'Player'} obtained ${itemName}.`);
    }
  }

  world.drops = world.drops.filter(drop => drop && !drop.collected);
}

export function getLootRarityColor(rarity) {
  return RARITY?.[rarity]?.color || '#d9ad4f';
}

function chooseLootOwner(enemy, partyLeader) {
  const party = getPartyMembers(partyLeader);
  if (!party.length) return partyLeader;

  let best = party[0];
  let bestDistance = Infinity;

  for (const member of party) {
    const distance = Math.hypot((member.x || 0) - enemy.x, (member.y || 0) - enemy.y);
    if (distance < bestDistance) {
      best = member;
      bestDistance = distance;
    }
  }

  return best;
}

function getPartyMembers(player) {
  return [
    player,
    ...(player?.coop?.players || []).filter(ally => ally && ally.active !== false)
  ].filter(Boolean);
}

function rollEnemyLootSafe(enemy, world,rng=Math.random) {
  try {
    return rollEnemyLoot(enemy, { world,rng }) || [];
  } catch {
    return [];
  }
}

function findReachableDropPoint(world, owner, enemy, angle, distance) {
  const desiredX = enemy.x + Math.cos(angle) * distance;
  const desiredY = enemy.y + Math.sin(angle) * distance;
  const nearEnemy = findNearestActorPassablePoint(world, desiredX, desiredY, 6, 8);

  if (isActorPositionPassable(world, nearEnemy.x, nearEnemy.y, 6) && hasSimplePassableLine(world, owner, nearEnemy)) {
    return nearEnemy;
  }

  const ownerAngle = angle + Math.PI;
  const ownerX = (owner?.x || enemy.x) + Math.cos(ownerAngle) * 24;
  const ownerY = (owner?.y || enemy.y) + Math.sin(ownerAngle) * 24;
  return findNearestActorPassablePoint(world, ownerX, ownerY, 6, 8);
}

function hasSimplePassableLine(world, from, to) {
  if (!world?.tiles?.length || !from || !to) return false;

  const dx = (to.x || 0) - (from.x || 0);
  const dy = (to.y || 0) - (from.y || 0);
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 16));

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (from.x || 0) + dx * t;
    const y = (from.y || 0) + dy * t;
    if (!isPassable(world, x, y)) return false;
  }

  return true;
}

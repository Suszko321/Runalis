import {regionalLegendaryPool} from './regionalLootSystem.js';
// legendarySystem.js
// Legendary boss loot rolls and equipment passive effects.

import { ITEMS } from './data.js';
import { addFloatingText, addLootText, addStatusText } from './floatingText.js';
import {isGravecallerSustain,restoreGravecallerHealth} from './gravecallerSustain.js';

export const LEGENDARY_BOSS_DROP_IDS = [
  'dawnwardAegis',
  'demonseedScythe',
  'crownOfTheEndless',
  'veyrglassBlade',
  'lichboneScythe',
  'thornheartStaffLegendary',
  'mercenarysLastMark',
  'sunfractureGauntlet',
  'oathplateOfTheLastDawn',
  'ashboundMantle',
  'sunforgedHalo',
  'briarCovenantGreaves',
  'runalisLantern',
  'zephyrglassAmulet',
  'uncrownedPrism',
  'blackstarGreaves',
  'seraphsBrokenWing',
  'everdawnCarver',
  'tideglassHeart',
  'blackbriarCrown',
  'orrakaiFoundersSignet'
];

const LEGENDARY_DROP_CHANCE = .02;
const LEGENDARY_MINI_DEMON_STATS = Object.freeze({
  hp: 85,
  damage: 14
});

export function getLegendaryEffectDetails(item) {
  if (!item || item.rarity !== 'legendary' || !item.slot) return null;

  const passive = item.legendaryPassive;
  if (!passive) {
    return {
      name: 'No Unique Passive',
      description: 'This Legendary currently has no implemented unique passive effect.'
    };
  }

  return {
    name: passive.name || 'Legendary Effect',
    description: `${describeLegendaryPassive(passive)}${describeLegendaryChargeBonus(passive)}`
  };
}

function describeLegendaryChargeBonus(passive) {
  const details = [];

  if (passive.chargedCostReductionPct) {
    details.push(`Charged abilities cost ${formatLegendaryPercent(passive.chargedCostReductionPct)} less resource.`);
  }

  if (passive.fullChargeDamagePct) {
    details.push(`Fully charged abilities deal ${formatLegendaryPercent(passive.fullChargeDamagePct)} more damage.`);
  }

  if (passive.chargedDurationPct) {
    details.push(`Charged ability durations are ${formatLegendaryPercent(passive.chargedDurationPct)} longer.`);
  }

  return details.length ? ` ${details.join(' ')}` : '';
}

export function describeLegendaryPassive(passive) {
  if (!passive) return '';

  switch (passive.type) {
    case 'damageShield':
      return `When you take damage while the effect is ready, gain a barrier that absorbs up to ${formatLegendaryNumber(passive.amount)} damage. Recharges every ${formatLegendarySeconds(passive.cooldown)}.`;
    case 'learnSummon':
      return passive.desc;
    case 'summonOnDamage':
      return `When you deal damage while the effect is ready, summon a Mini Demon with ${LEGENDARY_MINI_DEMON_STATS.hp} HP and ${LEGENDARY_MINI_DEMON_STATS.damage} damage for ${formatLegendarySeconds(passive.duration)}. Recharges every ${formatLegendarySeconds(passive.cooldown)}.`;
    case 'killRestore':
      return `Each enemy kill restores ${formatLegendaryNumber(passive.hp)} HP and ${formatLegendaryNumber(passive.spirit)} Spirit. Spirit is restored after Spirit has awakened.`;
    case 'executeBonus':
      return `Hits against enemies at or below ${formatLegendaryPercent(Number(passive.thresholdPct || 0) * 100)} health deal ${formatLegendaryPercent(passive.bonusPct)} more damage.`;
    case 'lifestealDamage':
      return `Hits deal ${formatLegendaryPercent(passive.bonusPct)} more damage. ${formatLegendaryPercent(passive.lifestealPct)} lifesteal follows your class's eligible attacks and healing limits.`;
    case 'damageNova':
      return `When you deal damage while the effect is ready, deal ${formatLegendaryNumber(passive.damage)} damage to other enemies within ${formatLegendaryNumber(passive.radius)} pixels of the target. Recharges every ${formatLegendarySeconds(passive.cooldown)}.`;
    case 'rangedBonus':
      return `All ranged hits deal ${formatLegendaryPercent(passive.bonusPct)} more damage.`;
    case 'reflectDamage':
      return `Whenever an attacker damages you, that attacker takes ${formatLegendaryNumber(passive.amount)} retaliatory damage.`;
    case 'lowHpReduction':
      return `While at or below ${formatLegendaryPercent(Number(passive.thresholdPct || 0) * 100)} health, incoming damage is reduced by ${formatLegendaryPercent(passive.reductionPct)}.`;
    case 'flatDamage':
      return `Every hit deals ${formatLegendaryNumber(passive.amount)} additional damage.`;
    case 'snareAttacker':
      return `When an attacker damages you while the effect is ready, root and slow them for ${formatLegendarySeconds(passive.duration)}. Recharges every ${formatLegendarySeconds(passive.cooldown)}.`;
    case 'cheatDeath':
      return `Fatal incoming damage is negated and sets your health to ${formatLegendaryNumber(passive.heal)} HP, up to your maximum. Recharges every ${formatLegendarySeconds(passive.cooldown)}.`;
    case 'cooldownFlatDamage':
      return `Your next hit while the effect is ready deals ${formatLegendaryNumber(passive.amount)} additional damage. Recharges every ${formatLegendarySeconds(passive.cooldown)}.`;
    case 'dodgeChance':
      return `You have a ${formatLegendaryPercent(Number(passive.chance || 0) * 100)} chance to completely avoid each incoming hit.`;
    case 'damageReductionAndStamina':
      return `Every incoming hit deals ${formatLegendaryPercent(passive.reductionPct)} less damage and restores ${formatLegendaryNumber(passive.stamina)} stamina.`;
    default:
      return passive.desc || 'This Legendary has a unique passive effect.';
  }
}

export function shouldRollLegendaryDrop(enemy) {
  return !!enemy && (enemy.isBoss || enemy.worldBoss || enemy.miniBoss || enemy.roomRole === 'miniBoss');
}

export function rollLegendaryBossDrop(enemy, rng = Math.random) {
  if(enemy?.encounterStatsVersion&&Number(enemy.combatLevel)<20)return null;
  if (!shouldRollLegendaryDrop(enemy)) return null;
  if(enemy.legendaryBossLootRolled)return null;enemy.legendaryBossLootRolled=true;
  const chance=enemy.isBoss||enemy.worldBoss?LEGENDARY_DROP_CHANCE:.005;
  if (rng() >= chance) return null;

  const pool=regionalLegendaryPool(enemy,LEGENDARY_BOSS_DROP_IDS);
  const itemId=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
  const item = ITEMS[itemId];

  if (!item) return null;

  return {
    item: itemId,
    qty: 1,
    legendary: true
  };
}

export function getEquippedLegendaryItems(player) {
  const equipment = player?.equipment || {};

  return Object.values(equipment)
    .map(itemId => ITEMS[itemId])
    .filter(item => item?.rarity === 'legendary' && item.legendaryPassive);
}

export function applyLegendaryIncomingDamage(player, incomingDamage, attacker = null, world = null, log = null, now = performance.now() / 1000) {
  let damage = Math.max(0, Math.ceil(incomingDamage || 0));
  if (!player || damage <= 0) return damage;

  const state = ensureLegendaryState(player);

  for (const item of getEquippedLegendaryItems(player)) {
    const passive = item.legendaryPassive;
    if (!passive) continue;

    if (passive.type === 'dodgeChance' && Math.random() < (passive.chance || 0)) {
      addFloatingText(player, passive.name || 'Dodged', {
        preset: 'status',
        color: '#66f0ff',
        ttl: 0.9,
        size: 15,
        offsetY: -70,
        glow: true
      });
      return 0;
    }

    if (passive.type === 'cheatDeath' && damage >= (player.hp || 0) && isReady(state, passive, now)) {
      setCooldown(state, passive, now);
      const heal = Math.max(1, Number(passive.heal || 1));
      player.hp = Math.min(player.maxHp || heal, Math.max(1, heal));
      addLegendaryText(player, passive.name || item.name);
      log?.(`${item.name} saved ${player.name || 'the player'} from death.`);
      damage = 0;
      continue;
    }

    if (passive.type === 'damageShield') {
      const key = passive.id;
      state.shields[key] = state.shields[key] || 0;

      if (state.shields[key] <= 0 && isReady(state, passive, now)) {
        state.shields[key] = Math.max(1, Number(passive.amount || 1));
        setCooldown(state, passive, now);
        addLegendaryText(player, passive.name || item.name);
      }

      if (state.shields[key] > 0) {
        const absorbed = Math.min(damage, state.shields[key]);
        state.shields[key] -= absorbed;
        damage -= absorbed;

        addFloatingText(player, `Barrier -${absorbed}`, {
          preset: 'block',
          color: '#ffcc66',
          ttl: 0.85,
          size: 14,
          offsetY: -76,
          glow: true
        });
      }
    }

    if (passive.type === 'lowHpReduction') {
      const hpPct = (player.hp || 0) / Math.max(1, player.maxHp || player.hp || 1);
      if (hpPct <= Number(passive.thresholdPct || 0.5)) {
        damage = Math.ceil(damage * (1 - Math.max(0, passive.reductionPct || 0) / 100));
      }
    }

    if (passive.type === 'damageReductionAndStamina') {
      damage = Math.ceil(damage * (1 - Math.max(0, passive.reductionPct || 0) / 100));
      player.stamina = Math.min(player.maxStamina || player.stamina || 0, (player.stamina || 0) + Math.max(0, passive.stamina || 0));
    }

    if (passive.type === 'reflectDamage' && attacker && !attacker.dead && attacker.hp > 0) {
      const reflected = Math.max(1, Number(passive.amount || 1));
      attacker.hp = Math.max(0, attacker.hp - reflected);
      attacker.hitFlash = 0.12;
      addFloatingText(attacker, `${reflected}`, {
        preset: 'damage',
        color: '#ffcc66',
        ttl: 0.75,
        size: 13
      });
    }

    if (passive.type === 'snareAttacker' && attacker && isReady(state, passive, now)) {
      attacker.rootUntil = Math.max(attacker.rootUntil || 0, now + Number(passive.duration || 1));
      attacker.slowTimer = Math.max(attacker.slowTimer || 0, Number(passive.duration || 1));
      setCooldown(state, passive, now);
      addFloatingText(attacker, 'Root Snare', {
        preset: 'status',
        color: '#73d18a',
        ttl: 0.8,
        size: 12
      });
    }
  }

  return Math.max(0, damage);
}

export function applyLegendaryOutgoingDamage(player, target, baseDamage, context = {}, world = null, log = null, now = performance.now() / 1000) {
  let damage = Math.max(0, Math.ceil(baseDamage || 0));
  if (!player || !target || damage <= 0) return damage;

  const state = ensureLegendaryState(player);

  for (const item of getEquippedLegendaryItems(player)) {
    const passive = item.legendaryPassive;
    if (!passive) continue;

    if (passive.type === 'rangedBonus' && isRangedContext(context)) {
      damage = Math.ceil(damage * (1 + Number(passive.bonusPct || 0) / 100));
    }

    if (passive.type === 'executeBonus') {
      const targetPct = (target.hp || 0) / Math.max(1, target.maxHp || target.hp || 1);
      if (targetPct <= Number(passive.thresholdPct || 0.25)) {
        damage = Math.ceil(damage * (1 + Number(passive.bonusPct || 0) / 100));
        addFloatingText(target, passive.name || 'Execute', {
          preset: 'crit',
          color: '#ffcc66',
          ttl: 0.8,
          size: 16
        });
      }
    }

    if (passive.type === 'lifestealDamage') {
      damage = Math.ceil(damage * (1 + Number(passive.bonusPct || 0) / 100));
      // Gravecaller heals once, after mitigation and remaining target HP are
      // known. The coordinator includes this gear bonus on eligible attacks.
      if(isGravecallerSustain(player))continue;
      const heal = Math.max(1, Math.floor(damage * Number(passive.lifestealPct || 0) / 100));
      player.hp = Math.min(player.maxHp || player.hp || 1, (player.hp || 0) + heal);
      addFloatingText(player, `+${heal}`, {
        preset: 'heal',
        color: '#b68cff',
        ttl: 0.65,
        size: 12
      });
    }

    if (passive.type === 'flatDamage') {
      damage += Math.max(0, Number(passive.amount || 0));
    }

    if (passive.type === 'cooldownFlatDamage' && isReady(state, passive, now)) {
      const extra = Math.max(1, Number(passive.amount || 1));
      damage += extra;
      setCooldown(state, passive, now);
      addFloatingText(target, passive.name || 'Echo', {
        preset: 'spirit',
        color: '#66f0ff',
        ttl: 0.75,
        size: 13
      });
    }

    if (passive.type === 'damageNova' && world && isReady(state, passive, now)) {
      const novaDamage = Math.max(1, Number(passive.damage || 1));
      const radius = Math.max(32, Number(passive.radius || 96));
      damageEnemiesNear(world, target, radius, novaDamage, player, passive.name || 'Nova');
      setCooldown(state, passive, now);
    }

    if (passive.type === 'summonOnDamage' && passive.id !== 'demonseedImp' && isReady(state, passive, now)) {
      summonMiniDemon(player, passive, now);
      setCooldown(state, passive, now);
      addLegendaryText(player, passive.name || item.name);
    }
  }

  return Math.max(0, damage);
}

export function onLegendaryEnemyKilled(player, enemy, world = null, log = null, now = performance.now() / 1000) {
  if (!player || !enemy || enemy.legendaryKillHandled) return;
  enemy.legendaryKillHandled = true;

  for (const item of getEquippedLegendaryItems(player)) {
    const passive = item.legendaryPassive;
    if (!passive) continue;

    if (passive.type === 'killRestore') {
      const hp = Math.max(0, Number(passive.hp || 0));
      const spirit = Math.max(0, Number(passive.spirit || 0));
      if(isGravecallerSustain(player))restoreGravecallerHealth(player,hp,{now,source:'gear'});
      else player.hp = Math.min(player.maxHp || player.hp || 1, (player.hp || 0) + hp);

      if (player.spiritAwakened) {
        player.spirit = Math.min(player.maxSpirit || player.spirit || 0, (player.spirit || 0) + spirit);
      }

      addFloatingText(player, passive.name || 'Legendary Restore', {
        preset: 'spirit',
        color: '#ffcc66',
        ttl: 0.9,
        size: 13,
        glow: true
      });
    }
  }
}

export function getLegendaryLifestealPct(player){
 return getEquippedLegendaryItems(player).reduce((sum,item)=>sum+(item.legendaryPassive?.type==='lifestealDamage'?Number(item.legendaryPassive.lifestealPct||0):0),0);
}

export function updateLegendarySummons(player, now = performance.now() / 1000) {
  if (!player?.summons?.length) return;

  for (const summon of player.summons) {
    if (!summon?.legendaryTemporary) continue;
    if (summon.expiresAt && now >= summon.expiresAt) {
      summon.alive = false;
      summon.dismissed = true;
      summon.dead = true;
    }
  }
}

export function announceLegendaryPickup(player, itemName) {
  addLootText(player, `LEGENDARY: ${itemName}`, {
    color: '#ffcc66',
    ttl: 2.35,
    size: 24,
    offsetY: -112,
    weight: '900',
    glow: true,
    shake: 1.6,
    scaleStart: 1.75,
    scaleEnd: 1.05
  });

  addStatusText(player, 'Legendary Item Acquired', {
    color: '#ffefb0',
    ttl: 1.8,
    size: 16,
    offsetY: -84,
    glow: true
  });
}

function ensureLegendaryState(player) {
  player.legendaryState = player.legendaryState && typeof player.legendaryState === 'object'
    ? player.legendaryState
    : {};

  player.legendaryState.cooldowns = player.legendaryState.cooldowns || {};
  player.legendaryState.shields = player.legendaryState.shields || {};

  return player.legendaryState;
}

function isReady(state, passive, now) {
  const key = passive.id || passive.name || passive.type;
  return now >= Number(state.cooldowns[key] || 0);
}

function setCooldown(state, passive, now) {
  const key = passive.id || passive.name || passive.type;
  state.cooldowns[key] = now + Number(passive.cooldown || 0);
}

function isRangedContext(context) {
  return context?.ranged === true ||
    context?.projectile === true ||
    context?.weaponType === 'bow' ||
    context?.skill === 'archery';
}

function summonMiniDemon(player, passive, now) {
  player.summons = Array.isArray(player.summons) ? player.summons : [];

  const existing = player.summons.find(summon => summon?.legendaryTemporary && summon.legendaryPassiveId === passive.id && summon.alive !== false);
  if (existing) {
    existing.expiresAt = now + Number(passive.duration || 10);
    return existing;
  }

  const summon = {
    id: `legendary-demon-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    kind: 'miniDemon',
    kindTag: 'summon',
    displayName: 'Mini Demon',
    x: (player.x || 0) - 34,
    y: (player.y || 0) + 24,
    dirX: player.dirX || 0,
    dirY: player.dirY || 1,
    hp: LEGENDARY_MINI_DEMON_STATS.hp,
    maxHp: LEGENDARY_MINI_DEMON_STATS.hp,
    damage: LEGENDARY_MINI_DEMON_STATS.damage,
    speed: 112,
    attackRange: 36,
    attackCooldown: 0,
    attackRate: 0.82,
    legendaryTemporary: true,
    legendaryPassiveId: passive.id,
    expiresAt: now + Number(passive.duration || 10),
    alive: true,
    dead: false,
    dismissed: false,
    walkTime: 0
  };

  player.summons.push(summon);
  return summon;
}

function formatLegendaryNumber(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10);
}

function formatLegendaryPercent(value) {
  return `${formatLegendaryNumber(value)}%`;
}

function formatLegendarySeconds(value) {
  const number = Number(value || 0);
  return `${formatLegendaryNumber(number)} second${number === 1 ? '' : 's'}`;
}

function damageEnemiesNear(world, target, radius, damage, player, label) {
  for (const enemy of world.enemies || []) {
    if (!enemy || enemy === target || enemy.dead || enemy.hp <= 0 || enemy.remove) continue;
    const distance = Math.hypot((enemy.x || 0) - (target.x || 0), (enemy.y || 0) - (target.y || 0));
    if (distance > radius) continue;

    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.hitFlash = 0.16;
    enemy.lastDamagedByPlayer = true;

    addFloatingText(enemy, `${label} ${damage}`, {
      preset: 'damage',
      color: '#73d18a',
      ttl: 0.85,
      size: 12
    });

    if (enemy.hp <= 0) {
      enemy.dead = true;
    }
  }
}

function addLegendaryText(player, text) {
  addFloatingText(player, text, {
    preset: 'level',
    color: '#ffcc66',
    ttl: 1.05,
    size: 16,
    offsetY: -92,
    glow: true
  });
}

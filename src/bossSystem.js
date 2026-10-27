import {encounterRng} from './encounterData.js';
import { rewardAbilitySupport } from './abilityMasterySystem.js';
import { applyDefensiveDamage } from './combatActions.js';
import { mitigateTechniqueDamage } from './combatExpansion.js';
import {mitigateSubclassDamage,onSubclassDamaged} from './subclassCombat.js';
// bossSystem.js
// Reusable boss phase/death reward helpers.

import { ITEMS, RARITY, TILE } from './data.js';
import { addItem, getArmour } from './player.js';
import { addLootText, addQuestText, addStatusText } from './floatingText.js';
import { playSfx } from './audioSystem.js';
import { announceLegendaryPickup } from './legendarySystem.js';
import { applyBossStoryProgress } from './storyRuntime.js';
import { findNearestPassablePoint, hasLineOfSight } from './world.js';
import { isDodgeInvulnerable } from './combatActions.js';
import { getEnemyAttackProfile } from './animationProfiles.js';
import {beginEnemyAttackPresentation,syncEnemyAttackPresentation,releaseEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {enemyWithinTargetView} from './enemyVisibility.js';
import {getEnemyTargetablePlayers} from './coopEnemyScaling.js';
import {
  applyEnemyStrengthScaling,
  applyGlobalEnemyDamageMultiplier
} from './enemyScaling.js';
import {
  getCoopEnemyScalingPlayerCount,
  getScaledBossAddCount
} from './coopEnemyScaling.js';

export function updateBossFramework(enemy, world, player, dt, now, log, canStartAttack=true) {
  if (!enemy?.isBoss || enemy.dead || enemy.hp <= 0) return;

  ensureBossState(enemy);
  maybeTriggerBossIntro(enemy, world, player, now, log);

  if (enemy.boss.pendingSpecial) {
    updatePendingBossSpecial(enemy, world, player, dt, now, log);
    return;
  }

  if (Number(enemy.boss.recoveryUntil || 0) > now) {
    return;
  }

  const hpPct = Math.max(0, enemy.hp / Math.max(1, enemy.maxHp || enemy.hp || 1));

  if (hpPct <= 0.35 && enemy.boss.phase < 3) {
    enterBossPhase(enemy, world, player, 3, log);
  } else if (hpPct <= 0.7 && enemy.boss.phase < 2) {
    enterBossPhase(enemy, world, player, 2, log);
  }

  enemy.boss.specialTimer = Math.max(0, (enemy.boss.specialTimer || 0) - dt);

  if (enemy.boss.specialTimer <= 0 && canStartAttack) {
    beginBossSpecial(enemy, world, now);
  }
}

export function applyBossDefeatRewards(enemy, player, world, log) {
  if (!enemy?.isBoss || !player || enemy.bossRewardClaimed || enemy.rewardSuppressed || enemy.summonedByBoss) return;
  enemy.bossRewardClaimed=true;

  const bossId = enemy.bossId || enemy.id || enemy.bossName || enemy.name || 'boss';
  const dungeonId = world?.dungeonId || world?.poiId || world?.entranceId || world?.name || null;

  player.bossKills = player.bossKills || {};
  player.bossKills[bossId] = Math.max(0, Number(player.bossKills[bossId] || 0)) + 1;

  if (dungeonId) {
    player.completedDungeons = player.completedDungeons || {};
    player.completedDungeons[dungeonId] = {
      id: dungeonId,
      completedAt: Date.now(),
      bossId
    };
  }

  const firstKillMap = player.completedBossFirstKills || {};
  const firstKill = !firstKillMap[bossId];
  player.completedBossFirstKills = firstKillMap;
  player.completedBossFirstKills[bossId] = true;

  const rewards = getBossRewardBundle(enemy, firstKill);

  for (const reward of rewards) {
    const item = ITEMS[reward?.itemId];
    if (!item) continue;

    const qty = Math.max(1, Math.floor(Number(reward.qty || 1)));
    addItem(player, reward.itemId, qty);

    const label = reward.name || item.name || reward.itemId;
    addLootText(player, qty > 1 ? `${label} x${qty}` : label, {
      color: reward.color || RARITY[item.rarity]?.color || '#ffcc66',
      ttl: item.rarity === 'legendary' || item.rarity === 'mythic' || item.rarity === 'ancient' ? 1.9 : 1.45,
      important: item.rarity === 'legendary' || item.rarity === 'mythic' || item.rarity === 'ancient' || item.rarity === 'relic',
      offsetY: -74
    });

    if (item.rarity === 'legendary' || item.rarity === 'mythic' || item.rarity === 'ancient') {
      announceLegendaryPickup(player, label);
    }

    log?.(`${firstKill ? 'First kill reward' : 'Boss reward'}: ${label}${qty > 1 ? ` x${qty}` : ''}.`);
  }

  addQuestText(player, `${enemy.bossName || enemy.name || 'Boss'} Defeated`, {
    color: '#ffcc66',
    ttl: 1.6,
    size: 16
  });

  applyBossStoryProgress(enemy, player, world, log);
}

function ensureBossState(enemy) {
  if (enemy.boss) return enemy.boss;

  const isVeyrWarden = getBossType(enemy) === 'veyrWarden';
  const isDemonLord = getBossType(enemy) === 'demonLord';

  enemy.boss = {
    name: enemy.bossName || enemy.name || 'Boss',
    type: getBossType(enemy),
    phase: 1,
    specialTimer: isDemonLord ? 3.2 : isVeyrWarden ? 4.5 : 6.5,
    spawnedPhaseTwoAdds: false,
    spawnedPhaseThreeAdds: false,
    enraged: false
  };

  return enemy.boss;
}

function maybeTriggerBossIntro(enemy, world, player, now, log) {
  if (!enemy?.boss || enemy.boss.introShown) return false;

  const bossId = enemy.bossId || enemy.id || enemy.bossName || enemy.name || 'boss';
  const dungeonState = world?.dungeonState || null;
  dungeonState && (dungeonState.bossIntros = dungeonState.bossIntros || {});

  if (dungeonState?.bossIntros?.[bossId]) {
    enemy.boss.introShown = true;
    return false;
  }

  const distance = player
    ? Math.hypot((player.x || 0) - (enemy.x || 0), (player.y || 0) - (enemy.y || 0))
    : Infinity;
  const awake = enemy.aggro > 0 || enemy.alerted || distance <= 520;
  if (!awake) return false;

  enemy.boss.introShown = true;
  if (dungeonState) dungeonState.bossIntros[bossId] = true;
  enemy.boss.recoveryUntil = Math.max(Number(enemy.boss.recoveryUntil || 0), now + 0.85);

  world.effects = world.effects || [];
  world.effects.push({
    kind: 'bossFlourish',
    layer: 'front',
    x: enemy.x,
    y: enemy.y,
    targetX: enemy.x,
    targetY: enemy.y,
    radius: Math.max(96, (enemy.r || enemy.radius || 24) * 4),
    color: '#ffcc66',
    telegraphShape: 'circle',
    telegraphPose: 'bossSlam',
    ttl: 0.9,
    age: 0
  });

  addQuestText(player, enemy.bossName || enemy.name || enemy.boss.name || 'Dungeon Boss', {
    color: '#ffcc66',
    ttl: 1.7,
    size: 18
  });
  addStatusText(player, 'Boss Encounter', {
    color: '#ffcc66',
    ttl: 1.05
  });
  log?.(`${enemy.bossName || enemy.name || 'The dungeon boss'} enters the arena.`);
  playSfx('boss', { volume: 0.92, throttle: 0.2 });
  return true;
}

function beginBossSpecial(enemy, world, now=performance.now()/1000) {
  const tell = getBossTellData(enemy);
  const profile = getEnemyAttackProfile(tell.profileKind);

  enemy.boss.pendingSpecial = {
    ...tell,
    time: Math.max(.45,Number(profile?.windup || tell.windup || 0.82)*.92),
    maxTime: Math.max(.45,Number(profile?.windup || tell.windup || 0.82)*.92),
    recovery: Math.max(.3,Number(profile?.recovery || tell.recovery || 0.9)*.72),
    shape: 'circle',
    pose: profile?.pose || tell.pose || 'bossSlam'
  };

  enemy.bossTell = {
    ...enemy.boss.pendingSpecial,
    x: enemy.x,
    y: enemy.y
  };

  beginEnemyAttackPresentation(enemy,{...enemy.boss.pendingSpecial,kind:'bossSpecial',x:enemy.x+(enemy.dirX??0),y:enemy.y+(enemy.dirY??1)},now);
  playSfx('bossWindup', { volume: 0.72, throttle: 0.2 });
}

function updatePendingBossSpecial(enemy, world, player, dt, now, log) {
  const pending = enemy.boss.pendingSpecial;
  pending.time = Math.max(0, Number(pending.time || 0) - dt);
  enemy.bossTell = {
    ...pending,
    x: enemy.x,
    y: enemy.y
  };

  syncEnemyAttackPresentation(enemy,{...pending,kind:'bossSpecial',x:enemy.x+(enemy.dirX??0),y:enemy.y+(enemy.dirY??1)},now);
  if (pending.time > 0) return;

  releaseEnemyAttackPresentation(enemy,now);
  runBossSpecial(enemy, world, player, now, log);
  playSfx('bossImpact', { volume: 0.9, throttle: 0.16 });
  enemy.boss.pendingSpecial = null;
  enemy.bossTell = null;
  enemy.boss.recoveryUntil = now + Number(pending.recovery || 0.9);
  enemy.boss.specialTimer = getBossSpecialInterval(enemy)*.8;
}

function getBossTellData(enemy) {
  const phase = enemy?.boss?.phase || 1;
  const type = enemy?.boss?.type || 'genericBoss';

  if (type === 'demonLord') {
    return {
      profileKind: 'bossRift',
      radius: phase >= 3 ? 152 : phase >= 2 ? 122 : 92,
      color: phase >= 3 ? '#ff5a3d' : '#ef6f6c'
    };
  }

  if (type === 'hollowElk') {
    return {
      profileKind: 'bossRoots',
      radius: phase >= 3 ? 138 : phase >= 2 ? 112 : 84,
      color: '#73d18a'
    };
  }

  if (type === 'seraphel') {
    return {
      profileKind: 'bossJudgment',
      radius: phase >= 3 ? 142 : phase >= 2 ? 112 : 86,
      color: phase >= 2 ? '#d7e8ff' : '#ffcc66'
    };
  }

  if (type === 'zephyrLight') {
    return {
      profileKind: 'bossJudgment',
      radius: phase >= 3 ? 178 : phase >= 2 ? 138 : 96,
      color: phase >= 3 ? '#66f0ff' : '#d7e8ff'
    };
  }

  return {
    profileKind: 'bossShockwave',
    radius: type==='veyrWarden'?(phase >= 3 ? 126 : phase >= 2 ? 104 : 78):(phase >= 3 ? 118 : phase >= 2 ? 94 : 70),
    color: phase >= 3 ? '#ef6f6c' : '#ffcc66'
  };
}

function enterBossPhase(enemy, world, player, phase, log) {
  enemy.boss.phase = phase;

  if (phase === 2) {
    log?.(getBossPhaseLine(enemy, phase));
    playSfx('boss', { volume: 0.82, throttle: 0.2 });
    addStatusText(player, 'Boss Phase 2', { color: '#b68cff', ttl: 1.2 });

    if (enemy.boss.type === 'veyrWarden' && !enemy.boss.spawnedPhaseTwoAdds) {
      enemy.boss.spawnedPhaseTwoAdds = true;
      spawnSpectralGuards(enemy, world, scaleBossAdds(2, player, 5));
    }

    if (enemy.boss.type === 'dungeonWarden' && !enemy.boss.spawnedPhaseTwoAdds) {
      enemy.boss.spawnedPhaseTwoAdds = true;
      spawnDungeonOathguards(enemy, world, scaleBossAdds(2, player, 5));
    }

    if (enemy.boss.type === 'demonLord' && !enemy.boss.spawnedPhaseTwoAdds) {
      enemy.boss.spawnedPhaseTwoAdds = true;
      log?.('Last Dawn seal-keepers tear the binding wider.');
      spawnDemonCultAdds(enemy, world, scaleBossAdds(3, player, 7));
      enemy.damage = Math.ceil((enemy.damage || enemy.dmg || 12) * 1.12);
      enemy.dmg = enemy.damage;
    }
  }

  if (phase === 3) {
    log?.(getBossPhaseLine(enemy, phase));
    playSfx('boss', { volume: 1, throttle: 0.2 });
    addStatusText(player, 'Enraged', { color: '#ef6f6c', ttl: 1.2 });
    enemy.boss.enraged = true;
    enemy.speed = Math.max(enemy.speed || 40, 62);
    enemy.damage = Math.ceil((enemy.damage || enemy.dmg || 10) * 1.18);
    enemy.dmg = enemy.damage;
    enemy.attackRate = Math.max(0.72, (enemy.attackRate || 1.05) * 0.82);

    if (enemy.boss.type === 'demonLord' && !enemy.boss.spawnedPhaseThreeAdds) {
      enemy.boss.spawnedPhaseThreeAdds = true;
      log?.(`${enemy.boss.name} resumes the siege-form that survived the Divine War.`);
      spawnDemonCultAdds(enemy, world, scaleBossAdds(4, player, 8));
      enemy.speed = Math.max(enemy.speed || 40, 76);
      enemy.damage = Math.ceil((enemy.damage || enemy.dmg || 12) * 1.24);
      enemy.dmg = enemy.damage;
      enemy.attackRate = Math.max(0.56, (enemy.attackRate || 1.0) * 0.72);
    }
  }
}

function getBossPhaseLine(enemy, phase) {
  const name = enemy?.boss?.name || enemy?.bossName || enemy?.name || 'The boss';
  const type = enemy?.boss?.type || getBossType(enemy);

  if (type === 'demonLord') {
    return phase === 2
      ? `${name}'s armor shatters. The Broken Mantle wakes.`
      : `${name} becomes the Final Siege.`;
  }

  if (type === 'seraphel') {
    return phase === 2
      ? `${name}'s halo splinters into the Uncrowned Ruin.`
      : `${name} becomes Last Judgment.`;
  }

  if (type === 'zephyrLight') {
    return phase === 2
      ? `${name} opens into the Ascendant Network.`
      : `${name} becomes World-Devouring Unity.`;
  }

  return phase === 2 ? `${name} enters Phase 2.` : `${name} is enraged.`;
}

function runBossSpecial(enemy, world, player, now, log) {
  if (enemy.boss.type === 'demonLord') {
    runDemonLordSpecial(enemy, world, player, log);
    return;
  }

  if (enemy.boss.type === 'seraphel') {
    runSeraphelSpecial(enemy, world, player, log);
    return;
  }

  if (enemy.boss.type === 'zephyrLight') {
    runZephyrSpecial(enemy, world, player, log);
    return;
  }

  if (enemy.boss.type === 'hollowElk') {
    const radius = enemy.boss.phase >= 3 ? 138 : enemy.boss.phase >= 2 ? 112 : 84;

    telegraphRoots(enemy, world, radius);
    damageNearbyParty(enemy, player, world, radius, enemy.boss.phase >= 3 ? 10 : 6);

    if (enemy.boss.phase >= 2 && Math.random() < 0.5) {
      spawnRootAdds(enemy, world, scaleBossAdds(1 + (enemy.boss.phase >= 3 ? 1 : 0), player, 5));
      log?.('The Blighted Elk calls the forest to its wound.');
    }

    return;
  }

  if (enemy.boss.type !== 'veyrWarden') {
    runGenericDungeonBossSpecial(enemy, world, player, log);
    return;
  }

  const radius = enemy.boss.phase >= 3 ? 126 : enemy.boss.phase >= 2 ? 104 : 78;

  telegraphShockwave(enemy, world, radius);
  damageNearbyParty(enemy, player, world, radius, enemy.boss.phase >= 3 ? 11 : 7);

  if (enemy.boss.phase >= 2 && Math.random() < 0.45) {
    spawnSpectralGuards(enemy, world, scaleBossAdds(1, player, 4));
    log?.('Spectral guards answer the Warden.');
  }
}

function scaleBossAdds(baseCount, player, cap = 6) {
  return getScaledBossAddCount(baseCount, getCoopEnemyScalingPlayerCount(player), cap);
}

function getBossSpecialInterval(enemy) {
  const phase = enemy?.boss?.phase || 1;
  const type = enemy?.boss?.type || 'genericBoss';

  if (type === 'dungeonWarden') {
    return phase >= 3 ? 2.9 : phase >= 2 ? 4.2 : 5.8;
  }

  if (type === 'demonLord') {
    return phase >= 3 ? 2.1 : phase >= 2 ? 3.0 : 4.2;
  }

  if (type === 'seraphel') {
    return phase >= 3 ? 2.35 : phase >= 2 ? 3.25 : 4.4;
  }

  if (type === 'zephyrLight') {
    return phase >= 3 ? 1.95 : phase >= 2 ? 2.75 : 3.8;
  }

  return phase >= 3 ? 3.4 : phase >= 2 ? 4.7 : 6.6;
}

function runSeraphelSpecial(enemy, world, player, log) {
  const phase = enemy.boss.phase || 1;
  const radius = phase >= 3 ? 142 : phase >= 2 ? 112 : 86;
  const damage = phase >= 3 ? 18 : phase >= 2 ? 13 : 9;

  telegraphShockwave(enemy, world, radius, phase >= 2 ? '#d7e8ff' : '#ffcc66');
  telegraphBossCross(enemy, world, phase);
  damageNearbyParty(enemy, player, world, radius, damage);

  if (phase >= 2 && Math.random() < 0.55) {
    spawnSeraphEchoes(enemy, world, scaleBossAdds(phase >= 3 ? 2 : 1, player, 5));
    log?.('Seraphel calls broken judgments from the Choir.');
  }
}

function runZephyrSpecial(enemy, world, player, log) {
  const phase = enemy.boss.phase || 1;
  const radius = phase >= 3 ? 178 : phase >= 2 ? 138 : 96;
  const damage = phase >= 3 ? 24 : phase >= 2 ? 17 : 11;

  telegraphShockwave(enemy, world, radius, phase >= 3 ? '#66f0ff' : '#b68cff');
  telegraphNetworkEyes(enemy, world, phase);
  damageNearbyParty(enemy, player, world, radius, damage);

  if (phase >= 2 && Math.random() < (phase >= 3 ? 0.8 : 0.55)) {
    spawnNetworkEchoes(enemy, world, scaleBossAdds(phase >= 3 ? 3 : 2, player, 7));
    log?.('Zephyr Light speaks through borrowed bodies.');
  }
}

function runDemonLordSpecial(enemy, world, player, log) {
  const phase = enemy.boss.phase || 1;
  const radius = phase >= 3 ? 152 : phase >= 2 ? 122 : 92;
  const damage = phase >= 3 ? 22 : phase >= 2 ? 16 : 11;

  telegraphShockwave(enemy, world, radius, phase >= 3 ? '#ff5a3d' : '#ef6f6c');
  telegraphDemonRifts(enemy, world, phase);
  damageNearbyParty(enemy, player, world, radius, damage);

  if (phase >= 2 && Math.random() < (phase >= 3 ? 0.72 : 0.48)) {
    spawnDemonCultAdds(enemy, world, scaleBossAdds(phase >= 3 ? 2 : 1, player, 6));
    log?.('Last Dawn seal-keepers answer the binding.');
  }
}

function telegraphDemonRifts(enemy, world, phase) {
  world.effects = world.effects || [];
  const count = phase >= 3 ? 6 : phase >= 2 ? 4 : 3;
  const ring = phase >= 3 ? TILE * 4.2 : TILE * 3.3;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (enemy.walkTime || 0) * 0.15;
    world.effects.push({
      kind: 'bossFlourish',
      layer: 'front',
      x: enemy.x + Math.cos(angle) * ring,
      y: enemy.y + Math.sin(angle) * ring * 0.75,
      radius: phase >= 3 ? 72 : 54,
      color: i % 2 ? '#b68cff' : '#ef6f6c',
      ttl: 0.7,
      age: 0
    });
  }
}

function telegraphNetworkEyes(enemy, world, phase) {
  world.effects = world.effects || [];
  const count = phase >= 3 ? 8 : phase >= 2 ? 6 : 4;
  const ring = phase >= 3 ? TILE * 5.1 : TILE * 3.9;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count - (enemy.walkTime || 0) * 0.12;
    world.effects.push({
      kind: 'bossFlourish',
      layer: 'front',
      x: enemy.x + Math.cos(angle) * ring,
      y: enemy.y + Math.sin(angle) * ring * 0.72,
      radius: phase >= 3 ? 82 : 58,
      color: i % 2 ? '#66f0ff' : '#d7e8ff',
      ttl: 0.66,
      age: 0
    });
  }
}

function runGenericDungeonBossSpecial(enemy, world, player, log) {
  const phase = enemy.boss.phase || 1;
  const radius = phase >= 3 ? 118 : phase >= 2 ? 94 : 70;

  telegraphShockwave(enemy, world, radius, phase >= 3 ? '#ef6f6c' : '#ffcc66');
  damageNearbyParty(enemy, player, world, radius, phase >= 3 ? 12 : phase >= 2 ? 9 : 6);

  if (phase >= 2) {
    telegraphBossCross(enemy, world, phase);
  }

  if (phase >= 3 && Math.random() < 0.65) {
    spawnDungeonOathguards(enemy, world, scaleBossAdds(1, player, 4));
    log?.(`${enemy.boss.name} calls another oathguard.`);
  }
}

function telegraphShockwave(enemy, world, radius, color = '#b68cff') {
  world.effects = world.effects || [];
  world.effects.push({
    kind: 'enemyTellRelease',
    layer: 'front',
    x: enemy.x,
    y: enemy.y,
    radius,
    color,
    ttl: 0.55,
    age: 0
  });
}

function telegraphBossCross(enemy, world, phase) {
  world.effects = world.effects || [];
  const radius = phase >= 3 ? 92 : 74;
  const offsets = [
    { x: TILE * 3, y: 0 },
    { x: -TILE * 3, y: 0 },
    { x: 0, y: TILE * 3 },
    { x: 0, y: -TILE * 3 }
  ];

  for (const offset of offsets) {
    world.effects.push({
      kind: 'bossFlourish',
      layer: 'front',
      x: enemy.x + offset.x,
      y: enemy.y + offset.y,
      radius,
      color: '#ef6f6c',
      ttl: 0.62,
      age: 0
    });
  }
}

function telegraphRoots(enemy, world, radius) {
  world.effects = world.effects || [];
  world.effects.push({
    kind: 'enemyTellRelease',
    layer: 'front',
    x: enemy.x,
    y: enemy.y,
    radius,
    color: '#73d18a',
    ttl: 0.6,
    age: 0
  });
}

export function damageNearbyParty(enemy, player, world, radius, damage, hitTest = null, label = 'Shockwave', combatNow = performance.now()/1000) {
  const scaledDamage = applyGlobalEnemyDamageMultiplier(damage);
  const members = getEnemyTargetablePlayers(player);

  for (const member of members) {
    if ((member.hp || 0) <= 0) continue;
    if(!enemyWithinTargetView(enemy,member,world))continue;

    const distance = Math.hypot((member.x || 0) - enemy.x, (member.y || 0) - enemy.y);
    if (distance > radius || hitTest && !hitTest(member)) continue;
    if (world && !hasLineOfSight(world, enemy.x, enemy.y, member.x, member.y, { startSkip: 1, endSkip: 1 })) continue;

    if (Number(member.invulnerableUntil || 0) > performance.now() / 1000) {
      addStatusText(member, 'Protected', {
        color: '#fff1b8',
        ttl: 0.55
      });
      continue;
    }

    if (isDodgeInvulnerable(member)) {
      addStatusText(member, 'Evade', {
        color: '#d9f7ff',
        ttl: 0.55
      });
      continue;
    }

    const now=performance.now()/1000;
    let incoming=applyDefensiveDamage(member,scaledDamage,null,enemy,world).hpDamage;
    if(member.buffs?.defense?.timer>0) {
      const before=incoming;incoming=Math.ceil(incoming*(1-Math.min(.72,member.buffs.defense.reduction||0)));
      rewardAbilitySupport(member.buffs.defense,world,before-incoming,now);
    }
    const bubble=member.buffs?.bubbleWard;
    if(bubble&&(bubble.until>now||bubble.timer>0)) {
      const prevented=Math.min(incoming,bubble.flatAbsorb||0);incoming-=prevented;
      rewardAbilitySupport(bubble,world,prevented,now);
    }
    incoming=Math.max(0,incoming-getArmour(member)*.18);
    const applied=mitigateSubclassDamage(member,enemy,mitigateTechniqueDamage(member,enemy,incoming,now,world),now);
    member.hp = Math.max(0, (member.hp || 0) - applied);
    if(applied>0)onSubclassDamaged(member,applied,enemy,world,now);
    addStatusText(member, `${label} -${Math.ceil(applied)}`, {
      color: '#ef6f6c',
      ttl: 0.75
    });
  }
}

function spawnSpectralGuards(enemy, world, count) {
  count=Math.min(count,Math.max(0,8-(world.enemies||[]).filter(e=>e.summonedByBoss===enemy.id&&e.hp>0&&!e.dead).length));
  world.enemies = world.enemies || [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / Math.max(1, count) + Math.random() * 0.45;
    const spawn = safeSpawn(world, enemy.x + Math.cos(angle) * TILE * 2.4, enemy.y + Math.sin(angle) * TILE * 2.4);

    world.enemies.push(applyEnemyStrengthScaling({
      id: `spectral-guard-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: 'gravebound',
      name: 'Spectral Guard',
      x: spawn.x,
      y: spawn.y,
      r: 14,
      radius: 14,
      hp: 48,
      maxHp: 48,
      damage: 8,
      dmg: 8,
      xp: 18,
      speed: 54,
      aggroRange: 250,
      attackRange: 27,
      attackRate: 1.05,
      attackCooldown: 0,
      summonedByBoss: enemy.id,
      rewardSuppressed:true,
      combatLevel:enemy.combatLevel,
      dead: false,
      remove: false
    }));
  }
}

function spawnRootAdds(enemy, world, count) {
  count=Math.min(count,Math.max(0,8-(world.enemies||[]).filter(e=>e.summonedByBoss===enemy.id&&e.hp>0&&!e.dead).length));
  world.enemies = world.enemies || [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spawn = safeSpawn(world, enemy.x + Math.cos(angle) * TILE * 3, enemy.y + Math.sin(angle) * TILE * 3);

    world.enemies.push(applyEnemyStrengthScaling({
      id: `hollow-elk-rootling-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: 'hollowling',
      name: 'Root-Torn Spirit',
      x: spawn.x,
      y: spawn.y,
      r: 15,
      radius: 15,
      hp: 54,
      maxHp: 54,
      damage: 8,
      dmg: 8,
      xp: 20,
      speed: 72,
      aggroRange: 260,
      attackRange: 26,
      attackRate: 0.9,
      attackCooldown: 0,
      summonedByBoss: enemy.id,
      rewardSuppressed:true,
      combatLevel:enemy.combatLevel,
      dead: false,
      remove: false
    }));
  }
}

function spawnDungeonOathguards(enemy, world, count) {
  count=Math.min(count,Math.max(0,8-(world.enemies||[]).filter(e=>e.summonedByBoss===enemy.id&&e.hp>0&&!e.dead).length));
  world.enemies = world.enemies || [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / Math.max(1, count) + Math.random() * 0.6;
    const spawn = safeSpawn(world, enemy.x + Math.cos(angle) * TILE * 2.9, enemy.y + Math.sin(angle) * TILE * 2.9);

    world.enemies.push(applyEnemyStrengthScaling({
      id: `dungeon-oathguard-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: 'shieldKnight',
      archetype: 'shieldKnight',
      name: 'Oathbound Guard',
      x: spawn.x,
      y: spawn.y,
      r: 16,
      radius: 16,
      hp: 76,
      maxHp: 76,
      damage: 11,
      dmg: 11,
      xp: 24,
      speed: 48,
      aggroRange: 310,
      attackRange: 31,
      attackRate: 1.05,
      attackCooldown: 0,
      eliteModifier: i === 0 ? 'armoured' : null,
      summonedByBoss: enemy.id,
      rewardSuppressed:true,
      combatLevel:enemy.combatLevel,
      dead: false,
      remove: false
    }));
  }
}

function spawnDemonCultAdds(enemy, world, count) {
  count=Math.min(count,Math.max(0,8-(world.enemies||[]).filter(e=>e.summonedByBoss===enemy.id&&e.hp>0&&!e.dead).length));
  world.enemies = world.enemies || [];

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / Math.max(1, count) + Math.random() * 0.55;
    const cultist = i % 3 === 2;
    const spawn = safeSpawn(world, enemy.x + Math.cos(angle) * TILE * 3.4, enemy.y + Math.sin(angle) * TILE * 2.7);

    world.enemies.push(applyEnemyStrengthScaling({
      id: `red-seal-add-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: cultist ? 'cultist' : 'demonCultist',
      archetype: 'cultist',
      name: cultist ? 'Last Dawn Acolyte' : 'Last Dawn Mantle-Ripper',
      x: spawn.x,
      y: spawn.y,
      r: 15,
      radius: 15,
      hp: enemy.boss?.phase >= 3 ? 96 : 72,
      maxHp: enemy.boss?.phase >= 3 ? 96 : 72,
      damage: enemy.boss?.phase >= 3 ? 16 : 12,
      dmg: enemy.boss?.phase >= 3 ? 16 : 12,
      xp: 30,
      speed: cultist ? 58 : 70,
      aggroRange: 340,
      attackRange: cultist ? 150 : 29,
      attackRate: cultist ? 1.4 : 0.86,
      attackCooldown: 0,
      eliteModifier: i === 0 ? 'burning' : null,
      summonedByBoss: enemy.id,
      rewardSuppressed:true,
      combatLevel:enemy.combatLevel,
      dead: false,
      remove: false
    }));
  }
}

function spawnSeraphEchoes(enemy, world, count) {
  count=Math.min(count,Math.max(0,8-(world.enemies||[]).filter(e=>e.summonedByBoss===enemy.id&&e.hp>0&&!e.dead).length));
  world.enemies = world.enemies || [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spawn = safeSpawn(world, enemy.x + Math.cos(angle) * TILE * 3.1, enemy.y + Math.sin(angle) * TILE * 2.7);
    world.enemies.push(applyEnemyStrengthScaling({
      id: `seraphel-echo-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: i % 2 ? 'wraith' : 'shieldKnight',
      archetype: i % 2 ? 'wraith' : 'shieldKnight',
      name: i % 2 ? 'Broken Luminary Echo' : 'Uncrowned Guard',
      x: spawn.x,
      y: spawn.y,
      r: 15,
      radius: 15,
      hp: enemy.boss?.phase >= 3 ? 118 : 84,
      maxHp: enemy.boss?.phase >= 3 ? 118 : 84,
      damage: enemy.boss?.phase >= 3 ? 18 : 13,
      dmg: enemy.boss?.phase >= 3 ? 18 : 13,
      xp: 38,
      speed: i % 2 ? 76 : 48,
      aggroRange: 340,
      attackRange: i % 2 ? 42 : 32,
      attackRate: i % 2 ? 0.95 : 1.12,
      attackCooldown: 0,
      eliteModifier: i === 0 ? 'frozen' : null,
      summonedByBoss: enemy.id,
      rewardSuppressed:true,
      combatLevel:enemy.combatLevel,
      dead: false,
      remove: false
    }));
  }
}

function spawnNetworkEchoes(enemy, world, count) {
  count=Math.min(count,Math.max(0,8-(world.enemies||[]).filter(e=>e.summonedByBoss===enemy.id&&e.hp>0&&!e.dead).length));
  world.enemies = world.enemies || [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const brute = enemy.boss?.phase >= 3 && i === 0;
    const spawn = safeSpawn(world, enemy.x + Math.cos(angle) * TILE * 3.8, enemy.y + Math.sin(angle) * TILE * 3.1);
    world.enemies.push(applyEnemyStrengthScaling({
      id: `zephyr-network-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      kind: brute ? 'brute' : i % 2 ? 'cultist' : 'wraith',
      archetype: brute ? 'brute' : i % 2 ? 'cultist' : 'wraith',
      name: brute ? 'Unity Vessel' : i % 2 ? 'Choir-Made Confessor' : 'Assimilated Echo',
      x: spawn.x,
      y: spawn.y,
      r: brute ? 18 : 15,
      radius: brute ? 18 : 15,
      hp: brute ? 190 : enemy.boss?.phase >= 3 ? 126 : 92,
      maxHp: brute ? 190 : enemy.boss?.phase >= 3 ? 126 : 92,
      damage: brute ? 24 : enemy.boss?.phase >= 3 ? 19 : 14,
      dmg: brute ? 24 : enemy.boss?.phase >= 3 ? 19 : 14,
      xp: brute ? 70 : 42,
      speed: brute ? 36 : 68,
      aggroRange: 380,
      attackRange: brute ? 38 : i % 2 ? 210 : 46,
      attackRate: brute ? 0.65 : 1.05,
      attackCooldown: 0,
      eliteModifier: i === 0 ? 'armoured' : i === 1 ? 'vampiric' : null,
      summonedByBoss: enemy.id,
      rewardSuppressed:true,
      combatLevel:enemy.combatLevel,
      dead: false,
      remove: false
    }));
  }
}

function getBossRewardBundle(enemy, firstKill) {
  const rng=enemy.rewardSeed?encounterRng(`${enemy.rewardSeed}:boss`):Math.random;
  const randomBossReward=rewards=>rewards?.length?rewards[Math.min(rewards.length-1,Math.floor(rng()*rewards.length))]:null;
  const chanceBossReward=(chance,itemId,qty=1,color=null)=>rng()<chance?bossReward(itemId,qty,color):null;
  const type = getBossType(enemy);
  const rewards = [
    bossReward('bossCore', 1),
    bossReward('ashCoin', firstKill ? 42 : 24)
  ];

  if (firstKill) {
    rewards.push(bossReward('dungeonRelicShard', 2));
  } else if (rng() < 0.45) {
    rewards.push(bossReward('crackedRelic', 1));
  }

  if (type === 'demonLord') {
    rewards.push(
      ...(firstKill
        ? [
            bossReward('redSealScythe', 1, '#ef6f6c'),
            bossReward('redGlassIchor', 2, '#ef6f6c'),
            bossReward('redSealFragment', 3, '#ef6f6c')
          ]
        : [
            randomBossReward([
              bossReward('redSealFragment', 2, '#ef6f6c'),
              bossReward('redGlassIchor', 1, '#ef6f6c'),
              bossReward('redSealRing', 1, '#ef6f6c')
            ]),
            chanceBossReward(0.16, 'redSealConductor', 1, '#ef6f6c')
          ])
    );
  } else if (type === 'veyrWarden') {
    rewards.push(
      ...(firstKill
        ? [
            bossReward('veyrRapier', 1, '#6fa8ef'),
            bossReward('veyrSilkMantle', 1, '#6fa8ef'),
            bossReward('veyrSigil', 2, '#6fa8ef')
          ]
        : [
            randomBossReward([
              bossReward('veyrSigil', 2, '#6fa8ef'),
              bossReward('veyrglassShard', 2, '#6fa8ef'),
              bossReward('graveboundHelm', 1, '#6fa8ef')
            ]),
            chanceBossReward(0.14, 'veyrGraveLens', 1, '#6fa8ef')
          ])
    );
  } else if (type === 'hollowElk') {
    rewards.push(
      ...(firstKill
        ? [
            bossReward('blackbriarCrown', 1, '#73d18a'),
            bossReward('briarRoot', 4, '#73d18a'),
            bossReward('thornSeed', 2, '#73d18a')
          ]
        : [
            randomBossReward([
              bossReward('thornCharm', 1, '#73d18a'),
              bossReward('briarRoot', 3, '#73d18a'),
              bossReward('livingBark', 2, '#73d18a')
            ]),
            chanceBossReward(0.16, 'thornhookStaff', 1, '#73d18a')
          ])
    );
  } else if (type === 'redSealExecutioner') {
    rewards.push(
      ...(firstKill
        ? [
            bossReward('redSealConductor', 1, '#ef6f6c'),
            bossReward('redSealFragment', 4, '#ef6f6c'),
            bossReward('redGlassIchor', 2, '#ef6f6c')
          ]
        : [
            randomBossReward([
              bossReward('redSealFragment', 3, '#ef6f6c'),
              bossReward('redGlassIchor', 2, '#ef6f6c'),
              bossReward('redSealRing', 1, '#ef6f6c')
            ]),
            chanceBossReward(0.14, 'redSealConductor', 1, '#ef6f6c')
          ])
    );
  } else if (type === 'graveMawBear') {
    rewards.push(
      ...(firstKill
        ? [
            bossReward('graveboundHelm', 1, '#b68cff'),
            bossReward('graveAsh', 4, '#b68cff'),
            bossReward('tornHide', 3, '#d9ad4f')
          ]
        : [
            randomBossReward([
              bossReward('graveAsh', 3, '#b68cff'),
              bossReward('boneShard', 4, '#e8dcae'),
              bossReward('tornHide', 3, '#d9ad4f')
            ]),
            chanceBossReward(0.12, 'graveboundHelm', 1, '#b68cff')
          ])
    );
  } else if (type === 'briarTitan') {
    rewards.push(
      ...(firstKill
        ? [
            bossReward('thornhookStaff', 1, '#73d18a'),
            bossReward('livingBark', 3, '#73d18a'),
            bossReward('thornSeed', 3, '#73d18a')
          ]
        : [
            randomBossReward([
              bossReward('livingBark', 2, '#73d18a'),
              bossReward('thornSeed', 2, '#73d18a'),
              bossReward('thornCharm', 1, '#73d18a')
            ]),
            chanceBossReward(0.12, 'blackbriarCrown', 1, '#73d18a')
          ])
    );
  } else if (type === 'seraphel') {
    rewards.push(
      ...(firstKill
        ? [
            bossReward('seraphelFeather', 1, '#d7e8ff'),
            bossReward('everdawnCarver', 1, '#ffcc66'),
            bossReward('radiantSplinter', 3, '#d7e8ff')
          ]
        : [
            randomBossReward([
              bossReward('lightstormWard', 1, '#d7e8ff'),
              bossReward('radiantSplinter', 2, '#d7e8ff'),
              bossReward('dawncarverLens', 1, '#ffcc66')
            ]),
            chanceBossReward(0.12, 'sunfractureGauntlet', 1, '#ffcc66')
          ])
    );
  } else if (type === 'zephyrLight') {
    rewards.push(
      ...(firstKill
        ? [
            bossReward('zephyrShard', 1, '#66f0ff'),
            bossReward('zephyrglassAmulet', 1, '#66f0ff'),
            bossReward('towerFragment', 4, '#66f0ff')
          ]
        : [
            randomBossReward([
              bossReward('towerFragment', 3, '#66f0ff'),
              bossReward('watcherGlass', 2, '#66f0ff'),
              bossReward('uncrownedPrism', 1, '#66f0ff')
            ]),
            chanceBossReward(0.1, 'seraphsBrokenWing', 1, '#d7e8ff')
          ])
    );
  } else {
    rewards.push(
      ...(firstKill
        ? [
            bossReward('crackedRelic', 2, '#6fa8ef'),
            bossReward('dungeonRelicShard', 1, '#b68cff'),
            chanceBossReward(0.18, 'orrakaiFoundersSignet', 1, '#ffcc66')
          ]
        : [
            randomBossReward([
              bossReward('dungeonRelicShard', 1, '#b68cff'),
              bossReward('crackedRelic', 1, '#6fa8ef'),
              bossReward('arcaneDust', 2, '#b68cff')
            ])
          ])
    );
  }

  return mergeBossRewards(rewards.filter(Boolean));
}

function bossReward(itemId, qty = 1, color = null) {
  return {
    itemId,
    qty,
    color
  };
}

function randomBossReward(rewards) {
  const valid = rewards.filter(reward => reward?.itemId);
  if (!valid.length) return null;
  return valid[Math.floor(Math.random() * valid.length) % valid.length];
}

function chanceBossReward(chance, itemId, qty = 1, color = null) {
  return Math.random() < chance ? bossReward(itemId, qty, color) : null;
}

function mergeBossRewards(rewards) {
  const merged = [];

  for (const reward of rewards) {
    const item = ITEMS[reward?.itemId];
    if (!item) continue;

    if (item.stack) {
      const existing = merged.find(entry => entry.itemId === reward.itemId);
      if (existing) {
        existing.qty = Math.max(1, Number(existing.qty || 1)) + Math.max(1, Number(reward.qty || 1));
        existing.color = existing.color || reward.color;
        continue;
      }
    }

    merged.push({
      itemId: reward.itemId,
      qty: Math.max(1, Number(reward.qty || 1)),
      color: reward.color
    });
  }

  return merged;
}

function getBossType(enemy) {
  const text = `${enemy.bossType || ''} ${enemy.bossName || ''} ${enemy.name || ''} ${enemy.id || ''}`.toLowerCase();

  if (text.includes('demonlord') || text.includes('demon lord') || text.includes('malakar') || text.includes('solgate demon')) return 'demonLord';
  if (text.includes('seraphel') || text.includes('uncrowned')) return 'seraphel';
  if (text.includes('zephyrlight') || text.includes('zephyr light') || text.includes('zephyr')) return 'zephyrLight';
  if (text.includes('veyr warden') || text.includes('veyrwarden')) return 'veyrWarden';
  if (text.includes('hollow elk') || text.includes('hollowelk') || text.includes('blighted elk')) return 'hollowElk';
  if (text.includes('redsealexecutioner') || text.includes('red seal executioner') || text.includes('last dawn executioner')) return 'redSealExecutioner';
  if (text.includes('gravemawbear') || text.includes('grave-maw bear') || text.includes('grave maw bear')) return 'graveMawBear';
  if (text.includes('briartitan') || text.includes('briar titan')) return 'briarTitan';
  return enemy.bossType || 'genericBoss';
}

function safeSpawn(world, x, y) {
  return findNearestPassablePoint(world, x, y, 8);
}

import {getAbilityExpertise} from './skillExpertiseSystem.js';
import {applyCombatTempo} from './combatTempo.js';
import {HOTBAR_SLOT_COUNT} from './hotbarConfig.js';
import {resolveSubclassAbility} from './subclassVariants.js';
import {getAbilityMorphOptions} from './abilityMorphSystem.js';
import { attributeHandling } from './combatPower.js';
import { recordSupportContribution } from './encounterLedger.js';
import { advanceProgression, xpRequired, XP_CURVES, safeXP, safeLevel } from './progressionMath.js';
import { getAbilityById, normalizeAbilityId } from './data.js';
import { addFloatingText } from './floatingText.js';
import { playAbilityAudioEvent } from './abilityAudio.js';
import { getBalancedAbility } from './abilityCombatProfiles.js';

export const MASTERY_MILESTONES = [5, 10, 20, 30, 50, 100, 250, 500];
const supportSources = new WeakMap();
const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const empty = () => ({level:1,xp:0,lifetimeKills:0,lifetimeContributingKills:0,lifetimeSuccessfulUses:0,lifetimeDamage:0,lastMasteryGainAt:0});

export function masteryXpRequired(level) {
  const l = Math.max(1, number(level));
  return xpRequired(l, XP_CURVES.mastery);
}
export function normalizeAbilityMastery(player) {
  if (!player) return {};
  if (player.abilityMasteryVersion === 1 && player.abilityMastery && typeof player.abilityMastery === 'object' && !Array.isArray(player.abilityMastery)) return player.abilityMastery;
  const next = {};
  for (const [rawId, raw] of Object.entries(player.abilityMastery || {})) {
    const id = normalizeAbilityId(rawId);
    if (!getAbilityById(id) || !raw || typeof raw !== 'object') continue;
    const entry = empty();
    for (const key of Object.keys(entry)) entry[key] = number(raw[key]);
    entry.level = Math.max(1, Math.floor(entry.level));
    entry.level = safeLevel(entry.level);
    entry.xp = safeXP(entry.xp);
    // Alias collisions preserve the most experienced summary, never duplicate XP.
    if (!next[id] || next[id].level < entry.level || (next[id].level === entry.level && next[id].xp < entry.xp)) next[id] = entry;
  }
  player.abilityMastery = next;
  player.abilityMasteryVersion = 1;
  return next;
}
export function getAbilityMastery(player, abilityId, create = false) {
  const id = normalizeAbilityId(abilityId);
  if (!getAbilityById(id)) return empty();
  const map = normalizeAbilityMastery(player);
  if (!map[id] && create) map[id] = empty();
  return map[id] || empty();
}
export function getMasteryProgress(player, abilityId) {
  const entry = getAbilityMastery(player, abilityId);
  const next = masteryXpRequired(entry.level);
  return {...empty(),...entry, next, progress: Math.min(1, (entry.xp||0) / next), nextMilestone:MASTERY_MILESTONES.find(l => l > entry.level) || null};
}
export function getMasteryBonuses(player, abilityId) {
  const level = getAbilityMastery(player, abilityId).level;
  const refinement = 1 - Math.exp(-Math.max(0, level - 1) / 45);
  const ability=getAbilityById(abilityId), summon=!!ability?.summonType, mobility=!!ability?.mobilityProfile,
    protective=/heal|ward|aegis|guard|litany|mend/i.test(abilityId), channel=!!ability?.channelProfile;
  return {damage:1 + (summon?.30:protective?.26:channel?.24:mobility?.10:.18) * refinement,
    range:1 + (summon?0:protective?.06:mobility?.08:.12) * refinement,
    efficiency:1 - (mobility?.18:summon?.15:.1) * refinement,
    channelEfficiency:1 - .4 * (1 - Math.exp(-Math.max(0, level - 1) / 25)),
    tier:MASTERY_MILESTONES.filter(l => level >= l).length, extraBounce:level >= 20 ? 1 : 0, extraSwarm:level >= 30 ? 1 : 0};
}
export function applyAbilityMastery(player, ability) {
  if (!ability) return ability;
  ability=applyCombatTempo(resolveSubclassAbility(player,getBalancedAbility(ability)));
  const bonus = getMasteryBonuses(player, ability.id);
  const efficiency = (ability.channelProfile ? bonus.channelEfficiency : bonus.efficiency) * (ability.channelProfile ? 1 - .12 * attributeHandling(player,'focus') : 1);
  return {...ability, damage: Number(ability.damage || 0),
    damageMultiplier: Number(ability.damageMultiplier || 0) * bonus.damage,
    range: Number(ability.range || 0) * bonus.range, cost:Math.ceil(Number(ability.cost || 0) * efficiency),
    channelProfile:ability.channelProfile?{...ability.channelProfile,costPerSecond:ability.channelProfile.costPerSecond*efficiency}:undefined,
    _mastery:bonus,_expertise:getAbilityExpertise(player,ability)};
}
export function grantAbilityMasteryXp(player, abilityId, amount, now = performance.now()/1000, log = null) {
  if (!player || !getAbilityById(abilityId) || !(amount > 0) || !Number.isFinite(amount)) return 0;
  const entry = getAbilityMastery(player, abilityId, true);
  const previous = entry.level;
  amount = safeXP(amount);
  advanceProgression(entry,amount,XP_CURVES.mastery);
  entry.lastMasteryGainAt = now;
  if (entry.level > previous) {
    const milestone = MASTERY_MILESTONES.some(l => l > previous && l <= entry.level);
    const ability = getAbilityById(abilityId);
    const unlocked=getAbilityMorphOptions(player,ability.id).filter(o=>o.id!=='base'&&o.requiredMastery>previous&&o.requiredMastery<=entry.level);
    addFloatingText(player, `${ability.name} · Mastery ${entry.level}${unlocked.length?' · Morph unlocked':''}`, {color:milestone?'#ead49a':'#c3cfdd',size:milestone?13:10,ttl:1.1,offsetY:-70});
    log?.(`${ability.name} reaches Mastery ${entry.level}${unlocked.length?` — ${unlocked.map(o=>o.name).join(', ')} morph unlocked in Abilities.`:milestone ? ' — technique refined.' : '.'}`);
    player.masteryMilestoneEvent = milestone ? {abilityId,level:entry.level,at:now} : player.masteryMilestoneEvent;
    if(milestone)playAbilityAudioEvent('masteryMilestone',ability,{level:entry.level});
  }
  return amount;
}
export function awardHotbarMasteryXp(player, amount, now = performance.now()/1000, log = null) {
  amount = safeXP(amount);
  if (!player || !amount || !Array.isArray(player.loadout?.abilitySlots)) return 0;
  const ids = new Set(player.loadout.abilitySlots.slice(0,HOTBAR_SLOT_COUNT).map(normalizeAbilityId).filter(id => getAbilityById(id)));
  // Every distinct assigned skill receives the earned XP, regardless of casts,
  // damage, cooldown, summon state, proficiency, or the currently selected morph.
  for (const id of ids) grantAbilityMasteryXp(player,id,amount,now,log);
  return ids.size;
}
export function recordAbilitySuccessfulUse(player, id) {
  getAbilityMastery(player, id, true).lifetimeSuccessfulUses++;
}
export function recordAbilityDamage(player, id, damage) {
  if (id && getAbilityById(id) && damage > 0) getAbilityMastery(player,id,true).lifetimeDamage += damage;
}
export function recordEnemyAbilityStatistics(enemy, contributions, now = performance.now()/1000) {
  if (!enemy || enemy.abilityMasteryAwarded) return;
  enemy.abilityMasteryAwarded = true;
  if(enemy.trainingDummy || enemy.friendly)return;
  // Historical combat statistics only. Mastery XP comes from player XP awards.
  for (const c of contributions) {
    const p = c.actor;
    if (!p) continue; // Experience already earned persists even if the caster dies.
    for (const [id,damage] of Object.entries(c.abilities || {})) {
      if (!(damage > 0) || !getAbilityById(id)) continue;
      if (getAbilityById(id).summonType && !p.loadout?.abilitySlots?.includes(id)) continue;
      const entry = getAbilityMastery(p,id,true);
      entry.lifetimeContributingKills++;
      if (c.lastAbilityId === id && enemy.lastDamagedByActorId === c.actorId) entry.lifetimeKills++;
    }
  }
  // A useful curse/death mark need not deal its own damage or land the kill.
  const rewardedMarks=new Set();
  for(const mark of enemy.techniqueMarks || []) {
    const p=mark.owner;if(!p || mark.until < now)continue;
    const own=contributions.find(c=>c.actor===p);
    if(!own?.playerParticipation)continue;
    if(own?.abilities?.[mark.abilityId]>0)continue;
    const key=`${p.id||p.profileId||p.name}:${mark.abilityId}`;if(rewardedMarks.has(key))continue;rewardedMarks.add(key);
    getAbilityMastery(p,mark.abilityId,true).lifetimeContributingKills++;
  }
}
// Compatibility for older callers. Combat statistics never award mastery XP;
// live gameplay grants it only through awardHotbarMasteryXp when player XP arrives.
export function awardEnemyAbilityMastery(enemy, contributions, baseXp, now = performance.now()/1000, log = null) {
  return recordEnemyAbilityStatistics(enemy, contributions, now);
}
export function getHostileCombatEnemies(player, world) {
  if(world?.safeZone || ['capital','hub','town'].includes(world?.mode))return [];
  const party=[player,...(player.coop?.players||[])].filter(p=>p&&p.active!==false);
  const targetIds=new Set(party.flatMap(p=>[p.id,p.profileId,p.sessionSlot,p.slot,p.playerNumber,p.name,...(p.summons||[]).map(s=>s.id)]).filter(v=>v!=null).map(String));
  return (world?.enemies || []).filter(e => e && e.hp > 0 && !e.dead && !e.remove && !e.friendly && !e.trainingDummy &&
    Math.hypot(e.x-player.x,e.y-player.y) < 650 &&
    ((targetIds.has(String(e.combatTargetId))) ||
      (!e.combatTargetId && (e.aggro > 0 || e.isInCombat || e.awakened))));
}
export function rewardCombatPurpose(player, world, id, amount, now, log = null) {
  const enemies = getHostileCombatEnemies(player,world);
  if (!enemies.length || !(amount > 0)) return 0;
  recordSupportContribution(player,enemies,id,amount);
  // Useful support can qualify the player for shared victory XP. It does not
  // train an individual skill or create mastery XP before an XP reward arrives.
  return 0;
}
export function rewardMobilityMastery(player,world,id,distance,now,log=null) {
  if (distance < 28) return 0;
  return rewardCombatPurpose(player,world,id,4,now,log);
}

// Keep caster references in ephemeral state, including shields cast on allies.
export function registerAbilitySupport(buff,owner,abilityId) {
  if(buff && typeof buff==='object')supportSources.set(buff,{owner,abilityId});
}
export function rewardAbilitySupport(buff,world,effectiveAmount,now,log=null) {
  const source=supportSources.get(buff);
  if(!source || !(effectiveAmount>0))return 0;
  return rewardCombatPurpose(source.owner,world,source.abilityId,effectiveAmount*.12,now,log);
}

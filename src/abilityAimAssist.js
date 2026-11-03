import {canChargeAbility} from './chargeSystem.js';
import {hasLineOfSight} from './world.js';

const directionalEffects = new Set([
  'chain','tether','mandate','ricochet','deadfall','urn','seed','echo','bloom',
  'undertow','pressure','pillar','overexposure','angle'
]);
const directionalMorphs = new Set([
  'bolt','pierce','chain','beam','projectileChannel','mark','field','trap','burst'
]);
const legacyRanged = new Set([
  'fellhunterThrowingDaggers','fellhunterBearTrap','fellhunterCaltrops','fellhunterBombToss',
  'fellhunterGrapplingHook','fellhunterSmokeBomb','fellhunterKillZone',
  'lightbringerGleamBolt','lightbringerHaloBrand'
]);

export function usesAbilityAimAssist(ability) {
  if (!ability || ability._charge || canChargeAbility(ability) || !(ability.range > 0) || ability.summonType) return false;
  if (ability.faeFlowerField || ability.petalStorm || ability.soulSiphonField) return false;
  if (ability.spectralUrn) return true;
  if (ability.subclassMode && ability.subclassMode !== 'original') return directionalMorphs.has(ability.subclassMode);
  if (ability.channelProfile) return !['litany','maelstrom'].includes(ability.effectProfile);
  return directionalEffects.has(ability.effectProfile) || legacyRanged.has(ability.id);
}

const MAX_ANGLE = 22 * Math.PI / 180;
const MAX_CORRECTION = 10 * Math.PI / 180;
const DIRECT_AIM_ANGLE = 2 * Math.PI / 180;

export function assistAbilityAim(actor, world, aim, range) {
  const intent = Math.atan2(aim.y, aim.x);
  let bestScore = Infinity, correction = 0;
  for (const enemy of world?.enemies || []) {
    if (!enemy || !(enemy.hp > 0) || enemy.dead || enemy.remove || enemy.friendly ||
        enemy.arenaDormant || enemy.invulnerable || enemy.veyreignTransform != null) continue;
    const dx = enemy.x - actor.x, dy = enemy.y - actor.y;
    const distance = Math.hypot(dx, dy);
    if (!(distance > 0 && distance <= range) || dx * aim.x + dy * aim.y <= 0) continue;
    const angle = Math.atan2(dy, dx) - intent;
    const offset = Math.atan2(Math.sin(angle), Math.cos(angle));
    if (Math.abs(offset) > MAX_ANGLE) continue;
    const score = distance + Math.abs(offset) / MAX_ANGLE * 24;
    const directlyAimed = Math.abs(offset) <= DIRECT_AIM_ANGLE;
    if ((!directlyAimed && score >= bestScore) || (world.tiles?.length &&
        !hasLineOfSight(world,actor.x,actor.y,enemy.x,enemy.y))) continue;
    if (directlyAimed) return aim;
    bestScore = score;
    correction = offset;
  }
  if (!correction) return aim;
  const adjusted = intent + Math.max(-MAX_CORRECTION, Math.min(MAX_CORRECTION, correction));
  return {x:Math.cos(adjusted), y:Math.sin(adjusted)};
}

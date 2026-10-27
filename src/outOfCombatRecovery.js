import {hasHostileTarget} from './weaponStance.js';
import {getEliteHazards,getEliteHazardGeometry} from './eliteEncounterSystem.js';
import {telegraphContainsPoint} from './enemyTelegraphGeometry.js';
export const RECOVERY_DELAY=6;
export const HEALTH_RECOVERY_RATE=.2;
export const SUMMON_HEALTH_RECOVERY_RATE=HEALTH_RECOVERY_RATE/3;
const recovery=new WeakMap();
const livingSummon=(s,now)=>s&&s.hp>0&&s.alive!==false&&!s.dead&&!s.dismissed&&!(s.expiresAt&&s.expiresAt<=now);
const livingEnemy=e=>e&&e.hp>0&&e.alive!==false&&!e.dead&&!e.remove&&!e.friendly&&!e.returningHome;
export function hasUnlimitedStamina(actor){return recovery.get(actor)?.resting===true&&actor.hp>0&&!actor.dead&&!['downed','beingRevived','dead','respawning'].includes(actor.lifeState);}
export function updateOutOfCombatRecovery(actor,world,input,dt,now){
  const previous=recovery.get(actor),seconds=Math.max(0,Number(dt)||0);
  const combat=actor.combatState||{},action=actor.visualAction;
  const unable=actor.hp<=0||actor.dead||actor.active===false||['downed','beingRevived','dead','respawning'].includes(actor.lifeState);
  const damaged=(previous&&Number(actor.hp)<previous.hp)||Number(actor.visualHitUntil||0)>now;
  const activeAction=action&&now>=Number(action.startedAt)&&now<Number(action.startedAt)+Number(action.duration||0);
  const summons=(actor.summons||[]).filter(s=>livingSummon(s,now));
  const companions=new Set(summons.filter(s=>s.id!=null).map(s=>String(s.id)));
  const summonTargets=new Set(summons.filter(s=>s.targetEnemyId!=null).map(s=>String(s.targetEnemyId)));
  const companionThreat=(world?.enemies||[]).some(e=>livingEnemy(e)&&
    (e.combatTargetKind==='summon'&&companions.has(String(e.combatTargetId))||e.id!=null&&summonTargets.has(String(e.id))));
  const companionDamaged=summons.some(s=>previous?.summonHealth?.has(s)&&Number(s.hp)<previous.summonHealth.get(s)||Number(s.visualHitUntil||0)>now);
  // Announced battlefield danger counts as combat even if this co-op member
  // is not the caster's primary target. Dodging it must spend actual stamina.
  const eliteThreat=actor.eliteFrost>0||actor.eliteFrozenUntil>now||getEliteHazards(world).some(h=>telegraphContainsPoint(getEliteHazardGeometry(h),actor.x,actor.y,60));
  const engaged=unable||world?.mode==='pvpArena'||actor.activeChannel||actor.abilityCharge?.active||damaged||hasHostileTarget(actor,world)||eliteThreat||companionThreat||companionDamaged||combat.attacking||combat.heavyChargeActive||input?.attackPressed||input?.attackHeld||activeAction;
  const remaining=engaged?RECOVERY_DELAY:Math.max(0,(previous?.remaining||0)-seconds);
  const resting=!engaged&&remaining===0;
  if(resting){
    // Only the portion of this update after the cooldown expires may heal.
    const healSeconds=Math.max(0,seconds-(previous?.remaining||0));
    actor.hp=Math.min(actor.maxHp,actor.hp+actor.maxHp*HEALTH_RECOVERY_RATE*healSeconds);
    // The same rest window covers every companion. Recover one third of the
    // player's percentage rate; native healing remains additive in summon combat.
    for(const summon of summons)if(Number.isFinite(summon.maxHp)&&summon.maxHp>0){
      summon.hp=Math.min(summon.maxHp,summon.hp+summon.maxHp*SUMMON_HEALTH_RECOVERY_RATE*healSeconds);
    }
    actor.stamina=actor.maxStamina;
    actor.spirit=Math.min(actor.maxSpirit || 0,(actor.spirit || 0)+(actor.maxSpirit || 0)*.25*healSeconds);
    if(actor.actionState)actor.actionState.staminaRegenDelay=0;
  }
  recovery.set(actor,{remaining,resting,hp:Number(actor.hp),summonHealth:new Map(summons.map(s=>[s,Number(s.hp)]))});
  return {resting,remaining};
}
export function refillExplorationStamina(actor){
  if(hasUnlimitedStamina(actor)){actor.stamina=actor.maxStamina;if(actor.actionState)actor.actionState.staminaRegenDelay=0;}
}

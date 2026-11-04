import {ITEMS} from './data.js';
import {getGearVisualProfile} from './gearVisualStyle.js';
import {getEnemyTargetId} from './coopEnemyScaling.js';

export const WEAPON_READY_SECONDS=6;
const STOWABLE_WEAPONS=new Set(['sword','dagger','axe','mace','hammer','spear','staff','scythe','spiritFocus','grimoire']);
const stances=new WeakMap();
export function canSheatheWeapon(actor){
  const ref=actor?.equipment?.weapon,id=typeof ref==='string'?ref:ref?.id;
  return !!id&&STOWABLE_WEAPONS.has(getGearVisualProfile(id,ITEMS[id]||{}).weaponType);
}
export function hasHostileTarget(actor,world){
  if(world?.safeZone)return false;
  const id=getEnemyTargetId(actor);
  if(!id)return false;
  return (world?.enemies||[]).some(enemy=>enemy&&enemy.alive!==false&&!enemy.dead&&Number(enemy.hp??1)>0&&!enemy.returningHome&&
    enemy.combatTargetKind==='player'&&String(enemy.combatTargetId||'')===id);
}
// Presentation state lives outside actors and saves. Preview renders cannot reset it.
export function sampleWeaponStance(actor,world,now=performance.now()/1000){
  if(!canSheatheWeapon(actor))return {sheathed:false,readyUntil:0};
  const {ready,...stance}=sampleCombatReadiness(actor,world,now);
  return {...stance,sheathed:!ready};
}
// Readiness also applies to bows and unarmed players, whose weapons do not stow.
export function sampleCombatReadiness(actor,world,now=performance.now()/1000){
  const combat=actor.combatState||{},action=actor.visualAction;
  const previous=stances.get(actor);
  const changedAttack=!!previous&&combat.attackId!==previous.attackId&&Number(combat.attackId)>0;
  const activeAction=action&&now>=Number(action.startedAt)&&now<Number(action.startedAt)+Number(action.duration||0);
  const busy=!!actor.simulatedInCombat||!!combat.attacking||!!combat.heavyChargeActive||!!activeAction||!!actor.actionState?.blocking;
  const threatened=hasHostileTarget(actor,world);
  let readyUntil=previous?.readyUntil||0;
  if(busy||changedAttack||threatened)readyUntil=now+WEAPON_READY_SECONDS;
  const result={ready:busy||threatened||now<readyUntil,readyUntil,attackId:combat.attackId};
  stances.set(actor,result);return result;
}

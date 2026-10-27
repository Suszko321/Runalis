import { ITEMS } from './data.js';

export const EQUIPMENT_BOUND_SKILLS = Object.freeze({summonDemon:'demonseedScythe'});
export function requiredSkillEquipment(ability) {return ability?.requiredEquipmentId || EQUIPMENT_BOUND_SKILLS[ability?.id] || null;}
export function hasSkillEquipment(player,ability) {
  const id=typeof ability==='string'?EQUIPMENT_BOUND_SKILLS[ability]:requiredSkillEquipment(ability);
  return !id || Object.values(player?.equipment || {}).some(ref=>(typeof ref==='string'?ref:ref?.id)===id);
}
export function equipmentSkillReason(ability) {const id=requiredSkillEquipment(ability);return id?`Requires equipped ${ITEMS[id]?.name || id}.`:'';}
export function synchronizeEquipmentBoundSkills(player,now=performance.now()/1000) {
  if(!player)return;
  // Learned IDs, hotbar assignments, mastery and recharge clocks survive.
  // Only actors powered by removed equipment are dismissed.
  if(!hasSkillEquipment(player,'summonDemon')) {
    player.summons=(player.summons || []).filter(s=>{
      if(s.kind!=='miniDemon' && s.requiredEquipmentId!=='demonseedScythe')return true;
      if(s.alive!==false && !s.legendaryTemporary && !s.cooldownStarted){player.cooldowns ||= {};player.cooldowns.summonDemon=Math.max(Number(player.cooldowns.summonDemon)||-Infinity,now);s.cooldownStarted=true;}
      s.dismissed=true;s.alive=false;s.dead=true;s.hp=0;return false;
    });
  }
}

export function dismissCoterieForEquipmentChange(player,now=performance.now()/1000) {
  const actors=(player?.summons || []).filter(s=>s?.coterieEquipment && s.alive!==false && s.hp>0);
  if(!actors.length)return;
  // A recast takes a fresh gear snapshot; removed gear cannot keep powering an actor.
  for(const summon of actors){summon.dismissed=true;summon.alive=false;summon.dead=true;summon.hp=0;summon.cooldownStarted=true;}
  player.cooldowns ||= {};
  player.cooldowns.summonLich=Math.max(Number(player.cooldowns.summonLich)||-Infinity,now);
}

import {hasLineOfSight} from './world.js';
import {getLivingPartyMembers} from './partySupport.js';
import {addFloatingText} from './floatingText.js';
import {isTauntAbility,tauntingProgression} from './supportProgression.js';

// Encounter-only ownership: never serialized and never shared between worlds.
const taunts=new WeakMap();
export function tankTauntProfile(a,actor,bonuses) {
  return isTauntAbility(a) ? tauntingProgression(actor,bonuses) : null;
}
export function describeTankTaunt(a) {
  return tankTauntProfile(a)&&!a._tankTauntDescription&&!a.desc?.includes("Taunts visible")?{...a,_tankTauntDescription:true,desc:a.desc+' Taunts visible nearby non-boss enemies. Taunting progression increases reach and duration. Committed attacks still finish; leaving range or falling ends the challenge.'}:a;
}
export function applyTankTaunt(actor,world,ability,now,bonuses) {
  const profile=tankTauntProfile(ability,actor,bonuses), challenged=[];
  if(!profile||!world||world.mode==='pvpArena'||!getLivingPartyMembers(actor).includes(actor))return challenged;
  for(const enemy of world.enemies||[]){
    if(enemy.hp<=0||enemy.dead||enemy.remove||enemy.friendly||enemy.trainingDummy||enemy.arenaDormant||enemy.isBoss||enemy.worldBoss||enemy.bossId||enemy.bossType)continue;
    if(Math.hypot(enemy.x-actor.x,enemy.y-actor.y)>profile.radius||world.tiles?.length&&!hasLineOfSight(world,actor.x,actor.y,enemy.x,enemy.y))continue;
    if(getTauntTarget(enemy,world,now)!==actor)challenged.push(enemy);
    taunts.set(enemy,{actor,world,until:now+profile.duration});
    addFloatingText(enemy,'Taunted',{color:'#ead49a',ttl:.7,size:11});
  }
  return challenged;
}
export function getTauntTarget(enemy,world,now=performance.now()/1000) {
  const t=taunts.get(enemy);
  if(!t)return null;
  if((world&&t.world!==world) || now>=t.until || !getLivingPartyMembers(t.actor).includes(t.actor) ||
    !(t.world.enemies||[]).includes(enemy) || Math.hypot(enemy.x-t.actor.x,enemy.y-t.actor.y)>360 ||
    t.world.tiles?.length&&!hasLineOfSight(t.world,enemy.x,enemy.y,t.actor.x,t.actor.y)){
    taunts.delete(enemy);return null;
  }
  return t.actor;
}

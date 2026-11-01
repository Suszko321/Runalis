import {hasLineOfSight} from './world.js';
import {getLivingPartyMembers} from './partySupport.js';
import {addFloatingText} from './floatingText.js';

// Encounter-only ownership: never serialized and never shared between worlds.
const taunts=new WeakMap();
export function tankTauntProfile(a) {
  if(a?.id==='oathkeeperBulwarkOfLight')return {radius:180,duration:4};
  if(a?.id==='gravecallerFuneralUrn'&&a.subclassId==='deathknight')return {radius:180,duration:4};
  if(a?.id==='thornbinderLivingBriar'&&a.subclassId==='petalknight')return {radius:180,duration:4};
  return null;
}
export function describeTankTaunt(a) {
  return tankTauntProfile(a)&&!a._tankTauntDescription&&!a.desc?.includes("Taunts visible")?{...a,_tankTauntDescription:true,desc:a.desc+' Taunts visible nearby non-boss enemies within 180 pixels for 4 seconds. Committed attacks still finish; leaving range or falling ends the challenge.'}:a;
}
export function applyTankTaunt(actor,world,ability,now) {
  const profile=tankTauntProfile(ability);
  if(!profile||world?.mode==='pvpArena'||!getLivingPartyMembers(actor).includes(actor))return;
  for(const enemy of world.enemies||[]){
    if(enemy.hp<=0||enemy.dead||enemy.remove||enemy.friendly||enemy.arenaDormant||enemy.isBoss||enemy.worldBoss||enemy.bossId||enemy.bossType)continue;
    if(Math.hypot(enemy.x-actor.x,enemy.y-actor.y)>profile.radius||world.tiles?.length&&!hasLineOfSight(world,actor.x,actor.y,enemy.x,enemy.y))continue;
    taunts.set(enemy,{actor,world,until:now+profile.duration});
    addFloatingText(enemy,'Taunted',{color:'#ead49a',ttl:.7,size:11});
  }
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

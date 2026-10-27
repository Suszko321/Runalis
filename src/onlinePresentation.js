import {getSubclassCombatState,getSubclassResourceLabel} from './subclassCombat.js';
import {getSunkenPressureState} from './sunkenPressureSystem.js';
import {getCombatTechniqueState} from './combatExpansion.js';
import {wireClone} from './onlineProtocol.js';

export function hostPresentationRefs(game){
 const refs=new Map();
 for(const actor of [game.player,...(game.player.coop?.players||[])]){
  const id=actor===game.player?'host':actor.networkId||String(actor.slot);refs.set(actor,'actor:'+id);
  for(const [i,summon]of (actor.summons||[]).entries())refs.set(summon,`summon:${id}:${summon.id||i}`);
 }
 for(const enemy of game.world.enemies||[])refs.set(enemy,'enemy:'+enemy.id);
 return refs;
}
export function actorPresentation(actor,refs){
 const state=getSubclassCombatState(actor),depth=getSunkenPressureState(actor),technique=getCombatTechniqueState(actor);
 return {subclassState:state?wireClone(state,refs):null,techniqueState:technique?wireClone(technique,refs):null,resourceLabel:getSubclassResourceLabel(actor),sunkenDepth:depth?{startedAt:depth.startedAt,lastHit:depth.lastHit,depth:depth.depth}:null};
}
export function hydratePresentation(game,selfId,partyActors){
 const refs=new Map(),actors=[[selfId,game.player],...partyActors],known=new Set();
 for(const [id,actor]of actors){refs.set('actor:'+id,actor);known.add(actor);for(const [i,summon]of (actor.summons||[]).entries()){refs.set(`summon:${id}:${summon.id||i}`,summon);known.add(summon);}}
 for(const enemy of game.world.enemies||[]){refs.set('enemy:'+enemy.id,enemy);known.add(enemy);}
 const visited=new WeakSet();
 function hydrate(value){
  if(!value||typeof value!=='object')return value;
  if(value.$ref){if(!refs.has(value.$ref)&&value.$ref.startsWith('enemy:'))refs.set(value.$ref,{id:value.id,x:value.x||0,y:value.y||0,hp:value.hp||0});return refs.get(value.$ref)||null;}
  if(known.has(value)||visited.has(value))return value;visited.add(value);
  if(value instanceof Map){const entries=[...value].map(([k,v])=>[hydrate(k),hydrate(v)]).filter(([k])=>k);value.clear();for(const [k,v]of entries)value.set(k,v);}
  else if(value instanceof Set){const items=[...value].map(hydrate);value.clear();for(const v of items)value.add(v);}
  else for(const key of Object.keys(value))value[key]=hydrate(value[key]);
  return value;
 }
 for(const [,actor]of actors){for(const key of ['networkPresentation','combatState','activeChannel','combatEffects','buffs'])if(actor[key])hydrate(actor[key]);for(const summon of actor.summons||[])for(const key of Object.keys(summon))summon[key]=hydrate(summon[key]);for(const key of ['subclassState','techniqueState'])if(actor.networkPresentation?.[key])actor.networkPresentation[key].world=game.world;}
 for(const effect of [...(game.world.effects||[]),...(game.world.combatEffects||[])]){hydrate(effect);if(effect.mantleVisual)effect.mantleVisual.world=game.world;}
}

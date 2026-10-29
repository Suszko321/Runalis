// Compact mutations for repeatable side zones and regional tower floors.
// Geography and seeded enemies are regenerated; re-entry never rerolls a run.
import {resetFailedDungeonArena} from './dungeonArenaSystem.js';
const flags=['locked','claimed','depleted','opened','triggered','eventTriggered','completed','rewardClaimed'];
function plainClone(value){const seen=new WeakSet();return JSON.parse(JSON.stringify(value, (name,item)=>{
 if(['telegraph','bossTell','pendingSpecial','visualReaction','visualDeath'].includes(name))return undefined;
 if(['combatContributors','combatContributions','verdantWound','actor','owner','target','coop','questOwner'].includes(name))return undefined;
 if(item&&typeof item==='object'){if(seen.has(item))return undefined;seen.add(item);}return item;
}));}
const key=w=>w.mode==='tower'?`tower:${w.infiniteDungeonRegionId}:${w.floor}`:`side:${w.regionId}:${w.sideZoneType}:${w.sideZoneSeed}`;
export function recordRepeatableEnemyDeath(world,player,enemy){
 if(!player||!['tower','sideZone'].includes(world?.mode)||enemy.summonedBy||enemy.summonedByBoss)return;
 player.worldMemory ||= {};const ledger=player.worldMemory.instanceEncounters ||= {},entry=ledger[key(world)] ||= {deadIds:[],wounds:{},objects:{},drops:[]};
 if(!entry.deadIds.includes(enemy.id))entry.deadIds.push(enemy.id);
 delete entry.wounds?.[enemy.id];
}
export function rememberRepeatableInstance(game,{failed=false}={}){
 const host=game?.hostGame||game,w=host?.world,p=host?.player;if(!p||!['tower','sideZone'].includes(w?.mode))return;
 if(failed&&w.dungeonState?.grove)resetFailedDungeonArena(w);
 p.worldMemory ||= {};const ledger=p.worldMemory.instanceEncounters ||= {},now=Number(p.worldMemory.elapsed)||0;
 const prior=ledger[key(w)],deadIds=[...(prior?.deadIds||[])],wounds={},objects={},eliteBudgets={};
 for(const e of w.enemies||[]){if(e.summonedBy||e.summonedByBoss)continue;if(e.dead||e.hp<=0){if(!deadIds.includes(e.id))deadIds.push(e.id);}else if(e.hp<e.maxHp)wounds[e.id]=e.hp;}
 for(const e of w.enemies||[])if(e.eliteHealRemaining!=null)eliteBudgets[e.id]=e.eliteHealRemaining;
 for(const o of w.objects||[]){const state={};for(const f of flags)if(o[f]!=null)state[f]=o[f];if(Object.keys(state).length)objects[o.id]=state;}
 const eventIds=new Set(Object.values(w.dungeonState?.activeEvents||{}).flatMap(e=>e.memberIds||[]));
 const eventEnemies=(w.enemies||[]).filter(e=>eventIds.has(e.id)&&e.hp>0&&!e.dead);
 ledger[key(w)]={deadIds,wounds,objects,eliteBudgets,drops:plainClone(w.drops||[]),events:plainClone(w.dungeonState||null),eventEnemies:plainClone(eventEnemies),cleared:!!w.cleared,arenaPhase:failed?'dormant':w.bossArena?.phase,resetAt:w.cleared?(prior?.resetAt||(now+1800)):null};
}
export function restoreRepeatableInstance(world,player){
 const ledger=player?.worldMemory?.instanceEncounters,state=ledger?.[key(world)];if(!state)return false;
 if(world.dungeonState?.grove&&!state.events?.grove){delete ledger[key(world)];return false;}
 if(state.resetAt&&Number(player.worldMemory.elapsed)>=state.resetAt){delete ledger[key(world)];return false;}
 const dead=new Set(state.deadIds||[]);world.enemies=(world.enemies||[]).filter(e=>!dead.has(e.id));
 for(const e of world.enemies)if(state.wounds?.[e.id]!=null)e.hp=Math.max(1,Math.min(e.maxHp,state.wounds[e.id]));
 for(const e of world.enemies)if(state.eliteBudgets?.[e.id]!=null)e.eliteHealRemaining=state.eliteBudgets[e.id];
 for(const o of world.objects||[])if(state.objects?.[o.id])Object.assign(o,state.objects[o.id]);
 world.drops=JSON.parse(JSON.stringify(state.drops||[]));world.cleared=!!state.cleared;
 if(state.events)world.dungeonState=JSON.parse(JSON.stringify(state.events));
 for(const e of state.eventEnemies||[])if(!world.enemies.some(other=>other.id===e.id))world.enemies.push(JSON.parse(JSON.stringify(e)));
 if(world.bossArena){world.bossArena.phase=state.arenaPhase||'dormant';if(world.cleared)world.bossArena.phase='defeated';}
 return true;
}

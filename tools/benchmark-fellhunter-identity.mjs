import fs from 'node:fs';
import {ABILITIES} from '../src/data.js';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {useAbility,updateCombat} from '../src/combat.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';
import {SKILL_TREE_NODES,spendSkillTreeNode,getSpentSkillTreePoints} from '../src/skillTreeSystem.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
export function fixture(id='fellhunterThrowingDaggers',family='bloodhound',count=1,rank='normal'){
 now=100;const p=createPlayer('Hunter identity review');chooseClass(p,'fellhunter');p.equipment.weapon='hunterBow';p.skillState.combat.level=33;
 for(const value of Object.values(p.skillState.skills))value.level=33;migratePlayer(p);Object.assign(p,{x:400,y:400,dirX:1,dirY:0,spiritAwakened:true});p.skillTree.respecVersion=1;
 const w={mode:'dungeon',width:70,height:50,tiles:Array.from({length:50},()=>Array.from({length:70},()=>({passable:true,biome:'grass'}))),enemies:[],effects:[],objects:[],drops:[]};
 w.enemies=Array.from({length:count},(_,i)=>({id:'review'+i,kind:'brute',x:460+i%4*22,y:400+Math.floor(i/4)*15,radius:12,hp:1e7,maxHp:1e7,xp:0,isBoss:rank==='boss',isElite:rank==='elite'}));
 updateCombat(p,w,{},0,now,()=>{});p.maxSpirit=p.spirit=p.maxStamina=p.stamina=10000;p.hp=p.maxHp*.5;
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;selectAbilityMorph(p,id,family,now);p.loadout.abilitySlots=[id,null,null,null,'block'];
 const input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
 const c={p,w,input,now:()=>now,a:()=>resolveAbilityMorph(p,id,family),cast:()=>useAbility(0,p,w,()=>{},now,input),state:()=>getSubclassCombatState(p),damage:()=>w.enemies.reduce((n,e)=>n+e.maxHp-e.hp,0),refresh:()=>{p.cooldowns={};p.abilityUseCharges={};p.spirit=p.stamina=10000;},tick(dt=.025){now+=dt;updateCombat(p,w,input,dt,now,()=>{});for(const f of w.effects)f.age=(f.age||0)+dt;w.effects=w.effects.filter(f=>f.age<f.ttl);}};
 return c;
}
export function benchmark(){
 const casts=[];
 for(const family of ['base','bloodhound','hellstalker'])for(const a of ABILITIES.filter(a=>a.classId==='fellhunter'))for(const count of [1,16]){
  const c=fixture(a.id,family,count),resolved=c.a();if(resolved.subclassMode==='burst')for(const [i,e]of c.w.enemies.entries()){e.x=c.p.x+resolved.range+i%4*12;e.y=c.p.y+Math.floor(i/4)*12;}
  const used=c.cast(),field=c.state()?.fields?.[0];if(field)for(const [i,e]of c.w.enemies.entries()){e.x=field.x+i%4*12;e.y=field.y+Math.floor(i/4)*12;}
  let peakEffects=0;const timeline=[];for(let step=1;step<=720;step++){c.tick();peakEffects=Math.max(peakEffects,c.w.effects.length);if(step%40===0)timeline.push(Math.round(c.damage()));}
  casts.push({id:a.id,family,enemies:count,used,damage:Math.round(c.damage()),timeline,peakEffects});
 }
 return {note:'Level 33, mastery 20, Hunter Bow, one cast, no passive tree, 18 seconds, stationary targets. Traps/fields are populated after placement. Timelines are cumulative damage at each second, not FPS.',casts,rotations:rotationBenchmark()};
}
export function rotationBenchmark(){
 const results=[],ids=['fellhunterPracticalStrike','fellhunterThrowingDaggers','fellhunterExecutionWindow','fellhunterKillZone'];
 for(const developed of [false,true])for(const family of ['bloodhound','hellstalker'])for(const enemies of [1,16]){
  const c=fixture(ids[0],family,enemies);for(const [i,e]of c.w.enemies.entries()){e.x=472+i%4*18;e.y=400+Math.floor(i/4)*14;}
  for(const id of ids.slice(1)){unlockActiveAbility(c.p,id,{autoAssignEmpty:false});getAbilityMastery(c.p,id,true).level=20;selectAbilityMorph(c.p,id,family,c.now());}c.p.loadout.abilitySlots=[...ids,'block'];
  if(developed){
   spendSkillTreeNode(c.p,'archery_root');spendSkillTreeNode(c.p,'archery_trick_arrows');
   for(const branch of ['archery','bow']){
    for(let pass=0;pass<4;pass++)for(const n of Object.values(SKILL_TREE_NODES))if(n.tree===branch&&!n.expertise&&!c.p.skillTree.spent[n.id])spendSkillTreeNode(c.p,n.id);
    if(branch==='archery')spendSkillTreeNode(c.p,`archery_expertise_${family}`);
   }
  }
  let peakBleed=0,peakPoison=0;
  for(let i=0;i<1200;i++){
   for(let slot=0;slot<4;slot++)useAbility(slot,c.p,c.w,()=>{},c.now(),c.input);c.tick();
   for(const bundle of c.state()?.afflictions.values()||[]){const a=bundle.effects.get('bloodhound');peakBleed=Math.max(peakBleed,a?.bleeds?.length||0);peakPoison=Math.max(peakPoison,a?.venoms?.length||0);}
  }
  const damage30=Math.round(c.damage());for(let i=0;i<720;i++)c.tick();
  results.push({family,developed,enemies,spentPoints:getSpentSkillTreePoints(c.p),damage30,dps:+(damage30/30).toFixed(1),tailDamage:Math.round(c.damage())-damage30,peakBleed,peakPoison});
 }
 return results;
}
if(process.argv[1]?.endsWith('benchmark-fellhunter-identity.mjs')){const label=process.argv[2]||'after';fs.mkdirSync('docs/fellhunter-identity',{recursive:true});const report=benchmark();fs.writeFileSync(`docs/fellhunter-identity/${label}.json`,JSON.stringify(report,null,2));console.log(JSON.stringify({label,casts:report.casts.length,failed:report.casts.filter(c=>!c.used)}));}

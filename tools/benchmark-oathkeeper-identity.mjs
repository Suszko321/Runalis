import fs from 'node:fs';
import {ABILITIES} from '../src/data.js';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {useAbility,updateCombat} from '../src/combat.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {SKILL_TREE_NODES,spendSkillTreeNode,getSpentSkillTreePoints} from '../src/skillTreeSystem.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
export function fixture(ids,family='holyknight',count=1,type='normal',classId='oathkeeper'){
 now=100;const p=createPlayer('Identity review');chooseClass(p,classId);
 if(classId==='oathkeeper')p.equipment.weapon='oathkeepersMace';
 if(classId==='fellhunter')p.equipment.weapon='hunterBow';
 p.skillState.combat.level=33;for(const skill of Object.values(p.skillState.skills))skill.level=33;migratePlayer(p);
 p.x=p.y=400;p.dirX=1;p.dirY=0;
 const w={mode:'dungeon',width:60,height:50,tiles:Array.from({length:50},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};
 w.enemies=Array.from({length:count},(_,i)=>({id:'review'+i,kind:'rat',x:445+(i%4)*18,y:400+Math.floor(i/4)*18,radius:10,hp:1e7,maxHp:1e7,xp:0,isElite:type==='elite',isBoss:type==='boss'}));
 updateCombat(p,w,{},0,now,()=>{});p.maxStamina=p.stamina=p.maxSpirit=p.spirit=10000;p.hp=p.maxHp*.5;
 for(const id of ids){unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;selectAbilityMorph(p,id,family,now);}
 p.loadout.abilitySlots=[...ids];
 const input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
 return {p,w,input,now:()=>now,cast:(i=0)=>useAbility(i,p,w,()=>{},now,input),tick:(dt=.025)=>{now+=dt;updateCombat(p,w,input,dt,now,()=>{});for(const fx of w.effects)fx.age=(fx.age||0)+dt;w.effects=w.effects.filter(f=>f.age<f.ttl);},damage:()=>w.enemies.reduce((n,e)=>n+e.maxHp-e.hp,0)};
}
export function benchmark(){
 const casts=[];
 for(const family of ['holyknight','sinner'])for(const a of ABILITIES.filter(a=>a.classId==='oathkeeper'))for(const count of [1,16]){
  const c=fixture([a.id],family,count),hp=c.p.hp;const used=c.cast();let maxEffects=0;
  for(let i=0;i<240;i++){c.tick();maxEffects=Math.max(maxEffects,c.w.effects.length);}
  casts.push({id:a.id,family,enemies:count,used,damage:+c.damage().toFixed(2),healthChange:+(c.p.hp-hp).toFixed(2),maxEffects});
 }
 return {note:'Level 33, mastery 20, fixed equipment, 6 s per cast, stationary targets, no incoming attacks. These are damage/healing comparisons, not FPS measurements.',casts,rotations:rotationBenchmark()};
}
export function rotationBenchmark(){
 const results=[];
 for(const invested of [false,true])for(const [classId,family,ids] of [
  ['oathkeeper','holyknight',['oathkeeperOathStrike','oathkeeperJudgmentSmite','oathkeeperHallowedBlades','oathkeeperHeavenbreakerJudgment']],
  ['oathkeeper','sinner',['oathkeeperOathStrike','oathkeeperJudgmentSmite','oathkeeperHallowedBlades','oathkeeperHeavenbreakerJudgment']],
  ['fellhunter','hellstalker',['fellhunterThrowingDaggers','fellhunterMarkedShot','fellhunterBombToss','fellhunterFlamingArrowVolley']]
 ]){
  const c=fixture(ids,family,1,'boss',classId);
  if(invested){
   c.p.skillTree.respecVersion=1;
   const tree=classId==='oathkeeper'?'blade':'archery',weapon=classId==='oathkeeper'?'blunt':'bow';
   // Spend the real level-33 entitlement through the normal purchase path.
   for(const branch of [tree,weapon]){
    for(let pass=0;pass<4;pass++)for(const n of Object.values(SKILL_TREE_NODES))
     if(n.tree===branch&&!n.expertise&&!c.p.skillTree.spent[n.id])spendSkillTreeNode(c.p,n.id);
    if(branch===tree)spendSkillTreeNode(c.p,`${tree}_expertise_${family}`);
   }
  }
  for(let i=0;i<1200;i++){for(let slot=0;slot<4;slot++)c.cast(slot);c.tick();}
  results.push({family,invested,spentPoints:getSpentSkillTreePoints(c.p),seconds:30,damage:Math.round(c.damage()),dps:+(c.damage()/30).toFixed(1)});
 }
 return results;
}
if(process.argv[1]?.endsWith('benchmark-oathkeeper-identity.mjs')){
 const label=process.argv[2]||'after';fs.mkdirSync('docs/oathkeeper-identity',{recursive:true});
 const report=benchmark();fs.writeFileSync(`docs/oathkeeper-identity/${label}.json`,JSON.stringify(report,null,2));
 console.log(JSON.stringify({label,casts:report.casts.length,failed:report.casts.filter(c=>!c.used).map(c=>c.id)}));
}

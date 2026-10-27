import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'.'),output=process.argv[3]||'docs/gravecaller-sustain/after.json';
const src=name=>import(pathToFileURL(path.join(root,'src',name)).href);
const {createPlayer,chooseClass,migratePlayer}=await src('player.js');
const {useAbility,updateCombat}=await src('combat.js');
const {unlockActiveAbility}=await src('abilityLoadoutSystem.js');
const {getAbilityMastery}=await src('abilityMasterySystem.js');
const {selectAbilityMorph}=await src('abilityMorphSystem.js');
const {getSpentSkillTreePoints}=await src('skillTreeSystem.js');
let clock=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
const aim={hasAim:true,combatAimX:1,combatAimY:0,ability0Held:true};
const world=()=>({mode:'dungeon',width:40,height:32,tiles:Array.from({length:32},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]});
function actor(level,id,morph){
 const p=createPlayer('Balance comparison');chooseClass(p,'gravecaller');p.skillState.combat.level=level;
 for(const s of ['spirit','summoning','scythe','focus','dexterity'])p.skillState.skills[s].level=Math.round(level*.35);
 p.equipment.weapon='lichboneScythe';p.bloodline={id:'vampire'};p.skillTree.respecVersion=1;
 p.skillTree.spent=Object.fromEntries(['spirit_root','spirit_harvest','spirit_minions','spirit_bone_coterie','spirit_soul_siphon','spirit_vital_theft','spirit_grave_command','scythe_root','scythe_branch_b','scythe_merge','scythe_second_b','scythe_second_merge','scythe_capstone','scythe_foundation_1','scythe_foundation_2','scythe_foundation_3','scythe_foundation_4'].map(id=>[id,1]));
 migratePlayer(p);Object.assign(p,{id:'comparison',x:256,y:320,spiritAwakened:true,isInCombat:true});p.hp=p.maxHp*.3;p.spirit=p.maxSpirit;
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots[0]=id;selectAbilityMorph(p,id,morph);clock+=30;return p;
}
const cases=[];
for(const level of [65,100])for(const [id,morph,count,hp,seconds] of [['gravecallerMurmuringHost','acolyte',20,1e6,3],['graveSpark','base',1,1,.5]]){
 const p=actor(level,id,morph),w=world();w.enemies=Array.from({length:count},(_,i)=>({id:'enemy'+i,kind:'hollowling',name:'Target',x:302+i*20,y:320,hp,maxHp:hp,radius:16,r:16,aggro:3,combatLevel:15}));
 const before=p.hp,start=clock;if(!useAbility(0,p,w,()=>{},clock,aim))throw Error('Cast failed');
 for(let frame=1;frame<=seconds*60;frame++){clock=start+frame/60;updateCombat(p,w,aim,1/60,clock,()=>{});}
 cases.push({level,skill:id,morph,targets:count,targetInitialHp:hp,seconds,pointsSpent:getSpentSkillTreePoints(p),maxHp:p.maxHp,initialHp:before,finalHp:p.hp,healing:Number((p.hp-before).toFixed(4)),totalDamage:w.enemies.reduce((sum,e)=>sum+hp-e.hp,0)});
}
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(cases,null,2)+'\n');console.log(JSON.stringify(cases));

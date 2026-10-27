import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {useAbility,updateSummons} from '../src/combat.js';
import {companionFollowPoint} from '../src/summonPositioning.js';
const id='thornbinderSummonElderThornbeast',report=[];
for(const morph of ['base','fae','petalknight'])for(const pack of [false,true])for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
 const p=createPlayer('Elder following');chooseClass(p,'thornbinder');p.skillState.combat.level=33;migratePlayer(p);Object.assign(p,{x:700,y:700,dirX:dx,dirY:dy,spiritAwakened:true});p.spirit=p.maxSpirit=10000;
 const w={mode:'dungeon',width:80,height:80,tiles:Array.from({length:80},()=>Array.from({length:80},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};let now=performance.now()/1000;
 for(const skill of pack?['thornbinderSummonThornlings',id]:[id]){unlockActiveAbility(p,skill,{autoAssignEmpty:false});getAbilityMastery(p,skill,true).level=20;assert(selectAbilityMorph(p,skill,morph,now).ok);assert(useAbility(skill,p,w,()=>{},now));}
 const elder=p.summons.find(s=>s.sourceAbilityId===id);assert(elder);const count=p.summons.length;const before={damage:elder.damage,range:elder.attackRange,speed:elder.speed};
 for(let i=0;i<150;i++){p.x+=dx*100/60;p.y+=dy*100/60;now+=1/60;updateSummons(1/60,p,w,()=>{},now);}
 const trailing=(p.x-elder.x)*dx+(p.y-elder.y)*dy,target=companionFollowPoint(elder,p),clearance=(elder.evolutionStage==='thornTitan'?102:elder.summonMorph==='petalknight'?92:84)+Math.max(0,-dy)*20;
 assert(trailing>=clearance-20,JSON.stringify({morph,pack,dx,dy,trailing,target,elder:{x:elder.x,y:elder.y}}));if(morph==='petalknight')assert(trailing>=76);assert(trailing<clearance+96,JSON.stringify({morph,pack,dx,dy,trailing,clearance,count,target,position:{x:elder.x,y:elder.y}}));assert.deepEqual({damage:elder.damage,range:elder.attackRange,speed:elder.speed},before);assert.equal(p.summons.length,count);report.push({morph,pack,dx,dy,trailing,clearance});
}
// Ordinary wolves retain their exact existing following point.
assert.deepEqual(companionFollowPoint({kind:'wolf'}, {x:400,y:400,dirX:1,dirY:0}),{x:352,y:400});
fs.mkdirSync('docs/elder-follow-spacing',{recursive:true});fs.writeFileSync('docs/elder-follow-spacing/verification.json',JSON.stringify({cases:report,ordinaryCompanionsUnchanged:true},null,2));console.log(JSON.stringify({cases:report.length,minTrailing:Math.min(...report.map(c=>c.trailing))}));

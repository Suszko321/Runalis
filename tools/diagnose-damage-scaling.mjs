import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {ITEMS,getAbilityById} from '../src/data.js';
import {calculateAbilityDamage,useAbility} from '../src/combat.js';
import {calculateWeaponDamage} from '../src/combatMoves.js';
import {applyAbilityMastery,getAbilityMastery} from '../src/abilityMasterySystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {progressionPower} from '../src/combatPower.js';
import {configureEncounterEnemy} from '../src/encounterData.js';
const report=[];
for(const level of [1,5,15,33,65,100]){
 const p=createPlayer('scaling-review');chooseClass(p,'gravecaller');p.equipment.weapon='graveScythe';p.skillState.combat.level=level;
 for(const id of ['spirit','scythe','summoning','focus','dexterity'])p.skillState.skills[id].level=Math.max(1,Math.round(level*.35));
 migratePlayer(p);Object.assign(p,{id:'scaling-review',x:400,y:400,spiritAwakened:true});
 const row={level,proficiency:p.skillState.skills.spirit.level,offence:progressionPower(p,'spirit'),defence:progressionPower(p,'warding','defence'),weapon:calculateWeaponDamage(p,ITEMS[p.equipment.weapon],'scythe'),spells:{},pets:{},ordinaryHp:{}};
 for(const id of ['graveSpark','bloodLance','soulSiphon','gravecallerMurmuringHost']){getAbilityMastery(p,id,true).level=20;row.spells[id]=calculateAbilityDamage(p,applyAbilityMastery(p,getAbilityById(id)));}
 for(const id of ['summonLich','gravecallerSummonLich'])for(const form of ['base','acolyte','cursed','deathknight']){
  const w={mode:'dungeon',width:32,height:32,tiles:Array.from({length:32},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};
  p.summons=[];p.cooldowns={};p.spirit=p.maxSpirit;unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;selectAbilityMorph(p,id,form);
  if(useAbility(id,p,w,()=>{},performance.now()/1000+20,{combatAimX:1,combatAimY:0,hasAim:true}))row.pets[id+':'+form]=p.summons[0]?.damage;
 }
 for(const enemyLevel of [5,15,33,65]){const e={id:'scaling-foe',kind:'hollowling',x:450,y:400,hp:42,maxHp:42};configureEncounterEnemy(e,{id:'fixed-review',levels:[enemyLevel,enemyLevel]},e.id,{rank:'ordinary'});row.ordinaryHp[enemyLevel]=e.maxHp;}
 report.push(row);
}
fs.mkdirSync('docs/damage-scaling',{recursive:true});const path=process.argv[2]||'docs/damage-scaling/current.json';fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

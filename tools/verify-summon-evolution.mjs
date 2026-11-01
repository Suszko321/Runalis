import assert from 'node:assert/strict';
import {SUMMON_VISUAL_MILESTONES,SUMMON_MASTERY_ABILITIES,summonVisualTier,synchronizeSummonEvolution,summonEvolutionPresentation} from '../src/summonEvolution.js';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {unlockActiveAbility,assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {useAbility,updateSummons} from '../src/combat.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
for(const [level,tier]of [[1,0],[4,0],[5,1],[9,1],[10,2],[19,2],[20,3],[49,3],[50,4],[9999,4],[NaN,0],[Infinity,0],[-10,0]])assert.equal(summonVisualTier(level),tier);
for(const [kind,ability]of Object.entries(SUMMON_MASTERY_ABILITIES)){
 const s={kind,id:'identity',hp:37,maxHp:90,damage:17,armour:12,evolutionStage:'unchanged',summonPath:'unchanged',summonMorph:'base'},before=structuredClone(s);
 for(const level of SUMMON_VISUAL_MILESTONES){synchronizeSummonEvolution(s,{abilityMastery:{[ability]:{level}}});assert.equal(s.summonVisualMastery,level);assert.equal(summonEvolutionPresentation(s,{}).tier,summonVisualTier(level));for(const key of Object.keys(before))assert.deepEqual(s[key],before[key]);}
}
const temporary={kind:'wolf',legendaryTemporary:true};synchronizeSummonEvolution(temporary,{});assert.equal(temporary.summonVisualMastery,undefined);assert.equal(summonEvolutionPresentation(temporary).scale,1);
console.log('PASS all mastery boundaries, six persistent kinds, guest metadata, temporary exclusion and unchanged combat state');
const world=()=>({mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
const now=performance.now()/1000,ids=['thornbinderSummonThornlings','thornbinderSummonElderThornbeast'];
for(const morph of ['base','fae','petalknight'])for(const id of ids){
 const party=Array.from({length:4},(_,i)=>{const p=createPlayer('Evolution P'+(i+1));chooseClass(p,'thornbinder');for(const skill of Object.values(p.skillState.skills))skill.level=80;migratePlayer(p);Object.assign(p,{id:'evolution-'+i,slot:i+1,x:300+i*40,y:320,spiritAwakened:true,maxSpirit:10000,spirit:10000});unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=50;assert(assignAbilityToSlot(p,0,id).ok);if(morph!=='base')assert(selectAbilityMorph(p,id,morph).ok);getAbilityMastery(p,id,true).level=[1,5,20,50][i];return p;});
 const w=world();for(const p of party){assert(useAbility(0,p,w,()=>{},now));const s=p.summons[0],health=[s.hp,s.maxHp],identity=s.id;assert.equal(s.summonVisualMastery,p.abilityMastery[id].level);for(const level of SUMMON_VISUAL_MILESTONES){p.abilityMastery[id].level=level;updateSummons(0,p,w,()=>{},now+.1);assert.equal(s.summonVisualTier,summonVisualTier(level));assert.equal(s.id,identity);assert.deepEqual([s.hp,s.maxHp],health);assert.equal(s.evolutionStage,id===ids[0]?'thornling':'elderThornbeast');}}
 party[0].abilityMastery[id].level=5;updateSummons(0,party[0],w,()=>{},now+.2);assert.equal(party[3].summons[0].summonVisualMastery,50);
 const saved=normalizeProfileSave(sanitizeForSave(party[3]));assert.equal(saved.abilityMastery[id].level,50);saved.summons=[];saved.cooldowns={};saved.spirit=10000;assert(useAbility(0,saved,world(),()=>{},now+100));assert.equal(saved.summons[0].summonVisualTier,4);
}
console.log('PASS actual spawn/live evolution/save-load-recast for Standard, Fae and Petalknight packs/elders in every player slot');

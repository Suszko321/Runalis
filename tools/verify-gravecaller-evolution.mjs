import assert from 'node:assert/strict';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {spendSkillTreeNode} from '../src/skillTreeSystem.js';
import {assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {useAbility,updateSummons} from '../src/combat.js';
import {SUMMON_VISUAL_MILESTONES,summonEvolutionPresentation} from '../src/summonEvolution.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {wireClone} from '../src/onlineProtocol.js';
const ids=['summonLich','gravecallerSummonLich'],world=()=>({mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]}),now=performance.now()/1000;
function actor(slot,morph){
 const p=createPlayer('Grave evolution P'+slot);chooseClass(p,'gravecaller');p.skillTree.bloodlineBonusPoints=100;
 for(const skill of Object.values(p.skillState.skills))skill.level=80;
 for(const node of ['spirit_root','spirit_harvest','spirit_minions','spirit_lich_ascension'])assert(spendSkillTreeNode(p,node).ok,node);
 migratePlayer(p);Object.assign(p,{id:'grave-owner-'+slot,slot,x:300+slot*35,y:300,spiritAwakened:true,maxSpirit:10000,spirit:10000});
 ids.forEach((id,i)=>{getAbilityMastery(p,id,true).level=50;assert(assignAbilityToSlot(p,i,id).ok);assert(selectAbilityMorph(p,id,morph).ok);});return p;
}
for(const morph of ['base','acolyte','deathknight']){
 const party=Array.from({length:4},(_,i)=>actor(i+1,morph)),w=world();
 for(const p of party){
  // Morphs must be learned/cast at their actual unlock mastery. Exercise lower
  // visual tiers on the existing actor rather than bypassing morph gates.
  p.abilityMastery.summonLich.level=50;p.abilityMastery.gravecallerSummonLich.level=50;
  ids.forEach((id,i)=>assert(useAbility(i,p,w,()=>{},now)));
  const bound=p.summons.find(s=>s.kind==='lich'),greater=p.summons.find(s=>s.kind==='greaterLich');assert(bound&&greater);
  p.abilityMastery.summonLich.level=1;updateSummons(0,p,w,()=>{},now+.05);
  assert.equal(bound.summonVisualMastery,1);assert.equal(greater.summonVisualMastery,50);
  for(const s of [bound,greater]){
   const id=s.sourceAbilityId,stable=Object.fromEntries(['id','hp','maxHp','armour','summonMorph','evolutionStage','ownerId','summonPath','coterieEquipment'].map(k=>[k,structuredClone(s[k])]));
   for(const level of SUMMON_VISUAL_MILESTONES){p.abilityMastery[id].level=level;updateSummons(0,p,w,()=>{},now+.1);assert.equal(s.summonVisualMastery,level);for(const k of Object.keys(stable))assert.deepEqual(s[k],stable[k],k);
    const presentation=summonEvolutionPresentation(s,p);assert.equal(presentation.graveArt,level===10?null:s.kind==='lich'?({base:'skeleton',acolyte:'bound-specter',deathknight:'bound-knight'}[morph]):({base:'lich',acolyte:'lich-specter',deathknight:'lich-knight'}[morph]));
    assert.deepEqual(summonEvolutionPresentation(wireClone(s),{}),presentation);
   }
  }
  const loaded=normalizeProfileSave(sanitizeForSave(p));loaded.summons=[];loaded.cooldowns={};loaded.spirit=10000;
  ids.forEach((id,i)=>{assert.equal(loaded.abilityMastery[id].level,50);assert(useAbility(i,loaded,world(),()=>{},now+100));});assert(loaded.summons.every(s=>s.summonVisualTier===4));
 }
 party[0].abilityMastery.summonLich.level=5;party[0].abilityMastery.gravecallerSummonLich.level=20;updateSummons(0,party[0],w,()=>{},now+.2);
 assert.equal(party[0].summons.find(s=>s.kind==='lich').summonVisualMastery,5);assert.equal(party[0].summons.find(s=>s.kind==='greaterLich').summonVisualMastery,20);
 assert(party.slice(1).every(p=>p.summons.every(s=>s.summonVisualMastery===50)));
}
console.log('PASS six Gravecaller forms × four local slots × five milestones; separate source mastery, preserved actors/stats/gear, wire snapshots and save/load/recast');

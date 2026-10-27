import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {ABILITIES,getAbilityById} from '../src/data.js';
import {SUBCLASSES} from '../src/subclassData.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {useAbility,updateCombat,updateSummons} from '../src/combat.js';
import {getSubclassCombatState,applyGardenCompanionHit,onSubclassDamaged,onSubclassBlocked,mitigateSubclassDamage,clearSubclassCombatState} from '../src/subclassCombat.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {expertiseNodeId} from '../src/skillExpertiseSystem.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const report={checks:[],skills:[]},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const copy=x=>JSON.parse(JSON.stringify(x));
function setup(id,family,rank='normal'){
 now=100;const p=createPlayer('Garden and grave review');chooseClass(p,getAbilityById(id).classId);p.skillState.combat.level=33;migratePlayer(p);p.x=400;p.y=400;p.dirX=1;p.dirY=0;
 const w={mode:'dungeon',width:60,height:50,tiles:Array.from({length:50},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),enemies:[],effects:[],objects:[],drops:[]};
 updateCombat(p,w,{},0,now,()=>{});p.maxSpirit=p.spirit=10000;p.maxStamina=p.stamina=10000;p.hp=p.maxHp*.5;
 const e={id:'target',kind:'brute',name:'Durable foe',x:460,y:400,radius:12,hp:100000,maxHp:100000,...(rank==='boss'?{isBoss:true}:rank==='elite'?{elite:true,isElite:true}:{})};w.enemies=[e];
 function learn(id,morph=family){unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;assert(selectAbilityMorph(p,id,morph,now).ok);}
 learn(id);p.loadout.abilitySlots=[id,null,null,null,'block'];
 const input={combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true};
 return {p,w,e,input,learn,cast(id=p.loadout.abilitySlots[0]){return useAbility(id===p.loadout.abilitySlots[0]?0:id,p,w,()=>{},now,input);},refresh(){p.spirit=10000;p.cooldowns={};p.abilityUseCharges={};},advance(seconds,pets=false){for(let i=0;i<Math.ceil(seconds/.025);i++){now+=.025;updateCombat(p,w,input,.025,now,()=>{});if(pets)updateSummons(.025,p,w,()=>{},now);}}};
}
const entry=(c,f)=>getSubclassCombatState(c.p)?.afflictions.get(c.e)?.effects.get(f);
test('Original, Fae and other Acolyte definitions and family identities exactly match the backup',()=>{
 const saved=JSON.parse(fs.readFileSync('backups/garden-grave-2026-10-12/protected-skills.json','utf8'));
 for(const item of saved.protectedSkills){if(item.family==='acolyte'&&item.ability.id==='gravecallerFuneralUrn')continue;const a=getAbilityById(item.ability.id),actual=item.family==='base'?a:resolveAbilityMorph({classId:a.classId},a,item.family);assert.deepEqual(copy(actual),['bloodLance','summonLich'].includes(item.ability.id)&&item.family==='base'?{...item.ability,desc:actual.desc}:item.ability,item.family+' '+a.id);}
 for(const id of ['fae','acolyte'])assert.deepEqual(copy(SUBCLASSES[id]),saved.families[id]);
 report.protectedDefinitions=saved.protectedSkills.length-1;
 report.authorizedChanges=['Acolyte Funeral Urn: explicitly requested 2026-10-18'];
});
test('all 21 retained close-combat morphs actually cast, pay resources and retain finite bounded state',()=>{
 for(const classId of ['thornbinder','gravecaller'])for(const base of ABILITIES.filter(a=>a.classId===classId))for(const family of classId==='thornbinder'?['petalknight']:['deathknight']){
  const c=setup(base.id,family),a=resolveAbilityMorph(c.p,base,family),m=getAbilityMastery(c.p,base.id),xp=m.xp;assert(a.gardenGraveMorph);assert(a.desc.length>40);const before=c.p.spirit+c.p.stamina;assert(c.cast(),base.id+'/'+family);assert(c.p.spirit+c.p.stamina<before);
  const f=getSubclassCombatState(c.p)?.fields[0];if(f){c.e.x=f.x;c.e.y=f.y;}c.advance(2.5,!!a.summonType);
  const s=getSubclassCombatState(c.p);if(s){assert(s.fields.length<=12&&s.shots.length<=32&&s.afflictions.size<=64);}
  assert.equal(m.xp,xp,'Casting and damage must not award mastery XP');assert(Number.isFinite(c.p.hp)&&Number.isFinite(c.e.hp));
  report.skills.push({id:base.id,family,mode:a.subclassMode,cost:a.cost,cooldown:a.cd,radius:a.subclassRadius,damage:100000-c.e.hp,companions:c.p.summons.length});
 }
 assert.equal(report.skills.length,21);
});
test('Deathknight rewards close pressure with Death Sentence, grants an iron ward and does not add new lifesteal',()=>{
 const c=setup('graveSpark','deathknight');for(let i=0;i<3;i++){c.refresh();assert(c.cast());c.advance(.8);}assert(c.w.effects.some(f=>f.geometry==='deathSentence'));
 const q=setup('gravecallerMurmuringHost','deathknight');assert(q.cast());q.advance(1.5);assert(q.p.buffs.defense.reduction>=.12);assert.equal(q.p.buffs.defense.gardenFamily,'deathknight');
 const r=setup('gravecallerFuneralUrn','deathknight'),hp=r.p.hp;assert(r.cast());r.e.x=getSubclassCombatState(r.p).fields[0].x;r.advance(4);assert.equal(r.p.hp,hp,'Bone standard has no hidden lifesteal');
});
test('Roseguard builds three layers, reflects real nearby damage and blocked damage, and obeys recovery windows',()=>{
 const c=setup('thornbinderThornLash','petalknight');for(let i=0;i<3;i++){c.e.x=500;c.e.y=400;c.refresh();assert(c.cast());c.advance(.65);}c.e.x=460;const s=getSubclassCombatState(c.p);assert.equal(s.roseGuard.stacks,3);assert(mitigateSubclassDamage(c.p,null,100,now)<100);
 let hp=c.e.hp;onSubclassDamaged(c.p,30,c.e,c.w,now);c.advance(.025);assert(c.e.hp<hp);assert(c.w.effects.some(f=>f.geometry==='roseReflection'));const damage=hp-c.e.hp;assert(damage<=30*.45+1);
 hp=c.e.hp;onSubclassDamaged(c.p,30,c.e,c.w,now);c.advance(.025);assert.equal(c.e.hp,hp,'Retaliation cannot spam');c.advance(.8);
 onSubclassBlocked(c.p,{blocked:true,preventedDamage:40},c.e,c.w,now);hp=c.e.hp;c.advance(.025);assert(c.e.hp<hp);
 c.e.x=900;c.advance(.8);onSubclassDamaged(c.p,100,c.e,c.w,now);hp=c.e.hp;c.advance(.025);assert.equal(c.e.hp,hp,'Distant attackers cannot be hit by rose thorns');
 for(const rank of ['normal','elite','boss']){const q=setup('thornbinderRootPrison','petalknight',rank);q.e.x=550;let last=0,count=0;for(let i=0;i<80;i++){q.refresh();q.cast();q.advance(.1);if(q.e.rootUntil>now&&q.e.rootUntil>last){if(count)assert(now>=last+2.4);last=q.e.rootUntil;count++;}}if(rank==='boss')assert.equal(count,0);else assert(count>0);}
});
test('Rose pack and elder coexist, retain independent dismissal, and save their distinct identity',()=>{
 const id='thornbinderSummonThornlings',elder='thornbinderSummonElderThornbeast',c=setup(id,'petalknight');c.learn(elder);assert(c.cast());assert(c.cast(elder));assert.equal(c.p.summons.length,4);assert(c.p.summons.every(s=>s.gardenSummon&&s.summonMorph==='petalknight'&&/^Rose /.test(s.displayName)));
 const hp=c.p.hp;c.advance(5,true);assert.equal(c.p.hp,hp,'Rose companions do not inherit passive owner healing');
 const loaded=normalizeProfileSave(sanitizeForSave(c.p));migratePlayer(loaded);assert.equal(loaded.summons.length,4);assert(loaded.summons.every(s=>s.summonMorph==='petalknight'));
 c.refresh();assert(c.cast(id));c.advance(.05,true);assert.equal(c.p.summons.length,1);assert.equal(c.p.summons[0].sourceAbilityId,elder);
});
test('Rose Hook pulls light foes, Rosebite scatters thorns, and distant gardens do not build melee guard',()=>{
 const c=setup('thornbinderBriarHook','petalknight');c.e.x=600;const x=c.e.x;assert(c.cast());c.advance(.4);assert(c.e.x<x,'Hook must actually displace its target');
 const q=setup('thornbinderRosebiteBurst','petalknight');assert(q.cast());assert(q.w.effects.some(f=>f.geometry==='burst'));assert(q.e.hp<100000);
 const r=setup('thornbinderBramblePatch','petalknight');assert(r.cast());const f=getSubclassCombatState(r.p).fields[0];r.e.x=f.x+15;r.e.y=f.y;r.advance(2);assert(!getSubclassCombatState(r.p).roseGuard,'A ranged thicket must not grant guard outside melee range');
});
test('mixed Fae and rose groups keep their own bodies and source abilities',()=>{
 const c=setup('thornbinderSummonThornlings','fae');c.learn('thornbinderSummonElderThornbeast','petalknight');assert(c.cast());assert(c.cast('thornbinderSummonElderThornbeast'));assert.equal(c.p.summons.filter(s=>s.summonMorph==='fae').length,3);assert.equal(c.p.summons.filter(s=>s.summonMorph==='petalknight').length,1);
});
test('Expertise scales targeted class damage once and cleanup removes temporary combat state',()=>{
 const values=[];for(const spec of [null,'deathknight','acolyte']){const c=setup('graveSpark','deathknight');if(spec)c.p.skillTree.spent[expertiseNodeId('gravecaller',spec)]=1;c.cast();c.advance(.25);values.push(100000-c.e.hp);clearSubclassCombatState(c.p);assert.equal(getSubclassCombatState(c.p),null);}assert(Math.abs(values[1]/values[0]-1.15)<.06);assert(Math.abs(values[2]/values[0]-.9)<.06);report.expertiseDamage=values;
});
fs.mkdirSync('docs/garden-grave-morphs',{recursive:true});fs.writeFileSync('docs/garden-grave-morphs/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.checks.length,morphs:report.skills.length,protectedDefinitions:report.protectedDefinitions}));


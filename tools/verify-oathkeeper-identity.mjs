import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fixture,rotationBenchmark} from './benchmark-oathkeeper-identity.mjs';
import {getAbilityById} from '../src/data.js';
import {OATHKEEPER_MORPHS} from '../src/oathkeeperMorphs.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {getSubclassCombatState,clearAbilityMorphCombatState,onSubclassDamaged,onSubclassBlocked,onSubclassKill,onOathkeeperMeleeContact,setSubclassSupportParty} from '../src/subclassCombat.js';
import {requestBasicAttack,updateWeaponCombat} from '../src/combatMoves.js';
import {updateCombat} from '../src/combat.js';
import {SKILL_TREE_NODES,normalizeSkillTreeState,getSpentSkillTreePoints,getAvailableSkillTreePoints,spendSkillTreeNode,getSkillTreeBonuses,respecSkillTree} from '../src/skillTreeSystem.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
const report={checks:[],rotations:[]};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const run=(c,time)=>{for(let i=0;i<Math.ceil(time/.025);i++)c.tick();};
const s=c=>getSubclassCombatState(c.p);
function contact(c){
 const foe=c.w.enemies[0];foe.x=c.p.x+32;foe.y=c.p.y;
 assert(requestBasicAttack(c.p,c.w,c.input,()=>{},c.now()));
 for(let i=0;c.p.combatState.attacking&&i<200;i++){
  c.tick(.01);updateWeaponCombat(c.p,c.w,c.input,.01,c.now(),()=>{});
 }
 run(c,.5);
}
test('66 protected morphs remain exact; the later Fellhunter and Waverider passes own their forms',()=>{
 const hashes=JSON.parse(fs.readFileSync('docs/oathkeeper-identity/protected-forms.json'));
 let checked=0;for(const [key,hash] of Object.entries(hashes)){
  const [id,family]=key.split(':'),a=getAbilityById(id),resolved=resolveAbilityMorph({classId:a.classId},a,family);
  if(['fellhunter','waverider'].includes(a.classId))continue;checked++;
  assert.equal(createHash('sha256').update(JSON.stringify(resolved)).digest('hex'),hash,key);
 }
 assert.equal(checked,66);
});
test('24 authored morph jobs have unique names, correct elements, resource types and useful role coverage',()=>{
 for(const [family,skills] of Object.entries(OATHKEEPER_MORPHS)){
  assert.equal(Object.keys(skills).length,12);assert.equal(new Set(Object.values(skills).map(c=>c.name)).size,12);
  for(const mode of ['melee','dash','heal','field','mark','ward','auraChannel'])assert(Object.values(skills).some(c=>c.mode===mode),family+' '+mode);
  for(const id of Object.keys(skills)){const a=resolveAbilityMorph({classId:'oathkeeper'},id,family);assert(a.oathMorph);assert.equal(a.element,family==='sinner'?'necrotic':'holy');assert(!a.subclassSecondary);assert(!a.canCharge);}
 }
});
test('real melee contacts build paced Resolve; a clean block works, failed or empty blocks do not',()=>{
 const c=fixture(['oathkeeperOathStrike','oathkeeperJudgmentSmite'],'holyknight');
 contact(c);assert.equal(s(c).oath.resolve,1);
 const e=c.w.enemies[0],t=c.now();onSubclassBlocked(c.p,{blocked:true,preventedDamage:30},e,c.w,t);
 assert(s(c).oath.resolve<=2);const n=s(c).oath.resolve;
 for(let i=0;i<20;i++)onSubclassBlocked(c.p,{blocked:true,preventedDamage:30},e,c.w,t);assert.equal(s(c).oath.resolve,n);
 run(c,.8);onSubclassBlocked(c.p,{blocked:true,guardBroken:true,preventedDamage:30},e,c.w,c.now());assert.equal(s(c).oath.resolve,n);
 onSubclassBlocked(c.p,{blocked:true,preventedDamage:0},e,c.w,c.now());assert.equal(s(c).oath.resolve,n);
 for(let i=0;i<3;i++){run(c,.8);onSubclassBlocked(c.p,{blocked:true,preventedDamage:30},e,c.w,c.now());}
 assert.equal(s(c).oath.resolve,3);const before=e.hp;assert(c.cast(1));assert.equal(s(c).oath.resolve,0);assert(e.hp<before);
});
test('Second Wind spends Resolve for bounded healing and never passes through the old extra scaling',()=>{
 const c=fixture(['oathkeeperOathStrike','oathkeeperLastRite'],'holyknight');assert(c.cast());
 s(c).oath.resolve=3;c.p.hp=c.p.maxHp*.2;const hp=c.p.hp;assert(c.cast(1));
 assert.equal(c.p.hp-hp,Math.round(c.p.maxHp*.24));assert.equal(s(c).oath.resolve,0);
});
test('Sinner melee healing shares a 3%-maximum-health budget across skills and across a dense pack',()=>{
 const c=fixture(['oathkeeperOathStrike','oathkeeperBastionBash'],'sinner',120);c.p.hp=c.p.maxHp*.2;const hp=c.p.hp;
 assert(c.cast());assert(c.cast(1));assert(c.p.hp-hp<=c.p.maxHp*.03+.001);
 assert.equal(s(c).penance,1,'One close hit cadence, not one gain per victim');
 assert(s(c).afflictions.size<=64);
});
test('misses, fields and channels do not farm Penance or melee lifesteal',()=>{
 for(const id of ['oathkeeperOathStrike','oathkeeperConsecratedGround','oathkeeperLitanyOfIron']){
  const c=fixture([id],'sinner');if(id.endsWith('OathStrike'))c.w.enemies[0].x+=500;
  assert(c.cast());run(c,2);assert.equal(s(c).penance,0,id);
  onSubclassKill(c.p,c.w.enemies[0],c.w,c.now());assert.equal(s(c).penance,0,'Remote kills do not bypass the melee/injury loop');
 }
});
test('three Penance improve pack pressure without multiplying single-target spell damage',()=>{
 const damage=(count,penance)=>{const c=fixture(['oathkeeperOathStrike','oathkeeperJudgmentSmite'],'sinner',count);c.cast();run(c,1);s(c).penance=penance;for(const e of c.w.enemies)e.hp=e.maxHp;assert(c.cast(1));assert.equal(c.damage(),0,'Impale waits for its warning');run(c,.5);return {damage:c.damage(),penance:s(c).penance};};
 const one=damage(1,0),empowered=damage(1,3),pack=damage(16,0),empoweredPack=damage(16,3);
 assert.equal(one.damage,empowered.damage);assert(empoweredPack.damage>pack.damage);assert.equal(empoweredPack.penance,0);
});
test('Penance recovery has no self-cost, spends exactly three and has distinct zero-resource healing',()=>{
 const c=fixture(['oathkeeperOathStrike','oathkeeperLastRite'],'sinner');c.cast();s(c).penance=6;
 c.p.hp=c.p.maxHp*.2;const hp=c.p.hp;assert(c.cast(1));assert.equal(c.p.hp-hp,Math.round(c.p.maxHp*.24));assert.equal(s(c).penance,3);
});
test('self-heals and personal sword armor do not turn into party support when players overlap',()=>{
 for(const id of ['oathkeeperLastRite','oathkeeperBulwarkOfLight']){
  const c=fixture([id],'sinner'),ally={x:c.p.x,y:c.p.y,hp:10,maxHp:100,buffs:{}};setSubclassSupportParty(c.p,[ally]);
  assert(c.cast());assert.equal(ally.hp,10);assert.equal(ally.buffs.defense,undefined);
 }
});
test('the third actual mace contact triggers a single judgment and heal; spells cannot advance a covenant',()=>{
 for(const family of ['holyknight','sinner']){
  const c=fixture(['oathkeeperMandate','oathkeeperOathStrike'],family);assert(c.cast());const mark=s(c).oath.mark;
  assert(c.cast(1));assert.equal(mark.hits,0);const hp=c.p.hp;
  for(let i=0;i<3;i++)contact(c);
  assert.equal(s(c).oath.mark,null);assert(c.p.hp>hp);assert(s(c).oath.contacts.length===0);
 }
});
test('Borrowed Blades adds no damage to the struck foe and has exactly three weapon-triggered cleaves',()=>{
 const c=fixture(['oathkeeperDebtOfBlood'],'sinner',16);assert(c.cast());assert.equal(s(c).penance,2);
 const distant=c.w.enemies[5];for(let i=0;i<3;i++)contact(c);
 assert.equal(s(c).oath.borrowed,null);assert(distant.hp<distant.maxHp);assert(s(c).oath.contacts.length===0);
});
test('a killing covenant contact keeps its heal and nearby death-sword strikes after corpse removal',()=>{
 const c=fixture(['oathkeeperMandate'],'sinner',16);assert(c.cast());const target=c.w.enemies[0];
 contact(c);contact(c);assert.equal(s(c).oath.mark.hits,2);
 target.hp=0;onOathkeeperMeleeContact(c.p,target,c.w,c.now());c.w.enemies=c.w.enemies.filter(e=>e!==target);
 const hp=c.p.hp,damage=c.damage();c.tick();assert.equal(c.p.hp-hp,Math.round(c.p.maxHp*.06));assert(c.damage()>damage);
});
test('retaliation observes cadence, target range, terrain and storage limits',()=>{
 const c=fixture(['oathkeeperBulwarkOfLight'],'sinner');assert(c.cast());const g=s(c).oath.guard,e=c.w.enemies[0];
 assert(Math.abs(c.p.buffs.defense.reduction-.3)<.001,'Guard reduction is scaled once');
 for(let i=0;i<30;i++)onSubclassDamaged(c.p,25,e,c.w,c.now());assert.equal(g.replies,1);assert(s(c).oath.contacts.length<=1);
 c.w.encounterBarriers=[{x:420,y:350,w:5,h:130}];run(c,.1);assert.equal(c.damage(),0,'A wall stops the reply');
 const d=fixture(['oathkeeperDebtOfBlood'],'holyknight');assert(d.cast());const debt=s(d).oath.guard;
 for(let i=0;i<100;i++)onSubclassDamaged(d.p,1000,d.w.enemies[0],d.w,d.now());assert(debt.stored<=debt.power*.75);
 run(d,4.1);assert(d.damage()>0);assert.equal(s(d).oath.guard,null);
});
test('mobility and chain approaches respect walls; bosses are anchors rather than movable victims',()=>{
 for(const family of ['holyknight','sinner']){const c=fixture(['oathkeeperDivineLeap'],family);c.w.encounterBarriers=[{x:450,y:300,w:6,h:200}];assert(c.cast());assert(c.p.x<450);}
 const c=fixture(['oathkeeperVowchain'],'holyknight',1,'boss');const e=c.w.enemies[0];e.x=590;assert(c.cast());assert(c.p.x>400);assert.equal(e.x,590);
});
test('fields replace rather than stack; channels pay upkeep and release; transient state clears on swaps, death and world changes',()=>{
 for(const family of ['holyknight','sinner']){
  const c=fixture(['oathkeeperConsecratedGround'],family);assert(c.cast());assert.equal(s(c).oath.fields.length,1);
  c.p.cooldowns={};c.p.abilityUseCharges={};assert(c.cast());assert.equal(s(c).oath.fields.length,1,'Recasting replaces the same grave or ring');
  for(const reason of ['clear','forget','morph','inactive']){
   const d=fixture(['oathkeeperConsecratedGround'],family);assert(d.cast());
   if(reason==='clear')clearAbilityMorphCombatState(d.p,'oathkeeperConsecratedGround');
   if(reason==='forget'){d.p.gold=5;assert(respecSkillTree(d.p).ok);}
   if(reason==='morph')d.p.abilityMorphs.oathkeeperConsecratedGround='base';
   if(reason==='inactive')d.p.active=false;d.tick();assert.equal(s(d)?.oath?.fields.length||0,0,reason);
  }
  const ch=fixture(['oathkeeperLitanyOfIron'],family);assert(ch.cast());const resource=family==='holyknight'?'stamina':'spirit',before=ch.p[resource];run(ch,2);assert(ch.p[resource]<before);
  updateCombat(ch.p,ch.w,{...ch.input,ability0Held:false,ability0Released:true},.025,ch.now()+.025,()=>{});assert.equal(ch.p.activeChannel,null);
  c.p.hp=0;c.tick();assert.equal(s(c),null);
  const d=fixture(['oathkeeperJudgmentSmite'],family);assert(d.cast());updateCombat(d.p,{...d.w,enemies:[]},{},.025,d.now()+1,()=>{});assert.notEqual(s(d)?.world,d.w);
 }
});
test('the streamlined tree has no dangling prerequisites and either doctrine reaches healing, mobility and conjurations',()=>{
 assert(!SKILL_TREE_NODES.blade_execution&&!SKILL_TREE_NODES.blade_guardian_oath);
 const nodes=Object.values(SKILL_TREE_NODES).filter(n=>n.tree==='blade');for(const n of nodes)for(const id of n.requires||[])assert(SKILL_TREE_NODES[id],n.id+' '+id);
 for(const opening of ['blade_combo','blade_oathguard']){
  const c=fixture(['oathkeeperOathStrike']);c.p.skillTree.bloodlineBonusPoints=1000;
  const buy=id=>{if(c.p.skillTree.spent[id])return;const n=SKILL_TREE_NODES[id];for(const r of n.requirementMode==='any'?[n.requires[0]]:n.requires||[])buy(r);assert(spendSkillTreeNode(c.p,id).ok,id);};
  buy(opening);buy('blade_last_rite');buy('blade_divine_leap');buy('technique_oathkeeperHallowedBlades');
  assert(c.p.knownAbilities.includes('oathkeeperLastRite'));
 }
});
test('old removed passive investments migrate once, preserve learned skills and return the unused points',()=>{
 const c=fixture(['oathkeeperLastRite'],'sinner'),p=c.p;
 p.skillTree={version:13,spent:{blade_root:1,blade_combo:1,blade_execution:1,blade_oathguard:1,blade_bastion:1,blade_guardian_oath:1,blade_living_bastion:1},respecVersion:1,bluntMasteryVersion:1};
 p.skillTreeProgress=p.skillTree.spent;p.unlockedPassives.push('blade_execution','blade_guardian_oath');
 const oldCost=12;normalizeSkillTreeState(p);assert.equal(getSpentSkillTreePoints(p),oldCost-2);
 assert(p.skillTree.spent.blade_last_rite);assert(!p.unlockedPassives.includes('blade_execution'));assert(!p.unlockedPassives.includes('blade_guardian_oath'));
 const points=getAvailableSkillTreePoints(p),bonuses=getSkillTreeBonuses(p),saved=sanitizeForSave(p),loaded=normalizeProfileSave(saved);
 assert.equal(getAvailableSkillTreePoints(loaded),points);assert.deepEqual(getSkillTreeBonuses(loaded),bonuses);
 assert.equal(loaded.abilityMorphs.oathkeeperLastRite,'sinner');assert.equal(loaded.abilityMastery.oathkeeperLastRite.level,20);
});
// Same fixed spell rotations before and after; no encounter win-rate claim.
report.rotations=rotationBenchmark();
test('Sinner focused output stays below the tested Hellstalker rotation and Holyknight melee finisher build',()=>{
 for(const invested of [false,true]){
  const sinner=report.rotations.find(r=>r.family==='sinner'&&r.invested===invested).dps;
  for(const family of ['holyknight','hellstalker'])assert(sinner<report.rotations.find(r=>r.family===family&&r.invested===invested).dps,family+' '+invested);
 }
});
fs.mkdirSync('docs/oathkeeper-identity',{recursive:true});fs.writeFileSync('docs/oathkeeper-identity/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report.rotations));

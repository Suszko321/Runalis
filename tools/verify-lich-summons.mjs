import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityById} from '../src/data.js';
import {assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery,awardHotbarMasteryXp} from '../src/abilityMasterySystem.js';
import {getAbilityMorphOptions,selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
import {spendSkillTreeNode,canSpendSkillTreeNode,respecSkillTree} from '../src/skillTreeSystem.js';
import {useAbility,updateSummons,updateCombat} from '../src/combat.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';
import {LICH_ABILITY_ID as id,LICH_FORMS,onLichSummonHit} from '../src/lichSummonSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {abilitySummary,abilityScaling} from '../src/uiInformation.js';

const checks=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
const now=()=>performance.now()/1000;
const world=()=>({mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
function player(learn=true,morph='base'){
 const p=createPlayer('Lich review');chooseClass(p,'gravecaller');Object.assign(p,{id:'lich-review',x:260,y:320,spiritAwakened:true,gold:20});
 p.skillTree.bloodlineBonusPoints=100;for(const skill of Object.values(p.skillState.skills))skill.level=50;
 if(learn)for(const node of ['spirit_root','spirit_harvest','spirit_minions','spirit_lich_ascension'])assert.ok(spendSkillTreeNode(p,node).ok,node);
 migratePlayer(p);p.maxSpirit=p.spirit=1000;
 if(learn){getAbilityMastery(p,id,true).level=20;assert.ok(assignAbilityToSlot(p,0,'summonLich').ok);assert.ok(assignAbilityToSlot(p,1,id).ok);assert.ok(selectAbilityMorph(p,id,morph).ok);}
 return p;
}
const cast=(p,w,slot=1)=>{const logs=[];assert.ok(useAbility(slot,p,w,m=>logs.push(m),now(),{combatAimX:1,combatAimY:0,hasAim:true}),logs.join('; '));return p.summons.find(s=>s.kind==='greaterLich'&&s.alive!==false);};
const foe=(s,dx=20,dy=0,extra={})=>({id:'enemy-'+Math.random(),name:'Target',kind:'rat',x:s.x+dx,y:s.y+dy,hp:10000,maxHp:10000,radius:12,aggro:3,combatTargetKind:'summon',combatTargetId:s.id,...extra});
function strike(p,w,s,t=now()){s.attackCooldown=0;updateSummons(.01,p,w,()=>{},t);}

test('Real Lichbound purchase unlocks a separate ability; skeleton starter and exclusive doctrine remain intact',()=>{
 const p=player(false);assert.ok(!p.knownAbilities.includes(id));const oldSlots=[...p.loadout.abilitySlots];
 for(const node of ['spirit_root','spirit_harvest','spirit_minions','spirit_lich_ascension'])assert.ok(spendSkillTreeNode(p,node).ok);
 assert.ok(p.knownAbilities.includes(id)&&p.knownAbilities.includes('summonLich'));
 oldSlots.forEach((a,i)=>{if(a)assert.equal(p.loadout.abilitySlots[i],a);});
 assert.ok(!canSpendSkillTreeNode(p,'spirit_bone_coterie').ok);assert.equal(getAbilityById('summonLich').name,'Raise the Bound Dead');
});
test('Both morphs unlock at Mastery 5/10; original is free and descriptions match the creatures',()=>{
 const p=player();getAbilityMastery(p,id,true).level=1;delete p.abilityMorphs[id];
 const options=getAbilityMorphOptions(p,id);assert.deepEqual(options.map(o=>o.id),['base','acolyte','deathknight']);
 for(const [i,morph] of ['acolyte','deathknight'].entries()){
  getAbilityMastery(p,id,true).level=[5,10][i]-1;assert.ok(!selectAbilityMorph(p,id,morph).ok);
  getAbilityMastery(p,id,true).level=[5,10][i];assert.ok(selectAbilityMorph(p,id,morph).ok);
  const a=resolveSubclassAbility(p,id);assert.equal(a.name,'Summon '+LICH_FORMS[morph].name);assert.equal(a.summonType,'greaterLich');assert.equal(abilitySummary(a,p),LICH_FORMS[morph].desc);
  assert.ok(selectAbilityMorph(p,id,'base').ok);
 }
 assert.match(abilityScaling(getAbilityById(id)),/Summoning.*Spirit/);
});
test('Skeletons and lich coexist, dismiss independently and start their own cooldowns',()=>{
 const p=player(),w=world();cast(p,w,0);const lich=cast(p,w);const skeleton=p.summons.find(s=>s.kind==='lich');
 assert.equal(skeleton.evolutionStage,'skeletonServant');assert.equal(p.summons.length,2);
 const spirit=p.spirit;cast(p,w);assert.equal(p.spirit,spirit);updateSummons(.01,p,w,()=>{},now());
 assert.deepEqual(p.summons.map(s=>s.kind),['lich']);assert.ok(Number.isFinite(p.cooldowns[id]));assert.ok(!Number.isFinite(p.cooldowns.summonLich));
 assert.equal(useAbility(1,p,w,()=>{},now()),false);assert.ok(skeleton.hp>0&&lich.alive===false);
});
for(const morph of Object.keys(LICH_FORMS))test(`${morph}: persistent spawn, real attack, source mastery and save round-trip`,()=>{
 const p=player(true,morph),w=world(),s=cast(p,w),e=foe(s);w.enemies=[e];
 assert.equal(s.displayName,LICH_FORMS[morph].name);assert.equal(s.summonMorph,morph);assert.equal(s.sourceAbilityId,id);assert.equal(s.expiresAt,undefined);
 strike(p,w,s);assert.ok(e.hp<e.maxHp);assert.ok(getAbilityMastery(p,id).lifetimeDamage>0);assert.ok(w.effects.some(f=>f.kind==='lichSummon'));
 const loaded=normalizeProfileSave(sanitizeForSave(p));migratePlayer(loaded);assert.equal(loaded.summons[0].summonMorph,morph);assert.equal(loaded.summons[0].sourceAbilityId,id);assert.equal(loaded.loadout.abilitySlots[1],id);
 const t=now();loaded.summons[0].targetEnemyId=null;for(let i=0;i<62;i++)updateSummons(1,loaded,world(),()=>{},t+i);assert.equal(loaded.summons.length,1);
});
test('Standard lich bursts on every third strike, with a bounded nearby target count',()=>{
 const p=player(),w=world(),s=cast(p,w),primary=foe(s),near=Array.from({length:5},(_,i)=>foe(s,25,i*4));w.enemies=[primary,...near];
 strike(p,w,s);strike(p,w,s);assert.ok(near.every(e=>e.hp===e.maxHp));strike(p,w,s);
 assert.equal(near.filter(e=>e.hp<e.maxHp).length,3);assert.ok(w.effects.some(f=>f.geometry==='burst'));
});
test('Specter heals owner and nearby living allies from actual damage, capped with quiet effects',()=>{
 const p=player(true,'acolyte'),w=world(),s=cast(p,w),ally=player(false),far=player(false),dead=player(false);p.hp=p.maxHp-10;
 Object.assign(ally,{x:s.x+5,y:s.y,hp:ally.maxHp-10});Object.assign(far,{x:s.x+300,y:s.y,hp:far.maxHp-10});dead.hp=0;p.coop={players:[p,ally,far,dead]};
 const e=foe(s,20,0,{hp:1});w.enemies=[e];const before=p.hp,ab=ally.hp,fb=far.hp,fx=p.floatingTexts?.length||0;strike(p,w,s);
 assert.ok(Math.abs(p.hp-before-.10)<1e-8,`Owner heal: ${p.hp-before}`);assert.ok(Math.abs(ally.hp-ab-.08)<1e-8);assert.equal(far.hp,fb);assert.equal(dead.hp,0);assert.equal(p.floatingTexts?.length||0,fx);
 const beforeCap=p.hp;onLichSummonHit(s,p,w,foe(s),100000,100000,now(),{effect:f=>w.effects.push(f),damage(){}});assert.ok(p.hp-beforeCap<=p.maxHp*.03+1e-8);
 assert.ok(w.effects.filter(f=>f.geometry==='mend').every(f=>f.ttl<=.25));
});
test('Deathknight cleaves forward only, draws attention, staggers every third hit and respects boss control limits',()=>{
 const p=player(true,'deathknight'),w=world(),s=cast(p,w),primary=foe(s),front=foe(s,28,12),back=foe(s,-28,0),boss=foe(s,30,-12,{isBoss:true});w.enemies=[primary,front,back,boss];
 strike(p,w,s);assert.ok(front.hp<front.maxHp);assert.equal(back.hp,back.maxHp);assert.equal(primary.targetSummonId,s.id);assert.ok(primary.summonThreatUntil>now());assert.equal(primary.staggerTimer,undefined);
 strike(p,w,s);strike(p,w,s);assert.equal(primary.staggerTimer,.3);assert.equal(boss.staggerTimer,.08);assert.equal(back.staggerTimer,undefined);
 const base=cast(player(),world());assert.ok(s.maxHp>base.maxHp&&s.armour>base.armour);
});
test('Walls block direct attacks, splash, curses and support healing; friendly targets are ignored',()=>{
 for(const morph of Object.keys(LICH_FORMS)){
  const p=player(true,morph),w=world(),s=cast(p,w);s.x=303;s.y=320;
  for(let y=0;y<w.height;y++)w.tiles[y][10].passable=false;
  const e=foe(s,37);w.enemies=[e];strike(p,w,s);assert.equal(e.hp,e.maxHp);assert.equal(s.lichStrikes,undefined);
 }
 const p=player(true,'acolyte'),w=world(),s=cast(p,w);w.enemies=[foe(s,10,0,{friendly:true})];strike(p,w,s);assert.equal(w.enemies[0].hp,10000);
 for(const morph of ['base','acolyte']){
  const p=player(true,morph),w=world(),s=cast(p,w);s.x=303;s.y=320;
  for(let y=0;y<w.height;y++)w.tiles[y][10].passable=false;
  const primary=foe(s,-12),blocked=foe(s,37),ally=player(false);Object.assign(ally,{x:340,y:320,hp:ally.maxHp-20});p.coop={players:[ally]};w.enemies=[primary,blocked];const before=ally.hp,t=now();
  for(let i=0;i<3;i++)strike(p,w,s,t);s.attackCooldown=100;updateSummons(.01,p,w,()=>{},t+1.1);
  assert.ok(primary.hp<primary.maxHp);assert.equal(blocked.hp,blocked.maxHp);assert.equal(ally.hp,before);
 }
});
test('Ranged companions face the enemy when firing from their combat formation',()=>{
 const p=player(),w=world(),s=cast(p,w);s.x=400;s.y=320;w.enemies=[foe(s,-104,0,{combatTargetKind:'player',combatTargetId:p.id})];strike(p,w,s);
 assert.ok(w.enemies[0].hp<10000);assert.ok(s.dirX<0);
});
test('Existing Lichbound saves receive new ability without changing hotbars, skeleton mastery or living lich health',()=>{
 const p=player(false);p.skillTree.spent={spirit_root:1,spirit_harvest:1,spirit_minions:1,spirit_lich_ascension:1};
 p.summons=[{id:'old-lich',kind:'lich',summonPath:'evolved',evolutionStage:'lich',hp:37,maxHp:200,alive:true,sourceAbilityId:'summonLich',summonAbilityId:'summonLich'}];
 getAbilityMastery(p,'summonLich',true).level=17;const slots=[...p.loadout.abilitySlots];migratePlayer(p);
 assert.ok(p.knownAbilities.includes(id));assert.deepEqual(p.loadout.abilitySlots,slots);assert.equal(p.summons[0].hp,37);assert.equal(p.summons[0].kind,'greaterLich');assert.equal(p.summons[0].sourceAbilityId,id);assert.equal(getAbilityMastery(p,'summonLich').level,17);
 migratePlayer(p);assert.equal(p.knownAbilities.filter(a=>a===id).length,1);assert.equal(p.summons[0].hp,37);
});
test('Respec removes the tree-granted lich and its actor, preserves skeletons, mastery and morph choice',()=>{
 const p=player(true,'acolyte'),w=world();cast(p,w,0);cast(p,w);assert.ok(respecSkillTree(p).ok);
 assert.ok(!p.knownAbilities.includes(id)&&p.knownAbilities.includes('summonLich'));assert.equal(p.loadout.abilitySlots[1],null);assert.deepEqual(p.summons.map(s=>s.kind),['lich']);assert.equal(getAbilityMastery(p,id).level,20);assert.equal(p.abilityMorphs[id],'acolyte');
});
test('Hotbar XP trains Summon Lich without casting; owner death removes both groups with separate cooldowns',()=>{
 const p=player(),before=getAbilityMastery(p,id).xp;awardHotbarMasteryXp(p,10);assert.equal(getAbilityMastery(p,id).xp,before+10);
 const w=world();cast(p,w,0);cast(p,w);p.hp=0;updateSummons(.01,p,w,()=>{},now());assert.equal(p.summons.length,0);assert.ok(Number.isFinite(p.cooldowns[id])&&Number.isFinite(p.cooldowns.summonLich));
});
fs.mkdirSync('docs/lich-summons',{recursive:true});fs.writeFileSync('docs/lich-summons/combat-verification.json',JSON.stringify({pass:true,checks},null,2)+'\n');
console.log(`Lich summon verification complete: ${checks.length} checks.`);

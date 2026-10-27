import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {assignAbilityToSlot} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery,awardHotbarMasteryXp} from '../src/abilityMasterySystem.js';
import {getAbilityMorphOptions,selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveSubclassAbility} from '../src/subclassVariants.js';
import {spendSkillTreeNode} from '../src/skillTreeSystem.js';
import {useAbility,updateSummons,updateCombat} from '../src/combat.js';
import {getSubclassCombatState} from '../src/subclassCombat.js';
import {BOUND_DEAD_FORMS,BOUND_DEAD_ABILITY_ID as id,onLichSummonHit} from '../src/lichSummonSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {abilitySummary} from '../src/uiInformation.js';
const checks=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);},now=()=>performance.now()/1000;
const world=()=>({mode:'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
function player(morph='base',commander=false,gear=false){
 const p=createPlayer('Henchmen review');chooseClass(p,'gravecaller');Object.assign(p,{id:'bound-review',x:260,y:320,spiritAwakened:true,gold:20});
 p.skillTree.bloodlineBonusPoints=100;for(const skill of Object.values(p.skillState.skills))skill.level=50;
 for(const node of ['spirit_root','spirit_harvest','spirit_minions',...(commander?['spirit_bone_coterie']:[])])assert.ok(spendSkillTreeNode(p,node).ok,node);
 migratePlayer(p);p.maxSpirit=p.spirit=1000;getAbilityMastery(p,id,true).level=20;assert.ok(assignAbilityToSlot(p,0,id).ok);assert.ok(selectAbilityMorph(p,id,morph).ok);
 if(gear)for(const s of p.gravecaller.skeletons)s.equipment={weapon:'hunterBow',armour:'leatherVest',charm:null};
 return p;
}
function cast(p,w){assert.ok(useAbility(0,p,w,()=>{},now(),{hasAim:true,combatAimX:1,combatAimY:0}));return p.summons.filter(s=>s.kind==='lich'&&s.alive!==false);}
const foe=(s,dx=20,dy=0,extra={})=>({id:'enemy-'+Math.random(),name:'Target',kind:'rat',x:s.x+dx,y:s.y+dy,hp:10000,maxHp:10000,radius:12,aggro:3,combatTargetKind:'summon',combatTargetId:s.id,...extra});
const strike=(p,w,s,t=now())=>{s.attackCooldown=0;updateSummons(.01,p,w,()=>{},t);};
test('Known starter has four persistent forms; mastery gates and concise creature descriptions stay accurate',()=>{
 const p=player();getAbilityMastery(p,id,true).level=1;delete p.abilityMorphs[id];assert.deepEqual(getAbilityMorphOptions(p,id).map(o=>o.id),['base','acolyte','deathknight']);
 for(const [i,m] of ['acolyte','deathknight'].entries()){
  getAbilityMastery(p,id,true).level=[5,10][i]-1;assert.ok(!selectAbilityMorph(p,id,m).ok);
  getAbilityMastery(p,id,true).level=[5,10][i];assert.ok(selectAbilityMorph(p,id,m).ok);
  const a=resolveSubclassAbility(p,id);assert.equal(a.summonType,'lich');assert.equal(a.name,'Raise '+BOUND_DEAD_FORMS[m].name);assert.equal(abilitySummary(a,p),BOUND_DEAD_FORMS[m].desc);assert.ok(a.noUseCharges);assert.equal(a.duration,undefined);
 }
 assert.ok(selectAbilityMorph(p,id,'base').ok);assert.ok(p.knownAbilities.includes(id));
});
for(const m of Object.keys(BOUND_DEAD_FORMS))for(const commander of [false,true])test(`${m}: ${commander?'Commander trio':'single henchman'} persists, attacks, trains its source, and survives save migration`,()=>{
 const p=player(m,commander),w=world(),group=cast(p,w);assert.equal(group.length,commander?3:1);
 for(const s of group){assert.equal(s.summonFamily,'boundDead');assert.equal(s.summonMorph,m);assert.equal(s.sourceAbilityId,id);assert.equal(s.expiresAt,undefined);assert.equal(s.evolutionStage,'skeletonServant');if(commander)assert.ok(s.skeletonRole);}
 const s=group[0],e=foe(s);w.enemies=[e];strike(p,w,s);assert.ok(e.hp<e.maxHp);assert.ok(getAbilityMastery(p,id).lifetimeDamage>0);
 if(m!=='base')assert.ok(w.effects.some(f=>f.kind==='lichSummon'));
 const loaded=normalizeProfileSave(sanitizeForSave(p));migratePlayer(loaded);assert.equal(loaded.summons.length,group.length);assert.ok(loaded.summons.every(s=>s.summonMorph===m&&s.sourceAbilityId===id));assert.equal(loaded.loadout.abilitySlots[0],id);
 const t=now(),empty=world();for(let i=0;i<65;i++)updateSummons(1,loaded,empty,()=>{},t+i);assert.equal(loaded.summons.length,group.length);
});
for(const m of Object.keys(BOUND_DEAD_FORMS))test(`${m}: Commander preserves all three Coterie equipment bonuses`,()=>{
 const plain=cast(player(m,true),world()),geared=cast(player(m,true,true),world());assert.equal(new Set(geared.map(s=>s.skeletonRole)).size,3);
 for(let i=0;i<3;i++){assert.ok(geared[i].damage>plain[i].damage);assert.ok(geared[i].maxHp>plain[i].maxHp);assert.ok(geared[i].armour>plain[i].armour);assert.equal(geared[i].coterieEquipment.weapon,'hunterBow');assert.equal(geared[i].coterieEquipment.armour,'leatherVest');}
});
test('Commander cooldown waits for the last henchman; dismissal removes the entire morph group without Spirit cost',()=>{
 const p=player('acolyte',true),w=world(),group=cast(p,w);group[0].hp=0;updateSummons(.01,p,w,()=>{},now());assert.equal(p.summons.length,2);assert.ok(!Number.isFinite(p.cooldowns[id]));
 const spirit=p.spirit;cast(p,w);assert.equal(p.spirit,spirit);updateSummons(.01,p,w,()=>{},now());assert.equal(p.summons.length,0);assert.ok(Number.isFinite(p.cooldowns[id]));assert.equal(useAbility(0,p,w,()=>{},now()),false);
 const p2=player('deathknight',true),w2=world();cast(p2,w2).forEach(s=>s.hp=0);updateSummons(.01,p2,w2,()=>{},now());assert.equal(p2.summons.length,0);assert.ok(Number.isFinite(p2.cooldowns[id]));
});
test('Specter heals owner and allies from actual damage with minimal effects and a per-strike cap',()=>{
 const p=player('acolyte'),w=world(),s=cast(p,w)[0],ally=player(),far=player();p.hp=p.maxHp-10;Object.assign(ally,{x:s.x+5,y:s.y,hp:ally.maxHp-10});Object.assign(far,{x:s.x+300,y:s.y,hp:far.maxHp-10});p.coop={players:[p,ally,far]};
 const e=foe(s,20,0,{hp:1});w.enemies=[e];const before=p.hp,ab=ally.hp,fb=far.hp,fx=p.floatingTexts?.length||0;strike(p,w,s);assert.ok(Math.abs(p.hp-before-.10)<1e-8,`Owner heal: ${p.hp-before}`);assert.ok(Math.abs(ally.hp-ab-.08)<1e-8);assert.equal(far.hp,fb);assert.equal(p.floatingTexts?.length||0,fx);
 const capBefore=p.hp;onLichSummonHit(s,p,w,foe(s),100000,100000,now(),{effect:f=>w.effects.push(f),damage(){}});assert.ok(p.hp-capBefore<=p.maxHp*.03+1e-8);assert.ok(w.effects.filter(f=>f.geometry==='mend').every(f=>f.ttl<=.25));
});
test('Lesser knight cleaves forward, draws attention and staggers every third strike with boss resistance',()=>{
 const p=player('deathknight'),w=world(),s=cast(p,w)[0],primary=foe(s),front=foe(s,28,12),back=foe(s,-28),boss=foe(s,30,-12,{isBoss:true});w.enemies=[primary,front,back,boss];strike(p,w,s);assert.ok(front.hp<front.maxHp);assert.equal(back.hp,back.maxHp);assert.equal(primary.targetSummonId,s.id);strike(p,w,s);strike(p,w,s);assert.equal(primary.staggerTimer,.3);assert.equal(boss.staggerTimer,.08);assert.equal(back.staggerTimer,undefined);
 const base=cast(player(),world())[0];assert.ok(s.maxHp>base.maxHp&&s.armour>base.armour);
});
test('Walls block morph attacks and friendly targets are ignored',()=>{
 for(const m of ['acolyte','deathknight']){
  const p=player(m),w=world(),s=cast(p,w)[0];s.x=303;s.y=320;for(let y=0;y<w.height;y++)w.tiles[y][10].passable=false;const e=foe(s,37);w.enemies=[e];strike(p,w,s);assert.equal(e.hp,e.maxHp);assert.equal(s.lichStrikes,undefined);
  w.enemies=[foe(s,10,0,{friendly:true})];strike(p,w,s);assert.equal(w.enemies[0].hp,10000);
 }
});
test('Legacy skeleton saves preserve health, hotbars and mastery; temporary Death Echo remains temporary',()=>{
 const p=player('acolyte');p.summons=[{id:'old-skeleton',kind:'lich',summonPath:'coterie',evolutionStage:'skeletonServant',hp:37,maxHp:200,alive:true,sourceAbilityId:id,summonAbilityId:id},{id:'echo',kind:'lich',legendaryTemporary:true,techniqueTemporary:true,expiresAt:99,hp:12}];const slots=[...p.loadout.abilitySlots];getAbilityMastery(p,id,true).level=17;migratePlayer(p);assert.equal(p.summons[0].hp,37);assert.equal(p.summons[0].summonMorph,'base');assert.equal(p.abilityMorphs[id],'acolyte');assert.deepEqual(p.loadout.abilitySlots,slots);assert.equal(getAbilityMastery(p,id).level,17);assert.equal(p.summons[1].summonFamily,undefined);assert.equal(p.summons[1].expiresAt,99);
 const before=getAbilityMastery(p,id).xp;awardHotbarMasteryXp(p,10);assert.equal(getAbilityMastery(p,id).xp,before+10);
});
test('Morphed henchman and separate Summon Lich coexist, dismiss independently, and clean up on owner death',()=>{
 const p=player('acolyte'),w=world();assert.ok(spendSkillTreeNode(p,'spirit_lich_ascension').ok);assert.ok(assignAbilityToSlot(p,1,'gravecallerSummonLich').ok);getAbilityMastery(p,'gravecallerSummonLich',true).level=20;assert.ok(selectAbilityMorph(p,'gravecallerSummonLich','acolyte').ok);
 const henchman=cast(p,w)[0];assert.ok(useAbility(1,p,w,()=>{},now()));assert.equal(p.summons.length,2);assert.ok(p.summons.some(s=>s.kind==='greaterLich'&&s.summonMorph==='acolyte'));
 assert.ok(useAbility(1,p,w,()=>{},now()));updateSummons(.01,p,w,()=>{},now());assert.deepEqual(p.summons,[henchman]);assert.ok(!Number.isFinite(p.cooldowns[id]));assert.ok(Number.isFinite(p.cooldowns.gravecallerSummonLich));
 p.hp=0;updateSummons(.01,p,w,()=>{},now());assert.equal(p.summons.length,0);assert.ok(Number.isFinite(p.cooldowns[id]));
});
test('Specter and lesser knight close to melee range before attacking, including all three Commander roles',()=>{
 for(const m of ['acolyte','deathknight'])for(const commander of [false,true]){
  const p=player(m,commander),w=world(),group=cast(p,w);group.forEach((s,i)=>{s.x=300;s.y=320+i*6;s.attackCooldown=0;assert.ok(s.attackRange<60);});
  const e=foe(group[0],180,0,{combatTargetKind:'player',combatTargetId:p.id});w.enemies=[e];const t=now();updateSummons(.05,p,w,()=>{},t);assert.equal(e.hp,e.maxHp);assert.ok(group.every(s=>s.moving));
  for(let i=1;i<100;i++)updateSummons(.05,p,w,()=>{},t+i*.05);assert.ok(group.every(s=>s.lichStrikes>0),m+' all Commander roles attack');assert.ok(e.hp<e.maxHp);
  assert.ok(!w.effects.some(f=>f.geometry==='soulBolt'));if(m==='acolyte')assert.ok(w.effects.some(f=>f.geometry==='soulSlash'&&f.radius===32));else assert.ok(w.effects.some(f=>f.geometry==='cleave'&&f.radius===50));
 }
});
test('Servant specter save migration changes ranged reach to melee once, without modifying health, gear or damage',()=>{
 const p=player('acolyte',true,true),w=world(),group=cast(p,w);for(const s of group){s.boundDeadArtVersion=1;s.attackRange=200;s.hp=37;}
 const before=group.map(s=>({hp:s.hp,maxHp:s.maxHp,damage:s.damage,armour:s.armour,coterieEquipment:s.coterieEquipment}));migratePlayer(p);assert.ok(p.summons.every(s=>s.attackRange===42&&s.boundDeadArtVersion===3));
 for(let i=0;i<3;i++)for(const [key,value] of Object.entries(before[i]))assert.deepEqual(p.summons[i][key],value);migratePlayer(p);assert.deepEqual(p.summons.map(s=>s.hp),[37,37,37]);
});
test('Lesser specter and knight remain weaker than the independently summoned greater companions',()=>{
 for(const m of ['acolyte','deathknight']){
  const p=player(m),w=world(),lesser=cast(p,w)[0];assert.ok(spendSkillTreeNode(p,'spirit_lich_ascension').ok);assert.ok(assignAbilityToSlot(p,1,'gravecallerSummonLich').ok);getAbilityMastery(p,'gravecallerSummonLich',true).level=20;assert.ok(selectAbilityMorph(p,'gravecallerSummonLich',m).ok);assert.ok(useAbility(1,p,w,()=>{},now()));const greater=p.summons.find(s=>s.kind==='greaterLich');assert.ok(lesser.damage<greater.damage&&lesser.maxHp<greater.maxHp);if(m==='acolyte')assert.ok(lesser.attackRange<60&&greater.attackRange>200);
 }
});
fs.mkdirSync('docs/bound-dead',{recursive:true});fs.writeFileSync('docs/bound-dead/combat-verification.json',JSON.stringify({pass:true,checks},null,2)+'\n');console.log(`Bound Dead verification complete: ${checks.length} checks.`);


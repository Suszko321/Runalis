import assert from 'node:assert/strict';import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';import {ABILITIES,ITEMS,getAbilityById} from '../src/data.js';import {SUBCLASSES} from '../src/subclassData.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';import {getBalancedAbility} from '../src/abilityCombatProfiles.js';import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';import {selectAbilityMorph} from '../src/abilityMorphSystem.js';import {useAbility,updateCombat,calculateAbilityDamage} from '../src/combat.js';
import {getSubclassCombatState,subclassWeaponDamage,clearSubclassCombatState} from '../src/subclassCombat.js';import {getCombatTechniqueState} from '../src/combatExpansion.js';
import {onPlayerDash,applyOutgoingClassPassiveDamage} from '../src/classPassives.js';import {fellhunterProficiency} from '../src/fellhunterWeapons.js';
import {requestBasicAttack} from '../src/combatMoves.js';import {expertiseNodeId} from '../src/skillExpertiseSystem.js';
import {updateOutOfCombatRecovery} from '../src/outOfCombatRecovery.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});Math.random=()=>.99;
const ids=ABILITIES.filter(a=>a.classId==='fellhunter').map(a=>a.id),weapons=Object.fromEntries(['sword','dagger','mace','staff','scythe','bow'].map(type=>[type,Object.keys(ITEMS).find(id=>ITEMS[id].slot==='weapon'&&ITEMS[id].weaponType===type)]));
for(const [type,id]of Object.entries(weapons))assert(id,'Existing '+type+' asset');
const report={checks:[],weapons,casts:[]},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
function setup(id='fellhunterPracticalStrike',family='base',type='sword',rank='normal'){
 now=100;const p=createPlayer('Hunter reviewer');chooseClass(p,'fellhunter');p.skillState.combat.level=33;p.skillState.skills.archery.level=1;for(const key of ['blade','blunt','scythe','dexterity','spirit','warding'])p.skillState.skills[key].level=33;migratePlayer(p);Object.assign(p,{x:400,y:400,dirX:1,dirY:0,spiritAwakened:true});p.equipment.weapon=weapons[type];p.skillTree.respecVersion=1;
 const w={mode:'dungeon',width:60,height:40,tiles:Array.from({length:40},()=>Array.from({length:60},()=>({passable:true,biome:'grass'}))),enemies:[],effects:[],drops:[],objects:[]};updateCombat(p,w,{},0,now,()=>{});p.stamina=p.maxStamina=p.spirit=p.maxSpirit=10000;p.hp=p.maxHp*.5;
 const e={id:'quarry',kind:'brute',name:'Quarry',x:460,y:400,hp:100000,maxHp:100000,radius:12,...(rank==='elite'?{elite:true,isElite:true}:rank==='boss'?{isBoss:true}:{})};w.enemies=[e];updateOutOfCombatRecovery(p,w,{attackPressed:true},0,now);const input={combatAimX:1,combatAimY:0,hasAim:true};
 function learn(skill,morph=family){unlockActiveAbility(p,skill,{autoAssignEmpty:false});getAbilityMastery(p,skill,true).level=20;assert(selectAbilityMorph(p,skill,morph,now).ok);}learn(id);p.loadout.abilitySlots=[id,null,null,null,'block'];
 return {p,w,e,input,learn,a:()=>getBalancedAbility(resolveAbilityMorph(p,id,family)),cast:(skill=id)=>useAbility(skill===id?0:skill,p,w,()=>{},now,input),refresh(){p.cooldowns={};p.abilityUseCharges={};p.stamina=p.spirit=10000;},advance(seconds){for(let i=0;i<Math.ceil(seconds/.025);i++){now+=.025;updateCombat(p,w,input,.025,now,()=>{});}}};
}
test('other class ability definitions remain exact; current Fellhunter identity is covered by verify-fellhunter-identity',()=>{const before=JSON.parse(fs.readFileSync('backups/fellhunter-full-pass-2026-10-13/protected.json','utf8'));for(const a of before.other)assert.deepEqual(JSON.parse(JSON.stringify(ABILITIES.find(current=>current.id===a.id))),['bloodLance','summonLich'].includes(a.id)?{...a,desc:ABILITIES.find(current=>current.id===a.id).desc}:a);});
test('all 45 forms work with six real weapon styles and retain mastery ownership',()=>{
 for(const type of Object.keys(weapons))for(const family of ['base','bloodhound','hellstalker'])for(const id of ids){
  const c=setup(id,family,type),xp=getAbilityMastery(c.p,id).xp,hp=c.p.hp;c.e.x=c.p.x+(c.a().subclassMode==='burst'?c.a().range:40);const before=c.p.stamina+c.p.spirit;assert(c.cast(),`${family}/${id}/${type}`);assert(c.p.stamina+c.p.spirit<before,`${family}/${id}/${type}: resource ${before}->${c.p.stamina+c.p.spirit}`);const s=getSubclassCombatState(c.p),t=getCombatTechniqueState(c.p),field=s?.fields[0]||t?.effects[0]||c.p.traps?.[0];if(field){c.e.x=field.x;c.e.y=field.y;}
  c.advance(1.5);assert.equal(getAbilityMastery(c.p,id).xp,xp);assert.equal(c.p.hp,hp);assert(Number.isFinite(c.p.hp));assert.equal(c.p.equipment.weapon,weapons[type]);assert(s?.fields.length<=12||!s);assert(t?.effects.length<=24||!t);
  assert(c.e.hp<100000||s?.empower||c.p.buffs?.defense||t?.statuses.execution||/GrapplingHook/.test(id),`${family}/${id}/${type} useful`);report.casts.push({family,id,type,damage:100000-c.e.hp});
 }assert.equal(report.casts.length,270);
});
test('melee training powers tools without adding two proficiency curves; Tactical Advantage works with weapons',()=>{
 for(const type of ['sword','dagger','mace','staff','scythe']){const c=setup(undefined,'base',type),proficiency=fellhunterProficiency(c.p);assert.notEqual(proficiency,'archery');const strong=calculateAbilityDamage(c.p,c.a());c.p.skillState.skills[proficiency].level=1;assert(strong>calculateAbilityDamage(c.p,c.a()));c.p.skillState.skills[proficiency].level=33;c.p.skillState.skills.archery.level=80;assert.equal(fellhunterProficiency(c.p),'archery');
  onPlayerDash(c.p,now);const stacks=c.p.passiveState.combatReloadStacks;const hit=applyOutgoingClassPassiveDamage(c.p,c.e,100,{melee:true,weaponType:type,skill:proficiency},now);assert(hit.damage>100);assert.equal(hit.consumedPassive,'combatReload');assert.equal(c.p.passiveState.combatReloadStacks,stacks-1);
  assert(requestBasicAttack(c.p,c.w,c.input,()=>{},now));assert.equal(c.p.combatState.attackMove.kind==='projectile',false);
 }
});
test('Bloodhound keeps one quarry, independently stacks poison and rewards wounded finishers',()=>{
 const c=setup('fellhunterThrowingDaggers','bloodhound');c.cast();c.advance(.15);let s=getSubclassCombatState(c.p);assert.equal(s.prey,c.e);const wound=s.afflictions.get(c.e).effects.get('bloodhound');assert(wound.dot&&wound.damage>0&&wound.venoms.length===1);const other={...c.e,id:'other',x:520};c.w.enemies.push(other);c.advance(.5);c.refresh();c.cast();c.advance(.2);assert.equal(s.prey,c.e);assert.equal(s.afflictions.get(c.e).effects.size,1);assert.equal(wound.venoms.length,2);
 c.advance(4.4);const expiry=wound.until;subclassWeaponDamage(c.p,c.e,100,now);assert.equal(wound.until,expiry);assert(s.preyUntil>now+5.9);c.advance(15);assert(!s.afflictions.get(c.e)?.effects.get('bloodhound'));assert(!s.prey);
 const damage=[];for(const wounded of [false,true]){const q=setup('fellhunterMarkedShot','bloodhound');q.cast();q.advance(.2);q.e.hp=wounded?25000:100000;q.refresh();const before=q.e.hp;q.cast();q.advance(.15);damage.push(before-q.e.hp);}assert(damage[1]>damage[0]*1.3);report.finisher=damage;
});
test('pursuit stops in melee range; retreats shoot forward; solid terrain blocks tools and mobility',()=>{
 const c=setup('fellhunterGrapplingHook','bloodhound');c.e.x=530;c.cast();assert(Math.abs(c.p.x-490)<2);
 for(const family of ['base','bloodhound']){const q=setup('fellhunterVaultingShot',family);q.cast();assert(q.p.x<400);q.advance(.3);assert(q.e.hp<100000);}
 for(const family of ['bloodhound']){const q=setup('fellhunterGrapplingHook',family);for(let y=0;y<q.w.height;y++)q.w.tiles[y][13].passable=false;const resource=q.p.stamina;assert(!q.cast());assert.equal(q.p.stamina,resource);}
});
test('fields replace their source; boss control is limited; Expertise scales damage once and cleanup removes encounter state',()=>{
 for(const family of ['bloodhound']){const c=setup('fellhunterKillZone',family);c.cast();c.refresh();c.cast();assert.equal(getSubclassCombatState(c.p).fields.length,1);const q=setup('fellhunterBearTrap',family,'sword','boss');q.cast();const f=getSubclassCombatState(q.p).fields[0];q.e.x=f.x;q.e.y=f.y;q.advance(.7);assert(!(q.e.rootUntil>now));assert(q.e.slowTimer>0);}
 const damage=[];for(const expert of [null,'bloodhound','hellstalker']){const c=setup('fellhunterThrowingDaggers','bloodhound');if(expert)c.p.skillTree.spent[expertiseNodeId('fellhunter',expert)]=1;c.cast();c.advance(.15);damage.push(100000-c.e.hp);clearSubclassCombatState(c.p);assert(!getSubclassCombatState(c.p));}assert(Math.abs(damage[1]/damage[0]-1.15)<.06&&Math.abs(damage[2]/damage[0]-.9)<.06);report.expertise=damage;
});
test('waiting traps stay visible after arming and still trigger on approach',()=>{
 for(const family of ['base','bloodhound','hellstalker'])for(const id of ['fellhunterBearTrap','fellhunterDeadfall']){
  const c=setup(id,family);c.cast();const s=getSubclassCombatState(c.p),t=getCombatTechniqueState(c.p),f=s?.fields[0]||t?.effects[0]||c.p.traps[0];c.e.x=f.x+250;c.advance(1.5);c.w.effects=[];c.advance(.7);
  assert(c.w.effects.some(fx=>fx.geometry==='field'||fx.profile==='deadfall'||fx.kind==='fellhunterBearTrap'),family+'/'+id+' waiting visual');assert.equal(c.e.hp,100000);c.e.x=f.x;c.e.y=f.y;c.advance(.8);assert(c.e.hp<100000,family+'/'+id+' triggers');
 }
});
fs.mkdirSync('docs/fellhunter',{recursive:true});fs.writeFileSync('docs/fellhunter/verification.json',JSON.stringify(report,null,2));

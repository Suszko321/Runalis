import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {getAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {spendSkillTreeNode} from '../src/skillTreeSystem.js';
import {assignAbilityToSlot,unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {useAbility,updateSummons} from '../src/combat.js';
import {assignCompanionFormation,companionFollowPoint,findCompanionRoom,summonTactics} from '../src/summonPositioning.js';
import {isActorPositionPassable,hasLineOfSight} from '../src/world.js';
const checks=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);},now=()=>performance.now()/1000;
const world=()=>({mode:'dungeon',width:40,height:32,tiles:Array.from({length:32},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
function player(commander=false){
 const p=createPlayer('Formation review');chooseClass(p,'gravecaller');Object.assign(p,{id:'formation-owner',x:400,y:400,dirX:1,dirY:0,spiritAwakened:true,gold:20});p.equipment.weapon='demonseedScythe';p.skillTree.bloodlineBonusPoints=100;
 for(const skill of Object.values(p.skillState.skills))skill.level=50;
 for(const id of ['spirit_root','spirit_harvest','spirit_minions',commander?'spirit_bone_coterie':'spirit_lich_ascension'])assert.ok(spendSkillTreeNode(p,id).ok);
 migratePlayer(p);p.maxSpirit=p.spirit=1000;return p;
}
function cast(p,w,id,morph='base',slot=0){
 assert.ok(assignAbilityToSlot(p,slot,id).ok);getAbilityMastery(p,id,true).level=20;assert.ok(selectAbilityMorph(p,id,morph).ok);assert.ok(useAbility(slot,p,w,()=>{},now()));return p.summons.filter(s=>s.sourceAbilityId===id&&s.alive!==false);
}
const foe=(s,d=200,extra={})=>({id:'target',name:'Target',kind:'rat',x:s.x+d,y:s.y,hp:100000,maxHp:100000,radius:12,aggro:3,combatTargetKind:'player',combatTargetId:'formation-owner',...extra});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const tick=(p,w,count=120,t=now())=>{for(let i=0;i<count;i++)updateSummons(1/60,p,w,()=>{},t+i/60);};
function actor(i,kind='thornbeast',extra={}){return {id:'pet-'+i,kind,sourceAbilityId:kind==='greaterLich'?'gravecallerSummonLich':'summonLich',summonAbilityId:kind==='greaterLich'?'gravecallerSummonLich':'summonLich',x:400,y:400,hp:1000,maxHp:1000,damage:5,armour:0,speed:160,attackRate:1,attackRange:42,alive:true,...extra};}
for(const morph of ['base','acolyte'])test(`${morph}: greater caster fires long-range magic and retreats from an enemy targeting it`,()=>{
 const p=player(),w=world(),s=cast(p,w,'gravecallerSummonLich',morph)[0];s.x=600;s.y=400;
 const e=foe(s);w.enemies=[e];updateSummons(.01,p,w,()=>{},now());assert.ok(e.hp<e.maxHp);assert.ok(w.effects.some(f=>f.geometry?.endsWith('Bolt')));assert.ok(s.attackRange>=230&&summonTactics(s).ranged);
 e.x=s.x+30;e.y=s.y;e.combatTargetKind='summon';e.combatTargetId=s.id;s.attackCooldown=0;const gap=dist(s,e),hp=e.hp;updateSummons(.05,p,w,()=>{},now());assert.ok(dist(s,e)>gap+8);assert.ok(e.hp<hp,'caster keeps firing while retreating');tick(p,w,90);assert.ok(dist(s,e)>=summonTactics(s).minimum-8);assert.ok(dist(s,e)<s.attackRange);assert.ok(isActorPositionPassable(w,s.x,s.y,s.radius));
});
test('Goliath, lesser goliath, bound specter, mummy and skeleton close to melee instead of retreating',()=>{
 for(const [id,morph] of [['gravecallerSummonLich','deathknight'],['summonLich','deathknight'],['summonLich','acolyte'],['summonLich','acolyte'],['summonLich','base']]){
  const p=player(),w=world(),s=cast(p,w,id,morph)[0];s.x=600;s.y=400;assert.ok(!summonTactics(s).ranged&&s.attackRange<65);const e=foe(s,180);w.enemies=[e];const initial=dist(s,e);updateSummons(.05,p,w,()=>{},now());assert.ok(dist(s,e)<initial);assert.equal(e.hp,e.maxHp);tick(p,w);assert.ok(e.hp<e.maxHp);assert.ok(dist(s,e)<=s.attackRange+10);assert.ok(!w.effects.some(f=>f.geometry==='hexBolt'||f.geometry==='soulBolt'));
 }
});
test('Independent skeleton, greater lich, wolf and demon abilities spawn and follow in shared distinct slots',()=>{
 const p=player(),w=world();unlockActiveAbility(p,'summonWolf');unlockActiveAbility(p,'summonDemon');
 for(const [i,id] of ['summonLich','gravecallerSummonLich','summonWolf','summonDemon'].entries())cast(p,w,id,'base',i);
 assert.equal(p.summons.length,4);assert.equal(new Set(p.summons.map(s=>s.companionIndex)).size,4);assert.ok(p.summons.every(s=>s.companionCount===4));
 for(let i=0;i<4;i++)for(let j=0;j<i;j++)assert.ok(dist(p.summons[i],p.summons[j])>=35,'spawn spacing');tick(p,w);
 for(let i=0;i<4;i++)for(let j=0;j<i;j++)assert.ok(dist(p.summons[i],p.summons[j])>=35,'following spacing');
});
test('Eight mixed saved companions initially stacked on the owner spread into open floor',()=>{
 const p=player(),w=world();p.summons=[actor(0,'lich'),actor(1,'greaterLich',{summonMorph:'acolyte',attackRange:245}),actor(2,'wolf'),actor(3,'miniDemon'),actor(4,'thornbeast'),actor(5,'thornbeast'),actor(6,'thornbeast'),actor(7,'eldritchHorror')];tick(p,w,240);
 assert.ok(p.summons.every(s=>dist(s,p)>=35&&dist(s,p)<170));for(let i=0;i<8;i++)for(let j=0;j<i;j++)assert.ok(dist(p.summons[i],p.summons[j])>=34,`${i}/${j}: mixed stack persists`);
 assert.ok(p.summons.every(s=>isActorPositionPassable(w,s.x,s.y,s.radius||12)));
});
test('Followers choose free rooms beside walls and adapt after passing through a narrow corridor',()=>{
 const p=player(),w=world();for(let y=0;y<w.height;y++)w.tiles[y][11].passable=false;w.tiles[12][11].passable=true;p.x=416;p.y=400;
 p.summons=Array.from({length:5},(_,i)=>actor(i));tick(p,w,180);for(const s of p.summons){assert.ok(isActorPositionPassable(w,s.x,s.y,12));assert.ok(hasLineOfSight(w,p.x,p.y,s.x,s.y));}
 // Player crosses through the opening; companions must walk through it too.
 p.x=240;tick(p,w,300);assert.ok(p.summons.every(s=>s.x<352&&isActorPositionPassable(w,s.x,s.y,12)),JSON.stringify(p.summons.map(s=>({x:s.x,y:s.y,slot:companionFollowPoint(s,p),room:findCompanionRoom(s,p,w,companionFollowPoint(s,p),now())}))));
});
test('Ranged retreat respects a wall and can still fire while boxed in',()=>{
 const p=player(),w=world(),s=cast(p,w,'gravecallerSummonLich','acolyte')[0];s.x=397;s.y=400;
 for(let y=0;y<w.height;y++)w.tiles[y][11].passable=false;const e=foe(s,30,{combatTargetKind:'summon',combatTargetId:s.id});w.enemies=[e];tick(p,w,120);assert.ok(s.x>=384);assert.ok(isActorPositionPassable(w,s.x,s.y,s.radius));assert.ok(e.hp<e.maxHp);
});
test('Combat separation keeps different melee ability groups apart while they attack one foe',()=>{
 const p=player(),w=world();p.summons=[actor(0,'lich',{x:600}),actor(1,'greaterLich',{x:600,summonMorph:'deathknight',attackRange:58,radius:20}),actor(2,'wolf',{x:600}),actor(3,'miniDemon',{x:600})];const e=foe(p.summons[0],75);w.enemies=[e];tick(p,w,180);
 assert.ok(e.hp<e.maxHp);for(let i=0;i<4;i++)for(let j=0;j<i;j++)assert.ok(dist(p.summons[i],p.summons[j])>=31,'combat pile-up');
});
test('Temporary and co-op companions participate in separation; family indices still identify one pack healer',()=>{
 const p=player(),w=world(),ally=player();ally.id='ally';ally.x=900;ally.summons=[actor(9,'wolf',{x:400,y:400})];p.coop={players:[p,ally]};p.summons=[actor(0,'greaterLich',{summonMorph:'base',attackRange:260}),actor(1,'thornbeast',{summonPath:'swarm'}),actor(2,'thornbeast',{summonPath:'swarm'}),actor(3,'thornbeast',{summonPath:'swarm'}),actor(4,'miniDemon',{legendaryTemporary:true,expiresAt:now()+20})];
 assignCompanionFormation(p,now());const pack=p.summons.filter(s=>s.kind==='thornbeast');assert.deepEqual(pack.map(s=>s.formationIndex),[0,1,2]);assert.ok(pack.every(s=>s.formationCount===3));tick(p,w,180);assert.ok(p.summons.every(s=>dist(s,ally.summons[0])>=34));assert.equal(p.summons.length,5);
});
test('Empty-floor selection avoids other ability summons and does not return a blocked position',()=>{
 const p=player(),w=world();p.summons=[actor(0),actor(1,'greaterLich',{x:400,y:455,radius:20})];assignCompanionFormation(p,now());const s=p.summons[0],point=findCompanionRoom(s,p,w,{x:400,y:455},now());assert.ok(dist(point,p.summons[1])>=36);assert.ok(isActorPositionPassable(w,point.x,point.y,12));
});
test('Crowded melee formations keep every companion attacking instead of choosing unreachable attack slots',()=>{
 const p=player(),w=world();p.summons=Array.from({length:8},(_,i)=>actor(i,'lich',{x:600,y:400,attackRange:42}));const e=foe(p.summons[0],120);w.enemies=[e];tick(p,w,300);assert.ok(p.summons.every(s=>Number.isFinite(s.attackAnimationUntil)));
 for(let i=0;i<8;i++)for(let j=0;j<i;j++)assert.ok(dist(p.summons[i],p.summons[j])>=29,'crowded attack separation');
});
test('Fast followers settle at their slot instead of overshooting it while haste is active',()=>{
 const p=player(),w=world();p.subclassHasteUntil=now()+100;p.summons=[actor(0,'wolf',{x:340,y:400,speed:1000})];tick(p,w,180);const s=p.summons[0],x=s.x,y=s.y;tick(p,w,120);assert.equal(s.x,x);assert.equal(s.y,y);assert.ok(dist(s,companionFollowPoint(s,p))<9);
});
fs.mkdirSync('docs/summon-positioning',{recursive:true});fs.writeFileSync('docs/summon-positioning/verification.json',JSON.stringify({pass:true,checks},null,2)+'\n');console.log(`Summon positioning: ${checks.length} checks passed.`);

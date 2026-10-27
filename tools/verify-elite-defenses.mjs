import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,chooseClass} from '../src/player.js';
import {applyTargetDamage} from '../src/enemyBehaviors.js';
import {applyDefensiveDamage,ensureActionState} from '../src/combatActions.js';
import {modifyBloodlineIncomingDamage} from '../src/bloodlineSystem.js';
import {moveActorWithCollision,isActorPositionPassable} from '../src/world.js';

let clock=10;
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock*1000},configurable:true});
const report={checks:[]};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const world=mode=>({mode:mode||'dungeon',width:32,height:24,tiles:Array.from({length:24},()=>Array.from({length:32},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[],drops:[]});
const player=(id='classless')=>{const p=createPlayer('Elite defense');chooseClass(p,id);Object.assign(p,{x:320,y:320,hp:1000,maxHp:1000,stamina:1000,maxStamina:1000});return p;};
const attacker={id:'hazard-source',x:300,y:320,hp:10000,maxHp:10000,damage:100};
const hit=(p,amount=100,now=clock)=>applyTargetDamage(attacker,p,amount,world(),()=>{},{now,label:'Critical hazard'});

test('Prism Guard and Halo Aegis absorb elite damage and award Prism Lumen once',()=>{
 const p=player('lightbringer'),baseline=hit(player('lightbringer')).hpDamage;
 p.lightbringer={lumens:0,lumenProgress:0};
 p.buffs={prismGuard:{until:clock+5,flatAbsorb:15},haloAegis:{until:clock+5,flatAbsorb:10}};
 const result=hit(p);assert.equal(result.lightAbsorbed,25);assert.equal(result.hpDamage,baseline-25);
 assert.equal(p.lightbringer.lumens,1);hit(p);assert.equal(p.lightbringer.lumens,1);
});
test('expired and active wards use the supplied simulation clock',()=>{
 const baseline=hit(player()).hpDamage,p=player();
 p.buffs={bubbleWard:{until:50,flatAbsorb:30},prismGuard:{until:50,flatAbsorb:30},haloAegis:{until:50,flatAbsorb:30}};
 assert.equal(hit(p,100,100).hpDamage,baseline);assert.deepEqual(p.buffs,{});
 const q=player();q.buffs={bubbleWard:{until:101,flatAbsorb:30}};
 assert.equal(hit(q,100,100).bubbleAbsorbed,30);
});
test('block uses the supplied clock for Oathkeeper Bulwark stamina and damage reduction',()=>{
 const p=player('oathkeeper');ensureActionState(p).blocking=true;
 p.oathkeeper={bulwarkUntil:50};const q=structuredClone(p);
 const expected=applyDefensiveDamage(q,100,()=>{},attacker,world(),100);
 const result=hit(p,100,100);assert.equal(p.stamina,q.stamina);assert.equal(result.blocked,true);
 assert.ok(result.hpDamage<=expected.hpDamage);
});
test('bloodline incoming damage applies to elite hazards, including vulnerabilities',()=>{
 const baseline=hit(player()).hpDamage;
 for(const id of ['nephilim','cambion','vampire']){
  const p=player();p.bloodline={id};
  assert.equal(hit(p).hpDamage,modifyBloodlineIncomingDamage(p,baseline),id);
 }
});
test('legendary barrier and cheat death protect against critical elite damage',()=>{
 const shield=player();shield.equipment={trinket:'dawnwardAegis'};
 assert.equal(hit(shield,200).hpDamage,0);assert.equal(shield.hp,1000);
 const lastChance=player();lastChance.hp=20;lastChance.equipment={trinket:'runalisLantern'};
 assert.equal(hit(lastChance,500).hpDamage,0);assert.equal(lastChance.hp,90);
 assert.ok(hit(lastChance,500).hpDamage>0,'cheat death ignored its cooldown');
});
test('Oathkeeper taking elite damage receives normal Conviction reaction',()=>{
 const p=player('oathkeeper');hit(p);
 assert.equal(p.passiveState.oathboundRiposteStacks,1);
 assert.equal(p.passiveState.oathboundRiposteUntil,clock+4.2);
});
test('hazard reflection and snare affect the actual caster rather than its impact-position copy',()=>{
 const p=player();p.equipment={chest:'oathplateOfTheLastDawn',legs:'briarCovenantGreaves'};
 const owner={...attacker},impact={...owner,x:p.x,y:p.y,combatSource:owner};
 applyTargetDamage(impact,p,100,world(),()=>{},{now:clock});
 assert.equal(owner.hp,attacker.hp-35);assert.equal(impact.hp,attacker.hp);
 assert.equal(owner.rootUntil,clock+1.6);assert.equal(impact.rootUntil,undefined);
});
test('valid dodge and protected windows prevent damage before all downstream reactions',()=>{
 for(const defense of ['dodge','protected']){
  const p=player('oathkeeper');
  if(defense==='dodge'){ensureActionState(p).dodgeIFrameDelay=0;p.actionState.dodgeIFrameTimer=.1;}
  else p.invulnerableUntil=clock+1;
  const result=hit(p,1000);assert.equal(result.hpDamage,0);assert.equal(p.hp,1000);
  assert.equal(p.passiveState?.oathboundRiposteStacks||0,0);
 }
});
test('wall collision is swept with actor radius in dungeon and overworld at low frame rates',()=>{
 for(const mode of ['dungeon','overworld'])for(const distance of [52,130,260]){
  const w=world(mode),p=player();w.encounterBarriers=[{x:350,y:250,w:12,h:150}];
  moveActorWithCollision(p,w,distance,0,12);
  assert.ok(p.x<338,`${mode} crossed a thin wall with ${distance} displacement`);
  assert.ok(isActorPositionPassable(w,p.x,p.y,12));
  p.y=220;moveActorWithCollision(p,w,distance,0,12);assert.ok(p.x>350,'legal opening was blocked');
 }
});
test('host and couch co-op movement route ordinary maps through swept collision',()=>{
 const host=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const ally=fs.readFileSync(new URL('../src/couchCoop.js',import.meta.url),'utf8');
 const hostMove=host.slice(host.indexOf('  move(dt) {'),host.indexOf('// SPLIT SYSTEM WRAPPERS'));
 assert.equal((hostMove.match(/if \(!bypassEditorCollision\)/g)||[]).length,2);
 const allyStart=ally.indexOf('function moveActorWithCollision(game, actor, dx, dy)');
 const allyMove=ally.slice(allyStart,ally.indexOf('\nfunction interactAsAlly',allyStart));
 assert.ok(allyMove.includes('moveWorldActor(actor, game.world'));assert.ok(!allyMove.includes('orrakaiRevision'));
});

fs.mkdirSync(new URL('../docs/elite-hazards/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../docs/elite-hazards/defenses-verification.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`${report.checks.length} elite defense verification groups passed.`);

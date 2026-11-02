import assert from 'node:assert/strict';
import {createPlayer,chooseClass,addItem} from '../src/player.js';
import {createTradeSystem,tradeItemReason} from '../src/tradeSystem.js';
import {createGearEntry} from '../src/equipmentProgressionSystem.js';
import {ITEMS,RECIPES} from '../src/data.js';
let checks=0;
const test=(name,run)=>{run();console.log('PASS '+name);checks++;};
function setup(options={}){
 const actors=Array.from({length:4},(_,i)=>{const p=createPlayer('Trader '+(i+1));chooseClass(p,'oathkeeper');return Object.assign(p,{profileId:'trade-'+i,slot:i+1,x:200+i*14,y:200,gold:1000,isMoving:false});});
 actors[0].coop={players:[actors[1]]};
 const game={player:actors[0],world:{safeZone:true,width:30,height:30,tileSize:32,tiles:Array.from({length:30},()=>Array.from({length:30},()=>({biome:'grass',passable:true})))},isActorInterfaceBusy:()=>false};
 const system=createTradeSystem(game,options);
 const wait=()=>{system.update(0);for(let i=0;i<41;i++)system.update(.1);};
 const act=(actor,type,extra={})=>{const s=system.snapshot(actor);return system.action(actor,{id:s.id,revision:s.revision,type,...extra});};
 const open=()=>{wait();assert(system.interact(actors[0]));};
 const finish=()=>{for(const p of actors.slice(0,2))assert(act(p,'accept').ok);assert.equal(system.snapshot(actors[0]).stage,'review');assert(act(actors[0],'confirm').ok);assert(act(actors[1],'confirm').ok);};
 return {actors,game,system,wait,act,open,finish};
}
test('four stationary seconds, safe-zone and line-of-sight gates; movement resets readiness',()=>{
 const {actors:[a,b],game,system}=setup();system.update(0);
 for(let i=0;i<39;i++)system.update(.1);assert.equal(system.snapshot(a).nearby.length,0);
 b.isMoving=true;system.update(.1);b.isMoving=false;
 for(let i=0;i<39;i++)system.update(.1);assert(!system.interact(a));
 for(let i=0;i<2;i++)system.update(.1);assert.equal(system.snapshot(a).nearby.length,1);
 game.world.safeZone=false;system.update(.1);assert(!system.interact(a));
 game.world.safeZone=true;b.x=600;for(let i=0;i<42;i++)system.update(.1);assert(!system.interact(a));
 b.x=214;game.world.tiles[6][6]={biome:'wall',passable:false};for(let i=0;i<42;i++)system.update(.1);assert(!system.interact(a));
});
test('materials, all recipe inputs, quest/locked/equipped items cannot enter an offer',()=>{
 const {actors:[a],system,open,act}=setup();
 for(const id of ['ironOre','emberleaf','rawSunfish','cookedSunfish','oldKnife'])addItem(a,id,2);
 for(const entry of a.inventory.filter(e=>e.id==='oldKnife'))entry.locked=true;
 for(const id of Object.values(RECIPES).flatMap(r=>(r.materials||[]).map(([id])=>id)))assert(tradeItemReason(a,{id,qty:1}));
 for(const def of Object.values(ITEMS).filter(i=>i.type==='quest'||i.questItem))assert(tradeItemReason(a,{id:def.id,qty:1}));
 open();assert.deepEqual(system.snapshot(a).inventory.map(e=>e.id),['cookedSunfish']);
 assert(!act(a,'add',{key:'forged',qty:1}).ok);
});
test('offer edits reset both approvals; stale revisions, early confirmations and outsiders fail',()=>{
 const {actors:[a,b,c],system,open,act}=setup();open();assert(act(a,'gold',{gold:70}).ok);
 const old=system.snapshot(a);assert(act(a,'accept').ok);assert(!act(b,'confirm').ok);
 assert(act(b,'gold',{gold:15}).ok);assert(!system.snapshot(a).accepted);
 assert(!system.action(a,{id:old.id,revision:old.revision,type:'accept'}).ok);
 assert(!system.action(c,{id:old.id,revision:system.snapshot(a).revision,type:'accept'}).ok);
 for(const gold of [-1,.5,Infinity,1001,'10'])assert(!act(a,'gold',{gold}).ok);
 assert(act(a,'accept').ok);assert(act(b,'accept').ok);assert.equal(system.snapshot(a).stage,'review');
 assert(!act(a,'gold',{gold:0}).ok);assert(act(a,'edit').ok);assert.equal(system.snapshot(a).stage,'offer');
});
test('two-stage exchange is atomic, conserves gold/stacks, preserves exact rolled gear and commits once',()=>{
 let commits=0;const {actors:[a,b],system,open,act,finish}=setup({completed:()=>commits++});
 addItem(a,'cookedSunfish',6);const gear=createGearEntry(a,'oldKnife',{upgradeTier:7,gearRarity:'rare',rarityRollVersion:1,itemLevel:25,customHistory:'preserve-me'});a.inventory.push(gear);
 open();const bag=system.snapshot(a).inventory;
 assert(act(a,'add',{key:bag.find(e=>e.id==='cookedSunfish').key,qty:3}).ok);
 assert(act(a,'add',{key:bag.find(e=>e.id==='oldKnife').key,qty:1}).ok);
 assert(act(a,'gold',{gold:125}).ok);assert(act(b,'gold',{gold:25}).ok);
 const before=JSON.stringify([a.inventory,b.inventory,a.gold,b.gold]);assert(act(a,'accept').ok);assert(act(b,'accept').ok);
 assert(act(a,'confirm').ok);assert.equal(JSON.stringify([a.inventory,b.inventory,a.gold,b.gold]),before);
 const final=system.snapshot(b);assert(act(b,'confirm').ok);
 assert.equal(a.gold,900);assert.equal(b.gold,1100);assert.equal(a.inventory.find(e=>e.id==='cookedSunfish').qty,3);assert.equal(b.inventory.find(e=>e.id==='cookedSunfish').qty,3);
 assert.deepEqual(b.inventory.find(e=>e.instanceId===gear.instanceId),gear);assert.equal(commits,1);
 assert(!system.action(b,{id:final.id,revision:final.revision,type:'confirm'}).ok);assert.equal(commits,1);
});
test('inventory mutations, distance, departure, world replacement and decline cancel without exchange',()=>{
 for(const mode of ['inventory','gold','distance','departure','world','death','controller','decline']){
  const {actors:[a,b],game,system,open,act}=setup();addItem(a,'cookedSunfish',3);open();act(a,'gold',{gold:10});
  if(mode==='inventory')a.inventory[0].qty++;
  if(mode==='gold')a.gold++;
  if(mode==='distance')b.x=600;
  if(mode==='departure')a.coop.players=[];
  if(mode==='world')game.world={...game.world};
  if(mode==='death')b.hp=0;
  if(mode==='controller')b.controllerDisconnected=true;
  if(mode==='decline')act(b,'cancel');else system.update(.1);
  assert(!system.isBusy(a),mode);assert.equal(b.gold,1000);assert.equal(b.inventory.length,0);
 }
});
test('full bags, gear level restrictions, identity collisions and failed persistence cannot partially commit',()=>{
 for(const mode of ['capacity','level','duplicate','storage']){
  const {actors:[a,b],system,open,act}=setup({persist:()=>mode!=='storage'});
  a.inventory.push(createGearEntry(a,'oldKnife'));
  if(mode==='capacity')for(let i=0;i<20;i++)b.inventory.push(createGearEntry(b,'oldKnife'));
  if(mode==='duplicate')b.inventory.push(structuredClone(a.inventory[0]));
  if(mode==='level')Object.assign(a.inventory[0],{gearRarity:'mythic',rarityRollVersion:1});
  open();act(a,'add',{key:system.snapshot(a).inventory[0].key,qty:1});act(b,'gold',{gold:10});
  const before=JSON.stringify([a.inventory,b.inventory,a.gold,b.gold]);act(a,'accept');act(b,'accept');act(a,'confirm');assert(!act(b,'confirm').ok,mode);
  assert.equal(JSON.stringify([a.inventory,b.inventory,a.gold,b.gold]),before,mode);
 }
});
test('four-player parties isolate simultaneous pairs and actor-owned requests',()=>{
 const {actors:[a,b,c,d],game,system,wait,act}=setup();a.coop.players=[b,c,d];c.x=600;d.x=615;wait();
 assert(system.interact(a));assert(system.interact(c));assert.notEqual(system.snapshot(a).id,system.snapshot(c).id);
 assert(act(a,'gold',{gold:20}).ok);assert.equal(system.snapshot(c).own.gold,0);act(b,'cancel');assert(system.isBusy(c));assert(!system.isBusy(a));
});
test('full gear bags can swap space atomically; currency overflow is rejected',()=>{
 const {actors:[a,b],system,open,act,finish}=setup();
 for(let i=0;i<20;i++){a.inventory.push(createGearEntry(a,'oldKnife'));b.inventory.push(createGearEntry(b,'oldKnife'));}
 const aId=a.inventory[0].instanceId,bId=b.inventory[0].instanceId;open();
 act(a,'add',{key:system.snapshot(a).inventory[0].key,qty:1});act(b,'add',{key:system.snapshot(b).inventory[0].key,qty:1});finish();
 assert.equal(a.inventory.length,20);assert.equal(b.inventory.length,20);assert(a.inventory.some(e=>e.instanceId===bId));assert(b.inventory.some(e=>e.instanceId===aId));
 const next=setup();const [x,y]=next.actors;x.gold=Number.MAX_SAFE_INTEGER;next.open();next.act(y,'gold',{gold:1});next.act(x,'accept');next.act(y,'accept');next.act(x,'confirm');assert(!next.act(y,'confirm').ok);assert.equal(x.gold,Number.MAX_SAFE_INTEGER);assert.equal(y.gold,1000);
});
console.log(`${checks}/${checks} player-trading contracts passed.`);

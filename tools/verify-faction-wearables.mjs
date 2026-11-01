import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {asset,spriteArtStatus}=await import('../src/spriteArt.js');
const {ITEMS}=await import('../src/data.js');
const {WEAPON_MOVESETS}=await import('../src/combatMoves.js');
const {armorReplacement}=await import('../src/armorMotionArt.js');
const {itemIconMarkup}=await import('../src/gearVisualStyle.js');
for(const n of ['human-male','human-female','human-male-attack','human-female-attack','human-male-cast','human-female-cast','heads-custom','player-wearables-covenant','player-wearables-last-dawn'])asset(n);
for(let i=0;i<150&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
assert(!spriteArtStatus().some(a=>a.failed));
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
const canvas=createCanvas(128,128),ctx=canvas.getContext('2d');
const actor={x:64,y:88,hp:100,maxHp:100,skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',appearance:{}};
const poses=[{},...[.01,2.1,4.1,6.1].map(walkTime=>({isMoving:true,walkTime})),{isMoving:true,walkTime:.6,run:true},{block:true},...[.05,.2,.4].map(attack=>({attack})),...[.1,.35,.65].map(cast=>({cast}))];
const kits=['Covenant','LastDawn'].flatMap(faction=>['Chest','Robe','ScoutChest'].map(chest=>({helm:`enemy${faction}${chest==='ScoutChest'?'ScoutHelm':'Helm'}`,chest:`enemy${faction}${chest}`,legs:`enemy${faction}Legs`})));
function render(kit){actor.equipment={weapon:'veyrRapier',...kit};ctx.clearRect(0,0,128,128);const before=JSON.stringify(actor);drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:5});assert.equal(JSON.stringify(actor),before);return ctx.getImageData(0,0,128,128).data;}
let comparisons=0;
for(const bodyType of ['male','female'])for(const hairStyle of ['short','ponytail','long','shaved'])for(const [dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]])for(const pose of poses){
 Object.assign(actor,{bodyType,hairStyle,dirX,dirY,isMoving:!!pose.isMoving,walkTime:pose.walkTime||0});actor.appearance.hairStyle=hairStyle;actor.actionState={blocking:!!pose.block,sprinting:!!pose.run};actor.combatState={attacking:pose.attack!=null,attackMove:WEAPON_MOVESETS.sword.moves[0],attackElapsed:pose.attack||0};actor.visualAction=pose.cast==null?null:{kind:'cast',startedAt:5-pose.cast,duration:.8};
 const base=render({});
 for(const kit of kits){
  for(const outfit of [{chest:kit.chest},{legs:kit.legs},{chest:kit.chest,legs:kit.legs},{chest:kit.chest,legs:kit.legs.includes('Covenant')?'enemyLastDawnLegs':'enemyCovenantLegs'}]){
   const fitted=render(outfit);for(let i=3;i<base.length;i+=4)assert.equal(fitted[i],base[i],`Silhouette moved ${JSON.stringify({bodyType,hairStyle,dirX,dirY,pose,outfit})}`);comparisons++;
  }
  render(kit);
 }
}
Object.assign(actor,{bodyType:'male',hairStyle:'short',dirX:0,dirY:1,isMoving:false,visualAction:null,actionState:{},combatState:{}});
for(const kit of kits){
 Object.assign(actor,{shirt:'#887052',pants:'#3d3a3c',boots:'#66421f'});const normal=render(kit);
 assert.deepEqual(render(Object.fromEntries(Object.entries(kit).map(([s,id])=>[s,{id,instanceId:`test-${s}`,upgradeTier:20}]))),normal);
 Object.assign(actor,{shirt:'#ff00ff',pants:'#00ffff',boots:'#00ff00'});assert.deepEqual(render(kit),normal,'Starter colours leaked');
 for(const part of ['chest','legs'])assert.equal(armorReplacement({equipment:kit},part),false);
 for(const id of Object.values(kit))assert.match(itemIconMarkup(ITEMS[id]),/player-wearables-(covenant|last-dawn)-icons/);
 const bare=render({});assert(normal.some((v,i)=>i%4!==3&&v!==bare[i]),'Kit has no visible art');
}
console.log('PASS',JSON.stringify({comparisons,wearables:12,kits:6,bodies:2,heads:4,facings:4,poses:poses.length,mixedFactions:true,perCopy:true,undercolorIsolation:true,icons:true,actorUnchanged:true}));


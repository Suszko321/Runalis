import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {asset,spriteArtStatus}=await import('../src/spriteArt.js');
const {WEAPON_MOVESETS}=await import('../src/combatMoves.js');
const {ITEMS}=await import('../src/data.js');
const {armorReplacement}=await import('../src/armorMotionArt.js');
const {drawWearableArt,drawLegwearArt}=await import('../src/equipmentArt.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
for(const n of ['human-male','human-female','human-male-attack','human-female-attack','human-male-cast','human-female-cast','heads-custom','player-wearables-first-pass'])asset(n);
for(let i=0;i<150&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
assert(!spriteArtStatus().some(a=>a.failed));
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
const canvas=createCanvas(128,128),ctx=canvas.getContext('2d'),out='docs/player-wearables-first-pass';fs.mkdirSync(out,{recursive:true});
const preview=createCanvas(660,1778),pc=preview.getContext('2d');pc.fillStyle='#29302d';pc.fillRect(0,0,preview.width,preview.height);pc.fillStyle='#decdb0';pc.font='14px sans-serif';for(const[c,label]of ['Base + same weapon','Fitted chest + greaves','Complete selected outfit'].entries())pc.fillText(label,c*220+14,25);
const actor={x:64,y:88,hp:100,maxHp:100,skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',equipment:{weapon:'veyrRapier',trinket:'orrakaiFoundersSignet'},actionState:{},combatState:{},appearance:{}};
const poses=[{},{isMoving:true,walkTime:.01},{isMoving:true,walkTime:2.1},{isMoving:true,walkTime:4.1},{isMoving:true,walkTime:6.1},{isMoving:true,walkTime:.6,run:true},{block:true},...[.05,.2,.4].map(elapsed=>({attack:elapsed})),...[.1,.35,.65].map(cast=>({cast}))];
const weapons=['veyrRapier',...['bow','staff','spiritFocus'].map(type=>Object.keys(ITEMS).find(id=>ITEMS[id].weaponType===type))];let weapon='veyrRapier';
let comparisons=0,previewRow=0;
function render(equipment){actor.equipment={weapon,trinket:'orrakaiFoundersSignet',...equipment};ctx.clearRect(0,0,128,128);const before=JSON.stringify(actor);drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:5});assert.equal(JSON.stringify(actor),before,'Render mutated actor');return ctx.getImageData(0,0,128,128).data;}
for(weapon of weapons)for(const bodyType of ['male','female'])for(const hairStyle of ['short','ponytail','long','shaved'])for(const[dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]])for(const pose of poses){
 Object.assign(actor,{bodyType,hairStyle,dirX,dirY,isMoving:!!pose.isMoving,walkTime:pose.walkTime||0});actor.appearance.hairStyle=hairStyle;actor.actionState={blocking:!!pose.block,sprinting:!!pose.run};actor.combatState={attacking:pose.attack!=null,attackMove:WEAPON_MOVESETS.sword.moves[0],attackElapsed:pose.attack||0};
 actor.visualAction=pose.cast==null?null:{kind:'cast',startedAt:5-pose.cast,duration:.8};
 const naked=render({});
 for(const equipment of [{chest:'patchedRoadLeathers'},{legs:'graveboundGreaves'},{chest:'patchedRoadLeathers',legs:'graveboundGreaves'}]){
  const dressed=render(equipment);for(let i=3;i<naked.length;i+=4)assert.equal(dressed[i],naked[i],`Equipment moved silhouette: ${bodyType}/${hairStyle}/${dirX},${dirY}/${JSON.stringify(pose)}/${JSON.stringify(equipment)}/${i}`);comparisons++;
 }
 render({helm:'graveboundHelm',chest:'patchedRoadLeathers',legs:'graveboundGreaves'});
 if(weapon==='veyrRapier'&&hairStyle==='short'&&Object.keys(pose).length===0){
  for(let c=0;c<3;c++){
   render(c===0?{}:c===1?{chest:'patchedRoadLeathers',legs:'graveboundGreaves'}:{helm:'graveboundHelm',chest:'patchedRoadLeathers',legs:'graveboundGreaves'});
   pc.imageSmoothingEnabled=false;pc.drawImage(canvas,32,20,64,100,c*220+46,50+previewRow*216,128,200);
  }
  previewRow++;
 }
}
assert.equal(armorReplacement({equipment:{chest:'patchedRoadLeathers'}},'chest'),false);
assert.equal(armorReplacement({equipment:{legs:'graveboundGreaves'}},'legs'),false);
weapon='veyrRapier';Object.assign(actor,{bodyType:'male',hairStyle:'short',dirX:0,dirY:1,isMoving:false,visualAction:null,actionState:{},combatState:{}});
const kit={helm:'graveboundHelm',chest:'patchedRoadLeathers',legs:'graveboundGreaves'},reference=render(kit);
assert.deepEqual(render(Object.fromEntries(Object.entries(kit).map(([slot,id])=>[slot,{id,instanceId:'probe-'+slot,upgradeTier:20}]))),reference,'Per-copy refs changed art');
Object.assign(actor,{shirt:'#ff00ff',pants:'#00ffff',boots:'#00ff00'});assert.deepEqual(render(kit),reference,'Starter colors leaked through equipped kit');
for(const id of ['graveboundHelm','patchedRoadLeathers','graveboundGreaves']){
 ctx.clearRect(0,0,128,128);const profile=getGearVisualProfile(id,ITEMS[id]);
 if(profile.slot==='legs')drawLegwearArt(ctx,profile,'down',64,88,0,0,{});else drawWearableArt(ctx,profile,'down',64,88,0,{});
 assert(ctx.getImageData(0,0,128,128).data.some((v,i)=>i%4===3&&v>0),'Standalone/non-human gear must not disappear: '+id);
}
fs.writeFileSync(`${out}/fitted-preview.png`,preview.toBuffer('image/png'));
console.log('PASS',JSON.stringify({silhouetteComparisons:comparisons,bodies:2,heads:4,directions:4,weapons,poses:poses.length,originalAnatomy:true,actorUnchanged:true}));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE||'@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {createPlayer}=await import('../src/player.js');
const {ITEMS}=await import('../src/data.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {armorMotionFamily}=await import('../src/armorMotionArt.js');
const {spriteArtStatus}=await import('../src/spriteArt.js');
const {ensureCombatState,WEAPON_MOVESETS}=await import('../src/combatMoves.js');
const families=['leather','plate','cloth'];
const itemFor=(slot,family)=>Object.keys(ITEMS).find(id=>ITEMS[id].slot===slot&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),slot)===family);
const actor=createPlayer('Armour review');ensureCombatState(actor);
Object.assign(actor,{x:80,y:105,hair:'#63391f',skin:'#eeb883',actionState:{},appearance:{hairStyle:'short'}});
actor.equipment.weapon=Object.keys(ITEMS).find(id=>ITEMS[id].slot==='weapon'&&getGearVisualProfile(id,ITEMS[id]).weaponType==='scythe');
actor.equipment.helm=Object.keys(ITEMS).find(id=>ITEMS[id].slot==='helm'&&getGearVisualProfile(id,ITEMS[id]).silhouette!=='hood');
const canvas=createCanvas(160,150),ctx=canvas.getContext('2d');
drawHumanActor(ctx,actor,{x:0,y:0});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
// Fix presentation time so pixel comparisons isolate the underclothing alone.
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
const legFamilies=families.filter(f=>itemFor('legs',f));
const setCount=2*families.length*legFamilies.length;
const sheet=createCanvas(960,setCount*150),sc=sheet.getContext('2d');sc.fillStyle='#263025';sc.fillRect(0,0,sheet.width,sheet.height);
let comparisons=0,row=0;
function render(colors){Object.assign(actor,colors);ctx.clearRect(0,0,160,150);const before=JSON.stringify(actor);drawHumanActor(ctx,actor,{x:0,y:0},{scale:1.7,isPlayer:true});assert.equal(JSON.stringify(actor),before);return Buffer.from(ctx.getImageData(0,0,160,150).data);}
for(const bodyType of ['male','female'])for(const chest of families)for(const legs of legFamilies){
 actor.bodyType=bodyType;actor.hairStyle=bodyType==='female'?'ponytail':'short';actor.equipment.chest=itemFor('chest',chest);actor.equipment.legs=itemFor('legs',legs);
 for(const [direction,[dirX,dirY]] of [[0,1],[1,0],[0,-1],[-1,0]].entries())for(let frame=0;frame<6;frame++){
  Object.assign(actor,{dirX,dirY,isMoving:frame>0&&frame<4,walkTime:(frame-1)*2+.01});
  actor.actionState.blocking=frame===4;actor.combatState.attacking=frame===5;
  actor.combatState.attackMove=WEAPON_MOVESETS.scythe.moves[0];actor.combatState.attackElapsed=actor.combatState.attackMove.duration*.45;
  const a=render({shirt:'#ff00ff',pants:'#00ffff',boots:'#ff0000'});
  const b=render({shirt:'#00ff00',pants:'#ffff00',boots:'#0000ff'});
  if(!a.equals(b)){const pixels=[];for(let i=0;i<a.length;i+=4)if(a.subarray(i,i+4).compare(b.subarray(i,i+4)))pixels.push([i/4%160,Math.floor(i/4/160)]);console.log('Differences',pixels.slice(0,20));}
  assert.ok(a.equals(b),`Starter clothing leaked: ${bodyType}/${chest}/${legs}/${direction}/${frame}`);comparisons++;
  if(direction===1){sc.drawImage(canvas,frame*160,row*150);}
 }
 sc.fillStyle='#e4d3b0';sc.font='12px sans-serif';sc.fillText(`${bodyType}: ${chest} / ${legs}`,4,row*150+13);row++;
}
fs.writeFileSync(new URL('../docs/visual-production/armor-composition-review.png',import.meta.url),sheet.toBuffer('image/png'));
let partialComparisons=0;
const partialSheet=createCanvas(640,1500),pc=partialSheet.getContext('2d');pc.fillStyle='#263025';pc.fillRect(0,0,640,1500);let partialRow=0;
for(const slot of ['chest','legs'])for(const bodyType of ['male','female'])for(const family of families){
 const id=itemFor(slot,family);if(!id)continue;
 actor.bodyType=bodyType;actor.hairStyle=bodyType==='female'?'ponytail':'short';actor.equipment.chest=null;actor.equipment.legs=null;actor.equipment[slot]=id;
 Object.assign(actor,{shirt:'#75502d',pants:'#484347',boots:'#654326'});
 for(const [dirX,dirY] of [[0,1],[1,0],[0,-1],[-1,0]])for(let frame=0;frame<4;frame++){
  Object.assign(actor,{dirX,dirY,isMoving:frame>0,walkTime:(frame-1)*2+.01});actor.combatState.attacking=false;actor.actionState.blocking=false;
  const a=render(slot==='chest'?{shirt:'#ff00ff'}:{pants:'#00ffff',boots:'#ff0000'});
  const b=render(slot==='chest'?{shirt:'#00ff00'}:{pants:'#ffff00',boots:'#0000ff'});
  assert.ok(a.equals(b),`Partial armour leaked: ${slot}/${bodyType}/${family}/${dirX},${dirY}/${frame}`);partialComparisons++;
  if(dirX===1)pc.drawImage(canvas,frame*160,partialRow*150);
 }
 pc.fillStyle='#e4d3b0';pc.font='12px sans-serif';pc.fillText(`${bodyType}: ${slot} ${family}`,4,partialRow*150+13);partialRow++;
}
fs.writeFileSync(new URL('../docs/visual-production/armor-partial-review.png',import.meta.url),partialSheet.toBuffer('image/png'));
console.log({comparisons,partialComparisons,underclothingIsolation:'passed',mixedSets:setCount,facings:4,poses:6,actorUnchanged:true});

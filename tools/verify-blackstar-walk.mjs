import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {spriteArtStatus}=await import('../src/spriteArt.js');
const c=createCanvas(640,960),ctx=c.getContext('2d');
const actor={hp:100,x:60,y:100,bodyType:'male',dirX:1,dirY:0,isMoving:true,equipment:{legs:'blackstarGreaves'},actionState:{}};
drawHumanActor(ctx,actor,{x:0,y:0});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
ctx.fillStyle='#263025';ctx.fillRect(0,0,640,960);
for(let row=0;row<8;row++)for(let key=0;key<4;key++){
 Object.assign(actor,{bodyType:row<4?'male':'female',hairStyle:row<4?'short':'ponytail',dirX:[1,-1,0,0][row%4],dirY:[0,0,1,-1][row%4],x:80+key*160,y:100+row*120,walkTime:key*2});
 drawHumanActor(ctx,actor,{x:0,y:0},{scale:1.8,animationTime:0});
}
fs.writeFileSync(new URL('../docs/visual-production/blackstar-walk-review.png',import.meta.url),c.toBuffer('image/png'));

const {drawArmorMotionArt}=await import('../src/armorMotionArt.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {ITEMS}=await import('../src/data.js');
const assert=(await import('node:assert/strict')).default;
const test=createCanvas(100,100),t=test.getContext('2d'),profile=getGearVisualProfile('blackstarGreaves',ITEMS.blackstarGreaves);
for(const facing of ['left','right','up','down'])for(const state of ['walk','run']){
 const frames=[];
 for(const sign of [-1,1]){
  t.clearRect(0,0,100,100);
  assert(drawArmorMotionArt(t,profile,'legs',facing,50,45,0,{state,gaitKey:0,gaitPhase:sign<0?0:1,frontLegStride:sign*2.1,backLegStride:-sign*2.1,frontFootLift:0,backFootLift:0}));
  frames.push(Buffer.from(t.getImageData(0,0,100,100).data));
 }
 assert(!frames[0].equals(frames[1]),`${facing}/${state}: leg silhouettes must change with stride even when the atlas frame is held`);
}
console.log('PASS: Blackstar Greaves follow independent leg strides in walking and running, all four directions.');

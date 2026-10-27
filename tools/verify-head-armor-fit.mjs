import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawCustomHead}=await import('../src/headArt.js');
const {humanHeadLayout}=await import('../src/humanHeadLayout.js');const {drawWearableArt}=await import('../src/equipmentArt.js');const {spriteArtStatus}=await import('../src/spriteArt.js');const {ITEMS}=await import('../src/data.js');const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');const {armorMotionFamily}=await import('../src/armorMotionArt.js');
const canvas=createCanvas(120,120),ctx=canvas.getContext('2d');
for(const bodyType of ['male','female'])for(const hairStyle of ['short','ponytail','long','shaved']){
 const h=humanHeadLayout({bodyType,hairStyle,facing:'down'});assert.equal(h.mouth.x,0);assert.equal(h.chin.x,0);assert.equal(h.brow.x,0);
}
drawWearableArt(ctx,getGearVisualProfile('leatherArmor',ITEMS.leatherArmor||{}),'down',60,80);
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
let count=0;
for(const family of ['leather','plate','cloth']){
 const id=Object.keys(ITEMS).find(id=>ITEMS[id].slot==='chest'&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),'chest')===family),profile=getGearVisualProfile(id,ITEMS[id]);
 for(const facing of ['down','right','up','left'])for(const pose of [{state:'idle'},{state:'walk',gaitKey:2},{state:'charge'},{state:'attack',attacking:true,phase:'strike'}]){
  ctx.clearRect(0,0,120,120);assert(drawWearableArt(ctx,profile,facing,60,80,0,pose));const data=ctx.getImageData(0,0,120,57).data;
  for(let i=3;i<data.length;i+=4)assert.equal(data[i],0,`${family}/${facing}/${pose.state}: chest paints head area`);count++;
 }
}
drawCustomHead(ctx,{facing:'up'});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
for(const bodyType of ['male','female'])for(const hairStyle of ['short','ponytail','long','shaved']){
 ctx.clearRect(0,0,120,120);ctx.save();ctx.translate(60,80);drawCustomHead(ctx,{bodyType,hairStyle,facing:'up',skin:'#ffd1bd',hair:'#245ded'});ctx.restore();
 const neck=ctx.getImageData(60,54,1,5).data;
 for(let i=3;i<neck.length;i+=4)assert(neck[i]>0,`${bodyType}/${hairStyle}: north-facing neck has a gap`);
}
console.log(`PASS: all front head styles share the torso centre; ${count} chest/direction/pose renders leave the head area untouched.`);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {asset,spriteArtStatus}=await import('../src/spriteArt.js');
const {drawSideLegArt}=await import('../src/sideLegArt.js');
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {ITEMS}=await import('../src/data.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {armorMotionFamily}=await import('../src/armorMotionArt.js');
for(const name of ['human-male','human-female','armor-motion-plate','armor-motion-leather','armor-motion-cloth'])asset(name);
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
assert(!spriteArtStatus().some(a=>a.failed));
const report={cases:0,composedCases:0,nativePixelsPreserved:true,mirrored:true,heldFrames:true,minimumUniqueFrames:4};
const canvas=createCanvas(96,96),ctx=canvas.getContext('2d');
for(const bodyType of ['male','female'])for(const facing of ['left','right'])for(const state of ['walk','run'])for(const material of ['bare','plate','leather','cloth']){
 const image=asset(material==='bare'?`human-${bodyType}`:`armor-motion-${material}`).image;
 const frames=new Set();
 for(let frame=0;frame<32;frame++){
  const key=Math.floor(frame/8),pose={bodyType,state,gaitKey:key,gaitPhase:frame/8},snapshot=JSON.stringify(pose);
  ctx.clearRect(0,0,96,96);ctx.save();ctx.translate(48,50);
  const matrix=ctx.getTransform();drawSideLegArt(ctx,image,pose,facing,-.7,material!=='bare');
  assert.deepEqual(ctx.getTransform(),matrix);ctx.restore();assert.equal(JSON.stringify(pose),snapshot);
  const pixels=Buffer.from(ctx.getImageData(0,0,96,96).data);
  // Compare against the complete authored cell at 1:1 pixel size. Narrow strips,
  // rotated calves, shrunken boots and interpolated limbs all fail this check.
  const reference=createCanvas(96,96),rc=reference.getContext('2d');rc.imageSmoothingEnabled=false;
  const col=[1,2,3,0][key],armor=material!=='bare',height=armor?64:80,top=armor?34:51;
  rc.drawImage(image,col*64,height+top,64,height-top,16,50+top-(armor?40:56),64,height-top);
  const expected=Buffer.from(rc.getImageData(0,0,96,96).data);
  if(facing==='left')for(let y=0;y<96;y++)for(let x=0;x<48;x++)for(let channel=0;channel<4;channel++){
   const a=(y*96+x)*4+channel,b=(y*96+95-x)*4+channel,temp=expected[a];expected[a]=expected[b];expected[b]=temp;
  }
  assert(pixels.equals(expected),`${bodyType}/${facing}/${state}/${material}/${frame}: native pixel art changed size or shape`);
  frames.add(pixels.toString('base64'));report.cases++;
 }
 assert(frames.size>=2&&frames.size<=4,`${material}: must use authored key frames, never continuous morphing`);
 report.minimumUniqueFrames=Math.min(report.minimumUniqueFrames,frames.size);
}
// Check the actual actor composition too: every subframe within one gait key
// holds its trousers/boots, including chest-only and mixed armor configurations.
for(const bodyType of ['male','female'])for(const dirX of [-1,1])for(const sprinting of [false,true])for(const family of [null,'leather','plate','cloth']){
 const item=(slot)=>family&&Object.keys(ITEMS).find(id=>ITEMS[id].slot===slot&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),slot)===family);
 for(const armoredLegs of [false,true])for(let key=0;key<4;key++){
  let first;
  for(const fraction of [.01,.25,.6,.95]){
   const actor={hp:100,x:48,y:60,bodyType,hairStyle:bodyType==='female'?'ponytail':'short',dirX,dirY:0,isMoving:true,walkTime:(key+fraction)/(sprinting?.72:.5),equipment:{chest:item('chest'),legs:armoredLegs?item('legs'):null},actionState:{sprinting}};
   ctx.clearRect(0,0,96,96);const snapshot=JSON.stringify(actor);drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:0});assert.equal(JSON.stringify(actor),snapshot);
   const legs=Buffer.from(ctx.getImageData(20,60,56,30).data);
   if(first)assert(legs.equals(first),`${bodyType}/${dirX}/${family}/${key}: composed legs morph within a pixel frame`);
   first=legs;report.composedCases++;
  }
 }
}
fs.writeFileSync('docs/visual-production/leg-gait-results.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${report.cases} native-size leg renders and ${report.composedCases} composed actor cases; original pixel coverage, mirrored silhouettes and held atlas frames.`);

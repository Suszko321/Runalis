import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');const {drawCustomHead}=await import('../src/headArt.js');const {spriteArtStatus}=await import('../src/spriteArt.js');
const canvas=createCanvas(1050,1440),ctx=canvas.getContext('2d'),actor={hp:100,x:70,y:140,bodyType:'male',hairStyle:'short',skin:'#a16e50',hair:'#35271f',shirt:'#c99d3d',pants:'#394354',dirX:0,dirY:1,isMoving:false,equipment:{},actionState:{}};
drawHumanActor(ctx,actor,{x:0,y:0});for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
const variants=[{}, {facialHair:'stubble'}, {facialHair:'shortBeard'}, {facialHair:'fullBeard'}, {accessory:'earring'}, {accessory:'mask'}, {accessory:'headband'}];let samples=0;
for(const [direction,[dirX,dirY]] of Object.entries({front:[0,1],right:[1,0],left:[-1,0]})){
 ctx.fillStyle='#27332e';ctx.fillRect(0,0,1050,1440);
 for(const [bodyIndex,bodyType] of ['male','female'].entries())for(const [hairIndex,hairStyle] of ['short','ponytail','long','shaved'].entries())for(const [col,cosmetic] of variants.entries()){
  const row=bodyIndex*4+hairIndex;
  Object.assign(actor,{bodyType,hairStyle,dirX,dirY,x:75+col*150,y:130+row*180,eyeColor:'#74a7d8',facialHair:'none',accessory:'none',...cosmetic});
  const before=JSON.stringify(actor);drawHumanActor(ctx,actor,{x:0,y:0},{scale:2.3,animationTime:0});assert.equal(JSON.stringify(actor),before);samples++;
  ctx.fillStyle='#e1d5b6';ctx.font='12px sans-serif';ctx.fillText(`${bodyType} ${hairStyle}`,actor.x-58,actor.y+34);ctx.fillText(cosmetic.facialHair||cosmetic.accessory||'Base',actor.x-40,actor.y+49);
 }
 fs.writeFileSync(new URL(`../docs/visual-production/face-fit-${direction}.png`,import.meta.url),canvas.toBuffer('image/png'));
}
// Eye color changes ink inside the authored face, never adds opaque pixels.
for(const bodyType of ['male','female'])for(const hairStyle of ['short','ponytail','long','shaved'])for(const facing of ['down','right','left']){
 const c=createCanvas(300,300),x=c.getContext('2d');x.translate(150,210);x.scale(3,3);
 const parts={bodyType,hairStyle,facing,skin:'#a16e50',hair:'#35271f'};
 drawCustomHead(x,{...parts,eyeColor:'#74a7d8'});const a=x.getImageData(0,0,300,300).data;x.clearRect(-50,-70,100,100);drawCustomHead(x,{...parts,eyeColor:'#54c46b'});const b=x.getImageData(0,0,300,300).data;
 for(let i=3;i<a.length;i+=4)assert.equal(a[i],b[i],'Eye tint added a second eye silhouette');
 assert(a.some((v,i)=>i%4!==3&&v!==b[i]),`${bodyType}/${hairStyle}/${facing}: eye color must affect native pixels`);
}
console.log(`PASS: ${samples} face/body/hair/cosmetic renders; eye colors preserve native silhouettes; actors unchanged.`);



for(const bodyType of ['male','female'])for(const hairStyle of ['short','ponytail','long','shaved'])for(const [dirX,dirY] of [[0,1],[1,0],[-1,0],[0,-1]])for(const skin of ['#ffd1bd','#a16e50','#533827'])for(const accessory of ['amulet','mask','headband','earring']){
 const a={...actor,bodyType,hairStyle,dirX,dirY,skin,accessory,marking:'freckles',facialHair:'fullBeard',x:75,y:130};const before=JSON.stringify(a);ctx.clearRect(0,0,150,180);drawHumanActor(ctx,a,{x:0,y:0},{scale:2.3,animationTime:0});assert.equal(JSON.stringify(a),before);
}
const {drawHumanSprite}=await import('../src/spriteArt.js');
for(const state of ['bow','cast','attack']){
 const c=createCanvas(100,100),x=c.getContext('2d'),draw=x.drawImage.bind(x),crops=[];
 x.drawImage=(...args)=>{crops.push(args);return draw(...args);};
 const pose=state==='bow'?{weaponType:'bow',attacking:true,phase:'strike'}:state==='cast'?{weaponType:'staff',state:'cast',castProgress:.5}:{weaponType:'sword',attacking:true,phase:'strike'};
 drawHumanSprite(x,{bodyType:'male',hairStyle:'short',skin:'#a16e50',hair:'#35271f',shirt:'#c99d3d',pants:'#394354',boots:'#654326',facing:'down',bodyOnly:true,animationPose:pose});
 assert(crops.length);for(const crop of crops)assert(crop[2]%80>=33,'Combat sprite must not draw a second head beneath the custom head');
}
console.log('PASS: 384 skin/accessory/direction combinations; bow, cast and melee body crops exclude duplicate heads.');

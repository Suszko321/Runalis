import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawCustomHead}=await import('../src/headArt.js');const {humanHeadLayout}=await import('../src/humanHeadLayout.js');const {spriteArtStatus}=await import('../src/spriteArt.js');
const c=createCanvas(200,200),ctx=c.getContext('2d');drawCustomHead(ctx,{});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
const sheet=createCanvas(800,800),s=sheet.getContext('2d');s.fillStyle='#252c29';s.fillRect(0,0,800,800);let samples=0;
for(const [row,hairStyle] of ['short','ponytail','long','shaved'].entries())for(const [col,facing] of ['down','right','up','left'].entries())for(const bodyType of ['male','female']){
 const parts={hairStyle,facing,bodyType,skin:'#ffd1bd',eyeColor:'#533827'},h=humanHeadLayout(parts);
 const render=hair=>{ctx.clearRect(0,0,200,200);ctx.save();ctx.translate(100,100);drawCustomHead(ctx,{...parts,hair});ctx.restore();return ctx.getImageData(0,0,200,200).data;};
 const blue=render('#245ded'),red=render('#e52c39');
 if(hairStyle==='shaved')assert.deepEqual(blue,red,`Shaved head tinted by hair: ${bodyType}/${facing}`);
 else if(facing!=='up'){
  // Interior of the lower face must stay identical when hair colour changes.
  const center=facing==='down'?24:facing==='right'?33:14;
  for(let y=h.eyeY+2;y<=h.eyeY+5;y++)for(let x=center-2;x<=center+2;x++){
   const px=Math.floor(100+(x-24)*h.scale),py=Math.floor(100+h.originY+y*h.scale),i=(py*200+px)*4;
   assert.deepEqual(blue.slice(i,i+4),red.slice(i,i+4),`Hair colour leaked into lower face: ${hairStyle}/${bodyType}/${facing}`);
  }
 }
 if(bodyType==='male'){s.save();s.translate(col*200+100,row*200+190);s.scale(4,4);drawCustomHead(s,{...parts,hair:'#245ded'});s.restore();}
 samples++;
}
fs.writeFileSync(new URL('../docs/visual-production/face-hair-color-review.png',import.meta.url),sheet.toBuffer('image/png'));
console.log(`PASS: ${samples} head/body/direction combinations; shaved heads ignore hair colour; lower faces preserve skin and ink.`);

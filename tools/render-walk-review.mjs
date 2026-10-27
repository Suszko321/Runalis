import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {spriteArtStatus}=await import('../src/spriteArt.js');
const c=createCanvas(640,480),ctx=c.getContext('2d');
const actor={hp:100,x:60,y:100,bodyType:'male',dirX:1,dirY:0,isMoving:true,equipment:{},actionState:{}};
drawHumanActor(ctx,actor,{x:0,y:0});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
ctx.fillStyle='#263025';ctx.fillRect(0,0,640,480);
for(let row=0;row<4;row++)for(let key=0;key<4;key++){
 Object.assign(actor,{bodyType:row<2?'male':'female',hairStyle:row<2?'short':'ponytail',dirX:row%2?-1:1,x:80+key*160,y:100+row*120,walkTime:key*2});
 drawHumanActor(ctx,actor,{x:0,y:0},{scale:1.8,animationTime:0});
}
fs.writeFileSync(new URL('../docs/visual-production/walk-review.png',import.meta.url),c.toBuffer('image/png'));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {spriteArtStatus}=await import('../src/spriteArt.js');
const {HUMAN_IDENTITY_ITEMS}=await import('../src/humanIdentityArt.js');
const c=createCanvas(160,180),ctx=c.getContext('2d');
const actor={hp:100,x:80,y:140,skin:'#ffd1bd',hair:'#683b21',shirt:'#426944',pants:'#394354',boots:'#674326',equipment:{},actionState:{}};
drawHumanActor(ctx,actor,{x:0,y:0});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
assert(spriteArtStatus().find(a=>a.name==='human-identity').ready);
const sheet=createCanvas(1080,720),s=sheet.getContext('2d');s.fillStyle='#30322e';s.fillRect(0,0,1080,720);
let count=0;
for(const [body,bodyType] of ['male','female'].entries())for(const [direction,[dirX,dirY]] of [[0,1],[1,0],[0,-1],[-1,0]].entries())for(const [index,item] of HUMAN_IDENTITY_ITEMS.slice(0,9).entries()){
 Object.assign(actor,{bodyType,dirX,dirY,hairStyle:body?'ponytail':'short',visualFactionId:null,professionId:null});
 const render=()=>{ctx.clearRect(0,0,160,180);drawHumanActor(ctx,actor,{x:0,y:0},{scale:2,animationTime:0});return Buffer.from(ctx.getImageData(0,0,160,94).data);};
 const face=render();actor[index<3?'visualFactionId':'professionId']=item;const before=JSON.stringify(actor);
 assert(face.equals(render()),`${bodyType}/${direction}/${item} covers head`);assert.equal(JSON.stringify(actor),before);
 s.save();s.translate(index*120+60,(body*4+direction)*90+68);drawHumanActor(s,{...actor,x:0,y:0},{x:0,y:0},{scale:1.2,animationTime:0});s.restore();
 s.fillStyle='#ece0bf';s.font='10px sans-serif';s.fillText(item,index*120+2,(body*4+direction)*90+85);count++;
}
fs.writeFileSync(new URL('../docs/visual-production/human-identity-review.png',import.meta.url),sheet.toBuffer('image/png'));
console.log(`PASS: ${count} faction/profession/body/direction combinations; head pixels unchanged; actor state unchanged.`);

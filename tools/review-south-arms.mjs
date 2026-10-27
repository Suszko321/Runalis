import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {humanSpriteReady,spriteArtStatus}=await import('../src/spriteArt.js');
const {ITEMS}=await import('../src/data.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {armorMotionFamily}=await import('../src/armorMotionArt.js');
for(const body of ['male','female'])humanSpriteReady(body);
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
const families=[null,'leather','plate','cloth'];
const chest=f=>f&&Object.keys(ITEMS).find(id=>ITEMS[id].slot==='chest'&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),'chest')===f);
const poses=[['Idle',false,0],['Walk contact',true,0],['Walk passing',true,1]];
const suffix=process.argv[2]||'current';
for(const weapon of [null,'scythe']){
 const sheet=createCanvas(960,1180),ctx=sheet.getContext('2d');ctx.fillStyle='#172129';ctx.fillRect(0,0,960,1180);ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#e9dec6';ctx.font='16px sans-serif';ctx.fillText(`South-facing arms · ${weapon||'empty hands'}`,20,24);
 for(const [col,f]of families.entries())ctx.fillText(f||'Unequipped reference',col*240+20,48);
 let row=0;
 for(const bodyType of ['male','female'])for(const [label,moving,phase]of poses){
  for(const [column,f]of families.entries()){
   const actor={hp:100,x:115+column*240,y:199+row*180,bodyType,hairStyle:bodyType==='female'?'ponytail':'short',hair:'#bbbbc7',shirt:'#987248',pants:'#294457',skin:'#edc7ab',dirX:0,dirY:1,isMoving:moving,walkTime:phase/.5,equipment:{chest:chest(f),weapon:weapon&&Object.keys(ITEMS).find(id=>ITEMS[id].slot==='weapon'&&ITEMS[id].weaponType===weapon)},actionState:{}};
   drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:0,scale:2.3});
  }
  ctx.fillStyle='#e9dec6';ctx.fillText(`${bodyType} · ${label}`,20,76+row*180);row++;
 }
 fs.writeFileSync(`docs/visual-production/south-arms-${suffix}${weapon?'-scythe':''}.png`,sheet.toBuffer('image/png'));
}
console.log(`Rendered south-facing comparisons: ${suffix}`);

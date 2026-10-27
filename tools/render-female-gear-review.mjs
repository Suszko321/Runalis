import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {createCanvas,Image}=require(process.env.RUNALIS_CANVAS_MODULE);
const sharp=require(process.env.RUNALIS_SHARP_MODULE||'sharp');
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {spriteArtStatus}=await import('../src/spriteArt.js');
const {ITEMS}=await import('../src/data.js');
const directions=[['South',0,1],['East',1,0],['North',0,-1],['West',-1,0]];
const actor={hp:100,bodyType:'female',hairStyle:'ponytail',hair:'#593a28',skin:'#ba8960',shirt:'#657078',pants:'#354b38',boots:'#3b3024',isMoving:true,equipment:{chest:'leatherVest',helm:'sunforgedHalo',trinket:'orrakaiFoundersSignet',weapon:'veyrglassBlade'},actionState:{}};
const width=640,height=360,c=createCanvas(width,height),ctx=c.getContext('2d');
drawHumanActor(ctx,{...actor,x:80,y:125,dirX:1,dirY:0},{x:0,y:0});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
for(const sprinting of [false,true]){
  const frames=[];
  for(let frame=0;frame<32;frame++){
    ctx.fillStyle='#263025';ctx.fillRect(0,0,width,height);ctx.fillStyle='#e4d3b0';ctx.font='14px sans-serif';
    ctx.fillText(`Female leather · halo + signet · ${sprinting?'sprint':'walk'}`,12,20);
    for(const [col,[label,dirX,dirY]] of directions.entries()){
      ctx.fillText(label,col*160+58,44);
      for(const [row,sheathed] of [true,false].entries()){
        Object.assign(actor,{dirX,dirY,x:80+col*160,y:163+row*153,walkTime:frame/32*4/(sprinting?.72:.5)});actor.actionState={sprinting};
        drawHumanActor(ctx,actor,{x:0,y:0},{scale:1.65,animationTime:0,weaponSheathed:sheathed});
      }
    }
    frames.push(Buffer.from(ctx.getImageData(0,0,width,height).data));
    if(frame===4)fs.writeFileSync(new URL(`../docs/visual-production/female-leather-${sprinting?'sprint':'walk'}.png`,import.meta.url),c.toBuffer('image/png'));
  }
  await sharp(Buffer.concat(frames),{raw:{width,height:height*32,channels:4,pageHeight:height}}).gif({loop:0,delay:Math.round(1000*4/(9*(sprinting?.72:.5)*32))}).toFile(fileURLToPath(new URL(`../docs/visual-production/female-leather-${sprinting?'sprint':'walk'}.gif`,import.meta.url)));
}
// Verify the carry silhouette as well as the held pose for every legendary weapon.
const weapons=Object.entries(ITEMS).filter(([,item])=>item.slot==='weapon'&&item.rarity==='legendary');
const sheet=createCanvas(640,weapons.length*160),sc=sheet.getContext('2d');sc.fillStyle='#263025';sc.fillRect(0,0,sheet.width,sheet.height);
for(const [row,[id]] of weapons.entries())for(const [col,[label,dirX,dirY]] of directions.entries()){
  Object.assign(actor,{dirX,dirY,x:80+col*160,y:125+row*160,walkTime:1});actor.actionState={};actor.equipment={chest:'leatherVest',weapon:id};
  drawHumanActor(sc,actor,{x:0,y:0},{scale:1.6,animationTime:0,weaponSheathed:true});
  sc.fillStyle='#e4d3b0';sc.font='10px sans-serif';sc.fillText(`${id} / ${label}`,col*160+3,row*160+12);
}
fs.writeFileSync(new URL('../docs/visual-production/legendary-female-sheathed.png',import.meta.url),sheet.toBuffer('image/png'));
console.log('Rendered combined female leather, halo, signet and sword in all directions, held and sheathed; reviewed every sheathed legendary weapon.');

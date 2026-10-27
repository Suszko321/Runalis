import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {createCanvas,Image}=require(process.env.RUNALIS_CANVAS_MODULE);
const sharp=require(process.env.RUNALIS_SHARP_MODULE||'sharp');
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {humanSpriteReady,spriteArtStatus}=await import('../src/spriteArt.js');
const {ITEMS}=await import('../src/data.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {armorMotionFamily}=await import('../src/armorMotionArt.js');
const families=[null,'leather','plate','cloth'];
const chests=families.map(family=>family&&Object.keys(ITEMS).find(id=>ITEMS[id].slot==='chest'&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),'chest')===family));
const legwear=families.map(family=>family&&Object.keys(ITEMS).find(id=>ITEMS[id].slot==='legs'&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),'legs')===family));
for(const body of ['male','female'])humanSpriteReady(body);
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
const width=640,height=600,count=32;
for(const bodyType of ['male','female'])for(const sprinting of [false,true]){
  const buffers=[],sheet=createCanvas(width*2,height*2),sheetCtx=sheet.getContext('2d');
  for(let frame=0;frame<count;frame++){
    const c=createCanvas(width,height),ctx=c.getContext('2d');
    ctx.fillStyle='#263025';ctx.fillRect(0,0,width,height);ctx.fillStyle='#e4d3b0';ctx.font='15px sans-serif';
    ctx.fillText(`${bodyType} · ${sprinting?'sprint':'walk'} · east / west`,16,24);
    for(let column=0;column<4;column++){
      ctx.fillText(families[column]||'No armor',column*160+20,54);
      for(let row=0;row<2;row++){
        const actor={hp:100,x:80+column*160,y:235+row*265,bodyType,hairStyle:bodyType==='male'?'short':'ponytail',hair:'#c6c9cb',shirt:'#657078',pants:'#344954',skin:'#edc7ab',dirX:row?-1:1,dirY:0,isMoving:true,walkTime:(frame/count*4)/(sprinting?.72:.5),equipment:{chest:chests[column],legs:legwear[column]},actionState:{sprinting}};
        drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:0,scale:3});
      }
    }
    buffers.push(Buffer.from(ctx.getImageData(0,0,width,height).data));
    if(frame%8===0)sheetCtx.drawImage(c,(frame/8%2)*width,Math.floor(frame/16)*height);
  }
  const name=`locomotion-${bodyType}-${sprinting?'sprint':'walk'}${process.argv[2]?'-'+process.argv[2]:''}`;
  const base=new URL('../docs/visual-production/',import.meta.url);
  fs.writeFileSync(new URL(`${name}.png`,base),sheet.toBuffer('image/png'));
  await sharp(Buffer.concat(buffers),{raw:{width,height:height*count,channels:4,pageHeight:height}}).gif({loop:0,delay:Math.round(1000*4/(9*(sprinting?.72:.5)*count))}).toFile(fileURLToPath(new URL(`${name}.gif`,base)));
}
console.log('Rendered full male/female walk and sprint cycles, both directions, bare and available matching chest/leg armor.');

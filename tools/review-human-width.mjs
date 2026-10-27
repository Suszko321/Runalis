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
const chests=families.map(f=>f&&Object.keys(ITEMS).find(id=>ITEMS[id].slot==='chest'&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),'chest')===f));
const poses=[['Idle',false,0],['Walk · 1',true,0],['Walk · 2',true,1],['Walk · 3',true,2],['Walk · 4',true,3],['Run',true,2,true]];
const sheet=createCanvas(1080,2080),sc=sheet.getContext('2d');sc.fillStyle='#172129';sc.fillRect(0,0,sheet.width,sheet.height);sc.font='16px sans-serif';sc.fillStyle='#e9dec6';
sc.fillText('Human profile width · idle → walk → run · shared game renderer',24,28);
const report=[];
let row=0;
for(const bodyType of ['male','female'])for(const facing of ['right','left'])for(let family=0;family<families.length;family++) {
 const entry={bodyType,facing,chest:families[family]||'shirt',widths:[]};
 sc.fillStyle='#e9dec6';sc.fillText(`${bodyType} · ${facing} · ${entry.chest}`,12,105+row*125);
 for(const [column,[title,moving,phase,sprinting]]of poses.entries()) {
  const canvas=createCanvas(100,100),ctx=canvas.getContext('2d');
  const actor={hp:100,x:50,y:65,bodyType,hairStyle:bodyType==='female'?'ponytail':'short',hair:'#9e71c7',shirt:'#987248',pants:'#5a4433',skin:'#edc7ab',dirX:facing==='left'?-1:1,dirY:0,isMoving:moving,walkTime:phase/(sprinting?.72:.5),equipment:{chest:chests[family]},actionState:{sprinting:!!sprinting}};
  drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:0});
  const pixels=ctx.getImageData(0,0,100,100).data;let total=0;
  for(let y=45;y<57;y++){let min=100,max=-1;for(let x=25;x<75;x++)if(pixels[(y*100+x)*4+3]>100){min=Math.min(min,x);max=Math.max(max,x);}if(max>=min)total+=max-min+1;}
  entry.widths.push(Number((total/12).toFixed(2)));
  sc.imageSmoothingEnabled=false;sc.drawImage(canvas,205+column*142,60+row*125,140,140);
  if(!row){sc.fillStyle='#96b6c7';sc.fillText(title,205+column*142,55);}
 }
 report.push(entry);row++;
}
const suffix=process.argv[2]||'current';fs.writeFileSync(`docs/visual-production/human-width-${suffix}.png`,sheet.toBuffer('image/png'));fs.writeFileSync(`docs/visual-production/human-width-${suffix}.json`,JSON.stringify(report,null,2)+'\n');
const preview=createCanvas(1080,565),pc=preview.getContext('2d');pc.drawImage(sheet,0,0,1080,65,0,0,1080,65);
for(const [i,row]of [0,1,12,13].entries())pc.drawImage(sheet,0,65+row*125,1080,125,0,65+i*125,1080,125);
fs.writeFileSync(`docs/visual-production/human-width-${suffix}-preview.png`,preview.toBuffer('image/png'));
const equipped=createCanvas(960,500),ec=equipped.getContext('2d');ec.fillStyle='#172129';ec.fillRect(0,0,960,500);ec.fillStyle='#e9dec6';ec.font='18px sans-serif';ec.fillText('Sideways movement · scythe and leather · actual human renderer',24,30);
const scythe=Object.keys(ITEMS).find(id=>ITEMS[id].slot==='weapon'&&ITEMS[id].weaponType==='scythe');
for(const [column,label]of ['Idle','Walk · contact','Walk · passing','Run'].entries())ec.fillText(label,30+column*240,62);
for(const [row,dirX]of [1,-1].entries())for(const [column,[,moving,phase,sprinting]]of [poses[0],poses[1],poses[2],poses[5]].entries()) {
 const actor={hp:100,x:120+column*240,y:210+row*215,bodyType:'male',hairStyle:'short',hair:'#9e71c7',shirt:'#987248',pants:'#5a4433',skin:'#edc7ab',dirX,dirY:0,isMoving:moving,walkTime:phase/(sprinting?.72:.5),equipment:{chest:chests[1],weapon:scythe},actionState:{sprinting:!!sprinting}};
 drawHumanActor(ec,actor,{x:0,y:0},{animationTime:0,scale:2.5});
}
fs.writeFileSync(`docs/visual-production/human-width-${suffix}-scythe.png`,equipped.toBuffer('image/png'));
console.log(JSON.stringify(report,null,2));

import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {spriteArtStatus}=await import('../src/spriteArt.js');
const {creatorCloakLayout,drawCreatorCloakArt}=await import('../src/creatorAccessoryArt.js');
const {ITEMS}=await import('../src/data.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {armorMotionFamily}=await import('../src/armorMotionArt.js');
const gear=[null,...['leather','plate','cloth'].map(family=>Object.keys(ITEMS).find(id=>ITEMS[id].slot==='chest'&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),'chest')===family))];
assert(gear.slice(1).every(Boolean));
const c=createCanvas(200,220),ctx=c.getContext('2d');
const actor={hp:100,x:100,y:150,bodyType:'male',skin:'#ffd1bd',hair:'#683b21',shirt:'#426944',pants:'#394354',boots:'#674326',dirX:0,dirY:1,equipment:{},actionState:{}};
drawHumanActor(ctx,actor,{x:0,y:0});
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
const directions={down:[0,1],right:[1,0],up:[0,-1],left:[-1,0]};let count=0;
for(const [facing,[dirX,dirY]] of Object.entries(directions)){
 const sheet=createCanvas(960,1120),s=sheet.getContext('2d');s.fillStyle='#27332e';s.fillRect(0,0,960,1120);
 for(const [body,bodyType] of ['male','female'].entries())for(const [style,cloak] of ['shortCape','shoulderMantle','travelCloak'].entries())for(const [column,chest] of gear.entries()){
  Object.assign(actor,{bodyType,dirX,dirY,cloak,equipment:chest?{chest,legs:'blackstarGreaves'}:{},hairStyle:bodyType==='female'?'ponytail':'short',isMoving:false,x:120+column*240,y:130+(body*3+style)*180});
  drawHumanActor(s,actor,{x:0,y:0},{scale:2.4,animationTime:0});s.fillStyle='#e1d5b6';s.font='13px sans-serif';s.fillText(`${bodyType} · ${cloak}`,actor.x-100,actor.y+52);s.fillText(chest||'No equipment',actor.x-100,actor.y+69);
 }
 fs.writeFileSync(new URL(`../docs/visual-production/cloak-fit-${facing}.png`,import.meta.url),sheet.toBuffer('image/png'));
 for(const bodyType of ['male','female'])for(const hairStyle of ['short','ponytail','long','shaved'])for(const chest of gear)for(const cloak of ['shortCape','shoulderMantle','travelCloak'])for(const moving of [false,true]){
  Object.assign(actor,{bodyType,hairStyle,dirX,dirY,x:100,y:150,isMoving:moving,walkTime:2,equipment:chest?{chest,legs:'blackstarGreaves'}:{},cloak:'none'});
  const render=()=>{ctx.clearRect(0,0,200,220);drawHumanActor(ctx,actor,{x:0,y:0},{scale:2,animationTime:0});return Buffer.from(ctx.getImageData(0,0,200,96).data);};
  const face=render();actor.cloak=cloak;const before=JSON.stringify(actor);assert(face.equals(render()),`Cloak covers face: ${bodyType}/${hairStyle}/${facing}/${cloak}/${chest}`);assert.equal(JSON.stringify(actor),before);count++;
 }
}
// All layers share a shoulder anchor and a hem above the soles. Armour increases room.
for(const bodyType of ['male','female'])for(const facing of Object.keys(directions))for(const cloak of ['shortCape','shoulderMantle','travelCloak']){
 const parts={bodyType,facing,bob:1,appearanceCosmetics:{cloak}};
 const base=creatorCloakLayout(parts),armoured=creatorCloakLayout({...parts,equipment:{chest:gear[2]}});
 assert(armoured.width>base.width);assert.equal(armoured.top,base.top);assert(base.top+base.height<=17);
 const calls=[],draw=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{calls.push(args);return draw(...args);};
 drawCreatorCloakArt(ctx,parts,'collar');ctx.drawImage=draw;
 for(const call of calls)assert(call[6]+call[8]<=base.top+base.collarHeight,'Collar must not paint the whole chest');
}
console.log(`PASS: ${count} cloak/body/hair/equipment/motion combinations; faces unchanged, armour allowance and collar bounds checked.`);

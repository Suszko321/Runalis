import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {LEGENDARY_WEAPON_ITEMS:items,LEGENDARY_WEAPON_ART:art,LEGENDARY_FOCUS_STYLES:focus}=await import('../src/legendaryWeaponData.js');
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {asset,spriteArtStatus}=await import('../src/spriteArt.js');
const {drawBossArmoryWeapon,drawFocusProjectile}=await import('../src/bossArmoryArt.js');
const {getHumanAnimationPose}=await import('../src/playerAnimationController.js');
const {WEAPON_MOVESETS}=await import('../src/combatMoves.js');
const {itemIconMarkup}=await import('../src/gearVisualStyle.js');
for(const a of Object.values(art)){asset(a.sheet);asset(a.iconSheet);}for(const name of ['human-male','human-female','human-male-attack','human-female-attack','human-male-cast','human-female-cast','heads-custom','melee-arm-parts'])asset(name);
for(let i=0;i<150&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));assert.deepEqual(spriteArtStatus().filter(a=>a.failed),[]);
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
const cv=createCanvas(240,240),ctx=cv.getContext('2d'),p={x:120,y:160,hp:100,maxHp:100,skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',appearance:{},equipment:{}};
const poseSamples=[{},...[0,1,2,3].map(gait=>({walkTime:(gait+.1)/.5,isMoving:true})),{run:true,walkTime:3,isMoving:true},{block:true},...[.06,.18,.3].map(t=>({attack:t})),...[.08,.22,.4].map(t=>({heavy:t})),{cast:.25}];
let renders=0,grips=0;const imageHashes=new Set();
for(const [id,a]of Object.entries(art)){
 assert.match(itemIconMarkup(items[id]),new RegExp(a.iconSheet));const im=asset(a.sheet).image;ctx.clearRect(0,0,240,240);ctx.drawImage(im,0,0);const pixels=ctx.getImageData(0,0,96,128).data,colors=new Set();let count=0;
 for(let y=0;y<128;y++)for(let x=0;x<96;x++){const i=(y*96+x)*4;assert([0,255].includes(pixels[i+3]),id);if(pixels[i+3]){count++;colors.add(pixels.slice(i,i+3).join(','));assert(x>0&&x<95&&y>0&&y<127,id+' clipped');}}
 assert(count>150&&colors.size<=24,id);imageHashes.add(Buffer.from(pixels).toString('base64'));assert(pixels[(a.gripY*96+a.gripX)*4+3]||pixels[(a.gripY*96+a.gripX-1)*4+3],id+' grip');
 for(const side of [-1,1]){
  const original=ctx.drawImage.bind(ctx),calls=[];ctx.drawImage=(...args)=>{calls.push({args,m:ctx.getTransform()});original(...args);};drawBossArmoryWeapon(ctx,id,120,150,side);ctx.drawImage=original;assert.equal(calls.length,1);const {args,m}=calls[0];assert.equal(args[0],im);assert.equal(m.a*(args[1]+a.gripX*a.scale)+m.e,120);assert.equal(m.d*(args[2]+a.gripY*a.scale)+m.f,150);grips++;
 }
 for(const bodyType of ['male','female'])for(const hairStyle of ['short','long','ponytail','shaved'])for(const [dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]])for(const pose of poseSamples){
  Object.assign(p,{bodyType,hairStyle,dirX,dirY,isMoving:!!pose.isMoving,walkTime:pose.walkTime||0,equipment:{weapon:id}});p.appearance.hairStyle=hairStyle;p.actionState={sprinting:!!pose.run,blocking:!!pose.block};
  p.combatState={attacking:pose.attack!=null||pose.heavy!=null,attackMove:WEAPON_MOVESETS[items[id].weaponType==='mace'?'staff':items[id].weaponType].moves[pose.heavy!=null?2:0],attackElapsed:pose.attack??pose.heavy??0};p.visualAction=pose.cast==null?null:{kind:'cast',startedAt:5-pose.cast,duration:.8};
  if(pose.isMoving&&!pose.run)assert.equal(getHumanAnimationPose(p,{now:5}).gaitKey,Math.floor(pose.walkTime*.5));
  ctx.clearRect(0,0,240,240);const before=JSON.stringify(p),calls=[],original=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{calls.push(args);original(...args);};drawHumanActor(ctx,p,{x:0,y:0},{animationTime:5});ctx.drawImage=original;assert(calls.some(args=>args[0]===im),id+' model unused');assert.equal(JSON.stringify(p),before);const m=ctx.getTransform();assert.equal(m.a,1);assert.equal(m.d,1);assert.equal(m.e,0);assert.equal(m.f,0);renders++;
 }
}
assert.equal(imageHashes.size,20);
const masks=new Set();for(const [id,s]of Object.entries(focus)){
 const im=asset(s.sheet).image;ctx.clearRect(0,0,240,240);ctx.drawImage(im,s.index*32,0,32,32,0,0,32,32);const pixels=ctx.getImageData(0,0,32,32).data;let mask='';for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4;assert([0,255].includes(pixels[i+3]));mask+=pixels[i+3]?'1':'0';if(pixels[i+3])assert(x>0&&x<31&&y>0&&y<31);}masks.add(mask);
 for(const [dirX,dirY]of [[1,0],[0,1],[-1,0],[0,-1]])for(const kind of ['focusBolt','focusLance']){const calls=[],original=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>calls.push(args);assert(drawFocusProjectile(ctx,{focusItemId:id,kind,dirX,dirY},120,120));ctx.drawImage=original;assert.equal(calls[0][0],im);assert.equal(calls[0][1],s.index*32);}
}
assert.equal(masks.size,4);console.log('PASS',JSON.stringify({weapons:20,renders,grips,bodies:2,heads:4,directions:4,poses:poseSamples.length,distinctProjectiles:4,binaryAlpha:true,paletteLimit:24,actorUnchanged:true}));

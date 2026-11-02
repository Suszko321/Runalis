import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js'),{asset,spriteArtStatus}=await import('../src/spriteArt.js'),{ITEMS}=await import('../src/data.js'),{fittedWearable}=await import('../src/playerWearableArt.js'),{drawWearableArt}=await import('../src/equipmentArt.js'),{getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const helms=Object.values(ITEMS).filter(i=>i.slot==='helm'),chests=[null,...Object.values(ITEMS).filter(i=>i.slot==='chest')],charms=Object.values(ITEMS).filter(i=>i.slot==='trinket');
for(const item of [...helms,...chests.filter(Boolean),...charms])asset(fittedWearable(item.id).sheet);
const c=createCanvas(128,128),ctx=c.getContext('2d');drawHumanActor(ctx,{x:64,y:80,equipment:{},appearance:{}},{x:0,y:0});
for(let i=0;i<200&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));assert.deepEqual(spriteArtStatus().filter(a=>a.failed),[]);
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
const actor={x:64,y:80,hp:100,maxHp:100,skin:'#d7c4ad',hair:'#b8b0a0',shirt:'#5a5363',pants:'#2b2630',boots:'#2a211b',appearance:{}};
const render=equipment=>{actor.equipment=equipment;ctx.clearRect(0,0,128,128);drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:5});};
const facings=[['down',0,1],['right',1,0],['up',0,-1],['left',-1,0]];
let torsoPairs=0,charmPairs=0,cowls=0,motionCases=0;
// Batch by torso so a full catalogue sweep does not thrash the bounded 48-atlas
// garment cache. Every pair is still rendered through the production pipeline.
for(const bodyType of ['male','female'])for(const hairStyle of ['short','ponytail','long','shaved'])for(const [facing,dirX,dirY]of facings){
 Object.assign(actor,{bodyType,hairStyle,dirX,dirY,isMoving:false,walkTime:0,actionState:{},combatState:{},visualAction:null});actor.appearance.hairStyle=hairStyle;
 const heads=new Map();for(const helm of helms){render({helm:helm.id});heads.set(helm.id,Buffer.from(ctx.getImageData(43,5,42,47).data));}
 for(const chest of chests)for(const helm of helms){render({helm:helm.id,chest:chest?.id||null});assert.deepEqual(Buffer.from(ctx.getImageData(43,5,42,47).data),heads.get(helm.id),`${helm.id}/${chest?.id}/${bodyType}/${hairStyle}/${facing}: chest changed head pixels`);torsoPairs++;}
 for(const helm of helms){
 Object.assign(actor,{isMoving:false,walkTime:0,actionState:{},combatState:{},visualAction:null});
 render({helm:helm.id,chest:'patchedRoadLeathers'});const face=Buffer.from(ctx.getImageData(59,38,10,11).data);
 for(const charm of charms){render({helm:helm.id,chest:'patchedRoadLeathers',trinket:charm.id});assert.deepEqual(Buffer.from(ctx.getImageData(59,38,10,11).data),face,`${helm.id}/${charm.id}/${bodyType}/${hairStyle}/${facing}: charm overwrote face`);charmPairs++;}
 const fit=fittedWearable(helm.id),profile=getGearVisualProfile(helm.id,helm);
 if(profile.silhouette==='hood'||fit.neckStyle==='cowl'){
  ctx.clearRect(0,0,128,128);assert(drawWearableArt(ctx,profile,facing,64,80,0,{bodyType,hairStyle,fittedPlayerWearables:true}));
  for(const yy of [58,59])assert(ctx.getImageData(49,yy,30,1).data.some((v,i)=>i%4===3&&v>0),`${helm.id}/${bodyType}/${hairStyle}/${facing}: cowl does not reach shoulders`);cowls++;
 }
 // Mixed equipment stays attached through all four gait cells and action poses.
 for(const pose of [{isMoving:true,walkTime:.01},{isMoving:true,walkTime:2.1},{isMoving:true,walkTime:4.1},{isMoving:true,walkTime:6.1},{isMoving:true,walkTime:.6,actionState:{sprinting:true}},{actionState:{blocking:true}},{combatState:{attacking:true,attackElapsed:.2}},{visualAction:{kind:'cast',startedAt:4.7,duration:.8}}]){
  Object.assign(actor,{isMoving:false,walkTime:0,actionState:{},combatState:{},visualAction:null},pose);const n=motionCases++,chest=['patchedRoadLeathers','enemyCovenantChest','starweaverChest','enemyLastDawnRobe'][n%4],charm=charms[n%charms.length];const gear={helm:helm.id,chest,trinket:charm.id};actor.equipment=gear;const before=JSON.stringify(actor);render(gear);assert.equal(JSON.stringify(actor),before);assert(ctx.getImageData(48,51,32,11).data.some((v,i)=>i%4===3&&v>0),'Detached/empty shoulder region');
 }
 }
 console.log(`PASS ${bodyType}/${hairStyle}/${facing} torso, charm and motion pairings`);
}
console.log('PASS',JSON.stringify({helms:helms.length,chests:chests.length-1,charms:charms.length,torsoPairs,charmPairs,cowls,motionCases,bodyTypes:2,headTypes:4,facings:4,actorUnchanged:true}));

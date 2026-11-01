import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {asset,spriteArtStatus}=await import('../src/spriteArt.js');
const {ITEMS}=await import('../src/data.js');
const {WEAPON_MOVESETS}=await import('../src/combatMoves.js');
const {armorReplacement}=await import('../src/armorMotionArt.js');
const {itemIconMarkup,getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {fittedWearable}=await import('../src/playerWearableArt.js');
const {drawWearableArt,drawLegwearArt}=await import('../src/equipmentArt.js');
const {getHumanAnimationPose}=await import('../src/playerAnimationController.js');
const {drawFactionGuard,isFactionGuard}=await import('../src/factionEquipmentArt.js');
const {sampleArmoredArms}=await import('../src/meleeArmArt.js');
// Endgame ensembles have their own loot/equip/pose suite; retain this original catalogue contract.
const items=Object.values(ITEMS).filter(i=>!i.endgameExclusive&&['helm','chest','legs','trinket'].includes(i.slot));
assert.equal(items.length,120,'Catalogue changed: update authored manifest and coverage');
for(const item of items){const fit=fittedWearable(item.id);assert(fit,'Missing authored art: '+item.id);asset(fit.sheet);asset(fit.sheet+'-icons');assert(itemIconMarkup(item).includes(fit.sheet+'-icons.png'));}
for(const n of ['human-male','human-female','human-male-attack','human-female-attack','human-male-cast','human-female-cast','heads-custom','armor-motion-leather','armor-motion-plate','armor-motion-cloth'])asset(n);
for(let i=0;i<150&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
assert.deepEqual(spriteArtStatus().filter(a=>a.failed),[]);
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
const canvas=createCanvas(160,160),ctx=canvas.getContext('2d');
const actor={x:80,y:100,hp:100,maxHp:100,skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',appearance:{}};
const poses=[{},...[.01,2.1,4.1,6.1].map(walkTime=>({isMoving:true,walkTime})),{isMoving:true,walkTime:.6,run:true},{block:true},...[.05,.2,.4].map(attack=>({attack})),...[.1,.35,.65].map(cast=>({cast}))];
assert.deepEqual(poses.filter(p=>p.isMoving&&!p.run).map(p=>getHumanAnimationPose({...actor,...p,dirX:1,dirY:0,equipment:{weapon:'veyrRapier'}},{now:5}).gaitKey),[0,1,2,3],'Review must cover all four held gait frames');
let weapon='veyrRapier',comparisons=0,renders=0;
function render(kit){actor.equipment={weapon,...kit};ctx.clearRect(0,0,160,160);const before=JSON.stringify(actor);drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:5});assert.equal(JSON.stringify(actor),before);renders++;return ctx.getImageData(0,0,160,160).data;}
const counts={};
for(const item of items){
 counts[item.id]=0;
 const body=item.slot!=='trinket';
 for(const bodyType of ['male','female'])for(const hairStyle of body?['short','ponytail','long','shaved']:['short'])for(const[dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]])for(const [pi,pose]of poses.entries()){
  Object.assign(actor,{bodyType,hairStyle,dirX,dirY,isMoving:!!pose.isMoving,walkTime:pose.walkTime||0});actor.appearance.hairStyle=hairStyle;
  weapon=['veyrRapier','cindervowBow','enemyRoadlessStaff','roseboundCodex'][pi%4];actor.actionState={blocking:!!pose.block,sprinting:!!pose.run};actor.combatState={attacking:pose.attack!=null,attackMove:WEAPON_MOVESETS.sword.moves[0],attackElapsed:pose.attack||0};actor.visualAction=pose.cast==null?null:{kind:'cast',startedAt:5-pose.cast,duration:.8};
  const base=render({}),dressed=render({[item.slot]:item.id});
  if(['chest','legs'].includes(item.slot)){
   for(let i=3;i<base.length;i+=4)assert.equal(dressed[i],base[i],`Silhouette drift: ${item.id}/${bodyType}/${hairStyle}/${dirX},${dirY}/${pi}`);comparisons++;
  }
  counts[item.id]++;
 }
 Object.assign(actor,{bodyType:'male',hairStyle:'short',dirX:0,dirY:1,isMoving:false,visualAction:null,actionState:{},combatState:{},shirt:'#887052',pants:'#3d3a3c',boots:'#66421f'});actor.appearance.hairStyle='short';weapon='veyrRapier';
 const kit={[item.slot]:item.id},normal=render(kit),bare=render({});assert(normal.some((v,i)=>v!==bare[i]),'Invisible item '+item.id);
 assert.deepEqual(render({[item.slot]:{id:item.id,instanceId:'review-'+item.id,upgradeTier:20,gearRarity:'mythic'}}),normal,'Per-copy art drift '+item.id);
 if(['chest','legs'].includes(item.slot)){
  assert.equal(armorReplacement({equipment:kit},item.slot),false);
  // Only the equipped slot's underlying colours are hidden.
  if(item.slot==='chest')actor.shirt='#ff00ff';else Object.assign(actor,{pants:'#00ffff',boots:'#00ff00'});
  assert.deepEqual(render(kit),normal,'Undercolour leak '+item.id);Object.assign(actor,{shirt:'#887052',pants:'#3d3a3c',boots:'#66421f'});
 }
 if(body){ctx.clearRect(0,0,160,160);const p=getGearVisualProfile(item.id,item);if(item.slot==='legs')drawLegwearArt(ctx,p,'down',80,100,0,0,{});else drawWearableArt(ctx,p,'down',80,100,0,{});assert(ctx.getImageData(0,0,160,160).data.some((v,i)=>i%4===3&&v>0),'Missing standalone fit '+item.id);}
}
// Mixed layers remain independent, including colours and unrelated faction gear.
const chests=items.filter(i=>i.slot==='chest'),legs=items.filter(i=>i.slot==='legs');
for(const [n,chest]of chests.entries())for(const bodyType of ['male','female'])for(const[dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]]){
 Object.assign(actor,{bodyType,dirX,dirY,isMoving:true,walkTime:.6});actor.combatState={};actor.actionState={};const base=render({}),mixed=render({chest:chest.id,legs:legs[n%legs.length].id});for(let i=3;i<base.length;i+=4)assert.equal(mixed[i],base[i],`Mixed silhouette ${chest.id}`);comparisons++;
}
let shieldAnchors=0;
for(const item of items.filter(i=>fittedWearable(i.id).kind==='shield'))for(const bodyType of ['male','female'])for(const facing of ['down','right','up','left']){
 const a={bodyType,equipment:{trinket:item.id,weapon:'veyrRapier'}},pose={state:'idle',weaponType:'sword',bodyType,gaitPhase:0};assert(isFactionGuard(a));const hand=sampleArmoredArms(a,pose,facing).support.hand;
 ctx.clearRect(0,0,160,160);ctx.save();ctx.translate(80,100);drawFactionGuard(ctx,a,facing,hand);ctx.restore();const d=ctx.getImageData(0,0,160,160).data;let l=160,r=0,t=160,b=0;
 for(let y=0;y<160;y++)for(let x=0;x<160;x++)if(d[(y*160+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 assert(l<=80+hand[0]&&r>=80+hand[0]&&t<=100+hand[1]&&b>=100+hand[1],item.id+' detached from free-hand grip');assert(r-l+1<=24&&b-t+1<=32);shieldAnchors++;
}
fs.writeFileSync('docs/wearable-catalogue/verification.json',JSON.stringify({items:items.length,bodyWearables:85,accessories:35,renders,silhouetteComparisons:comparisons,shieldAnchors,perItemPoseCases:counts},null,2)+'\n');
console.log('PASS',JSON.stringify({items:items.length,renders,silhouetteComparisons:comparisons,shieldAnchors,bodyWearables:85,accessories:35,bodies:2,heads:4,facings:4,poses:13,perCopy:true,undercolorIsolation:true,mixedLayers:true,nonHumanStandalone:true,actorUnchanged:true}));

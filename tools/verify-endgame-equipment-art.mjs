import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {ENDGAME_ITEMS,ENDGAME_ENSEMBLES}=await import('../src/endgameEquipmentData.js');
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {asset,spriteArtStatus}=await import('../src/spriteArt.js');
const {WEAPON_MOVESETS}=await import('../src/combatMoves.js');
const {getHumanAnimationPose}=await import('../src/playerAnimationController.js');
const {armorReplacement}=await import('../src/armorMotionArt.js');
const {itemIconMarkup}=await import('../src/gearVisualStyle.js');
for(const s of Object.values(ENDGAME_ENSEMBLES)){asset(s.sheet);asset(s.sheet+'-icons');}
for(const n of ['human-male','human-female','human-male-attack','human-female-attack','human-male-cast','human-female-cast','heads-custom','melee-arm-parts'])asset(n);
for(let i=0;i<150&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));assert.deepEqual(spriteArtStatus().filter(a=>a.failed),[]);
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
const cv=createCanvas(160,160),ctx=cv.getContext('2d'),a={x:80,y:105,hp:100,maxHp:100,skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',appearance:{}};
const poses=[{},...[.01,2.1,4.1,6.1].map(walkTime=>({isMoving:true,walkTime})),{isMoving:true,walkTime:2.1,run:true},{block:true},...[.05,.2,.4].map(attack=>({attack})),...[.1,.35,.65].map(cast=>({cast}))];
assert.deepEqual(poses.filter(p=>p.isMoving&&!p.run).map(p=>getHumanAnimationPose({...a,...p,dirX:1,equipment:{}},{now:5}).gaitKey),[0,1,2,3]);
let weapon='veyrRapier',comparisons=0,renders=0;
function render(kit){a.equipment={weapon,...kit};ctx.clearRect(0,0,160,160);const before=JSON.stringify(a);drawHumanActor(ctx,a,{x:0,y:0},{animationTime:5});assert.equal(JSON.stringify(a),before);renders++;return ctx.getImageData(0,0,160,160).data;}
for(const item of Object.values(ENDGAME_ITEMS)){
 for(const bodyType of ['male','female'])for(const hairStyle of ['short','ponytail','long','shaved'])for(const[dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]])for(const[pi,p]of poses.entries()){
  Object.assign(a,{bodyType,hairStyle,dirX,dirY,isMoving:!!p.isMoving,walkTime:p.walkTime||0});a.appearance.hairStyle=hairStyle;weapon=['veyrRapier','cindervowBow','enemyRoadlessStaff','roseboundCodex'][pi%4];a.actionState={blocking:!!p.block,sprinting:!!p.run};a.combatState={attacking:p.attack!=null,attackMove:WEAPON_MOVESETS.sword.moves[0],attackElapsed:p.attack||0};a.visualAction=p.cast==null?null:{kind:'cast',startedAt:5-p.cast,duration:.8};
  const base=render({}),dressed=render({[item.slot]:item.id});
  if(item.slot==='chest'||item.slot==='legs'){for(let i=3;i<base.length;i+=4)assert.equal(dressed[i],base[i],`Body silhouette changed ${item.id}/${bodyType}/${hairStyle}/${dirX},${dirY}/${pi}`);comparisons++;}
 }
 Object.assign(a,{bodyType:'male',hairStyle:'short',dirX:0,dirY:1,isMoving:false,visualAction:null,actionState:{},combatState:{},shirt:'#887052',pants:'#3d3a3c',boots:'#66421f'});a.appearance.hairStyle='short';weapon='veyrRapier';
 const kit={[item.slot]:item.id},normal=render(kit),bare=render({});assert(normal.some((v,i)=>v!==bare[i]),'Invisible '+item.id);assert.deepEqual(render({[item.slot]:{id:item.id,gearRarity:item.rarity,instanceId:'art-'+item.id}}),normal);
 if(item.slot==='chest'||item.slot==='legs'){
  assert.equal(armorReplacement({equipment:kit},item.slot),false);if(item.slot==='chest')a.shirt='#ff00ff';else Object.assign(a,{pants:'#00ffff',boots:'#00ff00'});assert.deepEqual(render(kit),normal,'Undercolour leak '+item.id);
 }
 assert.match(itemIconMarkup(item),/endgame-.*-icons/);
}
// Full ensembles and mixed helmets/cloaks exercise the shared depth/anchor path.
for(const[sindex,s]of Object.values(ENDGAME_ENSEMBLES).entries())for(const bodyType of ['male','female'])for(const[dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]]){
 Object.assign(a,{bodyType,dirX,dirY,isMoving:true,walkTime:4.1});a.combatState={};a.actionState={};a.visualAction=null;const kit=Object.fromEntries(s.pieces.map(id=>[ENDGAME_ITEMS[id].slot,id]));render(kit);render({...kit,helm:Object.values(ENDGAME_ENSEMBLES)[(sindex+1)%12].pieces[0]});
}
console.log('PASS',JSON.stringify({items:48,renders,silhouetteComparisons:comparisons,bodies:2,heads:4,facings:4,poses:13,gaitFrames:4,weapons:4,perCopy:true,undercolourIsolation:true,actorUnchanged:true,mixedEnsembles:true}));

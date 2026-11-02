import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {ITEMS}=await import('../src/data.js');
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {asset,spriteArtStatus}=await import('../src/spriteArt.js');
const {BOSS_ARMORY_ART}=await import('../src/bossArmoryArtData.js');
const {drawEquippedArt}=await import('../src/equipmentArt.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {getHumanAnimationPose}=await import('../src/playerAnimationController.js');
const {WEAPON_MOVESETS}=await import('../src/combatMoves.js');
const {getHumanVisualProfile,applyHumanVisualProfile}=await import('../src/humanVisualProfiles.js');
const {focusAtHip,focusHipTransform,focusHipBehindBody}=await import('../src/handedness.js');
const {sampleWeaponStance,WEAPON_READY_SECONDS}=await import('../src/weaponStance.js');
const items=Object.values(ITEMS).filter(i=>i.weaponType==='spiritFocus');assert.equal(items.length,19);
for(const name of ['human-male','human-female','human-male-attack','human-female-attack','human-male-cast','human-female-cast','heads-custom','melee-arm-parts','arcane-special'])asset(name);
for(const item of items)if(BOSS_ARMORY_ART[item.id])asset(BOSS_ARMORY_ART[item.id].sheet);
for(let i=0;i<150&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));assert.deepEqual(spriteArtStatus().filter(a=>a.failed),[]);
Object.defineProperty(globalThis,'performance',{value:{now:()=>5000},configurable:true});
fs.mkdirSync('docs/focus-hip',{recursive:true});
const canvas=createCanvas(220,220),ctx=canvas.getContext('2d'),p={x:110,y:150,hp:100,maxHp:100,skin:'#dcb48b',hair:'#242128',shirt:'#887052',pants:'#3d3a3c',boots:'#66421f',appearance:{},actionState:{}};
let samples=0,activeCases=0;const overview=createCanvas(1440,70+items.length*200),c=overview.getContext('2d');c.fillStyle='#25292e';c.fillRect(0,0,overview.width,overview.height);c.fillStyle='#e6d3a6';c.font='16px sans-serif';c.fillText('19 focuses / grimoires · anatomical right hip · idle front / east / back / west · male & female',16,28);
function render(item,options={}){
 const art=BOSS_ARMORY_ART[item.id],image=asset(art?.sheet||'arcane-special').image,calls=[],all=[],draw=ctx.drawImage.bind(ctx);ctx.clearRect(0,0,220,220);ctx.drawImage=(...args)=>{const record={args,m:ctx.getTransform(),order:all.length};all.push(record);if(args[0]===image)calls.push(record);draw(...args);};
 const before=JSON.stringify(p);if(options.omitFocus)ctx.drawImage=(...args)=>{const record={args,m:ctx.getTransform(),order:all.length};all.push(record);if(args[0]===image)calls.push(record);else draw(...args);};drawHumanActor(ctx,p,{x:0,y:0},{animationTime:5,...options});ctx.drawImage=draw;assert.equal(JSON.stringify(p),before);assert.equal(calls.length,1,'Exactly one focus '+item.id);return{call:calls[0],all,pixels:ctx.getImageData(0,0,220,220).data};
}
for(const [ii,item]of items.entries()){
 const art=BOSS_ARMORY_ART[item.id],profile=getGearVisualProfile(item.id,item),image=asset(art?.sheet||'arcane-special').image;
 // Both old shared focuses and individual books shrink by exactly25% at the pivot.
 let transform;const draw=ctx.drawImage.bind(ctx);ctx.drawImage=(...args)=>{if(args[0]===image)transform=ctx.getTransform();};drawEquippedArt(ctx,item.id,profile,23,41);ctx.drawImage=draw;assert.equal(transform.a,.75);assert.equal(transform.d,.75);assert.equal(transform.e,23);assert.equal(transform.f,41);
 for(const [bi,bodyType]of ['male','female'].entries())for(const hairStyle of ['short','ponytail','long','shaved'])for(const [di,[facing,dirX,dirY]]of [['down',0,1],['right',1,0],['up',0,-1],['left',-1,0]].entries())for(const state of ['idle','walk','run'])for(let key=0;key<(state==='idle'?1:4);key++){
  Object.assign(p,{bodyType,hairStyle,dirX,dirY,isMoving:state!=='idle',walkTime:state==='run'?(key+.1)/.72:(key+.1)/.5,equipment:{weapon:item.id},combatState:{},visualAction:null,actionState:{sprinting:state==='run'}});p.appearance.hairStyle=hairStyle;
  const pose=getHumanAnimationPose(p,{now:5});assert(focusAtHip(pose));
  if(state!=='idle'&&['left','right'].includes(facing))Object.assign(pose,{bob:pose.gaitKey%2?-1:0,rootOffsetX:0,rootOffsetY:0,rootRotation:0,rootScaleX:1,rootScaleY:1});
  const result=render(item),expected=focusHipTransform(bodyType,facing,pose.bob),ec=createCanvas(1,1).getContext('2d');ec.translate(110,150);ec.translate(pose.rootOffsetX||0,pose.rootOffsetY||0);ec.rotate(pose.rootRotation||0);ec.scale(pose.rootScaleX||1,pose.rootScaleY||1);applyHumanVisualProfile(ec,getHumanVisualProfile(p,{bodyType,classId:null},facing));const m=ec.getTransform();
  assert(Math.abs(result.call.m.e-(m.a*expected.x+m.c*expected.y+m.e))<.001,item.id+' x');assert(Math.abs(result.call.m.f-(m.b*expected.x+m.d*expected.y+m.f))<.001,item.id+' y');
  const bodies=result.all.filter(r=>r.args[0].width===256&&r.args[0].height===320&&r.args.length===9&&r.args[3]>10&&r.args[4]>10);assert(bodies.length,'No body draw');
  if(focusHipBehindBody(facing))assert(result.call.order<bodies[0].order,'Rear focus must precede body');else assert(result.call.order>bodies.at(-1).order,'Near hip focus must follow body');
  // A redundant sheathed hint cannot add a second back-mounted focus.
  assert.deepEqual(render(item,{weaponSheathed:true}).pixels,result.pixels);
  if(state==='idle'&&hairStyle===(bodyType==='male'?'short':'ponytail')){render(item,{scale:1.8});c.drawImage(canvas,0,0,220,220,235+(bi*4+di)*148-95,45+ii*200,200,200);}
  samples++;
 }
 c.fillStyle='#e6d3a6';c.font='13px sans-serif';c.fillText(item.name,12,100+ii*200);
 for(const bodyType of ['male','female'])for(const [dirX,dirY]of [[0,1],[1,0],[0,-1],[-1,0]])for(const state of ['attack','cast','charge','block']){
  Object.assign(p,{bodyType,hairStyle:bodyType==='male'?'short':'ponytail',dirX,dirY,isMoving:false,equipment:{weapon:item.id},actionState:{blocking:state==='block'},combatState:state==='attack'?{attacking:true,attackMove:WEAPON_MOVESETS.spiritFocus.moves[0],attackElapsed:.15}:state==='charge'?{heavyChargeActive:true,heavyChargeTime:.4,heavyChargeThreshold:.5}: {},visualAction:state==='cast'?{kind:'cast',startedAt:4.8,duration:.8}:null});p.appearance.hairStyle=p.hairStyle;
  const pose=getHumanAnimationPose(p,{now:5});assert(!focusAtHip(pose));const result=render(item),hip=focusHipTransform(bodyType,dirX>0?'right':dirX<0?'left':dirY<0?'up':'down',pose.bob);assert(Math.abs(result.call.m.e-110-hip.x)>.1||Math.abs(result.call.m.f-150-hip.y)>.1,'Active focus left at hip');activeCases++;
 }
 for(const bodyType of ['male','female']){
  const visible=[];for(const dirX of [1,-1]){Object.assign(p,{bodyType,dirX,dirY:0,isMoving:false,combatState:{},visualAction:null,actionState:{},equipment:{weapon:item.id}});const shown=render(item).pixels,hidden=render(item,{omitFocus:true}).pixels;let count=0;for(let i=0;i<shown.length;i+=4)if(shown[i]!==hidden[i]||shown[i+1]!==hidden[i+1]||shown[i+2]!==hidden[i+2]||shown[i+3]!==hidden[i+3])count++;visible.push(count);}assert(visible[0]>visible[1],item.id+' far hip should be mostly occluded');
 }
 for(const [bi,bodyType]of ['male','female'].entries())for(const [di,[dirX,dirY]]of [[0,1],[1,0],[0,-1],[-1,0]].entries()){
  Object.assign(p,{bodyType,dirX,dirY,isMoving:true,walkTime:2.1,combatState:{attackId:0},visualAction:null,actionState:{},equipment:{weapon:item.id}});
  const time=1000+ii*1000+bi*100+di*20,w={enemies:[]},stance=t=>sampleWeaponStance(p,w,t).sheathed;
  assert(stance(time));const resting=render(item,{weaponSheathed:true}).pixels;
  p.combatState.attacking=true;p.combatState.attackId++;assert(!stance(time+1));p.combatState.attacking=false;
  const ready=render(item,{weaponSheathed:stance(time+1.01)}).pixels;assert.notDeepEqual(ready,resting,'Ready weapon must be in hand after attack ends');
  assert(!stance(time+1+WEAPON_READY_SECONDS-.001));assert.deepEqual(render(item,{weaponSheathed:stance(time+1+WEAPON_READY_SECONDS+.001)}).pixels,resting,'Expired readiness must return to same hip');
  w.enemies=[{hp:10,combatTargetKind:'player',combatTargetId:p.id||p.name||'focus'}];p.id=w.enemies[0].combatTargetId;
  assert(!stance(time+10));assert.deepEqual(render(item,{weaponSheathed:stance(time+10.1)}).pixels,ready,'Threat must retain hand pose');w.enemies[0].dead=true;
  assert(!stance(time+16.099));assert(stance(time+16.101));
 }
 for(const set of ['starweaver','sunwardRegent','moonstagWarden','runeboundMarshal'])for(const bodyType of ['male','female'])for(const [dirX,dirY]of [[1,0],[-1,0]])for(let key=0;key<4;key++){
  Object.assign(p,{bodyType,dirX,dirY,isMoving:true,walkTime:(key+.1)/.5,combatState:{},visualAction:null,actionState:{},equipment:{weapon:item.id,helm:set+'Helm',chest:set+'Chest',legs:set+'Legs',trinket:set+'Mantle'}});render(item);
 }
}
fs.writeFileSync('docs/focus-hip/idle-review.png',overview.toBuffer('image/png'));
for(let start=0;start<items.length;start+=4){const page=createCanvas(1440,870),pc=page.getContext('2d');pc.fillStyle='#25292e';pc.fillRect(0,0,1440,870);pc.fillStyle='#e6d3a6';pc.font='16px sans-serif';pc.fillText('Hip size / depth review · front / east / back / west · male and female',16,30);pc.drawImage(overview,0,45+start*200,1440,Math.min(4,items.length-start)*200,0,60,1440,Math.min(4,items.length-start)*200);fs.writeFileSync('docs/focus-hip/idle-page-'+(start/4+1)+'.png',page.toBuffer('image/png'));}
console.log('PASS',JSON.stringify({focuses:items.length,hipSamples:samples,activeCases,worldScale:.75,bothBodies:true,heads:4,oneModelPerFrame:true,depthOrder:true,sheathedHintIsolation:true,actorUnchanged:true}));

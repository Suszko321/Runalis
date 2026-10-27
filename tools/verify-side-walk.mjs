import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {drawHumanSprite,applyHumanTorsoMotion,humanSpriteReady,spriteArtStatus,restingWeaponGrip}=await import('../src/spriteArt.js');
const {usesSideLocomotion,sideLocomotionTilt,sampleSideLocomotionArms}=await import('../src/humanLocomotionRig.js');
const {drawArmorMotionArt}=await import('../src/armorMotionArt.js');
for(const body of ['male','female'])humanSpriteReady(body);
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));

// Isolate torso motion from root bob and atlas changes: the same leg frame
// must stay pixel-identical while the upper-body silhouette changes.
for(const bodyType of ['male','female'])for(const facing of ['left','right']){
  const frames=[];
  for(const sideLocomotionTilt of [-.045,.045]){
    const ctx=createCanvas(128,128).getContext('2d');
    ctx.translate(64,80);
    const pose={state:'walk',gaitKey:0,sideLocomotionArms:true,sideLocomotionTilt};
    applyHumanTorsoMotion(ctx,pose,0);
    const matrix=ctx.getTransform();
    assert(Math.abs(matrix.c*(-5)+matrix.e-64)<1e-5,'Waist pivot must stay fixed');
    assert(Math.abs(matrix.d*(-5)+matrix.f-75)<1e-5,'Waist height must stay fixed');
    assert(Math.abs(matrix.a*matrix.d-matrix.b*matrix.c-1)<1e-5,'Chest must not stretch or inflate');
    assert(drawHumanSprite(ctx,{bodyType,facing,bob:0,animationPose:pose}));
    frames.push({upper:Buffer.from(ctx.getImageData(32,56,64,18).data),legs:Buffer.from(ctx.getImageData(32,82,64,23).data)});
  }
  assert(!frames[0].upper.equals(frames[1].upper),`${bodyType}/${facing}: torso must move`);
  assert(frames[0].legs.equals(frames[1].legs),`${bodyType}/${facing}: preserve leg gait`);
}

// The composed actor should apply this motion only to east/west locomotion.
for(const [dirX,dirY] of [[1,0],[-1,0],[0,1],[0,-1]])for(const state of ['idle','walk','run']){
  const ctx=createCanvas(128,128).getContext('2d'),rotations=[];
  const rotate=ctx.rotate.bind(ctx);
  ctx.rotate=angle=>{rotations.push(angle);rotate(angle);};
  const actor={hp:100,x:64,y:80,bodyType:'male',dirX,dirY,isMoving:state!=='idle',walkTime:0,equipment:{},actionState:{sprinting:state==='run'}};
  drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:0});
  const facing=dirX<0?'left':dirX>0?'right':dirY<0?'up':'down';
  const tilt=sideLocomotionTilt({state,gaitPhase:0},facing);
  assert.equal(usesSideLocomotion({state},facing),state!=='idle'&&dirX!==0);
  if(tilt)assert(rotations.includes(tilt),`${state}/${facing}: missing torso motion`);
}

for(const state of ['walk','run'])for(const facing of ['left','right'])for(const weaponType of ['unarmed','sword','staff','bow']){
  let previous;
  for(let i=0;i<=120;i++){
    const pose={state,weaponType,gaitPhase:i/30,gaitKey:Math.floor(i/30)%4,sideLocomotionArms:true};
    const rig=sampleSideLocomotionArms(pose,facing);
    for(const arm of [rig.primary,rig.support]){
      assert(arm.hand[1]>arm.elbow[1]&&arm.elbow[1]>arm.shoulder[1],'Arms must stay below shoulders');
      assert(Math.abs(arm.hand[0]-arm.shoulder[0])<=5,'No flared or reaching arms');
    }
    if(previous&&i%30!==0)assert.deepEqual(rig,previous,'Pixel-art arm pose must hold until the next gait frame');
    if(weaponType!=='unarmed')assert.deepEqual(restingWeaponGrip({},pose,facing).hand,rig.primary.hand,'Weapon must follow the hand');
    assert(Math.abs(sideLocomotionTilt(pose,facing))<=.081,'Limit torso lean');
    previous=rig;
  }
  assert.deepEqual(previous,sampleSideLocomotionArms({state,weaponType,gaitPhase:0},facing),'Cycle must loop cleanly');
}

// Isolate chest art from body motion: its silhouette must not inflate as the
// gait advances, including sprinting and all three armor families.
for(const silhouette of ['plate','robe','leather'])for(const facing of ['left','right','up','down'])for(const state of ['walk','run']){
  let first;
  for(let gaitKey=0;gaitKey<4;gaitKey++){
    const ctx=createCanvas(128,128).getContext('2d');
    assert(drawArmorMotionArt(ctx,{silhouette},'chest',facing,64,80,0,{state,gaitKey}));
    const pixels=Buffer.from(ctx.getImageData(0,0,128,128).data);
    if(first)assert(first.equals(pixels),`${silhouette}/${facing}/${state}: chest changes shape`);
    first=pixels;
  }
}
for(const facing of ['left','right','up','down'])for(const state of ['idle','attack','cast','guard'])assert.equal(sideLocomotionTilt({state},facing),0);

// Actual composed pixels must retain resting upper-body volume throughout the
// entire cycle. Pose math alone missed the sleeves being hidden in the chest.
const {ITEMS}=await import('../src/data.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {armorMotionFamily}=await import('../src/armorMotionArt.js');
const families=[null,'leather','plate','cloth'];
const chests=families.map(f=>f&&Object.keys(ITEMS).find(id=>ITEMS[id].slot==='chest'&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),'chest')===f));
const canvas=createCanvas(100,100),ctx=canvas.getContext('2d');
function upperWidth(actor){
  ctx.clearRect(0,0,100,100);const snapshot=JSON.stringify(actor);
  drawHumanActor(ctx,actor,{x:0,y:0},{animationTime:0});
  assert.equal(JSON.stringify(actor),snapshot,'Rendering must not change gameplay state');
  const pixels=ctx.getImageData(0,0,100,100).data;let total=0;
  for(let y=45;y<57;y++){let min=100,max=-1;for(let x=25;x<75;x++)if(pixels[(y*100+x)*4+3]>100){min=Math.min(min,x);max=Math.max(max,x);}if(max>=min)total+=max-min+1;}
  return total/12;
}
let widthCases=0;
for(const classId of ['classless','oathkeeper','fellhunter','gravecaller','thornbinder','waverider','lightbringer','eldritch'])for(const bodyType of ['male','female'])for(const dirX of [-1,1])for(const chest of chests){
 const actor={hp:100,x:50,y:65,classId,bodyType,hairStyle:bodyType==='female'?'ponytail':'short',dirX,dirY:0,isMoving:false,equipment:{chest},actionState:{}};
 const resting=upperWidth(actor);
 for(const sprinting of [false,true])for(let i=0;i<=32;i++){
  actor.isMoving=true;actor.actionState.sprinting=sprinting;actor.walkTime=(i/8)/(sprinting?.72:.5);
  const ratio=upperWidth(actor)/resting;
  assert(ratio>=.84&&ratio<=1.25,`${classId}/${bodyType}/${dirX}/${chest||'shirt'}/${sprinting?'run':'walk'}/${i}: upper body width changed to ${(ratio*100).toFixed(1)}% of idle`);
  widthCases++;
 }
}
console.log(`PASS: held pixel-art arms, attached grips, stable armor; ${widthCases} rendered width samples retain idle body volume across all identities. Authored leg frames are checked by verify-leg-gait.mjs.`);

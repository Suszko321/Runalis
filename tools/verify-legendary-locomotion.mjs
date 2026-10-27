import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {createCanvas,Image}=require(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {drawHumanActor}=await import('../src/humanRenderer.js');
const {spriteArtStatus,humanSpriteReady}=await import('../src/spriteArt.js');
const {drawWearableArt,drawTrinketArt}=await import('../src/equipmentArt.js');
const {drawHandTrinketArt}=await import('../src/handTrinketArt.js');
const {ITEMS}=await import('../src/data.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {sampleSideLocomotionArms}=await import('../src/humanLocomotionRig.js');
const {sampleLocomotionArms}=await import('../src/humanLocomotionRig.js');
const {getHumanAnimationPose}=await import('../src/playerAnimationController.js');
const {restingWeaponGrip}=await import('../src/spriteArt.js');
const items=Object.entries(ITEMS).filter(([,item])=>item.rarity==='legendary'&&item.slot);
const directions=[['south',0,1],['east',1,0],['north',0,-1],['west',-1,0]];
const ctx=createCanvas(160,160).getContext('2d');
const actor={hp:100,x:80,y:120,isMoving:true,bodyType:'female',hairStyle:'ponytail',skin:'#ba8960',hair:'#593a28',shirt:'#647075',pants:'#354b38',boots:'#3b3024',equipment:{},actionState:{}};
for(const body of ['male','female'])humanSpriteReady(body);
for(const [id,item] of items){actor.equipment={[item.slot]:id};drawHumanActor(ctx,actor,{x:0,y:0});}
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
assert(!spriteArtStatus().some(a=>a.failed),'Gear assets must load');

let samples=0;
for(const bodyType of ['female','male'])for(const slot of ['chest','helm','legs','trinket','weapon']){
  const selected=items.filter(([,item])=>item.slot===slot);
  if(slot==='chest')selected.unshift(['leatherVest',ITEMS.leatherVest]);
  const sheet=createCanvas(640,selected.length*320),sc=sheet.getContext('2d');
  sc.fillStyle='#263025';sc.fillRect(0,0,sheet.width,sheet.height);
  Object.assign(actor,{bodyType,hairStyle:bodyType==='female'?'ponytail':'short'});
  for(const [index,[id,item]] of selected.entries())for(const sprinting of [false,true]){
    actor.equipment={chest:'leatherVest',[slot]:id};actor.actionState={sprinting};
    for(const [column,[label,dirX,dirY]] of directions.entries())for(let phase=0;phase<4;phase++){
      Object.assign(actor,{dirX,dirY,walkTime:(phase+.4)/(sprinting?.72:.5)});
      ctx.clearRect(0,0,160,160);const before=JSON.stringify(actor);
      drawHumanActor(ctx,actor,{x:0,y:0},{scale:1.7,animationTime:0});
      assert.equal(JSON.stringify(actor),before,'Rendering changed actor state');
      const m=ctx.getTransform();assert.equal(m.a,1);assert.equal(m.d,1);assert.equal(m.e,0);assert.equal(m.f,0);
      if(phase===0){
        const y=index*320+Number(sprinting)*160;
        sc.drawImage(ctx.canvas,column*160,y);sc.fillStyle='#e4d3b0';sc.font='10px sans-serif';
        sc.fillText(`${id} ${sprinting?'run':'walk'}`,column*160+3,y+12);sc.fillText(label,column*160+3,y+25);
      }
      samples++;
    }
  }
  fs.writeFileSync(new URL(`../docs/visual-production/legendary-${bodyType}-${slot}.png`,import.meta.url),sheet.toBuffer('image/png'));
}

function bounds(ctx){
  const {width,height}=ctx.canvas,data=ctx.getImageData(0,0,width,height).data;
  let left=width,right=-1,top=height,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  return {left,right,top,bottom,width:right-left+1,height:bottom-top+1};
}
for(const bodyType of ['female','male'])for(const facing of ['left','right','up','down']){
  for(const id of ['sunforgedHalo','blackbriarCrown']){
    ctx.clearRect(0,0,160,160);
    drawWearableArt(ctx,getGearVisualProfile(id,ITEMS[id]),facing,80,100,0,{bodyType});
    const b=bounds(ctx);assert(b.width>0&&b.width<=22,`${id}/${facing}: oversized headwear`);
  }
  for(const [id,item] of items.filter(([,item])=>item.slot==='chest')){
    ctx.clearRect(0,0,160,160);
    drawWearableArt(ctx,getGearVisualProfile(id,item),facing,80,100,0,{bodyType,state:'walk'});
    // Side torsos were deliberately fitted to 18px when the skinny-body bug
    // was fixed. This bound checks that fit without restoring the narrow crop.
    const b=bounds(ctx),limit=['left','right'].includes(facing)?18:16;
    assert(b.width<=limit,'Chest must stay within its fitted torso and not duplicate sleeves');
  }
}
for(const facing of ['left','right','up','down'])for(let gaitPhase=0;gaitPhase<4;gaitPhase+=.25){
  const pose={state:'walk',weaponType:'sword',gaitPhase,gaitKey:Math.floor(gaitPhase),sideLocomotionArms:['left','right'].includes(facing)};
  ctx.clearRect(0,0,160,160);ctx.save();ctx.translate(80,100);
  drawHandTrinketArt(ctx,{bodyType:'female',equipment:{trinket:'orrakaiFoundersSignet'}},pose,facing);
  ctx.restore();const b=bounds(ctx);
  if(facing==='left')assert(b.width<0,'Far ring must be occluded');
  else {
    assert(b.width<=4&&b.height<=3,'Signet must remain ring-sized');
    if(facing==='right'){
      const hand=sampleSideLocomotionArms(pose,facing).support.hand;
      assert(Math.abs((b.left+b.right)/2-80-hand[0])<2&&Math.abs((b.top+b.bottom)/2-100-hand[1])<2,'Ring detached from hand');
    }
  }
}
for(const [id] of items.filter(([,item])=>item.slot==='trinket'))for(const facing of ['down','left','right']){
  ctx.clearRect(0,0,160,160);drawTrinketArt(ctx,id,facing,80,100);
  const b=bounds(ctx);assert(b.width<=10&&b.height<=13,`${id}: oversized pendant`);
}
for(const bodyType of ['male','female'])for(const facing of ['up','down']){
  const heights=[];
  for(let gaitPhase=0;gaitPhase<4;gaitPhase+=.125){
    const pose={state:'walk',bodyType,weaponType:'sword',gaitPhase,gaitKey:Math.floor(gaitPhase),locomotionArms:true};
    const rig=sampleLocomotionArms(pose,facing);
    for(const arm of [rig.primary,rig.support])assert(Math.abs(arm.hand[0]-arm.shoulder[0])<=(facing==='down'?4:2),'Front/back arms must match the relaxed base-body pose');
    assert.deepEqual(restingWeaponGrip({bodyType},pose,facing).hand,rig.primary.hand);
    heights.push(rig.primary.hand[1]-rig.support.hand[1]);
  }
  if(facing==='up')assert(Math.min(...heights)<0&&Math.max(...heights)>0,'North-facing arms must counter-swing');
  else assert(heights.every(h=>h===0),'South-facing wrists must match the authored relaxed base body');
}
for(const [,dirX,dirY] of directions){
  const bobs=Array.from({length:32},(_,i)=>Math.round(getHumanAnimationPose({hp:100,isMoving:true,dirX,dirY,walkTime:i/4,equipment:{},actionState:{}},{now:0}).bob));
  assert(Math.min(...bobs)===-1&&Math.max(...bobs)===0,'Walking must have a visible, restrained rise in every facing');
}
console.log(`PASS: ${items.length} legendary items, ${samples} male/female walk/run renders in all directions; fitted chests, compact headwear and pendants, attached ring-sized signet.`);

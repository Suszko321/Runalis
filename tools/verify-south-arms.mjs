import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,Image}=createRequire(import.meta.url)(process.env.RUNALIS_CANVAS_MODULE);
globalThis.document={createElement:()=>createCanvas(1,1)};
globalThis.Image=class extends Image{set src(v){super.src=fs.readFileSync(fileURLToPath(v));}};
const {sampleArmoredArms,drawMeleeArms}=await import('../src/meleeArmArt.js');
const {restingWeaponGrip,spriteArtStatus}=await import('../src/spriteArt.js');
const {ITEMS}=await import('../src/data.js');
const {getGearVisualProfile}=await import('../src/gearVisualStyle.js');
const {armorMotionFamily}=await import('../src/armorMotionArt.js');
for(let i=0;i<100&&spriteArtStatus().some(a=>!a.ready&&!a.failed);i++)await new Promise(r=>setTimeout(r,10));
assert(spriteArtStatus().find(a=>a.name==='melee-arm-parts')?.ready,'Arm atlas must load');
let cases=0;
for(const bodyType of ['male','female'])for(const family of ['leather','plate','cloth'])for(const state of ['idle','walk','run'])for(const weaponType of ['unarmed','scythe','bow']){
 const chest=Object.keys(ITEMS).find(id=>ITEMS[id].slot==='chest'&&armorMotionFamily(getGearVisualProfile(id,ITEMS[id]),'chest')===family);
 assert(chest,`Missing ${family} fixture`);
 const actor={bodyType,skin:'#edc7ab',equipment:{chest}};
 for(let frame=0;frame<(state==='idle'?1:32);frame++){
  const pose={bodyType,state,weaponType,gaitPhase:frame/8,gaitKey:Math.floor(frame/8),locomotionArms:state!=='idle'};
  const snapshot=JSON.stringify({actor,pose}),bob=.5;
  const rig=sampleArmoredArms(actor,pose,'down',bob);
  // The unequipped body's measured wrist landmarks are the reference, with
  // its baked arms enabled. Chest equipment must not pull those wrists inward.
  const reference=restingWeaponGrip(actor,{...pose,weaponType:'sword',locomotionArms:false},'down');
  assert.deepEqual(rig.primary.hand,[reference.hand[0],reference.hand[1]+bob]);
  assert.deepEqual(rig.support.hand,[-reference.hand[0],reference.hand[1]+bob]);
  for(const arm of [rig.primary,rig.support]){
   assert(Math.abs(arm.shoulder[0])>=9,'Shoulder folded into chest');
   assert(Math.abs(arm.elbow[0])>=11,'Elbow folded into chest');
   assert(arm.shoulder[1]<arm.elbow[1]&&arm.elbow[1]<arm.hand[1],'Arm must hang below shoulder');
  }
  const ctx=createCanvas(100,100).getContext('2d');ctx.translate(50,50);const matrix=ctx.getTransform();
  drawMeleeArms(ctx,actor,pose,'down',bob,'arms','all',true);
  drawMeleeArms(ctx,actor,pose,'down',bob,'hands','all',true);
  assert.deepEqual(ctx.getTransform(),matrix);
  const pixels=ctx.getImageData(0,0,100,100).data;
  let wristPixels=0,besideBody=0;
  for(let y=Math.floor(50+rig.primary.hand[1]-2);y<=Math.ceil(50+rig.primary.hand[1]+3);y++)for(let x=25;x<75;x++)if(pixels[(y*100+x)*4+3]>100){wristPixels++;if(Math.abs(x-50)>=10)besideBody++;}
  assert(wristPixels>0,'Arms failed to render');
  assert(besideBody/wristPixels>.7,'Rendered wrists overlap the front of the chest');
  assert.equal(JSON.stringify({actor,pose}),snapshot);
  cases++;
 }
}
console.log(`PASS: ${cases} south-facing arm poses match unequipped wrist landmarks, hang beside the body and preserve rendering state.`);

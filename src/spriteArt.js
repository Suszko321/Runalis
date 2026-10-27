// Presentation-only atlases. No simulation state, collision or save data writes.
import {usesMeleeRig} from './meleeRig.js';
import {usesSideLocomotion,sampleLocomotionArms,locomotionArtFrame} from './humanLocomotionRig.js';
import {drawSideLegArt} from './sideLegArt.js';
import {getEnemyVisualProfile} from './enemyVisualProfiles.js';
import {sampleEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {blightedUniformArt} from './factionEquipmentArt.js';
const images = new Map();
const variants = new Map();
const locomotionLegs = new WeakMap();
const neutralLegPixels = new WeakMap();
const MAX_VARIANTS = 48;
const motion = new WeakMap();
const terrainPatterns = new WeakMap();
export const SPRITE_ART_VERSION = 'earth-ash-brass-1';

export function asset(name) {
  if (images.has(name)) return images.get(name);
  if (typeof Image === 'undefined') return null;
  const record = { image: new Image(), ready: false, failed: false };
  record.image.onload = () => { record.ready = true; };
  record.image.onerror = () => { record.failed = true; };
  record.image.src = new URL(`../assets/art/sprites/${name}.png`, import.meta.url).href;
  images.set(name, record);
  return record;
}

export function spriteArtStatus() {
  return [...images].map(([name, a]) => ({ name, ready: a.ready, failed: a.failed }));
}

export function humanSpriteReady(bodyType) {
  return !!asset(bodyType === 'female' ? 'human-female' : 'human-male')?.ready;
}

function rgb(hex, fallback) {
  return /^#[0-9a-f]{6}$/i.test(hex || '') ? [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)) : fallback;
}

function humanVariant(bodyType, colors, attack=false) {
  const name = (bodyType === 'female' ? 'human-female' : 'human-male')+(attack===true?'-attack':typeof attack==='string'?`-${attack}`:'');
  const a = asset(name);
  if (!a?.ready) return null;
  const key = `${name}|${colors.skin}|${colors.hair}|${colors.shirt}|${colors.pants}|${colors.boots}`;
  if (variants.has(key)) return variants.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = a.image.width; canvas.height = a.image.height;
  const c = canvas.getContext('2d', { willReadFrequently: true });
  c.drawImage(a.image,0,0);
  const frame = c.getImageData(0,0,canvas.width,canvas.height);
  const ramps = {
    skin: rgb(colors.skin,[241,183,122]), hair: rgb(colors.hair,[100,60,29]),
    shirt: rgb(colors.shirt,[104,71,39]), pants: rgb(colors.pants,[61,58,60]), boots: rgb(colors.boots,[102,63,31])
  };
  for (let i=0;i<frame.data.length;i+=4) {
    const d = frame.data, r=d[i],g=d[i+1],b=d[i+2];
    if (d[i+3]<128 || Math.max(r,g,b)<28) continue; // preserve ink
    const y = Math.floor(i/4/canvas.width)%80;
    const warm = r>g*1.12 && g>b*1.08;
    let region=null, level=1;
    if (warm && r>155 && g>92 && y<57) { region='skin'; level=(r+g+b)/530; }
    else if (warm && y<31) { region='hair'; level=(r+g+b)/185; }
    else if (warm && y>=35 && y<51 && r<180) { region='shirt'; level=(r+g+b)/215; }
    else if (y>=51 && y<63 && Math.max(r,g,b)-Math.min(r,g,b)<27) { region='pants';level=(r+g+b)/170; }
    else if (warm && y>=63) { region='boots';level=(r+g+b)/205; }
    if (!region) continue;
    const target=ramps[region];
    for(let k=0;k<3;k++) d[i+k]=Math.min(255,Math.round(target[k]*Math.max(.35,Math.min(1.65,level))));
  }
  c.putImageData(frame,0,0);
  if(variants.size>=MAX_VARIANTS) variants.delete(variants.keys().next().value);
  variants.set(key,canvas);
  return canvas;
}

function fittedLegVariant(image, bodyType) {
  if(locomotionLegs.has(image))return locomotionLegs.get(image);
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
  const neutral=asset(bodyType==='female'?'human-female':'human-male').image;
  let source=neutralLegPixels.get(neutral);
  if(!source||source.width!==image.width||source.height!==image.height){
    const raster=document.createElement('canvas');raster.width=image.width;raster.height=image.height;
    // This scratch surface is read for fitting masks, never displayed. Avoid
    // a GPU readback for every differently coloured NPC/enemy/player atlas.
    const src=raster.getContext('2d',{willReadFrequently:true});src.drawImage(neutral,0,0);
    source={width:raster.width,height:raster.height,pixels:src.getImageData(0,0,raster.width,raster.height).data};
    neutralLegPixels.set(neutral,source);
  }
  const pixels=source.pixels;
  const hipOffsets={};
  // Authored gloves extend below the belt into the leg cells. Trim their
  // overhang using the original neutral-grey pants boundaries, before tinting
  // can make pants and gloves indistinguishable. Retain a pixel of ink.
  for(const row of [0,1,2,3])for(let col=0;col<4;col++)for(let y=51;y<=56;y++){
    let left=64,right=-1;
    for(let scan=y;scan<=Math.min(57,y+2)&&right<0;scan++)for(let x=16;x<49;x++){
      const i=((row*80+scan)*source.width+col*64+x)*4;
      const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
      if(pixels[i+3]&&Math.max(r,g,b)-Math.min(r,g,b)<27&&r+g+b>90){left=Math.min(left,x);right=Math.max(right,x);}
    }
    if(right<0)continue;
    ctx.clearRect(col*64,row*80+y,Math.max(0,left-1),1);
    ctx.clearRect(col*64+right+2,row*80+y,64-right-2,1);
  }
  // The generated female profile hips shift sideways between cells. Register
  // each pelvis under the shared torso, using the pants rather than the gloves.
  for(const row of [1,3])for(let col=0;col<4;col++){
    let sum=0,count=0;
    for(let y=54;y<=56;y++){
      let left=64,right=-1;
      for(let x=16;x<49;x++){
        const i=((row*80+y)*source.width+col*64+x)*4;
        const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
        if(pixels[i+3]&&Math.max(r,g,b)-Math.min(r,g,b)<27&&r+g+b>90){left=Math.min(left,x);right=Math.max(right,x);}
      }
      if(right>=0){sum+=(left+right)/2;count++;}
    }
    hipOffsets[`${row}:${col}`]=count?Math.round(32-sum/count):0;
  }
  const result={image:canvas,hipOffsets};
  locomotionLegs.set(image,result);return result;
}

export function humanFrame(pose) {
  return locomotionArtFrame(pose);
}

// Side-view locomotion keeps shoulders above the pelvis. The authored stride
// frames exaggerate the chest lean. A small waist-pivoted motion in the actor
// renderer brings the neutral torso to life above the articulated leg cycle.
export function humanUpperBodyFrame(pose, facing) {
  return usesSideLocomotion(pose, facing)
    ? 0 : humanFrame(pose);
}

export function applyHumanTorsoMotion(ctx, pose, bob, inverse = false) {
  const tilt = (pose?.sideLocomotionTilt || 0) * (inverse ? -1 : 1);
  if (!tilt) return;
  // Rigid rotation keeps the chest's volume constant; anchor it at the belt.
  const waist = -5 + Math.round(bob || 0);
  ctx.translate(0, waist);ctx.rotate(tilt);ctx.translate(0, -waist);
}

// Wrist centers measured on each generated locomotion frame, in actor coordinates.
// Always follow the anatomical LEFT arm, including the far arm facing east.
// The female west-facing fourth frame crosses the near hand over the torso.
const REST_GRIPS={
 male:{down:[[13,-4],[13,-7],[13,-4],[13,-7]],right:[[8,-7],[10,-9],[8,-7],[10,-9]],up:[[-14,-5],[-14,-7],[-14,-5],[-14,-7]],left:[[8,-6],[11,-6],[8,-6],[11,-6]]},
 female:{down:[[13,-4],[13,-4],[13,-4],[13,-4]],right:[[10,-7],[13,-6],[10,-7],[-11,-7]],up:[[-14,-5],[-14,-5],[-14,-5],[-14,-5]],left:[[3,-6],[9,-7],[3,-6],[-11,-7]]}
};
export function restingWeaponGrip(actor,pose,facing){
 if(!pose?.weaponType||pose.weaponType==='unarmed')return null;
 if(pose.locomotionArms||(pose.sideLocomotionArms&&usesSideLocomotion(pose,facing))){
   const rig=sampleLocomotionArms(pose,facing);
   return {hand:rig.primary.hand,angle:rig.weaponAngle};
 }
 const body=(actor.bodyType||actor.appearance?.bodyType)==='female'?'female':'male';
 const [x,y]=REST_GRIPS[body][facing||'down'][humanUpperBodyFrame(pose,facing)];
 return {hand:[x,y],angle:x<0?-.2:.2};
}
export function drawRestingWeaponHand(ctx,parts){
 const pose=parts.animationPose;
 if(hasBowBody(parts,pose)||hasCastBody(parts,pose)||hasAttackBody(parts,pose))return;
 const grip=restingWeaponGrip(parts,pose,parts.facing),image=humanVariant(parts.bodyType,parts);
 if(!grip||!image)return;
 const [x,y]=grip.hand,col=humanUpperBodyFrame(pose,parts.facing),row={down:0,right:1,up:2,left:3}[parts.facing]??0;
 // Reuse the authored glove over the hilt, keeping the original arm silhouette.
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,col*64+32+x-3,row*80+56+y-3,6,7,x-3,y-3+Math.round(parts.bob||0),6,7);
 ctx.restore();
}

export function drawHumanSprite(ctx, parts) {
  if(hasBowBody(parts,parts.animationPose)){
    const image=humanVariant(parts.bodyType,parts,'bow'),row={down:0,right:1,up:2,left:3}[parts.facing]??0;
    const col=bowBodyFrame(parts.animationPose);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,col*64,row*80+(parts.bodyOnly?33:0),64,parts.bodyOnly?47:80,-32,(parts.bodyOnly?-23:-56)+Math.round(parts.bob||0),64,parts.bodyOnly?47:80);ctx.restore();return true;
  }
  if(hasCastBody(parts,parts.animationPose)){
    const image=humanVariant(parts.bodyType,parts,'cast'),row={down:0,right:1,up:2,left:3}[parts.facing]??0;
    const col=castBodyFrame(parts.animationPose);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,col*64,row*80+(parts.bodyOnly?33:0),64,parts.bodyOnly?47:80,-32,(parts.bodyOnly?-23:-56)+Math.round(parts.bob||0),64,parts.bodyOnly?47:80);ctx.restore();return true;
  }
  if(hasAttackBody(parts,parts.animationPose)){
    const image=humanVariant(parts.bodyType,parts,true),row={down:0,right:1,up:2,left:3}[parts.facing]??0;
    const col=attackBodyFrame(parts.animationPose);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,col*64,row*80+(parts.bodyOnly?33:0),64,parts.bodyOnly?47:80,-32,(parts.bodyOnly?-23:-56)+Math.round(parts.bob||0),64,parts.bodyOnly?47:80);ctx.restore();return true;
  }
  const image=humanVariant(parts.bodyType,parts);
  if(!image) return false;
  const row={down:0,right:1,up:2,left:3}[parts.facing] ?? 0;
  const pose=parts.animationPose || {};
  // gaitKey comes from the existing locomotion sampler, not a second clock.
  const moving=['walk','run'].includes(pose.state);
  const col=moving ? humanFrame(pose) : 0;
  const bob=Math.round(parts.bob || 0);
  const upperCol=humanUpperBodyFrame(pose,parts.facing);
  const drawBody=()=>{
    const sideGait=usesSideLocomotion(pose,parts.facing);
    if(sideGait&&!parts.hideLegs){
      ctx.save();applyHumanTorsoMotion(ctx,pose,bob,true);
      const fitted=fittedLegVariant(image,parts.bodyType);
      drawSideLegArt(ctx,fitted.image,pose,parts.facing,bob,false,fitted.hipOffsets[`1:${col}`]||0);
      ctx.restore();
    }
    // The upper body overlaps the hips, closing the waist seam as legs pass.
    if(pose.sideLocomotionArms){
      // Retain only the shirt, replacing the baked sleeves and gloves with
      // relaxed articulated arms.
      const female=parts.bodyType==='female';
      const torsoX=female?29:27;
      const torsoWidth=female?12:13;
      // The neutral crop excludes baked sleeves. Fit its chest to the same
      // projected volume as the resting body instead of reducing body width
      // to the crop's narrow source rectangle during sideways movement.
      const profileWidth=female?17:19;
      ctx.save();ctx.scale(parts.facing==='left'?-1:1,1);
      // One complete profile on both sides, including the neck and belt.
      // The previous 18px crop left a hard cut at the shoulders and waist.
      const torsoHeight=parts.hideLegs?21:24;
      ctx.drawImage(image,torsoX,80+30,torsoWidth,torsoHeight,-profileWidth/2,-26+bob,profileWidth,torsoHeight);
      ctx.restore();
    } else ctx.drawImage(image,upperCol*64,row*80+33,64,18,-32,-23+bob,64,18);
    if(sideGait)return;
    ctx.save();
    applyHumanTorsoMotion(ctx,pose,bob,true);
    const fittedLegs=pose.fittedTorso
      ?fittedLegVariant(image,parts.bodyType):null;
    const hipOffset=fittedLegs?.hipOffsets[`${row}:${col}`]||0;
    ctx.drawImage(fittedLegs?.image||image,col*64,row*80+51,64,29,-32+hipOffset,-5+bob,64,29);
    ctx.restore();
  };
  ctx.imageSmoothingEnabled=false;
  if(parts.bodyOnly) {
    drawBody();
  } else {
    drawBody();
    const head=humanVariant(parts.hairStyle==='ponytail'?'female':'male',parts) || image;
    ctx.drawImage(head,upperCol*64,row*80,64,33,-32,-56+bob,64,33);
  }
  return true;
}

export function attackBodyFrame(pose){return pose.phase==='anticipation'?(pose.phaseProgress>.25?1:0):pose.phase==='strike'?2:pose.phase==='followThrough'?2:3;}
export function hasAttackBody(actor,pose){
  if(usesMeleeRig(pose)&&asset('melee-arm-parts')?.ready)return false;
  if(['bow','staff','spiritFocus','eldritch','unarmed'].includes(pose?.weaponType))return false;
  const female=(actor.bodyType||actor.appearance?.bodyType||'male')==='female',hair=actor.hairStyle||actor.appearance?.hairStyle||'short';
  return pose?.attacking && (female?['tied','ponytail'].includes(hair):hair==='short') && !!asset(female?'human-female-attack':'human-male-attack')?.ready;
}
export function attackBodyGrip(actor,pose,facing){
  if(!hasAttackBody(actor,pose))return null;
  const row={down:0,right:1,up:2,left:3}[facing]??0;
  return ((actor.bodyType||actor.appearance?.bodyType)==='female'?FEMALE_ATTACK_GRIPS:ATTACK_GRIPS)[row*4+attackBodyFrame(pose)];
}
const FEMALE_ATTACK_GRIPS=[[10,-12],[-15,-21],[4,-17],[9,-13],[10,-15],[-17,-25],[22,-18],[8,-13],[12,-12],[16,-24],[-20,-20],[10,-12],[-10,-14],[-17,-13],[-21,-18],[-8,-15]];
const ATTACK_GRIPS=[[9,-14],[-15,-25],[-2,-22],[9,-14],[-3,-15],[-17,-28],[19,-21],[-3,-15],[12,-12],[17,-21],[19,-23],[12,-12],[-11,-16],[-18,-9],[-23,-21],[-11,-16]];
asset('human-male-attack');
asset('human-female-attack');

export function castBodyFrame(pose){
  if(['charge','heavyCharge'].includes(pose.state))return (pose.chargeProgress||0)<.12?0:1;
  const t=pose.castProgress||0,release=pose.visualReleasePoint??.4;
  return t<.08?0:t<release?1:t<release+(1-release)*.68?2:3;
}
export function hasCastBody(actor,pose){
  if(!['cast','summon','charge','heavyCharge','guard'].includes(pose?.state))return false;
  if(!['staff','spiritFocus','eldritch','unarmed'].includes(pose.weaponType))return false;
  const female=(actor.bodyType||actor.appearance?.bodyType||'male')==='female',hair=actor.hairStyle||actor.appearance?.hairStyle||'short';
  return (female?['tied','ponytail'].includes(hair):hair==='short')&&!!asset(female?'human-female-cast':'human-male-cast')?.ready;
}
export function castBodyGrip(actor,pose,facing){
  if(!hasCastBody(actor,pose))return null;
  const row={down:0,right:1,up:2,left:3}[facing]??0,female=(actor.bodyType||actor.appearance?.bodyType)==='female';
  return (female?FEMALE_CAST_GRIPS:MALE_CAST_GRIPS)[row*4+castBodyFrame(pose)];
}
const MALE_CAST_GRIPS=[[12,-5],[3,-16],[9,-16],[12,-5],[9,-5],[8,-19],[18,-21],[9,-5],[-14,-5],[-12,-13],[-16,-15],[-14,-5],[9,-4],[-3,-13],[9,-15],[8,-4]];
const FEMALE_CAST_GRIPS=[[12,-5],[3,-14],[10,-12],[12,-5],[10,-7],[11,-17],[17,-19],[10,-7],[-14,-5],[-12,-13],[-14,-14],[-14,-5],[3,-6],[-3,-12],[6,-14],[3,-6]];
asset('human-male-cast');asset('human-female-cast');

export function bowBodyFrame(pose){
  if(['charge','heavyCharge'].includes(pose.state))return (pose.chargeProgress||0)<.08?0:1;
  if(['anticipation','draw'].includes(pose.phase))return pose.phaseProgress<.15?0:1;
  if(['strike','release','followThrough'].includes(pose.phase))return 2;
  if(pose.phase==='recover'&&pose.attackProgress<.65)return 2;
  return 3;
}
export function hasBowBody(actor,pose){
  if(pose?.weaponType!=='bow'||!(pose.attacking||['charge','heavyCharge'].includes(pose.state)))return false;
  const female=(actor.bodyType||actor.appearance?.bodyType||'male')==='female',hair=actor.hairStyle||actor.appearance?.hairStyle||'short';
  return (female?['tied','ponytail'].includes(hair):hair==='short')&&!!asset(female?'human-female-bow':'human-male-bow')?.ready;
}
export function bowBodyGrip(actor,pose,facing){
  if(!hasBowBody(actor,pose))return null;
  const row={down:0,right:1,up:2,left:3}[facing]??0,female=(actor.bodyType||actor.appearance?.bodyType)==='female';
  return (female?FEMALE_BOW_GRIPS:MALE_BOW_GRIPS)[row*4+bowBodyFrame(pose)];
}
const MALE_BOW_GRIPS=[[12,-4],[19,-21],[19,-21],[13,-4],[9,-5],[18,-22],[20,-22],[11,-5],[-13,-4],[-19,-21],[-21,-21],[-13,-4],[8,-6],[-19,-21],[-20,-21],[12,-6]];
const FEMALE_BOW_GRIPS=[[12,-4],[18,-19],[19,-19],[12,-4],[10,-7],[19,-20],[19,-20],[-10,-6],[-13,-4],[-20,-21],[-21,-21],[-12,-4],[3,-6],[-20,-22],[-20,-22],[-11,-6]];
asset('human-male-bow');asset('human-female-bow');

// Explicit coverage; unsupported objects keep their existing stateful renderer.
export const ENEMY_SPRITES = Object.freeze({
  hollowling:['enemies-core',0], ashWolf:['enemies-core',1], stalkerWolf:['enemies-core',1],
  gravebound:['enemies-core',2], shieldKnight:['enemies-core',2], demonCultist:['enemies-core',3], cultist:['enemies-core',3],
  roadlessBandit:['enemies-extra',0],archer:['enemies-extra',1],gravePriest:['enemies-extra',2],
  wraith:['enemies-extra',3],veyrWraith:['enemies-extra',3],
  brute:['enemies-remaining',0],exploder:['enemies-remaining',1],basicBeast:['enemies-remaining',2]
});

export function drawEnemySprite(ctx, enemy, x, y) {
  const profile=getEnemyVisualProfile(enemy);
  if(!profile.atlas)return false;
  const row=profile.row;
  const a=asset(profile.atlas);
  if(!a?.ready) return false;
  const now=performance.now()/1000;
  let sample=motion.get(enemy);
  if(!sample) { sample={x:enemy.x,y:enemy.y,until:0,attackUntil:0,cooldown:enemy.attackCooldown||0,facing:1};motion.set(enemy,sample); }
  const dx=enemy.x-sample.x,dy=enemy.y-sample.y;
  if(Math.hypot(dx,dy)>.05){sample.until=now+.12;if(Math.abs(dx)>.02)sample.facing=dx<0?-1:1;}
  sample.cooldown=enemy.attackCooldown||0;
  sample.x=enemy.x;sample.y=enemy.y;
  const attack=sampleEnemyAttackPresentation(enemy,now);
  const attacking=!enemy.dead && !!(enemy.reviewAnimation==='attack' || attack?.phase==='execution');
  const moving=!enemy.dead && (sample.until>now || ['walk','run'].includes(enemy.reviewAnimation));
  // Club-wielding brutes' fourth atlas frame is the raised weapon, so use it
  // during preparation; the lowered club reaches contact at the release.
  const heavy=attack?.technique==='slam',preparing=attack?.phase==='anticipation';
  const col=heavy?(preparing&&attack.progress>.18?3:attacking?0:moving?1+Math.floor(now*8)%2:0):
    attacking?3:preparing&&attack.progress>.3?1:moving?1+Math.floor(now*8)%2:0;
  ctx.save();
  ctx.translate(Math.round(x),Math.round(y));
  if((enemy.dirX || enemy.vx || sample.facing)<0) ctx.scale(-1,1);
  ctx.fillStyle='rgba(7,10,6,.4)';
  ctx.beginPath();ctx.ellipse(0,18,profile.shadow,5,0,0,Math.PI*2);ctx.fill();
  ctx.imageSmoothingEnabled=false;
  const bob=/wraith/i.test(enemy.kind)?Math.round(Math.sin(now*2.5)*2):0;
  const w=profile.cellWidth,h=profile.cellHeight,s=profile.scale;
  const dw=Math.round(w*s),dh=Math.round(h*s);
  const uniform=blightedUniformArt(a.image,profile);
  ctx.drawImage(uniform||a.image,col*w,uniform?0:row*h,w,h,Math.round(-dw/2),Math.round(18-profile.pivot*s+bob),dw,dh);
  ctx.restore();
  return true;
}

export function drawBossSprite(ctx, enemy, x, y, type=enemy.bossType || enemy.boss?.type) {
  if(['redSealExecutioner','graveMawBear','briarTitan'].includes(type))return drawEnemySprite(ctx,enemy,x,y);
  const phase=Math.max(1,Math.min(3,Number(enemy.boss?.phase||1)));
  const name=type==='seraphel'||(type==='demonLord'&&phase===3)?'bosses-ascendant':type==='zephyrLight'?'bosses-zephyr':'bosses-act1';
  const row=type==='seraphel'||type==='zephyrLight'?phase-1:type==='veyrWarden'?0:type==='hollowElk'?1:type==='demonLord'?(phase>=2?3:2):-1;
  const a=asset(name);if(row<0 || !a?.ready)return false;
  const now=performance.now()/1000;
  const attack=sampleEnemyAttackPresentation(enemy,now);
  const attacking=attack?.phase==='execution';
  let sample=motion.get(enemy);
  if(!sample){sample={x:enemy.x,y:enemy.y,until:0};motion.set(enemy,sample);}
  if(Math.hypot(enemy.x-sample.x,enemy.y-sample.y)>.05)sample.until=now+.12;
  sample.x=enemy.x;sample.y=enemy.y;
  const heavy=['bossSlam','overhead'].includes(attack?.pose)||attack?.technique==='slam';
  const col=heavy&&attack?.phase==='anticipation'&&attack.progress>.18?2:attacking?(heavy?0:2):sample.until>now?Math.floor(now*6)%2:0;
  const scale=type==='demonLord'?(phase>=3?1.15:.85):type==='zephyrLight'?(.75+phase*.12):type==='seraphel'?.83:.68;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.imageSmoothingEnabled=false;
  if((enemy.dirX||0)<0)ctx.scale(-1,1);
  ctx.fillStyle='rgba(7,10,6,.4)';ctx.beginPath();ctx.ellipse(0,18,36*scale,8*scale,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(a.image,col*160,row*176,160,176,-80*scale,18-170*scale,160*scale,176*scale);
  ctx.restore();return true;
}
asset('bosses-ascendant');
asset('bosses-zephyr');
asset('enemies-blighted');
asset('enemies-blighted-victims');
asset('bosses-frontier');

export function drawPropSprite(ctx, index, x, footY, scale=1) {
  const a=asset('props-core');
  if(!a?.ready) return false;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='rgba(8,12,6,.28)';
  ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(footY),28*scale,6*scale,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(a.image,(index%4)*128,Math.floor(index/4)*128,128,128,
    Math.round(x-64*scale),Math.round(footY-122*scale),Math.round(128*scale),Math.round(128*scale));
  ctx.restore();return true;
}

export function drawWeaponSprite(ctx,index,x,y,side=1,scale=.8) {
  const a=asset('icons-core');if(!a?.ready)return false;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(side,1);ctx.imageSmoothingEnabled=false;
  // Swords' guard/grip correspond to the existing drawSword local contract.
  ctx.drawImage(a.image,index%4*64,Math.floor(index/4)*64,64,64,
    -32*scale,12-49*scale,64*scale,64*scale);ctx.restore();return true;
}

export const TOWN_PROP_SPRITES=Object.freeze({
  supplyWagon:[0,.82],crateStack:[1,.46],medicineCrates:[1,.46],sacks:[2,.35],
  bedroll:[3,.65],infirmaryCot:[3,.65],lantern:[4,.55],barrels:[5,.4],
  well:[6,.76],bankChest:[14,.4]
});

export function drawTownPropSprite(ctx, object, x, y) {
  const config=TOWN_PROP_SPRITES[object.propType];
  if(!config || !asset('props-core')?.ready) return false;
  const scale=Number(object.scale || 1);
  if(object.propType==='lantern') {
    const flicker=.9+Math.sin(performance.now()/310+x)*.08;
    const glow=ctx.createRadialGradient(x,y-22*scale,1,x,y-22*scale,42*scale);
    glow.addColorStop(0,`rgba(242,172,64,${.19*flicker})`);glow.addColorStop(1,'rgba(242,172,64,0)');
    ctx.save();ctx.fillStyle=glow;ctx.fillRect(x-42*scale,y-64*scale,84*scale,84*scale);ctx.restore();
  }
  return drawPropSprite(ctx,config[0],x,y+12*scale,config[1]*scale);
}

export function terrainPattern(ctx,index,camera={x:0,y:0}) {
  const a=asset('terrain-core');
  if(!a?.ready) return null;
  let patterns=terrainPatterns.get(ctx);
  if(!patterns){patterns=new Map();terrainPatterns.set(ctx,patterns);}
  let pattern=patterns.get(index);
  if(!pattern){
    const tile=document.createElement('canvas');tile.width=64;tile.height=64;
    tile.getContext('2d').drawImage(a.image,index%4*64,Math.floor(index/4)*64,64,64,0,0,64,64);
    pattern=ctx.createPattern(tile,'repeat');patterns.set(index,pattern);
  }
  pattern.setTransform(new DOMMatrix().translate(-Math.floor(camera.x),-Math.floor(camera.y)));
  return pattern;
}

export function drawTerrainTile(ctx,world,tile,x,y,sx,sy) {
  const a=asset('terrain-core');if(!a?.ready)return false;
  const interior=['dungeon','tower','sideZone'].includes(world.mode);
  const index=tile.biome==='wall'?5:tile.biome==='water'?6:world.mode==='maraHouse'?3:
    tile.biome==='path'?(world.mode==='capital'?2:interior?4:1):
    tile.biome==='ruins'||tile.biome==='deadlands'?7:interior?4:0;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(a.image,index%4*64+(x%2)*32,Math.floor(index/4)*64+(y%2)*32,32,32,sx,sy,32,32);
  // The world profile remains responsible for regional lighting, not baked pixels.
  ctx.fillStyle='rgba(11,15,10,.22)';ctx.fillRect(sx,sy,32,32);ctx.restore();return true;
}

// Begin loading once. Existing art remains visible during decode/failure.
for(const name of ['human-male','human-female','enemies-core','enemies-extra','enemies-remaining','bosses-act1','props-core','terrain-core','icons-core']) asset(name);


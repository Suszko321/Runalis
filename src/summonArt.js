import {asset} from './spriteArt.js';
import {isGravecallerSummon,gravecallerMotionPose,gravecallerBodyOffset} from './gravecallerSummonMotion.js';
import {drawGreaterLichArt} from './lichSummonArt.js';
import {drawCompanionSprite,drawDemonCompanionFallback} from './companionSpriteArt.js';
import {faeSummonAtlas,faeSummonOutlinedFrame,drawFaeSummonWings} from './faeSummonArt.js';
import {drawPetalSummonArt,PETAL_SUMMON_ART} from './petalknightSummonArt.js';
const samples=new WeakMap();
const STAGES={skeletonServant:[0,54],thornling:[1,48],lesserHorror:[2,46],lich:[3,64]};
const EVOLVED={skeletalKnight:[0,60],thornbeast:[1,66],starlessHorror:[2,60],miniDemon:[3,38]};
const ANCIENT={lichLord:[0,80],elderThornbeast:[1,78],thornTitan:[2,90],oldHorror:[3,86]};
const SPECIAL={manyEyedHorror:[2,70],spectralHand:[3,36]};
// The elder's first stride was authored facing left; all its other poses face
// right. Normalize that body frame before applying the creature's facing.
const FRAME_FACING={elderThornbeast:[1,-1,1,1]};
export function drawSummonArt(ctx,summon,stage,x,y){
  if(drawPetalSummonArt(ctx,summon,stage,x,y))return true;
  if(drawGreaterLichArt(ctx,summon,x,y))return true;
  if(summon.kind==='wolf'||summon.kind==='miniDemon') {
    if(drawCompanionSprite(ctx,summon,x,y))return true;
    return summon.kind==='wolf'?drawWolfCompanion(ctx,summon,x,y):drawDemonCompanionFallback(ctx,summon,x,y);
  }
  const name=STAGES[stage]?'summons-core':EVOLVED[stage]?'summons-evolved':ANCIENT[stage]?'summons-ancient':'arcane-special';
  const config=STAGES[stage]||EVOLVED[stage]||ANCIENT[stage]||SPECIAL[stage],a=asset(name);if(!config||!a?.ready)return false;
  const ancient=name==='summons-ancient',w=ancient?128:96,h=ancient?144:112,pivot=h-6;
  const now=performance.now()/1000;
  let sample=samples.get(summon);
  if(!sample){sample={x:summon.x,y:summon.y,cooldown:summon.attackCooldown||0,movingUntil:0,attackUntil:0,facing:1};samples.set(summon,sample);}
  const dx=summon.x-sample.x,dy=summon.y-sample.y;
  if(Math.hypot(dx,dy)>.02){sample.movingUntil=now+.12;if(Math.abs(dx)>.02)sample.facing=dx<0?-1:1;}
  if((summon.attackCooldown||0)>sample.cooldown+.1)sample.attackUntil=now+.2;
  sample.x=summon.x;sample.y=summon.y;sample.cooldown=summon.attackCooldown||0;
  const fae=summon.kind==='thornbeast'&&summon.summonMorph==='fae';
  const authored=isGravecallerSummon(summon),pose=authored?gravecallerMotionPose(summon):null;
  const attacking=now<sample.attackUntil||((fae||authored)&&(now<(summon.attackAnimationUntil||0)||summon.reviewAnimation==='attack')),moving=now<sample.movingUntil||((fae||authored)&&(summon.moving||['walk','run'].includes(summon.reviewAnimation)));
  const frame=pose?.frame??(attacking?3:moving?1+Math.floor(now*8)%2:0);
  const scale=config[1]/(ancient?112:88),bob=pose?pose.bob:fae?(moving?Math.round(Math.sin(now*16)*.7):0):moving?Math.sin(now*16)*.7:Math.sin(now*2)*.35;
  const facing=pose?.facing??((fae)&&Math.abs(summon.dirX||0)>.05?(summon.dirX<0?-1:1):sample.facing);
  const sheet=fae?faeSummonAtlas(a.image,config[0],w,h):a.image;
  ctx.save();ctx.translate(Math.round(x),Math.round(y+16));ctx.scale(facing,1);ctx.imageSmoothingEnabled=false;
  if(fae)drawFaeSummonWings(ctx,stage,now);
  if(FRAME_FACING[stage]?.[frame]===-1)ctx.scale(-1,1);
  if(fae){
    const outlined=faeSummonOutlinedFrame(sheet,frame,w,h,Math.round(w*scale),Math.round(h*scale));
    ctx.drawImage(outlined,-Math.round(w/2*scale)-1,-Math.round(pivot*scale)+bob-1);
  }
  else if(authored)ctx.drawImage(sheet,frame*w,config[0]*h,w,h,gravecallerBodyOffset(stage,frame,scale)-Math.round(w/2*scale),-Math.round(pivot*scale)+Math.round(bob),Math.round(w*scale),Math.round(h*scale));
  else ctx.drawImage(sheet,frame*w,config[0]*h,w,h,-w/2*scale,-pivot*scale+bob,w*scale,h*scale);
  ctx.restore();return true;
}
export function drawWolfCompanion(ctx,summon,x,y){
  const t=summon.walkTime||0, facing=(summon.dirX||0)<0?-1:1;
  const bite=Number(summon.attackAnimationUntil||0)>performance.now()/1000;
  const stride=summon.moving?Math.round(Math.sin(t*2)*3):0, bob=summon.moving?Math.round(Math.abs(Math.sin(t*2))):0;
  ctx.save();ctx.translate(Math.round(x),Math.round(y+9));ctx.scale(facing,1);
  ctx.fillStyle='#142533';ctx.fillRect(-24,-14+bob,40,14);ctx.fillRect(10,-21+bob,14,16);
  ctx.fillStyle='#345e79';ctx.fillRect(-22,-12+bob,35,10);ctx.fillRect(11,-19+bob,11,13);
  ctx.fillStyle='#79adc4';ctx.fillRect(-17,-13+bob,26,6);ctx.fillRect(12,-18+bob,8,6);
  ctx.fillStyle='#dbf5f1';ctx.fillRect(-10,-7+bob,24,6);ctx.fillRect(20,-12+bob,10+(bite?4:0),5);
  ctx.fillStyle='#142533';ctx.fillRect(-18,-2,-5+stride+8,10);ctx.fillRect(7,-2,5,10);
  ctx.fillStyle='#79adc4';ctx.fillRect(-12,-2,5,7+stride);ctx.fillRect(2,-2,5,7-stride);
  ctx.fillStyle='#345e79';ctx.fillRect(-29,-13+bob,10,5);ctx.fillRect(-33,-16+bob,6,5);
  ctx.fillStyle='#345e79';ctx.fillRect(12,-26+bob,5,9);ctx.fillRect(20,-24+bob,4,8);
  ctx.fillStyle='#c7ae8c';ctx.fillRect(14,-23+bob,2,5);
  ctx.fillStyle='#6df4df';ctx.fillRect(20,-17+bob,3,2);
  ctx.fillStyle='#172020';ctx.fillRect(29+(bite?4:0),-12+bob,3,3);
  if(bite){ctx.fillStyle='#eadfc9';ctx.fillRect(23,-6+bob,7,2);}
  ctx.fillStyle='#796e4c';ctx.fillRect(11,-6+bob,3,8);ctx.fillStyle='#d7c78b';ctx.fillRect(11,0+bob,4,3);
  ctx.restore();return true;
}
asset('summons-core');
for(const name of ['summons-evolved','summons-ancient','arcane-special'])asset(name);
for(const profile of Object.values(PETAL_SUMMON_ART))asset(profile.sheet);


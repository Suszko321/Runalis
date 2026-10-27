import {asset} from './spriteArt.js';
export function drawCombatEffectArt(ctx,row,frame,x,y,size,rotation=0,alpha=1){
  const a=asset('combat-effects');if(!a?.ready)return false;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rotation);ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=false;
  ctx.drawImage(a.image,Math.max(0,Math.min(3,frame))*160,row*160,160,160,-size/2,-size/2,size,size);ctx.restore();return true;
}
asset('combat-effects');

export function drawSkillReleaseArt(ctx,kind,x,y,radius,t,alpha=1){
  const extra=/necro|grave|soul|bone/i.test(kind)?0:/fire|flame|bombExplosion/i.test(kind)?1:/mercenary|arrowImpact/i.test(kind)?2:/smoke/i.test(kind)?3:null;
  const row=extra??(/holy|solar|radiant|light|dawn|prism|halo/i.test(kind)?0:/thorn|briar|root|bramble/i.test(kind)?1:/water|tidal|hydro|wave|current|deluge/i.test(kind)?2:/eldritch|void|rift|maw|blackstar/i.test(kind)?3:null);
  if(row===null)return false;
  const a=asset(extra===null?'skill-effects':'skill-effects-extra');if(!a?.ready)return false;
  const progress=Math.max(0,Math.min(1,t)),frame=Math.min(3,Math.floor(progress*4));
  const size=Math.max(32,radius*2)*(0.88+Math.sin(progress*Math.PI)*.12);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=alpha*Math.min(1,progress*16)*(1-progress*.35);
  ctx.drawImage(a.image,frame*160,row*160,160,160,x-size/2,y-size/2,size,size);ctx.restore();return true;
}
asset('skill-effects');
asset('skill-effects-extra');

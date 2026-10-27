import {asset} from './spriteArt.js';
import {gravecallerMotionPose,gravecallerBodyOffset} from './gravecallerSummonMotion.js';
import {LICH_FORMS,BOUND_DEAD_FORMS,isBoundDeadMorph} from './lichSummonSystem.js';
import {drawGardenGraveEffect} from './gardenGraveArt.js';

export const BOUND_DEAD_SPRITES=Object.freeze({
 acolyte:{name:'bound-dead-specter',width:96,height:112,scale:.75},
 deathknight:{name:'bound-dead-knight',width:96,height:112,scale:.85}
});
const frames=new Map();
function outlinedFrame(sheet,frame,w,h){
 const key=`${sheet.src}:${frame}`;if(frames.has(key))return frames.get(key);
 const canvas=document.createElement('canvas');canvas.width=w+2;canvas.height=h+2;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(sheet,frame*w,0,w,h,1,1,w,h);
 const original=ctx.getImageData(0,0,w+2,h+2),outlined=ctx.createImageData(w+2,h+2),stride=w+2;
 for(let y=1;y<=h;y++)for(let x=1;x<=w;x++){
  const i=(y*stride+x)*4;if(original.data[i+3]<128)continue;
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const j=((y+dy)*stride+x+dx)*4;outlined.data[j]=16;outlined.data[j+1]=15;outlined.data[j+2]=20;outlined.data[j+3]=255;
  }
 }
 ctx.putImageData(outlined,0,0);ctx.drawImage(sheet,frame*w,0,w,h,1,1,w,h);frames.set(key,canvas);return canvas;
}
export function drawGreaterLichArt(ctx,s,x,y){
 const bound=isBoundDeadMorph(s);
 if((s.kind!=='greaterLich'&&!bound)||!['acolyte','deathknight'].includes(s.summonMorph))return false;
 const profile=bound?BOUND_DEAD_SPRITES[s.summonMorph]:null;
 const a=asset(profile?.name||`lich-${s.summonMorph}`);if(!a?.ready)return false;
 const knight=s.summonMorph==='deathknight';
 const w=profile?.width||(knight?128:96),h=profile?.height||(knight?144:112),scale=profile?.scale||(knight?1:.8);
 const {frame,bob,facing}=gravecallerMotionPose(s);
 const offset=gravecallerBodyOffset(profile?.name||`lich-${s.summonMorph}`,frame,scale);
 const art=outlinedFrame(a.image,frame,w,h);
 ctx.save();ctx.translate(Math.round(x),Math.round(y+16+bob));ctx.scale(facing,1);ctx.imageSmoothingEnabled=false;
 ctx.drawImage(art,offset-Math.round((w/2+1)*scale),-Math.round((h-5)*scale),Math.round((w+2)*scale),Math.round((h+2)*scale));
 ctx.restore();return true;
}
const pixel=(ctx,x,y,size=2)=>ctx.fillRect(Math.round(x),Math.round(y),size,size);
export function drawLichSummonEffect(ctx,fx,camera){
 if(fx.form==='deathknight'&&drawGardenGraveEffect(ctx,fx,camera))return;
 const form=(fx.summonFamily==='boundDead'?BOUND_DEAD_FORMS[fx.form]:null)||LICH_FORMS[fx.form]||LICH_FORMS.base,t=Math.min(1,(fx.age||0)/(fx.ttl||.35));
 const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),r=fx.radius||26;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha*=1-t*.7;ctx.fillStyle=form.color;
 if(fx.geometry.endsWith('Bolt')){
  const ex=fx.endX-camera.x,ey=fx.endY-camera.y;
  for(let i=0;i<6;i++){
   const phase=Math.max(0,t-i*.05),px=x+(ex-x)*phase,py=y+(ey-y)*phase;
   ctx.globalAlpha=(1-i/7)*(1-t*.3);pixel(ctx,px,py,i===0?4:2);
   if(fx.geometry==='soulBolt')pixel(ctx,px+3,py+(i%2?3:-3),2);
  }
 }else if(fx.geometry==='cleave'||fx.geometry==='soulSlash'){
  const angle=Math.atan2(fx.dirY,fx.dirX);
  for(let i=0;i<20;i++){
   const a=angle-1+i/19*2,rr=r*(.7+t*.3);
   pixel(ctx,x+Math.cos(a)*rr,y+Math.sin(a)*rr*.6,3);
   if(i%3===0){ctx.fillStyle=fx.summonFamily==='boundDead'?'#d1e8c9':'#f0c4b3';pixel(ctx,x+Math.cos(a)*(rr-5),y+Math.sin(a)*(rr-5)*.6);ctx.fillStyle=form.color;}
  }
 }else if(fx.geometry==='mend'){
  pixel(ctx,x-5,y-3-t*5);pixel(ctx,x+5,y-1-t*5);pixel(ctx,x,y-5-t*5);
 }else{
  const radius=fx.geometry==='arrival'?r*(.6+t*.4):r*t;
  for(let i=0;i<16;i++){
   const a=i*Math.PI/8;pixel(ctx,x+Math.cos(a)*radius,y+Math.sin(a)*radius*.4,i%4===0?3:2);
   if(fx.geometry==='arrival'&&i%4===0)pixel(ctx,x+Math.cos(a)*radius,y+Math.sin(a)*radius*.4-6*(1-t));
  }
 }
 ctx.restore();
}
for(const id of ['acolyte','deathknight'])asset(`lich-${id}`);
for(const profile of Object.values(BOUND_DEAD_SPRITES))asset(profile.name);

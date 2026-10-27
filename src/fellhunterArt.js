import {getAbilityById} from './data.js';
const TAU=Math.PI*2,palettes={base:['#8c7456','#ddd7c5','#25221d'],bloodhound:['#ad4850','#edbba7','#302125'],venom:['#8dad4b','#d2e59a','#26362a']};
const P=(c,x,y,color,n=2)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),n,n);};
function line(c,x,y,u,v,color,n=2){const count=Math.max(1,Math.ceil(Math.hypot(u-x,v-y)));for(let i=0;i<=count;i++)P(c,x+(u-x)*i/count,y+(v-y)*i/count,color,n);}
function ring(c,x,y,r,color,count=48){for(let i=0;i<count;i++){const a=i*TAU/count;P(c,x+Math.cos(a)*r,y+Math.sin(a)*r,color,2);}}
function seal(c,x,y,r,colors){const [metal,light,dark]=colors;for(const s of [-1,1]){line(c,x-r,y+s*r,x+r,y+s*r,dark,4);line(c,x-r,y+s*r,x+r,y+s*r,metal,2);line(c,x+s*r,y-r,x+s*r,y+r,metal,2);}line(c,x-r*.55,y,x+r*.55,y,light,2);line(c,x,y-r*.55,x,y+r*.55,light,2);P(c,x-1,y-1,dark,3);}
function quarry(c,x,y,r,colors){for(const s of [-1,1]){line(c,x+s*r,y-4,x+s*(r+5),y,colors[0],2);line(c,x+s*(r+5),y,x+s*r,y+4,colors[1],2);}}
function tool(c,x,y,dx,dy,colors,blade=false){const [metal,light,dark]=colors;line(c,x-dx*10,y-dy*10,x+dx*10,y+dy*10,dark,4);line(c,x-dx*(blade?3:13),y-dy*(blade?3:13),x+dx*9,y+dy*9,light,2);if(blade)line(c,x-dy*6,y+dx*6,x+dy*6,y-dx*6,metal,2);else for(const s of [-1,1])line(c,x+dx*9,y+dy*9,x+dx*3-dy*s*4,y+dy*3+dx*s*4,metal,2);}
function handbow(c,x,y,dx,dy,colors){line(c,x-dy*10,y+dx*10,x+dy*10,y-dx*10,colors[2],4);line(c,x-dy*10,y+dx*10,x+dy*10,y-dx*10,colors[0],2);line(c,x-dx*7,y-dy*7,x+dx*8,y+dy*8,colors[1],2);}
function oilFlame(c,x,y,t){P(c,x-2,y-2,'#713a29',5);P(c,x-1,y-4,'#db8040',3);P(c,x+(Math.floor(t*8)%2),y-6,'#eabe73',2);}
const kinds={fellhunterPracticalStrike:'arc',fellhunterDaggers:'knives',fellhunterMarkedShot:'shot',fellhunterFlamingArrowVolley:'volley',fellhunterBearTrap:'trap',fellhunterTrapSnap:'snap',fellhunterCaltrops:'field',fellhunterCaltropsStep:'impact',fellhunterBombFuse:'fuse',fellhunterExplosion:'blast',fellhunterGrapple:'dash',fellhunterSmokeBomb:'smoke',fellhunterKillZone:'field',fellhunterKillZoneBlast:'blast'};
const groundCache=new Map();
function ground(c,x,y,r,id,colors,t){
 const radius=Math.round(r),key=colors[0]+':'+id+':'+radius;let a=groundCache.get(key);
 if(!a){a=document.createElement('canvas');const o=radius+12;a.width=a.height=o*2;groundShape(a.getContext('2d'),o,o,radius,id,colors,t);if(groundCache.size>=24)groundCache.delete(groundCache.keys().next().value);groundCache.set(key,a);}
 c.drawImage(a,x-a.width/2,y-a.height/2);
}
function groundShape(c,x,y,r,id,colors,t){
 ring(c,x,y,r,colors[0]);const count=/KillZone/.test(id)?12:18;
 for(let i=0;i<count;i++){const a=i*2.399963,d=r*Math.sqrt((i+.5)/count)*.8,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
  if(/KillZone/.test(id)){line(c,px-4,py,px+4,py,colors[2],4);P(c,px,py,colors[1],2);if(i%3===0)seal(c,px,py,5,colors);}
  else{line(c,px-4,py+3,px,py-5,colors[2],3);line(c,px,py-5,px+4,py+3,colors[1],2);line(c,px-4,py+3,px+4,py+3,colors[0],2);}
 }
 if(colors===palettes.bloodhound)quarry(c,x,y,r*.38,colors);
}
export function drawFellhunterEffect(c,fx,camera){
 if(fx.subclassId&&fx.subclassId!=='bloodhound')return false;
 const ability=getAbilityById(fx.abilityId),base=kinds[fx.kind],tech=fx.kind==='combatTechnique'&&fx.classId==='fellhunter',sub=fx.kind==='subclassAbility'&&fx.subclassId==='bloodhound';
 if(!base&&!tech&&!sub){if(['abilityPresentation','signatureAbilityRelease'].includes(fx.kind)&&ability?.classId==='fellhunter'&&!fx.subclassId)return true;return false;}
 const family=fx.subclassId||'base',colors=family==='bloodhound'&&['poison','both'].includes(fx.hunterAilment)?palettes.venom:palettes[family],x=Math.round(fx.x),y=Math.round(fx.y),r=fx.radius||60,t=Math.min(1,(fx.age||0)/(fx.ttl||.4)),time=fx.phaseTime??t,id=fx.abilityId||fx.kind;
 if(x-camera.x< -600||y-camera.y< -600||x-camera.x>c.canvas.width+600||y-camera.y>c.canvas.height+600)return true;
 const g=base||fx.geometry||({tether:'chain',ricochet:fx.phase==='impact'?'impact':'blade',deadfall:fx.phase==='start'?'trap':'snap',vault:'dash',execution:'empower'}[fx.profile]||'impact');
 const dx=fx.dirX??1,dy=fx.dirY||0,ex=fx.endX??fx.targetX??fx.x+dx*(fx.range||120),ey=fx.endY??fx.targetY??fx.y+dy*(fx.range||120);
 c.save();c.translate(-Math.round(camera.x),-Math.round(camera.y));c.imageSmoothingEnabled=false;c.globalAlpha*=1-t*.65;
 if(g==='field'||g==='aura'||g==='smoke'){
  if(/BearTrap|Deadfall/.test(id)){ring(c,x,y,r,fx.armed===false?colors[2]:colors[0],32);jaws(c,x,y,colors,true);}
  else if(/SmokeBomb/.test(id)||g==='smoke'){
   ring(c,x,y,r,colors[0],32);for(let i=0;i<16;i++){const a=i*2.399963,d=r*Math.sqrt((i+.5)/16)*.75;P(c,x+Math.cos(a)*d,y+Math.sin(a)*d-((Math.floor(time*8)+i)%3),i%3?colors[2]:colors[0],i%2?5:3);}
  }else ground(c,x,y,r,id,colors,time);
 }else if(g==='trap'||g==='snap'){if(g==='trap')ring(c,x,y,r,colors[0],32);jaws(c,x,y,colors,g==='trap');if(g==='snap')for(let i=0;i<10;i++){const a=i*TAU/10;P(c,x+Math.cos(a)*r*t,y+Math.sin(a)*r*t,colors[i%2],2);}}
 else if(g==='knives'||g==='shot'||g==='volley'||g==='blade'){
  const nx=ex-x,ny=ey-y,d=Math.hypot(nx,ny)||1,ux=nx/d,uy=ny/d,count=g==='volley'?5:g==='knives'?Math.min(3,fx.count||2):1;
  for(let i=0;i<count;i++){const offset=(i-(count-1)/2)*6,px=x+nx*t-uy*offset,py=y+ny*t+ux*offset;tool(c,px,py,ux,uy,colors,g==='knives'||g==='blade');if(g==='volley'&&family==='base')oilFlame(c,px-ux*8,py-uy*8,t+i*.1);}
  if(g==='shot'||g==='volley')handbow(c,x+ux*8,y+uy*8,ux,uy,colors);
 }else if(g==='chain'||g==='dash'){
  const nx=ex-x,ny=ey-y,d=Math.hypot(nx,ny)||1;line(c,x,y,ex,ey,colors[2],3);for(let i=0;i<9;i++){const px=x+nx*i/8,py=y+ny*i/8;line(c,px-2,py-1,px+2,py+1,colors[0],2);}
  if(g==='chain'&&/Ricochet/.test(id))tool(c,ex,ey,nx/d,ny/d,colors,true);
  else if(g==='chain'){line(c,ex-5,ey-4,ex+5,ey+4,colors[1],2);line(c,ex+5,ey+4,ex+5,ey-3,colors[0],2);}
  if(family==='bloodhound')for(let i=0;i<5;i++)P(c,x+nx*i/4,y+ny*i/4+5,colors[0],3);
 }else if(g==='arc'||g==='execute'){
  const angle=Math.atan2(dy,dx),radius=g==='execute'?Math.min(32,r):fx.range||65;for(let i=0;i<28;i++){const a=angle-.8+i/27*1.6;P(c,x+Math.cos(a)*radius,y+Math.sin(a)*radius,colors[2],4);P(c,x+Math.cos(a)*(radius-2),y+Math.sin(a)*(radius-2),colors[1],2);}
  if(g==='execute')quarry(c,x,y,18,colors);
 }else if(g==='fuse'){P(c,x-6,y-5,colors[2],13);P(c,x-4,y-3,colors[0],9);line(c,x+2,y-5,x+6,y-11,colors[1],2);P(c,x+5,y-12,'#e5b26d',3);ring(c,x,y,r,colors[0],36);}
 else if(g==='ward'||g==='empower'||g==='cast'||g==='kindling'||g==='mark'){
  quarry(c,x,y,g==='mark'?12:18,colors);
 }else if(g==='dispel'){for(let i=0;i<4;i++){const a=i*TAU/4+Math.PI/4,d=8+t*25;seal(c,x+Math.cos(a)*d,y+Math.sin(a)*d,4,colors);}}
 else{for(let i=0;i<(g==='blast'||g==='burst'?18:8);i++){const a=i*2.399963,d=(g==='blast'||g==='burst'?r:25)*t,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;P(c,px,py,colors[i%3],i%2?2:3);if(g==='blast'&&family==='base'&&i%4===0)oilFlame(c,px,py,t+i*.1);}}
 c.restore();return true;
}
function jaws(c,x,y,colors,open){const w=18;line(c,x-w,y-7,x+w,y-7,colors[2],5);line(c,x-w,y+8,x+w,y+8,colors[0],3);for(let i=-w;i<=w;i+=6){line(c,x+i,y-7,x+i+2,y+(open?-1:3),colors[1],2);line(c,x+i,y+8,x+i+2,y+(open?3:0),colors[1],2);}line(c,x-w,y-7,x-w,y+8,colors[0],2);line(c,x+w,y-7,x+w,y+8,colors[0],2);}
export function drawFellhunterProjectile(c,s,camera){const a=s.a||s.ability||getAbilityById(s.abilityId);if(a?.classId!=='fellhunter'||a.subclassId==='hellstalker')return false;const colors=a.hunterAilment==='poison'?palettes.venom:palettes[a.subclassId||'base'];if(!colors)return false;const dx=s.aim?.x??s.dirX,dy=s.aim?.y??s.dirY;c.save();c.imageSmoothingEnabled=false;tool(c,s.x-camera.x,s.y-camera.y,dx,dy,colors,/Daggers|Line|Blade/.test(a.id));if(a.hunterAilment==='poison')for(let i=1;i<=3;i++)P(c,s.x-camera.x-dx*i*7,s.y-camera.y-dy*i*7+3,colors[0],2);c.restore();return true;}
export function drawFellhunterStatus(c,p,s,camera,now){
 const x=p.x-camera.x,y=p.y-camera.y;c.save();c.imageSmoothingEnabled=false;
 if(s.prey&&s.preyUntil>now)quarry(c,s.prey.x-camera.x,s.prey.y-camera.y+7,18,palettes.bloodhound);
 if(s.empower?.until>now&&s.empower.a.hunterMorph){const colors=palettes[s.empower.a.subclassId];quarry(c,x,y+7,16,colors);}
 c.restore();
}
export function drawFellhunterAffliction(c,e,entry,camera,now){
 if(!entry.ability?.hunterMorph)return false;const x=e.x-camera.x,y=e.y-camera.y;c.save();c.imageSmoothingEnabled=false;
 const bleeds=entry.bleeds?.length||0,venoms=entry.venoms?.length||0;
 for(let i=0;i<bleeds;i++)P(c,x-14+i*4,y-50,palettes.bloodhound[0],3);
 for(let i=0;i<venoms;i++)P(c,x-10+i*4,y-55,palettes.venom[0],3);
 if(bleeds)for(let i=0;i<2;i++)P(c,x-4+i*7,y+2+(Math.floor(now*3)+i)%5,palettes.bloodhound[0],2);
 if(venoms)for(let i=0;i<3;i++)P(c,x-7+i*7,y-7-((Math.floor(now*3)+i)%4),palettes.venom[1],2);
 c.restore();return true;
}

import {drawPetalStorm} from './petalStormArt.js';
import {drawRoseEruption,drawThornWound} from './roseEruptionArt.js';
import {drawRoseMantle} from './roseMantleArt.js';
// Authored pixel primitives share the game's world coordinates. Ground borders
// use the actual combat radius; no flattened ellipse suggests a smaller hitbox.
const families=new Set(['deathknight','petalknight']),TAU=Math.PI*2;
const palettes={deathknight:['#211e2d','#7d758f','#d8d4df','#563770'],petalknight:['#25151a','#b72b3e','#ee7a76','#476b39']};
const P=(c,x,y,color,n=2)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),n,n);};
function line(c,x,y,u,v,color,n=2){let a=Math.round(x),b=Math.round(y),ex=Math.round(u),ey=Math.round(v),dx=Math.abs(ex-a),dy=-Math.abs(ey-b),sx=a<ex?1:-1,sy=b<ey?1:-1,err=dx+dy;for(let i=0;i<1800;i++){P(c,a,b,color,n);if(a===ex&&b===ey)break;const t=2*err;if(t>=dy){err+=dy;a+=sx;}if(t<=dx){err+=dx;b+=sy;}}}
function ring(c,x,y,r,color,step=3){for(let i=0,n=Math.max(16,Math.ceil(TAU*r/step));i<n;i++){const a=i*TAU/n;P(c,x+Math.cos(a)*r,y+Math.sin(a)*r,color,2);}}
const rose=['000111000','001223100','012332210','123223321','123211321','123323321','012332210','001221100','000110000'];
const bloom=['000110000','001221100','012222210','122343221','122454221','122343221','012222210','001221100','000110000'];
export function drawGardenFlower(c,x,y,family='petalknight',unit=1){
 const red=family==='petalknight',rows=red?rose:bloom,colors=red?['','#30131a','#842132','#c93143','#ee7a76','#ffdfb9']:['','#355137','#adc58b','#fff3d2','#d6ba63','#f9df8e'];
 for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){const k=Number(rows[row][col]);if(k)P(c,x+(col-4)*unit,y+(row-4)*unit,colors[k],unit);}
}
function cleaver(c,x,y,dir=0,unit=1){const p=palettes.deathknight,dx=Math.cos(dir),dy=Math.sin(dir),nx=-dy,ny=dx;line(c,x-dx*9*unit,y-dy*9*unit,x+dx*8*unit,y+dy*8*unit,p[0],4*unit);line(c,x-dx*8*unit,y-dy*8*unit,x,y,p[1],2*unit);for(let i=0;i<9;i++)line(c,x+dx*i*unit,y+dy*i*unit,x+dx*i*unit+nx*5*unit,y+dy*i*unit+ny*5*unit,i%3?p[1]:p[2],unit);line(c,x+nx*5*unit,y+ny*5*unit,x+dx*8*unit+nx*5*unit,y+dy*8*unit+ny*5*unit,p[2],unit);}
function vine(c,x,y,u,v,family,thorns=true){const p=palettes[family],dx=u-x,dy=v-y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d;line(c,x,y,u,v,p[0],3);line(c,x,y,u,v,p[3],1);for(let i=1,n=Math.max(2,Math.floor(d/15));i<n;i++){const px=x+dx*i/n,py=y+dy*i/n,side=i%2?1:-1;line(c,px,py,px+nx*side*(thorns?7:4),py+ny*side*(thorns?7:4),p[thorns?2:1],1);}}
const grounds=new Map();
function ground(family,radius,skill){
 const r=Math.max(24,Math.round(radius)),key=`${family}:${r}:${skill}`;if(grounds.has(key))return grounds.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=r*2+30;const c=canvas.getContext('2d'),o=r+15,p=palettes[family];c.imageSmoothingEnabled=false;
 c.globalAlpha=.45;ring(c,o,o,r,p[0]);c.globalAlpha=.85;ring(c,o,o,r,p[1],5);
 if(family==='deathknight'){
  for(let i=0;i<6;i++){const a=i*TAU/6,x=o+Math.cos(a)*r*.84,y=o+Math.sin(a)*r*.84;line(c,x,y+9,x,y-13,p[1],3);line(c,x-5,y-7,x+5,y-7,p[2],2);P(c,x-3,y-13,p[0],7);}cleaver(c,o,o,-.8,2);
 }else{
  if(family==='petalknight')for(let arm=0;arm<6;arm++){
   let prior={x:o,y:o};for(let segment=1;segment<=5;segment++){const a=arm*TAU/6+(segment%2?.13:-.13),d=r*segment*.16,next={x:o+Math.cos(a)*d,y:o+Math.sin(a)*d};vine(c,prior.x,prior.y,next.x,next.y,family);prior=next;}
  }
  const count=family==='petalknight'?32:28;for(let i=0;i<count;i++){const a=i*2.3999632297,d=r*Math.sqrt((i+.7)/count)*.87,x=o+Math.cos(a)*d,y=o+Math.sin(a)*d;vine(c,x-4,y+7,x+4,y+3,family,family==='petalknight');drawGardenFlower(c,x,y,family,i%2===0?2:1);}for(let i=0;i<8;i++){const a=i*TAU/8;vine(c,o+Math.cos(a)*r*.78,o+Math.sin(a)*r*.78,o+Math.cos(a)*r*.94,o+Math.sin(a)*r*.94,family,family==='petalknight');}
 }
 if(grounds.size>=24)grounds.delete(grounds.keys().next().value);grounds.set(key,canvas);return canvas;
}
export function gardenGroundCacheSize(){return grounds.size;}
export function drawGardenGraveEffect(c,fx,camera){
 if(fx.geometry==='petalStorm'){drawPetalStorm(c,fx,camera);return true;}
 if(fx.geometry==='roseEruption'){drawRoseEruption(c,fx,camera);return true;}
 if(fx.geometry==='roseMantle'){drawRoseMantle(c,fx,camera);return true;}
 const family=fx.subclassId||(fx.form==='deathknight'?fx.form:null);if(!families.has(family))return false;
 const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),r=fx.radius||32,t=Math.min(1,(fx.age||0)/(fx.ttl||.35)),time=fx.phaseTime||t,g=fx.geometry,p=palettes[family];
 if(x< -650||y< -650||x>c.canvas.width+650||y>c.canvas.height+650)return true;
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha*=Math.max(0,1-t*.85);
 const symbol=(px,py,n=1)=>family==='deathknight'?cleaver(c,px,py,-.7,n):drawGardenFlower(c,px,py,family,n);
 if(g==='bloomMend'){c.globalAlpha*=.35;P(c,x-5,y-3-Math.floor(t*5),p[2],2);P(c,x+4,y-Math.floor(t*4),p[1],1);}
 else if(g==='field'||g==='aura'){
  if(fx.armed===false&&family==='petalknight'){vine(c,x,y+9,x,y-2,family);P(c,x-4,y-7,p[0],8);P(c,x-3,y-6,p[1],6);P(c,x-1,y-5,p[2],2);}
  else{c.globalAlpha=.88;const a=ground(family,r,fx.abilityId||'');c.drawImage(a,x-r-15,y-r-15);for(let i=0;i<8;i++){const ang=i*TAU/8+Math.floor(time*5)/12,d=r*(.35+(i%3)*.2);if(family==='deathknight')cleaver(c,x+Math.cos(ang)*d,y+Math.sin(ang)*d,ang+Math.PI/2,1);else{P(c,x+Math.cos(ang)*d,y+Math.sin(ang)*d,p[2],2);}}}
 }else if(['dash','chain','roseReflection'].includes(g)){
  const ex=Math.round((fx.endX??fx.x)-camera.x),ey=Math.round((fx.endY??fx.y)-camera.y);
  if(family==='petalknight'){vine(c,x,y,ex,ey,family);for(let i=1;i<=3;i++)drawGardenFlower(c,x+(ex-x)*i/4,y+(ey-y)*i/4,family,1);}
  else{line(c,x,y,ex,ey,p[3],4);for(let i=0;i<9;i++)P(c,x+(ex-x)*i/8,y+(ey-y)*i/8+(i%2?3:-3),p[i%2?1:2],2);symbol(ex,ey,2);}
 }else if(['arc','cleave','soulSlash','deathSentence'].includes(g)){
  const angle=Math.atan2(fx.dirY||0,fx.dirX??1),radius=g==='deathSentence'?28:Math.min(110,fx.range||r),start=angle-1;
  for(let i=0;i<34;i++){const a=start+i/33*2,rr=radius*(.8+t*.2);P(c,x+Math.cos(a)*rr,y+Math.sin(a)*rr,p[0],4);P(c,x+Math.cos(a)*(rr-2),y+Math.sin(a)*(rr-2),p[2],2);if(i%5===0)line(c,x+Math.cos(a)*(rr-8),y+Math.sin(a)*(rr-8),x+Math.cos(a)*(rr+5),y+Math.sin(a)*(rr+5),p[1],2);}
  if(family==='petalknight')for(let i=0;i<3;i++)drawGardenFlower(c,x+Math.cos(angle+(i-1)*.6)*radius*.75,y+Math.sin(angle+(i-1)*.6)*radius*.75,family,1);else cleaver(c,x+Math.cos(angle)*radius*.55,y+Math.sin(angle)*radius*.55,angle,2);
 }else if(['ward','ritual','arrival'].includes(g)){
  ring(c,x,y+6,Math.min(45,r)*(g==='arrival'?.6+t*.4:1),p[1],4);for(let i=0;i<4;i++)symbol(x+Math.cos(i*TAU/4)*26,y+Math.sin(i*TAU/4)*15-9,1);
 }else if(g==='mark')symbol(x,y-6,g==='mark'?2:1);
 else if(g==='cast'){symbol(x,y-18,1);for(let i=0;i<4;i++){const a=i*TAU/4;P(c,x+Math.cos(a)*14,y-18+Math.sin(a)*10,p[1],2);}}
 else{
  const big=g==='burst',radius=big?r:18;
  for(let i=0;i<(big?18:7);i++){const a=i*2.39996,d=radius*(.15+t*.85);P(c,x+Math.cos(a)*d,y+Math.sin(a)*d,p[i%3],i%3===0?3:2);if(family==='petalknight'){if(i%3===0)drawGardenFlower(c,x+Math.cos(a)*d,y+Math.sin(a)*d,family,1);}}
  symbol(x,y-6,big?2:1);
 }
 c.restore();return true;
}
export function drawGardenProjectile(c,shot,camera){
 if(!shot.a.gardenGraveMorph)return false;const f=shot.a.subclassId,p=palettes[f],x=shot.x-camera.x,y=shot.y-camera.y,aim=shot.aim;
 c.save();c.imageSmoothingEnabled=false;line(c,x-aim.x*20,y-aim.y*20,x,y,p[3],2);
 if(f==='petalknight'){vine(c,x-aim.x*25,y-aim.y*25,x+aim.x*7,y+aim.y*7,f);drawGardenFlower(c,x,y,f,1);}
 else drawGardenFlower(c,x,y,f,1);c.restore();return true;
}
export function drawGardenStatus(c,p,state,camera,now){
 const g=state.roseGuard;if(g?.until>now){for(let i=0;i<3;i++){const a=i*TAU/3-1.5,x=p.x-camera.x+Math.cos(a)*21,y=p.y-camera.y-16+Math.sin(a)*13;c.globalAlpha=i<g.stacks?.85:.3;drawGardenFlower(c,x,y,'petalknight',1);}c.globalAlpha=1;}
 if(p.buffs?.defense?.gardenFamily==='deathknight'&&p.buffs.defense.timer>0){c.globalAlpha=.65;cleaver(c,p.x-camera.x-21,p.y-camera.y-14,-1.5,1);cleaver(c,p.x-camera.x+21,p.y-camera.y-14,-1.5,1);c.globalAlpha=1;}
}
export function drawGardenAffliction(c,e,entry,camera){
 const f=entry.ability?.subclassId;if(!entry.ability?.gardenGraveMorph)return false;
 const x=e.x-camera.x,y=e.y-camera.y-48;
 if(entry.thornWound){drawThornWound(c,Math.round(x+18),Math.round(y+8));return true;}
 for(let i=0;i<Math.min(3,entry.stacks);i++){if(f==='deathknight')cleaver(c,x-12+i*12,y,-1,1);else if(f==='petalknight')drawGardenFlower(c,x-10+i*10,y,f,1);}
 if(entry.mark)f==='deathknight'?cleaver(c,x,y-10,-.7,1):drawGardenFlower(c,x,y-10,f,1);
 return true;
}

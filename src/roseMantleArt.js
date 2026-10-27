import {drawGardenFlower} from './gardenGraveArt.js';
import {getRoseMantle} from './roseMantleSystem.js';
const TAU=Math.PI*2,ink='#22131c',red='#b12b44',pink='#f0898b',green='#597441';
let flower=null;
function flowerStamp(){if(!flower){flower=document.createElement('canvas');flower.width=flower.height=13;drawGardenFlower(flower.getContext('2d'),6,6,'petalknight',1);}return flower;}
const pixel=(c,x,y,color,n=2)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),n,n);};
function strand(c,r,ry,phase,height){
 for(let i=0;i<52;i++){
  const a=phase+i*TAU/52,x=Math.cos(a)*r,y=Math.sin(a)*ry-height+i/52*9;
  pixel(c,x,y,ink,3);pixel(c,x+1,y+1,i%4===0?pink:green,1);
  if(i%8===0)pixel(c,x+Math.cos(a)*5,y-3,red,2);
 }
}
export function drawRoseMantle(c,fx,camera){
 const m=fx.mantleVisual;if(!m?.active)return;
 const now=m.startedAt+m.elapsed,remaining=m.until-now;if(remaining<=0)return;
 const time=Math.floor(m.elapsed*16)/16,charge=m.a._charge?.level||0;
 for(const actor of m.members){
  if(m.world?.networkGuest?(!actor||actor.hp<=0||m.until<=now):getRoseMantle(actor,now,m.world)!==m)continue;
  const player=actor===m.owner,elder=['elderThornbeast','thornTitan'].includes(actor.evolutionStage),r=elder?65:player?36:29,ry=elder?26:player?17:14;
  c.save();c.imageSmoothingEnabled=false;c.translate(Math.round(actor.x-camera.x),Math.round(actor.y-camera.y));c.globalAlpha*=Math.min(1,remaining/.45);
  if(fx.layer==='behind'){
   c.globalAlpha*=.7;for(let i=0;i<3;i++)strand(c,r-i*3,ry,time*(i%2?-1.9:1.6)+i*1.2,elder?25+i*13:12+i*13);
  }
  // Front and back halves give the roses a readable wrap around the body.
  const count=player?8:5;
  for(let i=0;i<count;i++){
   const a=i*TAU/count+time*2.1,front=Math.sin(a)>=0;if(front!==(fx.layer==='front'))continue;
   const height=player?21:elder?28:17,unit=player&&charge===2&&i%2===0?2:1;
   const x=Math.round(Math.cos(a)*r),y=Math.round(Math.sin(a)*ry-height+Math.sin(a*2-time)*6);
   c.drawImage(flowerStamp(),x-6*unit,y-6*unit,13*unit,13*unit);
  }
  // Small petals rise between the ribbons. The player's face stays clear,
  // with no healing numbers or repeated full-screen healing flashes.
  for(let i=0;i<(player?10:4);i++){
   const a=i*2.39996+time*1.6,front=Math.sin(a)>0;if(front!==(fx.layer==='front'))continue;
   const x=Math.cos(a)*(r+5),y=Math.sin(a)*ry-8-((time*20+i*7)%38);
   pixel(c,x-1,y-1,ink,4);pixel(c,x,y,i%3===0?pink:red,2);
  }
  if(m.elapsed<.28&&fx.layer==='behind'){
   const radius=(elder?55:30)*(m.elapsed/.28);for(let i=0;i<24;i++){const a=i*TAU/24;pixel(c,Math.cos(a)*radius,Math.sin(a)*radius*.6,pink,2);}
  }
  c.restore();
 }
}

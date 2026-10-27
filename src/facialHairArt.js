import {humanHeadLayout} from './humanHeadLayout.js';
export function drawFacialHairArt(ctx,parts){
 const kind=parts.appearanceCosmetics?.facialHair;
 if(!['stubble','shortBeard','fullBeard'].includes(kind)||parts.facing==='up')return true;
 const h=humanHeadLayout(parts),sideView=h.col!==0;
 const width=h.faceWidth*(sideView?.65:.8),height=(kind==='fullBeard'?5:kind==='shortBeard'?3:1.5)*(parts.bodyType==='female'?.9:1);
 const x=sideView?(h.mouth.x+h.chin.x)/2-h.side*1:h.mouth.x;
 const top=h.mouth.y+.5;
 ctx.save();ctx.fillStyle=parts.hair||'#35271f';ctx.globalAlpha=kind==='stubble'?.38:.95;
 if(kind==='stubble'){
  for(let dx=-Math.floor(width/2);dx<=width/2;dx+=2)ctx.fillRect(Math.round(x+dx),Math.round(top+(Math.abs(dx)<2?1:0)),1,1);
 }else{
  ctx.beginPath();ctx.moveTo(Math.round(x-width/2),Math.round(top-1));ctx.lineTo(Math.round(x-width/2+1),Math.round(top+height-1));ctx.lineTo(Math.round(x),Math.round(top+height));ctx.lineTo(Math.round(x+width/2-1),Math.round(top+height-1));ctx.lineTo(Math.round(x+width/2),Math.round(top-1));ctx.lineTo(Math.round(x+1),Math.round(top+1));ctx.lineTo(Math.round(x-1),Math.round(top+1));ctx.closePath();ctx.fill();
 }
 ctx.restore();return true;
}


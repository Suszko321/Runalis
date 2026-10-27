import {humanHeadLayout} from './humanHeadLayout.js';
export const FACE_DETAIL_ROWS=Object.freeze({scar:1,freckles:2,briarMark:3,sunMark:4,tideMark:5});
export function drawFaceDetailArt(ctx,parts){
 if(parts.facing==='up')return true;
 const marking=parts.appearanceCosmetics?.marking;if(!FACE_DETAIL_ROWS[marking])return true;
 const h=humanHeadLayout(parts),side=h.side,sideView=h.col!==0;
 const x=sideView?h.mouth.x-side*2:h.mouth.x+3,y=h.eyes[0].y+3;
 ctx.save();ctx.fillStyle=marking==='scar'?'#b67b65':parts.appearanceCosmetics.accent||'#ac9e6d';ctx.globalAlpha=.65;
 const dot=(dx,dy)=>ctx.fillRect(Math.round(x+dx),Math.round(y+dy),1,1);
 if(marking==='freckles'){dot(-1,0);dot(1,1);if(!sideView){dot(-6,0);dot(-4,1);}}
 else if(marking==='scar'){dot(0,-1);dot(0,0);dot(-1,1);}
 else if(marking==='sunMark'){dot(0,-3);dot(-1,-2);dot(1,-2);dot(0,-1);}
 else{dot(-1,0);dot(0,1);dot(1,0);}
 ctx.restore();return true;
}

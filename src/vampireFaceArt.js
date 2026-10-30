import {humanHeadLayout} from './humanHeadLayout.js';
export const hasVampireFace=a=>!!(a?.vampire||a?.raceId==='vampire'||a?.bloodline?.id==='vampire');
export function drawVampireFace(c,actor,parts){
 if(!hasVampireFace(actor)||parts.facing==='up')return;
 const h=humanHeadLayout(parts);c.save();c.imageSmoothingEnabled=false;
 for(const e of h.eyes){const x=Math.round(e.x),y=Math.round(e.y);c.globalAlpha=.25;c.fillStyle='#ff243b';c.fillRect(x-1,y-1,3,3);c.globalAlpha=1;c.fillStyle='#ff1836';c.fillRect(x,y,1,1);}
 const x=Math.round(h.mouth.x),y=Math.round(h.mouth.y);c.fillStyle='#581b2b';c.fillRect(x-3,y,6,1);c.fillStyle='#fff0d9';c.fillRect(x-2,y,1,2);if(h.col===0)c.fillRect(x+2,y,1,2);c.restore();
}

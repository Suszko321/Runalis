import {asset} from './spriteArt.js';

export const HUMAN_IDENTITY_ITEMS=['covenantOfLight','lastDawn','badge','smith','healer','merchant','guard','scholar','laborer','earring','amulet','mask','headband'];
export const HUMAN_IDENTITY_DIRECTIONS=['down','right','up','left'];
// Authored at the body sprite's pixel scale. All cloth starts below the chin.
export function paintHumanIdentityCell(ctx,item,facing,bodyType){
 const side=facing==='left'?-1:1,profile=facing==='left'||facing==='right';
 const half=bodyType==='female'?9:10;
 const pixel=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
 const patch=(x,y,w,h,base,light,shade)=>{
  pixel(x+1,y,w-2,h,shade);pixel(x,y+1,w,h-2,shade);
  pixel(x+1,y+1,w-2,h-2,base);pixel(x+2,y+1,w-4,1,light);
  pixel(x+1,y+2,1,h-4,light);
 };
 const sash=(base,light,shade)=>{
  for(let y=-21;y<2;y++){
   const x=profile?-2:Math.floor(-half+3+(y+21)*.55);
   pixel(x,y,4,1,shade);pixel(x+1,y,2,1,base);
   if(y%3!==0)pixel(x+1,y,1,1,light);
  }
 };
 if(['earring','amulet','mask','headband'].includes(item)){
  if(item==='earring'){pixel(-1,-3,1,4,'#d2b472');pixel(-2,0,3,2,'#ae803c');pixel(-1,0,1,1,'#f2d99b');}
  if(item==='amulet'){for(let i=0;i<4;i++){pixel(-4+i,-4+i,1,1,'#b7965e');pixel(3-i,-4+i,1,1,'#b7965e');}patch(-2,0,4,4,'#ba944e','#efcf83','#78603f');}
  if(item==='mask'){patch(-6,-2,12,4,'#666365','#a18f71','#49464b');pixel(-3,0,6,1,'#847c76');}
  if(item==='headband'){pixel(-7,-1,14,2,'#ac8747');pixel(-6,-1,12,1,'#e0c484');pixel(5,1,2,2,'#816a46');}
 }else if(item==='covenantOfLight'){
  const w=profile?12:half*2+4,x=-w/2;
  patch(x,-22,w,7,'#c8bda0','#eee3c6','#897d65');
  pixel(x+3,-19,2,3,'#ac9d7b');pixel(x+w-5,-19,2,3,'#ac9d7b');
  if(facing!=='up'){patch(profile?side*3-1:-2,-19,4,4,'#b78a39','#edd17e','#765b31');
   pixel(profile?side*3:0,-14,1,5,'#d4b45e');pixel(profile?side*3-1:-2,-12,3,1,'#d4b45e');}
 }else if(item==='lastDawn'){
  sash('#58616a','#92969a','#39434e');
  if(facing!=='up')patch(profile?-2:-4,-17,5,5,'#9c8260','#d1b78c','#60594b');
 }else if(item==='badge')patch(profile?side*3-2:-2,-18,4,5,'#a68d55','#e0cb8b','#6d6044');
 else if(item==='smith'){
  const w=profile?11:half*2-4;patch(-Math.floor(w/2),-17,w,21,'#795438','#a67b51','#4c382b');
  pixel(-Math.floor(w/2)+2,-13,1,10,'#8b6543');patch(-3,-5,6,6,'#654731','#97704b','#4c382b');
  pixel(-2,-5,4,1,'#b39262');
 }else if(item==='healer'||item==='scholar'){
  const x=profile?-side*7-3:item==='healer'?-half-2:half-5;
  patch(x,-3,7,9,item==='healer'?'#8e7050':'#6f6551','#c1a475','#514b3e');
  if(item==='healer'){pixel(x+3,-1,1,5,'#ece1bf');pixel(x+1,1,5,1,'#ece1bf');}
  else {pixel(x+2,-1,3,5,'#c9b993');pixel(x+1,-1,1,6,'#a58b5d');}
 }else if(item==='merchant')sash('#b18a4e','#dbb96b','#80663f');
 else if(item==='guard'){
  for(const x of profile?[-6]:[-half-3,half-4]){
   patch(x,-22,7,7,'#78848b','#bbc2c2','#454f59');
   pixel(x+2,-17,4,1,'#a09677');pixel(x+2,-20,1,1,'#ddd0a5');
  }
 }else if(item==='laborer'){
  for(const x of profile?[-3]:[-half+4,half-5]){
   pixel(x,-21,3,21,'#5d4a35');pixel(x+1,-21,1,20,'#aa8755');patch(x-1,-8,4,4,'#a68d59','#ddc38a','#706044');
  }
 }
}

export function drawHumanIdentityArt(ctx,{bodyType='male',facing='down',bob=0,visualFactionId,professionId}){
 const a=asset('human-identity');if(!a?.ready)return false;
 const column=HUMAN_IDENTITY_DIRECTIONS.indexOf(facing)+(bodyType==='female'?4:0);
 for(const item of [visualFactionId?(HUMAN_IDENTITY_ITEMS.includes(visualFactionId)?visualFactionId:'badge'):null,professionId]){
  const row=HUMAN_IDENTITY_ITEMS.indexOf(item);if(row<0)continue;
  ctx.drawImage(a.image,column*48,row*48,48,48,-24,-24+bob,48,48);
 }
 return true;
}
asset('human-identity');

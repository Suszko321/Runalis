import {humanHeadLayout} from './humanHeadLayout.js';
import {WEARABLE_CATALOGUE_ART} from './playerWearableCatalogue.js';
import {ENDGAME_WEARABLE_ART} from './endgameEquipmentData.js';
const fittings={
 patchedRoadLeathers:{sheet:'player-wearables-first-pass',row:1,part:1,color:'#775337'},
 graveboundGreaves:{sheet:'player-wearables-first-pass',row:2,part:2},
 graveboundHelm:{sheet:'player-wearables-first-pass',row:0,part:0}
};
for(const faction of ['Covenant','LastDawn'])for(const [row,part]of ['Helm','Chest','Legs','Robe','ScoutHelm','ScoutChest'].entries()){
 fittings[`enemy${faction}${part}`]={sheet:`player-wearables-${faction==='Covenant'?'covenant':'last-dawn'}`,row,part:part.includes('Helm')?0:part==='Legs'?2:1,rows:6,
  color:part==='ScoutChest'?'#66503b':faction==='Covenant'?'#b8b8ae':'#49373c'};
}
Object.assign(fittings,WEARABLE_CATALOGUE_ART);
Object.assign(fittings,ENDGAME_WEARABLE_ART);
Object.assign(fittings,{
 apprenticeRobe:fittings.necromancerRobe,
 reinforcedLeatherCap:fittings.brigandMask,
 reinforcedLeatherLeggings:fittings.watcherGreaves,
 rivetedIronCuirass:fittings.knightChest,
 rivetedIronGreaves:fittings.ironGreaves
});
for(const fit of Object.values(fittings))fit.iconColumns??=fit.rows||3;
export const fittedWearable=id=>fittings[id];
export const fittedChest=id=>fittings[id]?.part===1;
export const fittedLegs=id=>fittings[id]?.part===2;
export const fittedShirt=id=>fittings[id]?.color||'#775337';
export const wearableId=ref=>typeof ref==='string'?ref:ref?.id;
const pixels=new WeakMap();
const rects=[[[20,8,24,22],[23,33,18,18],[19,48,26,30]],[[21,9,22,21],[24,33,16,18],[20,48,24,30]]];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function sourcePixels(image){
 if(pixels.has(image))return pixels.get(image);
 const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const data=ctx.getImageData(0,0,c.width,c.height).data;pixels.set(image,data);return data;
}
// Material transfer changes RGB only. Source alpha, limb positions, outlines,
// frame choice and the existing body/weapon animation remain authoritative.
export function applyFittedPlayerGarments(frame,original,bodyType,equipment,images){
 const chest=fittedChest(wearableId(equipment?.chest)),legs=fittedLegs(wearableId(equipment?.legs));if(!chest&&!legs)return;
 const body=bodyType==='female'?1:0,width=frame.width,data=frame.data;
 for(let row=0;row<4;row++)for(let col=0;col<width/64;col++){
  const legBounds=[{left:64,right:0,top:80,bottom:0},{left:64,right:0,top:80,bottom:0}];
  if(legs)for(let y=54;y<80;y++)for(let x=12;x<53;x++){
   const i=((row*80+y)*width+col*64+x)*4;if(original[i+3]<128)continue;
   const r=original[i],g=original[i+1],b=original[i+2];if(Math.max(r,g,b)<28||y<63&&Math.max(r,g,b)-Math.min(r,g,b)>=27)continue;
   const box=legBounds[x<32?0:1];box.left=Math.min(box.left,x);box.right=Math.max(box.right,x);box.top=Math.min(box.top,y);box.bottom=Math.max(box.bottom,y);
  }
  for(let y=33;y<80;y++)for(let x=0;x<64;x++){
   const i=((row*80+y)*width+col*64+x)*4,r=original[i],g=original[i+1],b=original[i+2],max=Math.max(r,g,b);
   if(original[i+3]<128||max<28)continue;
   const warm=r>g*1.12&&g>b*1.08,skin=warm&&r>155&&g>92&&y<57;
   let part=-1,u=0,v=0;
   if(chest&&!skin&&warm&&r<180&&y>=35&&y<51&&x>=22&&x<=44){part=1;u=(x-(row===1||row===3?27:23))/(body?16:18);v=(y-34)/17;}
   else if(legs&&!skin&&(y>=51&&y<63&&max-Math.min(r,g,b)<27||y>=63&&warm)){
    part=2;const half=x<32?0:1,box=legBounds[half];
    u=(half+clamp((x-box.left)/Math.max(1,box.right-box.left),0,1))/2;
    v=clamp((y-51)/Math.max(1,box.bottom-51),0,1);
   }
   if(part<0)continue;
   const slot=part===1?'chest':'legs',fit=fittedWearable(wearableId(equipment?.[slot])),image=images[slot];if(!image)continue;
   const source=sourcePixels(image);
   const [rx,ry,rw,rh]=rects[body][part],tx=clamp(Math.round(u*(rw-1)),0,rw-1),ty=clamp(Math.round(v*(rh-1)),0,rh-1);
   const n=(((body*(fit.rows||3)+fit.row)*80+ry+ty)*image.width+row*64+rx+tx)*4;
   if(source[n+3]<128)continue;
   const light=part===1?clamp(.8+(r+g+b)/1075,.85,1.08):clamp(.8+(r+g+b)/1200,.82,1.03);
   for(let k=0;k<3;k++)data[i+k]=Math.round(source[n+k]*light);
  }
 }
}
export function drawFittedPlayerHelm(ctx,image,facing,x,y,bob,pose,fit={row:0,rows:3},profile={}){
 if(!image)return false;
 const body=pose.bodyType==='female'?1:0,col={down:0,right:1,up:2,left:3}[facing]??0;
 const [rx,ry,w,h]=fit.rects?.[body]||rects[body][0],head=humanHeadLayout({...pose,facing,bob}),eye=head.at(24,head.eyeY);
 const hasCowl=profile.silhouette==='hood'||fit.neckStyle==='cowl';
 // Seat cloth hoods closer to the collar while keeping the cowl hem on the shoulders.
 const top=Math.round(y+eye.y-(body?16:17)+(fit.headOffset||0)+(hasCowl?5:0));
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(hasCowl)drawHoodCowl(ctx,image,col*64+rx,(body*(fit.rows||3)+fit.row)*80+ry,w,h,x+head.originX,y,bob,head,body,facing,top);
 ctx.drawImage(image,col*64+rx,(body*(fit.rows||3)+fit.row)*80+ry,w,h,Math.round(x-w/2+head.originX),top,w,h);ctx.restore();return true;
}
const cowlPalettes=new WeakMap();
// Extend cloth with the actual cell's colours, including faction/endgame hues.
// Do not sample the central face opening or recolour the original head sprite.
function hoodPalette(image,sx,sy,w,h){
 let cache=cowlPalettes.get(image);if(!cache){cache=new Map();cowlPalettes.set(image,cache);}const key=`${sx},${sy},${w},${h}`;if(cache.has(key))return cache.get(key);
 const data=sourcePixels(image),colors=new Map();
 for(let yy=Math.floor(h/2);yy<h;yy++)for(let xx=0;xx<w;xx++){
  if(xx>w*.3&&xx<w*.7)continue;const i=((sy+yy)*image.width+sx+xx)*4;if(data[i+3]<128)continue;
  const rgb=[data[i],data[i+1],data[i+2]],value=rgb.join(','),entry=colors.get(value)||{color:`rgb(${value})`,light:(rgb[0]+rgb[1]+rgb[2])/3,count:0};entry.count++;colors.set(value,entry);
 }
 const ramp=[...colors.values()].sort((a,b)=>a.light-b.light),material=ramp.filter(c=>c.light>30&&c.light<185).sort((a,b)=>b.count-a.count),base=material[0]||ramp[Math.floor(ramp.length/2)];
 if(!base)return null;const palette={base:base.color,ink:ramp[0].color,shadow:(ramp.filter(c=>c.light>20&&c.light<base.light*.8).pop()||ramp[0]).color,light:(ramp.find(c=>c.light>base.light*1.15&&c.light<base.light*1.8)||base).color};cache.set(key,palette);return palette;
}
function drawHoodCowl(ctx,image,sx,sy,w,h,x,y,bob,head,body,facing,top){
 const p=hoodPalette(image,sx,sy,w,h);if(!p)return;
 const side=facing==='left'||facing==='right',start=Math.round(Math.min(top-y+h-4,head.chin.y-2)),end=Math.round(bob-19),chin=head.chin.y;
 for(let row=start;row<=end;row++){
  const t=(row-start)/Math.max(1,end-start),half=Math.round((side?6:8)+t*(side?2:body?3:4));
  const opening=facing==='up'?0:Math.min(side?2:4,Math.max(0,Math.ceil(chin+1-row)));
  for(let col=-half;col<=half;col++){
   const hem=end-Math.floor(Math.abs(col)/(side?4:5));if(row>hem)continue;
   if(Math.abs(col)<opening)continue;
   ctx.fillStyle=Math.abs(col)===half||row===hem?p.ink:col===-half+1?p.light:col>half-3||Math.abs(col)===opening?p.shadow:p.base;
   ctx.fillRect(Math.round(x)+col,Math.round(y)+row,1,1);
  }
 }
}

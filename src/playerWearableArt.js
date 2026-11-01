import {humanHeadLayout} from './humanHeadLayout.js';
export const fittedChest=id=>id==='patchedRoadLeathers';
export const fittedLegs=id=>id==='graveboundGreaves';
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
export function applyFittedPlayerGarments(frame,original,bodyType,equipment,image){
 const chest=fittedChest(wearableId(equipment?.chest)),legs=fittedLegs(wearableId(equipment?.legs));if(!chest&&!legs||!image)return;
 const source=sourcePixels(image),body=bodyType==='female'?1:0,width=frame.width,data=frame.data;
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
   const [rx,ry,rw,rh]=rects[body][part],tx=clamp(Math.round(u*(rw-1)),0,rw-1),ty=clamp(Math.round(v*(rh-1)),0,rh-1);
   const n=(((body*3+part)*80+ry+ty)*image.width+row*64+rx+tx)*4;
   if(source[n+3]<128)continue;
   const light=part===1?clamp(.8+(r+g+b)/1075,.85,1.08):clamp(.8+(r+g+b)/1200,.82,1.03);
   for(let k=0;k<3;k++)data[i+k]=Math.round(source[n+k]*light);
  }
 }
}
export function drawFittedPlayerHelm(ctx,image,facing,x,y,bob,pose){
 if(!image)return false;
 const body=pose.bodyType==='female'?1:0,col={down:0,right:1,up:2,left:3}[facing]??0;
 const [rx,ry,w,h]=rects[body][0],head=humanHeadLayout({...pose,facing,bob}),eye=head.at(24,head.eyeY);
 const top=Math.round(y+eye.y-(body?16:17));
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(image,col*64+rx,body*3*80+ry,w,h,Math.round(x-w/2+head.originX),top,w,h);ctx.restore();return true;
}

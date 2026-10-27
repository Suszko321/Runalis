import {asset} from './spriteArt.js';
import {humanHeadLayout} from './humanHeadLayout.js';
const variants=new Map();
const faceMasks=new WeakMap();
// The source atlas shares brown tones between hair and facial shading. Colour
// alone cannot distinguish them: protect the lower face and ears in each cell.
function faceMask(image,source){
 if(faceMasks.has(image))return faceMasks.get(image);
 const mask=new Uint8Array(source.length/4),width=image.width;
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){
  const eyeY=[33,34,30,31][row];
  let previousLeft=48,previousRight=-1,previousY=-3;
  for(let y=0;y<48;y++){
   let left=48,right=-1;
   for(let x=0;x<48;x++){
    const i=((row*48+y)*width+col*48+x)*4;
    if(source[i+3]&&source[i]>151&&source[i+1]>92&&source[i]>source[i+1]*1.1){left=Math.min(left,x);right=Math.max(right,x);}
   }
   if(right>=left){previousLeft=left;previousRight=right;previousY=y;}
   else if(y-previousY<=2){left=previousLeft;right=previousRight;}
   for(let x=0;x<48;x++){
    const n=(row*48+y)*width+col*48+x;
    if(row===3||col!==2&&y>=eyeY-3&&right>=left&&x>=left-2&&x<=right+2)mask[n]=1;
   }
  }
 }
 faceMasks.set(image,mask);return mask;
}
function color(value,fallback){return /^#[0-9a-f]{6}$/i.test(value||'')?[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)):fallback;}
export function customHeadReady(){return !!asset('heads-custom')?.ready;}
export function drawCustomHead(ctx,parts){
 const a=asset('heads-custom');if(!a?.ready)return false;
 const key=`${parts.skin}|${parts.hair}|${parts.eyeColor}`;let image=variants.get(key);
 if(!image){
  image=document.createElement('canvas');image.width=a.image.width;image.height=a.image.height;
  const c=image.getContext('2d',{willReadFrequently:true});c.drawImage(a.image,0,0);const pixels=c.getImageData(0,0,image.width,image.height);
  const sourcePixels=new Uint8ClampedArray(pixels.data);
  const face=faceMask(a.image,sourcePixels);
  const skin=color(parts.skin,[217,158,107]),hair=color(parts.hair,[103,61,34]);
  for(let i=0;i<pixels.data.length;i+=4){const d=pixels.data,r=d[i],g=d[i+1],b=d[i+2];if(!d[i+3]||r<35||r<g*1.1)continue;
   // Keep brows, lips and facial ink neutral rather than tinting them as hair.
   if(face[i/4]&&r<115){const ink=Math.round((r+g+b)/3*.65);d[i]=ink;d[i+1]=ink;d[i+2]=ink;continue;}
   const isSkin=r>151&&g>92||!!face[i/4],target=isSkin?skin:hair,level=(r+g+b)/(isSkin?490:205);
   for(let k=0;k<3;k++)d[i+k]=Math.min(255,Math.round(target[k]*Math.max(.3,Math.min(1.4,level))));
  }
  // Tint only the authored iris ink; never paint a second set of eyes.
  const iris=color(parts.eyeColor,[62,46,28]);
  for(const hairStyle of ['short','ponytail','long','shaved'])for(const facing of ['down','right','left']){
   const layout=humanHeadLayout({hairStyle,facing});
   for(const eyeX of layout.eyeXs)for(let yy=layout.eyeY-1;yy<=layout.eyeY;yy++)for(let xx=eyeX;xx<=eyeX+1;xx++){
    const i=((layout.row*48+yy)*image.width+layout.col*48+xx)*4,d=pixels.data;
    if(sourcePixels[i+3]&&Math.max(sourcePixels[i],sourcePixels[i+1],sourcePixels[i+2])<115){for(let k=0;k<3;k++)d[i+k]=Math.round(iris[k]*.65);}
   }
  }
  c.putImageData(pixels,0,0);if(variants.size>=32)variants.delete(variants.keys().next().value);variants.set(key,image);
 }
 const {row,col,scale,originX,originY}=humanHeadLayout(parts);
 ctx.save();ctx.imageSmoothingEnabled=false;
 if(col===2){
  // Arm replacement crops away the body's authored neck. Restore a short
  // skin sprite behind the back of the head and overlap the armour seam.
  const width=parts.bodyType==='female'?4:5;
  ctx.drawImage(image,2*48+22,3*48+30,4,6,-width/2,-28+(parts.bob||0),width,7);
 }
 ctx.drawImage(image,col*48,row*48,48,48,originX-24*scale,originY,48*scale,48*scale);ctx.restore();return true;
}
asset('heads-custom');

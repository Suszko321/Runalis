// Facial landmarks in the packed 48px head cells. Cosmetics share this geometry.
export function humanHeadLayout(parts){
 const style=parts.hairStyle==='tied'?'ponytail':parts.hairStyle||'short';
 const row={short:0,ponytail:1,long:2,shaved:3}[style]??0;
 const col={down:0,right:1,up:2,left:3}[parts.facing]??0;
 const scale=(parts.bodyType==='female'?.66:.72)*(style==='shaved'?.84:1),bottom=style==='long'?-19:-23;
 const originY=bottom+(parts.bob||0)-42*scale;
 // The tied head's face is one source pixel left of its atlas cell centre.
 // Centre on the shared torso/equipment anchor, not the asymmetric skin pixels
 // in one unarmoured sprite. The same fit must work with every chest piece.
 const faceCenterX=[24,23,24,24][row];
 const originX=col===0?(24-faceCenterX)*scale:0;
 const eyeY=[33,34,30,31][row],mouthY=[38,38,35,37][row];
 const eyeXs=col===0?[[19,27],[18,26],[19,28],[18,28]][row]:col===1?[[31],[33],[33],[32]][row]:[[15],[14],[14],[15]][row];
 const at=(x,y)=>({x:originX+(x-24)*scale,y:originY+y*scale});
 return {row,col,scale,originX,originY,at,eyes:eyeXs.map(x=>at(x,eyeY)),eyeY,eyeXs,mouth:at(col===0?faceCenterX:col===1?34:12,mouthY),chin:at(col===0?faceCenterX:col===1?31:15,[41,41,38,41][row]),ear:at(col===0?37:col===1?24:24,34),brow:at(faceCenterX,eyeY-5),faceWidth:(col===0?16:11)*scale,side:col===3?-1:1};
}

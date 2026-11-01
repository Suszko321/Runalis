// Native accessory drawings share existing cloak, free-hand and chest anchors.
import {asset} from './spriteArt.js';
import {fittedWearable} from './playerWearableArt.js';
export function drawCatalogueAccessory(ctx,id,facing,x,y,bob=0){
 const fit=fittedWearable(id);if(fit?.part!==3)return false;
 if(fit.kind==='ring'||fit.kind==='charm'&&facing==='up')return true;
 const a=asset(fit.sheet);if(!a?.ready)return false;
 const col={down:0,right:1,up:2,left:3}[facing]??0;
 const side=facing==='left'?-1:facing==='right'?1:0;
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(a.image,col*64+16,fit.row*80+16,32,48,Math.round(x-16+(fit.kind==='charm'||fit.kind==='lantern'?side*4:0)),Math.round(y+bob-(fit.kind==='shield'?16:28)),32,48);
 ctx.restore();return true;
}

import {asset} from './spriteArt.js';
export function drawArchitectureArt(ctx,index,x,y,height=80){
  const a=asset('architecture-core');if(!a?.ready)return false;
  const scale=height/152;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(a.image,index%3*160,Math.floor(index/3)*176,160,176,Math.round(x-80*scale),Math.round(y-170*scale),160*scale,176*scale);
  ctx.restore();return true;
}
asset('architecture-core');

export function drawTownBuildingArt(ctx,index,x,y,height=90,width=null){
  const a=asset('buildings-town');if(!a?.ready)return false;
  const scale=height/184;
  ctx.save();ctx.imageSmoothingEnabled=false;
  const dw=width||192*scale;
  ctx.drawImage(a.image,index%4*192,Math.floor(index/4)*208,192,208,Math.round(x-dw/2),Math.round(y-202*scale),dw,208*scale);
  ctx.restore();return true;
}
asset('buildings-town');

export function drawLandmarkArt(ctx,index,x,y,width,height=width){
  const a=asset('landmarks-modular');if(!a?.ready)return false;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(a.image,index%4*160,Math.floor(index/4)*176,160,176,x-width/2,y-height*170/176,width,height);
  ctx.restore();return true;
}
asset('landmarks-modular');

export function drawTownDetailArt(ctx,index,x,y,width=48,height=56){
  const a=asset('town-details');if(!a?.ready)return false;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(a.image,index%4*96,Math.floor(index/4)*112,96,112,x-width/2,y-height*106/112,width,height);
  ctx.restore();return true;
}
export function drawTownDetailProp(ctx,object,x,y){
  const map={bench:[0,45,30],banner:[1,35,64],woodPile:[3,42,32],weaponRack:[4,45,57],practiceDummy:[5,38,59],forge:[6,58,66],anvil:[7,34,34],alchemyTable:[8,52,45],contractTable:[9,52,42],candleCluster:[10,28,42],guardPost:[12,45,64],laundryLine:[13,Number(object.width||4)*32,48],herbPlanter:[14,50,35]};
  const config=map[object.propType],scale=Number(object.scale||1);
  if(config)return drawTownDetailArt(ctx,config[0],x,y+12*scale,config[1]*scale,config[2]*scale);
  if(['fence','palisade'].includes(object.propType)&&asset('town-details')?.ready){
    const length=Math.max(1,Number(object.length||3))*32,segments=Math.ceil(length/48),vertical=object.orientation==='vertical';
    ctx.save();ctx.translate(x,y);if(vertical)ctx.rotate(Math.PI/2);
    for(let i=0;i<segments;i++)drawTownDetailArt(ctx,object.propType==='fence'?2:11,-length/2+(i+.5)*length/segments,12,length/segments+3,object.propType==='fence'?30:47);
    ctx.restore();return true;
  }
  return false;
}
asset('town-details');

export const ENVIRONMENT_ART=Object.freeze({shrub:[0,32],tallGrassPatch:[1,29],stump:[2,34],deadRoot:[3,38],graveMarker:[4,46],brokenWall:[5,44],ruinPillar:[6,62],smallBoulder:[7,35],signpost:[8,48],ashFruit:[9,28],gravecap:[10,24],reed:[11,32],riverReed:[11,32],campfire:[12,34],bone:[13,22],log:[14,26],runestone:[15,43]});
export function drawEnvironmentProp(ctx,kind,x,y,object={}){
  const config=ENVIRONMENT_ART[kind],a=asset('environment-props');if(!config || !a?.ready)return false;
  const [index,height]=config,scale=height/80*Number(object.scale||1);
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(object.dead)ctx.filter='saturate(.25) brightness(.75)';
  // A held one-pixel sway preserves clusters; shearing changed individual pixel
  // widths continuously and made small vegetation shimmer at rest.
  const sway=['shrub','tallGrassPatch','reed','riverReed'].includes(kind)?Math.round(Math.sin(Math.floor(performance.now()/160)*.12+x*.03)):0;
  ctx.translate(Math.round(x)+sway,Math.round(y+8));
  ctx.drawImage(a.image,index%4*96,Math.floor(index/4)*112,96,112,-48*scale,-106*scale,96*scale,112*scale);
  ctx.restore();return true;
}
asset('environment-props');

// A modular, explicitly pixelated scenery kit. Every new silhouette is built
// from native world-pixel drawings and drawn without image
// smoothing. Art caches do not contain gameplay or alter collision.
import {drawTownBuildingArt} from './environmentArt.js';
import {drawOrrakaiWallArt} from './orrakaiRenderer.js';
import {drawForestKit} from './echorynRenderer.js';
import {makeNativeScenery} from './nativeSceneryArt.js';
import {WORLD_ART_STANDARD} from './worldArtDirection.js';

const MAX_ASSETS=160,pieces=new Map();
const floorPatterns=new WeakMap();
let cacheBytes=0;
const PALETTES={
 frontier:{ink:'#20261e',dark:'#3b4035',stone:'#666950',light:'#93917a',roof:'#5c4233',roofLight:'#866045',gold:'#b39b62',glass:'#879e8c',wood:'#6f5339',green:'#3c523b'},
 timber:{ink:'#231e19',dark:'#3e3428',stone:'#756b53',light:'#a49577',roof:'#614032',roofLight:'#96553e',gold:'#c3a267',glass:'#b19d68',wood:'#795538',green:'#50633e'},
 pass:{ink:'#192622',dark:'#303f35',stone:'#656b58',light:'#939782',roof:'#3d4840',roofLight:'#687763',gold:'#b6a679',glass:'#718f88',wood:'#625139',green:'#273e35'},
 aureate:{ink:'#333832',dark:'#666c5b',stone:'#c7c7a8',light:'#f0e5ba',roof:'#927942',roofLight:'#c3a365',gold:'#d9b95f',glass:'#537f98',wood:'#958362',green:'#698156'},
 imperial:{ink:'#282623',dark:'#48443a',stone:'#827d67',light:'#b8ae90',roof:'#763a38',roofLight:'#ae6250',gold:'#c9a064',glass:'#a38d63',wood:'#826044',green:'#617148'},
 fen:{ink:'#172a28',dark:'#2e4842',stone:'#586554',light:'#8b977c',roof:'#575b3e',roofLight:'#889273',gold:'#ac9f65',glass:'#739b8d',wood:'#685b3e',green:'#416450'},
 cosmic:{ink:'#272631',dark:'#45414e',stone:'#c0c1b3',light:'#e8e3cf',roof:'#767089',roofLight:'#b9afc8',gold:'#c8b978',glass:'#8a89b4',wood:'#656368',green:'#656f68'},
 blackglass:{ink:'#151d25',dark:'#273041',stone:'#4a5764',light:'#889caa',roof:'#3d4557',roofLight:'#778095',gold:'#9cacbd',glass:'#918db5',wood:'#5b6570',green:'#465563'}
};
const KNOWN=new Set(['Court','Wall','House','Granary','Abbey','Tower','Gate','Pine','Willow','Farm','Market','Ruin','Aqueduct','CausewayPier','Spire','Sign','InscribedWall','TimberStack','Wagon','Fountain','Scales','Stairs','Boardwalk','FishRack','ReedBed','WardStakes','Bell','Brazier','Sluice','Cairn']);

export function drawContinentalObject(ctx,o,camera,player=null){
 if(!o?.propType?.startsWith('continent'))return false;
 const type=o.propType.slice(9);if(!KNOWN.has(type))return false;
 const x=Math.round(o.x-camera.x),y=Math.round(o.y-camera.y),w=Math.max(16,Math.round(o.artWidth||96)),h=Math.max(16,Math.round(o.artHeight||128));
 if(x+w/2<-32||x-w/2>ctx.canvas.width+32||y<-32||y-h>ctx.canvas.height+32)return true;
 ctx.save();ctx.imageSmoothingEnabled=false;
 // Roof/pier fading follows proximity behind their own silhouette, and is
 // presentation-only. It cannot remove walls or change traversable space.
 if(o.fadeBehind&&player&&Math.abs(player.x-o.x)<w*.44&&player.y<o.y+8&&player.y>o.y-h)ctx.globalAlpha*=.3;
 if(type==='Wall'&&o.style==='frontier'){
  drawOrrakaiWallArt(ctx,x-w/2,y-h,w,h,!!o.vertical,{x:o.x-x,y:o.y-y});ctx.restore();return true;
 }
 if(type==='House'&&o.useExistingArt&&drawTownBuildingArt(ctx,o.buildingIndex||0,x,y,h,w)){ctx.restore();return true;}
 if(type==='Pine'&&drawForestKit(ctx,o.kitIndex??(o.style==='pass'?4+Number(o.variant||0)%2:1),x,y,w,h)){ctx.restore();return true;}
 if(type==='Willow'&&drawForestKit(ctx,7,x,y,w,h)){ctx.restore();return true;}
 // Large horizontal courts reuse a native material swatch. A whole capital
 // court used 14 MiB by itself and could evict nearby buildings every frame.
 const artW=type==='Court'?140:w,artH=type==='Court'?120:h;
 const key=[type,o.style||'frontier',o.variant||0,artW,artH,!!o.ruined,!!o.openFront,!!o.damaged,!!o.vertical].join(':');
 let bitmap=pieces.get(key);
 if(!bitmap){bitmap=makeNativeScenery(type,{...o,artWidth:artW,artHeight:artH},PALETTES[o.style]||PALETTES.frontier);if(bitmap){
  const bytes=bitmap.width*bitmap.height*4;
  while(pieces.size&&(pieces.size>=MAX_ASSETS||cacheBytes+bytes>WORLD_ART_STANDARD.sceneryCacheBytes)){
   const oldest=pieces.keys().next().value,old=pieces.get(oldest);cacheBytes-=old.width*old.height*4;pieces.delete(oldest);
  }
  // Oversized authored pieces can draw without permanently occupying the cache.
  if(bytes<=WORLD_ART_STANDARD.sceneryCacheBytes){pieces.set(key,bitmap);cacheBytes+=bytes;}
 }}else {pieces.delete(key);pieces.set(key,bitmap);}
 if(bitmap&&type==='Court'){
  let patterns=floorPatterns.get(ctx);if(!patterns){patterns=new WeakMap();floorPatterns.set(ctx,patterns);}
  let pattern=patterns.get(bitmap);if(!pattern){pattern=ctx.createPattern(bitmap,'repeat');patterns.set(bitmap,pattern);}
  ctx.translate(Math.round(x-w/2),y-h);ctx.fillStyle=pattern;ctx.fillRect(0,0,w,h);
 }else if(bitmap)ctx.drawImage(bitmap,Math.round(x-w/2),y-h,w,h);
 ctx.restore();return !!bitmap;
}

export function continentalArtCacheStatus(){return {cachedPieces:pieces.size,maxPieces:MAX_ASSETS,pixelUnit:1,cacheBytes,maxBytes:WORLD_ART_STANDARD.sceneryCacheBytes};}
export function clearContinentalArtCache(){pieces.clear();cacheBytes=0;}

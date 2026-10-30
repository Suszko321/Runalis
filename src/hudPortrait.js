import {drawDialoguePortrait} from './dialoguePortrait.js';
import {drawSummonAsset,getSummonEvolutionStage} from './codeAssets.js';
import {spriteArtStatus} from './spriteArt.js';

const portraits=new Map();
const portraitImages=new Map();
export function drawHudPortrait(ctx,actor,x,y,width,height){
 const url=hudPortraitUrl(actor);
 let image=portraitImages.get(url);
 if(!image){image=new Image();image.src=url;if(portraitImages.size>=48)portraitImages.delete(portraitImages.keys().next().value);portraitImages.set(url,image);}
 if(image.complete&&image.naturalWidth)ctx.drawImage(image,x,y,width,height);
}
export function hudPortraitUrl(actor,owner=null){
 const summon=owner!==null;
 const stage=summon?(actor.evolutionStage||getSummonEvolutionStage(actor.kind,owner)):null;
 const ready=spriteArtStatus().filter(a=>a.ready).length;
 const key=JSON.stringify([ready,summon?['summon',actor.kind,stage]:['human',
  actor.bodyType,actor.hairStyle,actor.skin,actor.hair,actor.shirt,actor.pants,actor.boots,
  actor.classId,actor.appearance,actor.faceStyle,actor.eyeColor,actor.facialHair,
  actor.accessory,actor.cloak,actor.marking,actor.accent,
  actor.equipment?.helm,actor.equipment?.chest]]);
 if(portraits.has(key))return portraits.get(key);
 const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
 const ctx=canvas.getContext('2d');
 if(!summon)drawDialoguePortrait(ctx,{x:0,y:0,w:96,h:96},actor,{portraitZoom:1.15,settings:{reducedMotion:true}});
 else {
  const sprite=document.createElement('canvas');sprite.width=256;sprite.height=256;
  const art=sprite.getContext('2d');
  drawSummonAsset(art,{...actor,evolutionStage:stage,x:0,y:0,attackCooldown:0},owner,128,210);
  const pixels=art.getImageData(0,0,256,256).data;
  let left=256,right=-1,top=256,bottom=-1;
  for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]){
   left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right>=left){
   const width=right-left+1,height=Math.ceil((bottom-top+1)*.62),scale=Math.min(88/width,88/height);
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(sprite,left,top,width,height,(96-width*scale)/2,(96-height*scale)/2,width*scale,height*scale);
  }
 }
 const url=canvas.toDataURL('image/png');
 if(portraits.size>=48)portraits.delete(portraits.keys().next().value);
 portraits.set(key,url);return url;
}
export function hudPortraitMarkup(actor,owner=null){
 return `<img class="hud-actor-portrait" src="${hudPortraitUrl(actor,owner)}" alt="" aria-hidden="true">`;
}

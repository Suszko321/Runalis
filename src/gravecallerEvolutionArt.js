import {asset} from './spriteArt.js';
import {gravecallerMotionPose} from './gravecallerSummonMotion.js';

export const GRAVE_EVOLUTION_ART=Object.freeze({
 skeleton:Object.freeze({width:192,height:112}),
 'bound-specter':Object.freeze({width:160,height:160}),
 'bound-knight':Object.freeze({width:160,height:160}),
 lich:Object.freeze({width:160,height:160}),
 'lich-specter':Object.freeze({width:160,height:160}),
 'lich-knight':Object.freeze({width:192,height:192})
});
export function gravecallerEvolutionFrame(name,tier){
 const profile=GRAVE_EVOLUTION_ART[name];if(!profile||tier===2)return null;
 return {...profile,row:[0,1,-1,2,3][tier],record:asset(`grave-evolution-${name}`)};
}
export function drawGravecallerEvolutionArt(ctx,s,presentation,x,y){
 const name=presentation.graveArt;
 // Standard skeletons retain the existing equipment attachment renderer.
 if(!name||name==='skeleton')return false;
 const profile=gravecallerEvolutionFrame(name,presentation.tier);if(!profile)return false;
 if(!profile.record.ready)return true;
 const {frame,bob,facing}=gravecallerMotionPose(s),{width,height,row}=profile;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(x),Math.round(y+16+bob));ctx.scale(facing,1);
 ctx.drawImage(profile.record.image,frame*width,row*height,width,height,-width/2,-(height-6),width,height);
 ctx.restore();return true;
}
for(const name of Object.keys(GRAVE_EVOLUTION_ART))asset(`grave-evolution-${name}`);

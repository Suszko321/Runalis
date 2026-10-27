// Equipment shares the unarmoured player's pixel anatomy and four gait cells.
// These small cached atlases are presentation only; no actor state is changed.
import {asset} from './spriteArt.js';
import {FACTION_STYLES} from './enemyVisualProfiles.js';
import {getMaterialVisualPalette} from './visualStyle.js';
const armour=new Map(),arms=new Map(),sourcePixels=new WeakMap();
const MAX_ARMOUR=72,MAX_ARMS=48;
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
export function humanoidGearRamp(profile,family){
 const faction=FACTION_STYLES[profile?.faction];
 const material=getMaterialVisualPalette(family==='plate'?'steel':family==='leather'?'leather':'cloth');
 return {ink:'#151316',shadow:faction?'#29272d':family==='leather'?'#39271c':material.shadow,base:faction?.base||(family==='leather'?'#765036':material.base),
  mid:faction?.mid||(family==='leather'?'#ad7850':material.light),light:faction?.light||(family==='leather'?'#d2a06a':material.accent),
  accent:faction?.accent||profile?.accent||'#c49a56',cloth:faction?.cloth||profile?.base||material.base,
  ...(!faction&&family==='cloth'?{shadow:profile?.deep||material.shadow,base:profile?.base||material.base,mid:profile?.mid||material.light,light:profile?.light||material.accent}:{}),
  ...(profile?.mythical?{shadow:profile.deep,base:profile.base,mid:profile.mid,light:profile.light,accent:profile.accent,cloth:profile.base}:{})};
}
function pixels(image){
 if(sourcePixels.has(image))return sourcePixels.get(image);
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
 const data=c.getImageData(0,0,image.width,image.height).data;sourcePixels.set(image,data);return data;
}
function shade(ramp,r,g,b){
 const l=(r+g+b)/3;
 return l<28?ramp.ink:l<60?ramp.shadow:l<100?ramp.base:l<155?ramp.mid:ramp.light;
}
function retain(cache,key,image,limit){if(cache.size>=limit)cache.delete(cache.keys().next().value);cache.set(key,image);return image;}
export function humanArmorImage(profile,family,bodyType='male'){
 const source=asset(bodyType==='female'?'human-female':'human-male');if(!source?.ready)return null;
 const ramp=humanoidGearRamp(profile,family),key=JSON.stringify([bodyType,family,ramp]);if(armour.has(key))return armour.get(key);
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=256;
 const c=canvas.getContext('2d'),out=c.createImageData(384,256),data=pixels(source.image);
 const set=(x,y,color)=>{const i=(y*384+x)*4,v=rgb(color);out.data.set([...v,255],i);};
 for(let row=0;row<4;row++)for(let col=0;col<6;col++){
  const sourceCol=col<4?col:0;
  for(let y=33;y<80;y++){
   // Starter gloves overlap the hip cells; only retain the actual trousers.
   let left=64,right=-1;
   if(y>=50&&y<63)for(let scan=y;scan<=Math.min(62,y+2)&&right<0;scan++)for(let x=16;x<49;x++){
    const i=((row*80+scan)*source.image.width+sourceCol*64+x)*4,r=data[i],g=data[i+1],b=data[i+2];
    if(data[i+3]&&Math.max(r,g,b)-Math.min(r,g,b)<27&&r+g+b>90){left=Math.min(left,x);right=Math.max(right,x);}
   }
   for(let x=0;x<64;x++){
    const i=((row*80+y)*source.image.width+sourceCol*64+x)*4,r=data[i],g=data[i+1],b=data[i+2];
    if(data[i+3]<128||(y>=50&&y<63&&right>=0&&(x<left-1||x>right+1)))continue;
    let color=shade(ramp,r,g,b);
    // Cloth trousers stay darker than boots; retain the base sprite's belt.
    if(y>=51&&y<63&&family==='leather')color=shade({ ...ramp,base:'#494044',mid:'#73626a',light:'#9e8b88'},r,g,b);
    if(y>=47&&y<=50&&r>g*1.2&&g>b*1.1&&r>100)color=r>160?ramp.accent:ramp.shadow;
    set(col*64+x,row*64+y-16,color);
   }
  }
 }
 c.putImageData(out,0,0);
 // A few connected pixel clusters distinguish metal seams from sewn leather.
 // Details are clipped to the authored body, never a second body silhouette.
 c.globalCompositeOperation='source-atop';
 for(let row=0;row<4;row++)for(let col=0;col<6;col++){
  const side=row===1||row===3,x=col*64,y=row*64;
  c.fillStyle=ramp.shadow;c.fillRect(x+(side?32:31),y+22,1,8);
  c.fillStyle=ramp.mid;c.fillRect(x+(side?28:26),y+21,side?3:5,1);
  if(family==='plate'){c.fillStyle=ramp.light;c.fillRect(x+(side?28:26),y+19,side?2:4,1);c.fillStyle=ramp.shadow;c.fillRect(x+25,y+28,14,1);}
  if(family==='leather'){c.fillStyle=ramp.accent;c.fillRect(x+29,y+25,1,1);c.fillRect(x+33,y+28,1,1);}
 }
 c.globalCompositeOperation='source-over';return retain(armour,key,canvas,MAX_ARMOUR);
}
export function humanArmMaterialImage(image,profile,family,skin='#e5b18a'){
 const ramp=humanoidGearRamp(profile,family),key=JSON.stringify([family,ramp,skin]);if(arms.has(key))return arms.get(key);
 const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
 const row=family==='plate'?1:family==='cloth'?2:0;
 const rects=[[[15,10,17,32],[65,12,13,30],[114,29,11,13]],[[15,58,18,32],[66,60,12,30],[114,75,12,15]],[[15,106,18,32],[66,106,12,32],[113,123,13,15]]][row];
 const skinRGB=/^#[0-9a-f]{6}$/i.test(skin)?rgb(skin):rgb('#e5b18a');
 const skinShadow='#'+skinRGB.map(v=>Math.round(v*.62).toString(16).padStart(2,'0')).join('');
 for(let part=0;part<3;part++){
  const [sx,sy,sw,sh]=rects[part],w=part===2?6:8,h=part===2?7:14;
  const piece=document.createElement('canvas');piece.width=w;piece.height=h;const p=piece.getContext('2d');
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const margin=y===0||y===h-1?2:y===1||y===h-2?1:0;if(x<margin||x>=w-margin)continue;
   const bare=family==='leather'&&part!==2&&(part===0?y>8:y<8);
   let color=x===margin||x===w-margin-1||y===0||y===h-1?ramp.ink:x===w-margin-2?(bare?skinShadow:ramp.shadow):(bare?skin:ramp.base);
   if(!bare&&x===margin+1&&y>1&&y<h-3)color=ramp.mid;
   if(!bare&&x===margin+2&&y===2)color=ramp.light;
   if(family==='plate'&&y===h-4&&x>margin&&x<w-margin-1)color=ramp.shadow;
   p.fillStyle=color;p.fillRect(x,y,1,1);
  }
  c.drawImage(piece,0,0,w,h,sx,sy,sw,sh);
 }
 return retain(arms,key,canvas,MAX_ARMS);
}
export function humanEquipmentArtStatus(){return {armourAtlases:armour.size,armAtlases:arms.size,maxArmourAtlases:MAX_ARMOUR,maxArmAtlases:MAX_ARMS};}

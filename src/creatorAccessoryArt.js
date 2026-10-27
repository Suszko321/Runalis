import {HUMAN_IDENTITY_ITEMS} from './humanIdentityArt.js';
import {asset} from './spriteArt.js';
import {ITEMS} from './data.js';
import {getGearVisualProfile} from './gearVisualStyle.js';
import {humanHeadLayout} from './humanHeadLayout.js';
export function drawCreatorAccessoryArt(ctx,id,facing,bob,headLift,accent,headCovered,parts={}){
 if(!['earring','amulet','mask','headband'].includes(id))return false;
 if(facing==='up'||headCovered&&id!=='amulet')return true;
 const h=humanHeadLayout({...parts,facing,bob}),sideView=h.col!==0;
 const a=asset('human-identity');if(!a?.ready)return true;
 const row=HUMAN_IDENTITY_ITEMS.indexOf(id);
 let x=0,y=-18+bob,width=16,height=8;
 if(id==='earring'){x=h.ear.x;y=h.ear.y+3;width=6;height=8;}
 else if(id==='mask'){x=sideView?(h.mouth.x+h.chin.x)/2:h.mouth.x;y=h.mouth.y+1;width=Math.max(6,Math.round(h.faceWidth*.8));height=5;}
 else if(id==='headband'){x=sideView?(h.eyes[0].x+h.ear.x)/2:h.brow.x;y=h.brow.y+1;width=Math.round(h.faceWidth*(sideView?1:1.15));height=4;}
 else x=sideView?h.side*2:0;
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.drawImage(a.image,16,row*48+20,16,8,Math.round(x-width/2),Math.round(y-height/2),width,height);
 ctx.restore();return true;
}
const cloakBounds=[[5,32,59,74],[16,31,48,74],[4,32,60,74],[17,31,47,74],[4,37,60,74],[15,38,48,74],[4,39,60,74],[15,38,48,74],[10,14,54,74],[15,11,48,74],[8,10,55,74],[15,11,48,74]];
export function cloakClothOffset(pose={},depth=0){
 const d=Math.max(0,Math.min(1,(depth-.24)/.76));
 if(d===0)return 0;
 const moving=['walk','run'].includes(pose.state),amplitude=pose.state==='run'?2.5:moving?1.5:0;
 const wave=Math.sin(Number(pose.gaitPhase||0)*Math.PI/2-d*1.8)*amplitude;
 return Math.max(-4,Math.min(4,(wave+Number(pose.cloakSway||0)*.35)*d*d));
}
// Cloth attaches to the torso, independently of hairstyle and head size.
export function creatorCloakLayout(parts){
 const row={shortCape:0,shoulderMantle:1,travelCloak:2}[parts.appearanceCosmetics?.cloak];
 if(row===undefined)return null;
 const col={down:0,right:1,up:2,left:3}[parts.facing]??0;
 const female=parts.bodyType==='female',side=col===1||col===3;
 const chest=parts.equipment?.chest,id=typeof chest==='string'?chest:chest?.id;
 const armour=id?getGearVisualProfile(id,ITEMS[id]||{}):null;
 const allowance=armour?.silhouette==='plate'?4:armour?2:0;
 const width=(side?(female?17:19):[female?27:30,female?30:33,female?28:31][row])+allowance;
 const height=[23,12,37][row],center=side?(col===1?-3:3):0;
 return {row,col,width,height,left:Math.round(center-width/2),top:Math.round(-22+(parts.bob||0)),collarHeight:row===1?6:4};
}
export function drawCreatorCloakArt(ctx,parts,layer){
 const fit=creatorCloakLayout(parts);if(!fit)return false;
 const a=asset('creator-cloaks');if(!a?.ready)return false;
 const {row,col,width,height,left,top,collarHeight}=fit;
 // The full cloth sits behind the body; looking north brings it over the back.
 if(layer==='front'&&col!==2||layer==='collar'&&col===2)return true;
 const [l,t,r,b]=cloakBounds[row*4+col],drawHeight=layer==='collar'?collarHeight:height;
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(let y=0;y<drawHeight;y+=2){
  const band=Math.min(2,drawHeight-y),shift=cloakClothOffset(parts.animationPose,y/height);
  ctx.drawImage(a.image,col*64+l,row*80+t+(b-t)*y/height,r-l,(b-t)*band/height,Math.round(left+shift),top+y,width,band);
 }
 ctx.restore();return true;
}
asset('creator-cloaks');

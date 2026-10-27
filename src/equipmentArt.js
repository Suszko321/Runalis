import {asset} from './spriteArt.js';
import {drawArmorMotionArt} from './armorMotionArt.js';
import {TIDEGLASS_RAPIER_ART,drawTideglassRapierModel} from './tideglassRapierArt.js';
import {isHandTrinket} from './handTrinketArt.js';
import {drawFactionHelm,drawFactionTrinket,drawFactionWeapon,drawFactionGarmentDetail} from './factionEquipmentArt.js';
import {bowSourceSide} from './bowOrientation.js';

export function weaponArtIndex(id,profile={}) {
  const text=String(id).toLowerCase(),type=profile.weaponType;
  if(text==='tideglassrapier')return 24; // Dedicated model, outside the shared atlases.
  if(type==='shield')return 9;
  if(type==='scythe')return 8;
  if(type==='bow')return 6;
  if(type==='dagger')return 1;
  if(['axe','mace','hammer','spear'].includes(type))return {axe:2,mace:3,hammer:4,spear:5}[type];
  if(type==='eldritch')return 23;
  if(type==='spiritFocus')return 16+(/gauntlet/.test(text)?6:/redseal/.test(text)?5:/grave/.test(text)?4:/moon/.test(text)?3:/prism|sealglass/.test(text)?2:/spirit|pilgrim/.test(text)?1:0);
  if(type==='staff')return /thorn|briar|druid/.test(text)?11:/bone|lich|grave|necro/.test(text)?10:7;
  if(type!=='sword')return null;
  if(/axe/.test(text))return 2;
  if(/mace/.test(text))return 3;
  if(/hammer/.test(text))return 4;
  if(/spear|pike/.test(text))return 5;
  if(/demon|blood|ashbound/.test(text))return 13;
  if(/sun|dawn|oath|light/.test(text))return 14;
  if(/^(?:ice|frost)|veyrglass|zephyr/.test(text))return 15;
  return profile.silhouette==='greatsword'?12:0;
}

// Packed-pixel grips measured from the generated source; each weapon rotates
// around its handle, rather than around the center of its bounding rectangle.
const GRIPS=[[39,89],[39,91],[28,85],[39,87],[39,75],[39,74],[33,58],[39,70],[17,74],[39,72],[39,70],[39,74],[39,89],[40,85],[39,86],[39,88]];
export function equippedArtReady(id,profile){
  if(profile?.faction)return true;
  if(id==='tideglassRapier')return true;
  const index=weaponArtIndex(id,profile);return index!==null && !!asset(index>=16?'arcane-special':'weapons-equipped')?.ready;
}
export function drawEquippedArt(ctx,id,profile,x,y,side=1) {
  if(drawFactionWeapon(ctx,id,profile,x,y,side))return true;
  if(id==='tideglassRapier'){
    const a=asset('tideglass-rapier');
    const {width,height,gripX,gripY,scale}=TIDEGLASS_RAPIER_ART;
    ctx.save();ctx.translate(x,y);ctx.scale(side,1);ctx.imageSmoothingEnabled=false;
    if(a?.ready)ctx.drawImage(a.image,-gripX*scale,-gripY*scale,width*scale,height*scale);
    else {ctx.scale(scale,scale);drawTideglassRapierModel(ctx);}
    ctx.restore();return true;
  }
  const index=weaponArtIndex(id,profile),a=asset(index>=16?'arcane-special':'weapons-equipped');
  if(index===null || !a?.ready)return false;
  if(index>=16){
    const cell=index-16,scale=.42;
    ctx.save();ctx.translate(x,y);ctx.scale(side,1);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(a.image,cell%4*96,Math.floor(cell/4)*112,96,112,-48*scale,-91*scale,96*scale,112*scale);
    ctx.restore();return true;
  }
  const scale=index===1?.45:index===9?.42:[5,7,8,10,11].includes(index)?.72:.56;
  const [gx,gy]=GRIPS[index];
  ctx.save();ctx.translate(x,y);ctx.scale(index===6?bowSourceSide(side):side,1);ctx.imageSmoothingEnabled=false;
  ctx.drawImage(a.image,index%4*80,Math.floor(index/4)*112,80,112,-gx*scale,-gy*scale,80*scale,112*scale);
  ctx.restore();return true;
}

export function drawWearableArt(ctx,profile,facing,x,y,bob=0,pose={}) {
  if(!profile)return false;
  if(drawFactionHelm(ctx,profile,facing,x,y,bob,pose))return true;
  if(profile.slot==='chest'&&drawArmorMotionArt(ctx,profile,'chest',facing,x,y,bob,pose)){drawFactionGarmentDetail(ctx,profile,facing,x,y,bob);return true;}
  const head=profile.slot==='helm';
  if(!head && profile.slot!=='chest')return false;
  const a=asset(head?'headgear-equipped':'armor-equipped');if(!a?.ready)return false;
  const col={down:0,right:1,up:2,left:3}[facing]??0;
  const text=String(profile.itemId||'');
  const row=head?(/demon|warlord|endless/i.test(text)?3:['crown','halo'].includes(profile.silhouette)?2:profile.silhouette==='hood'?1:0):profile.silhouette==='plate'?1:profile.silhouette==='robe'?2:0;
  if(head&&row===2){
    // The two profile cells were authored facing opposite their atlas labels.
    // Fit the band to a head, not the much wider full 48px source cell.
    const crownCol=col===1?3:col===3?1:col;
    const female=pose.bodyType==='female',sx=female?.43:.48,sy=female?.55:.6;
    const floating=profile.silhouette==='halo';
    ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(a.image,crownCol*48,row*48,48,48,x-24*sx,y+bob+(floating?-60:-54),48*sx,48*sy);
    ctx.restore();return true;
  }
  const scale=head?(pose.bodyType==='female'?.68:.74):.76;
  const bottom=head?(row===2?-35:-23):1;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(!head){ctx.beginPath();ctx.rect(x-64,y+bob-23,128,100);ctx.clip();}
  ctx.drawImage(a.image,col*48,row*48,48,48,x-24*scale,y+bob+bottom-42*scale,48*scale,48*scale);
  ctx.restore();return true;
}

export function drawLegwearArt(ctx,profile,facing,x,y,bob=0,step=0,pose={}){
  if(profile&&drawArmorMotionArt(ctx,profile,'legs',facing,x,y,bob,pose))return true;
  const a=asset('accessories-equipped');if(!profile || !a?.ready)return false;
  const col={down:0,right:1,up:2,left:3}[facing]??0;
  const text=String(profile.itemId||'');
  const row=/wrap|cloth|grave|robe/i.test(text)?2:/plate|iron|steel|greave|oath/i.test(text)?1:0;
  const scale=.82,top=y+bob+19-42*scale;
  ctx.save();ctx.imageSmoothingEnabled=false;
  for(let half=0;half<2;half++){
    const lift=Math.round(Math.max(0,step*(half?1:-1))*.55);
    ctx.drawImage(a.image,col*48+half*24,row*48,24,48,x+(half*24-24)*scale,top-lift,24*scale,48*scale);
  }
  ctx.restore();return true;
}

export function drawTrinketArt(ctx,id,facing,x,y,bob=0){
  if(drawFactionTrinket(ctx,id,facing,x,y,bob))return true;
  if(isHandTrinket(id))return true;
  const a=asset('accessories-equipped');if(!a?.ready)return false;
  if(facing==='up')return true;
  const text=String(id),col=/lantern/i.test(text)?3:/thorn|briar/i.test(text)?2:/grave|lich|void|bone|zephyr|soul/i.test(text)?1:0;
  const scale=col===3?.26:.19;
  const side=facing==='left'?-1:1,profile=facing==='left'||facing==='right';
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(x+(profile?side*5:0),y+bob-22);
  ctx.scale(profile?side*.5:1,1);
  ctx.drawImage(a.image,col*48,144,48,48,-24*scale,-6*scale,48*scale,48*scale);ctx.restore();return true;
}

for(const name of ['weapons-equipped','armor-equipped','headgear-equipped','accessories-equipped','tideglass-rapier'])asset(name);

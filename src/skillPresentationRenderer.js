import { ABILITIES } from './data.js';
import { LEGACY_SKILL_ART } from './skillArtProfiles.js';
import { getAbilityIconPalette } from './combatTechniqueIcons.js';

// Cosmetic geometry only: no targets, hitboxes, resource changes or random state.
const profiles=new Map(ABILITIES.map((a,i)=>[a.id,{...LEGACY_SKILL_ART[a.id],ability:a,
  effect:LEGACY_SKILL_ART[a.id]?.effect||a.effectProfile,palette:getAbilityIconPalette(a),variant:i%7}]));
export function getSkillPresentationProfile(id){return profiles.get(id)||null;}
const TAU=Math.PI*2;
const group=(name,list)=>list.includes(name);
const stroke=(ctx,points)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
function shard(ctx,x,y,w,h,rotation=0){ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();ctx.moveTo(0,-h);ctx.lineTo(w,0);ctx.lineTo(0,h);ctx.lineTo(-w,0);ctx.closePath();ctx.fill();ctx.restore();}
function skull(ctx,x,y,r){ctx.beginPath();ctx.moveTo(x-r,y+r*.2);ctx.quadraticCurveTo(x-r*1.3,y-r*1.6,x,y-r*1.4);ctx.quadraticCurveTo(x+r*1.3,y-r*1.6,x+r,y+r*.2);ctx.lineTo(x+r*.4,y+r*.7);ctx.lineTo(x-r*.4,y+r*.7);ctx.closePath();ctx.fill();ctx.save();ctx.fillStyle='#19242c';ctx.fillRect(x-r*.6,y-r*.5,r*.4,r*.4);ctx.fillRect(x+r*.2,y-r*.5,r*.4,r*.4);ctx.restore();}
function shield(ctx,r,t,facets=false){
 ctx.save();ctx.translate(7,-7);ctx.scale(.75,1);ctx.lineWidth=3;
 const w=r*(.5+.15*t),h=r*.8;
 const p=[[-w,-h],[w,-h],[w*.8,h*.25],[0,h*.8],[-w*.8,h*.25],[-w,-h]];
 ctx.globalAlpha*=.28;ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();p.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.fill();ctx.globalAlpha/=.28;stroke(ctx,p);
 if(facets){stroke(ctx,[[-w,-h],[0,h*.8],[w,-h]]);stroke(ctx,[[-w*.9,-h*.25],[w*.9,-h*.25]]);}else{stroke(ctx,[[0,-h*.7],[0,h*.35]]);stroke(ctx,[[-w*.55,-h*.1],[w*.55,-h*.1]]);}
 ctx.restore();
}
function branch(ctx,x,y,length,angle,t,width=2){
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.lineWidth=width;
 stroke(ctx,[[0,0],[length*.25,-4],[length*.45,6*Math.sin(t*15)],[length*.7,-3],[length,0]]);
 stroke(ctx,[[length*.45,4],[length*.56,13],[length*.8,16]]);ctx.restore();
}
function roots(ctx,r,t,rose=false,cage=false){
 const count=cage?6:rose?3:5;
 for(let i=0;i<count;i++){
  const a=i/count*TAU,px=Math.cos(a)*r*.7,py=Math.sin(a)*r*.28+10,h=(cage?47:rose?35:24)*(1-Math.pow(1-t,3));
  ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(px,py);ctx.bezierCurveTo(px-10,py-h*.3,px+9,py-h*.65,px,py-h);ctx.stroke();
  stroke(ctx,[[px+1,py-h*.4],[px+10,py-h*.5],[px+4,py-h*.2]]);
  if(rose){ctx.save();ctx.translate(px,py-h);for(let j=0;j<5;j++)shard(ctx,Math.cos(j*TAU/5)*5,Math.sin(j*TAU/5)*4,5,6,j);ctx.fillStyle='#231d24';ctx.fillRect(-6,-1,12,4);ctx.restore();}
 }
}
function spray(ctx,r,t,count,angle=0,gravity=0){
 for(let i=0;i<count;i++){const a=angle+(i-count/2)*.25,d=r*(.2+t*.9)*(1-(i%3)*.12);shard(ctx,Math.cos(a)*d,Math.sin(a)*d+gravity*t*t,1.5,4,a+Math.PI/2);}
}
function water(ctx,r,t,kind){
 const fountain=['wellspring','healingStream','healingStream','fountain'].includes(kind);
 if(fountain){for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*5,14);ctx.bezierCurveTo(i*6,-r,i*12,-r,i*18,5);ctx.stroke();shard(ctx,i*18,4+Math.sin(t*10+i)*5,2,4);}}
 else if(kind==='delugeCrown'){for(let i=-3;i<=3;i++){stroke(ctx,[[i*9,-45],[i*9-5,-12],[i*9-9,10]]);shard(ctx,i*9-9,10,2,5);}stroke(ctx,[[-27,-34],[-17,-26],[0,-40],[17,-26],[27,-34]]);}
 else {for(let j=0;j<3;j++){ctx.lineWidth=3-j*.7;ctx.beginPath();ctx.moveTo(-15,-3+j*9);ctx.bezierCurveTo(4,-r*.55+j*9,r*.6,r*.3+j*8,r*(.65+t*.25),j*8);ctx.stroke();}spray(ctx,r,t,7,-.5);}
}
export function drawSkillPresentation(ctx,fx,camera) {
 const profile=profiles.get(fx.abilityId);if(!profile)return false;
 const x=fx.x-camera.x,y=fx.y-camera.y;if(x< -160||y< -180||x>ctx.canvas.width+160||y>ctx.canvas.height+180)return true;
 const t=Math.max(0,Math.min(1,(fx.age||0)/(fx.ttl||.65))),fade=Math.pow(1-t,.65),impact=fx.phase==='impact';
 const [color,light,dark]=profile.palette,e=profile.effect;
 const tier=Math.min(5,Math.max(0,fx.masteryTier||0)),charge=Math.min(3,fx.chargeLevel||0);
 const r=Math.min(72,(fx.radius||34)*(1+charge*.08)),turn=Math.atan2(fx.dirY??0,fx.dirX??1);
 ctx.save();ctx.translate(x,y);ctx.globalAlpha=fade*.82;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=color;ctx.fillStyle=light;ctx.lineWidth=2;
 // A narrow dark underlay gives bright silhouettes contrast on snow and spell crowds.
 const mechanical=profile.ability.classId==='fellhunter';
 if(impact){
  const cls=profile.ability.classId;
  if(mechanical){ctx.rotate(turn);ctx.fillStyle='#e9d7b6';spray(ctx,r,t,7,-.55,10);}
  else if(cls==='thornbinder'){roots(ctx,r*.55,t,['roseJaw','bloom','roseBeast'].includes(e),false);}
  else if(cls==='waverider'){ctx.rotate(turn);water(ctx,r*.7,t,'impact');}
  else if(cls==='gravecaller'){if(e==='bloodLance'||e==='soulDrain')ctx.fillStyle='#d99ba4';else skull(ctx,0,-8,6*(1-t));spray(ctx,r*.6,t,4,-1.6,3);}
  else if(cls==='eldritch'){ctx.fillStyle=dark;shard(ctx,0,-4,7,12,t);ctx.strokeStyle=color;for(let i=0;i<3;i++)branch(ctx,0,-4,r,i*TAU/3,t,2);}
  else if(e==='hellfireSeal'){ctx.fillStyle='#f4b06b';spray(ctx,r,t,6,-1.5,-5);}
  else {for(let i=0;i<5;i++){const a=i*TAU/5+turn;shard(ctx,Math.cos(a)*r*t,Math.sin(a)*r*t*.6,2,7*(1-t),a);}}
  ctx.restore();return true;
 }
 if(e==='wolfPact'){
  // A rising wolf face, pointed ears and paw prints make the learned pact identifiable.
  ctx.translate(0,-8*(1-t));ctx.strokeStyle=light;
  stroke(ctx,[[-17,6],[-20,-22],[-9,-14],[0,-18],[9,-14],[20,-22],[17,6],[0,20],[-17,6]]);
  stroke(ctx,[[-12,-3],[-5,0]]);stroke(ctx,[[12,-3],[5,0]]);stroke(ctx,[[-5,8],[0,12],[5,8]]);
  for(let i=0;i<3+tier%3;i++){const px=(i-1)*18,py=20+t*15;ctx.fillStyle=color;ctx.fillRect(px-3,py,6,4);for(let j=-1;j<=1;j++)ctx.fillRect(px+j*3-1,py-5,2,3);}
 }else if(e==='demonPact'){
  // Horns and a split fiery gateway use a different silhouette from the wolf ritual.
  ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-13,15);ctx.lineTo(-8,-25);ctx.lineTo(0,-37);ctx.lineTo(8,-25);ctx.lineTo(13,15);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle=light;stroke(ctx,[[-7,-13],[-22,-31],[-18,-8],[-8,3],[0,15],[8,3],[18,-8],[22,-31],[7,-13]]);
  stroke(ctx,[[-9,-3],[-3,0]]);stroke(ctx,[[9,-3],[3,0]]);spray(ctx,r*.65,t,6,-1.6,-9);
 }else if(group(e,['oathSlash','steelCut','tidalCrescent'])){
  ctx.rotate(turn);const sweep=-1.25+t*2.2;
  ctx.strokeStyle=dark;ctx.lineWidth=10;ctx.beginPath();ctx.arc(0,0,r,-1.15,sweep);ctx.stroke();
  ctx.strokeStyle=color;ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle=light;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r-3,-1.08,sweep-.03);ctx.stroke();spray(ctx,r*.7,t,4,.1);
 }else if(group(e,['shieldBash','bulwark','plainGuard','ironWard','prismFacets','bubbleShell','seraphWard','haloAegis','mirror'])){
  if(e==='shieldBash')ctx.translate(Math.cos(turn)*r*t*.35,Math.sin(turn)*r*t*.35);
  shield(ctx,r,t,['prismFacets','seraphWard'].includes(e));
  if(e==='bubbleShell'){ctx.strokeStyle=light;ctx.beginPath();ctx.ellipse(0,-6,r*.76,r,0,-2.7,-1);ctx.stroke();spray(ctx,r*.8,t,5,1.2);}
  if(e==='haloAegis'||e==='seraphWard'){ctx.strokeStyle=light;ctx.beginPath();ctx.ellipse(0,-r*1.1,r*.8,r*.18,0,0,TAU);ctx.stroke();}
 }else if(group(e,['holyLanding','judgment','heavenbreaker','solarVerdict','consecration','pillar'])){
  const heavy=['heavenbreaker','solarVerdict'].includes(e);const count=heavy?8:4;
  ctx.globalAlpha=fade*.17;ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(0,12,r,r*.35,0,0,TAU);ctx.fill();ctx.globalAlpha=fade*.9;ctx.fillStyle=light;
  for(let i=0;i<count;i++){const a=i/count*TAU;shard(ctx,Math.cos(a)*r*t,12+Math.sin(a)*r*t*.35,3,(heavy?17:10)*(1-t),a);}
  if(heavy){ctx.strokeStyle=light;stroke(ctx,[[-5,-56],[0,6],[5,-56]]);}
  if(e==='consecration'){ctx.strokeStyle=color;stroke(ctx,[[-r*.6,12],[r*.6,12]]);stroke(ctx,[[0,4],[0,20]]);for(let i=-1;i<=1;i++)stroke(ctx,[[i*18,8],[i*18,-17*(1-t)]]);}
 }else if(group(e,['daggerFan','markedArrow','fireVolley','bombFuse','smokeCanister','steelTrap','caltropScatter','preparedZone','ricochet','deadfall','execution','vault'])){
  ctx.rotate(turn);const smoke=e==='smokeCanister',bomb=e==='bombFuse',trap=['steelTrap','deadfall'].includes(e);
  if(smoke){ctx.fillStyle='#88908c';for(let i=0;i<7;i++){ctx.globalAlpha=fade*.2;ctx.beginPath();ctx.ellipse(Math.cos(i*2.2)*r*t,Math.sin(i*2.2)*r*t*.6,8+t*13,5+t*10,0,0,TAU);ctx.fill();}}
  else if(trap){ctx.strokeStyle='#e1d6ba';ctx.lineWidth=3;const open=9*(1-t);stroke(ctx,[[-19,-open],[-9,0],[0,-open],[9,0],[19,-open]]);stroke(ctx,[[-19,open],[-9,0],[0,open],[9,0],[19,open]]);spray(ctx,27,t,6,-.3,12);}
  else if(e==='caltropScatter'||e==='preparedZone'){for(let i=0;i<5;i++){const px=i*8-10,py=Math.sin(i*3)*10;stroke(ctx,[[px-4,py+5],[px,py-4],[px+4,py+5],[px-4,py+5],[px+2,py+1]]);}spray(ctx,r,t,5,0,10);}
  else if(bomb){ctx.fillStyle='#51443d';ctx.beginPath();ctx.arc(12,-4,9,0,TAU);ctx.fill();ctx.strokeStyle='#edb87b';stroke(ctx,[[12,-13],[15,-20],[21,-20]]);spray(ctx,25,t,5,-.8,9);}
  else{ctx.fillStyle=e==='fireVolley'?'#ffc278':'#e0ddd0';const count=e==='daggerFan'||e==='fireVolley'?3:1;for(let i=0;i<count;i++){ctx.save();ctx.rotate((i-(count-1)/2)*.23);stroke(ctx,[[-9,0],[r*(.4+t*.6),0]]);shard(ctx,r*(.4+t*.6),0,3,7,Math.PI/2);ctx.restore();}}
 }else if(group(e,['graveOrb','boneRitual','thornPack','roseBeast','host','urn','echo'])){
  const ritual=e==='boneRitual'||e==='thornPack'||e==='roseBeast';
  if(ritual){for(let i=-1;i<=1;i++){const px=i*r*.5;ctx.strokeStyle=color;stroke(ctx,[[px-5,14],[px,-16*(1-t)],[px+5,14]]);if(e==='boneRitual')skull(ctx,px,-14*(1-t),7);else roots(ctx,r*.45,t,true,false);}}
  else{ctx.fillStyle=color;skull(ctx,Math.cos(turn)*15,-10+Math.sin(turn)*15,8);ctx.strokeStyle=light;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-9+i*6,5);ctx.quadraticCurveTo(-r*.5+i*5,18,-r*(.5+t*.4),0);ctx.stroke();}}
 }else if(group(e,['bloodLance','soulDrain','bloodClaws'])){
  ctx.strokeStyle=e==='soulDrain'?color:'#d68390';
  for(let i=0;i<3;i++){ctx.beginPath();const px=r*(1-t)*.8;ctx.moveTo(px,i*7-12);ctx.bezierCurveTo(px*.4,i*7-24,-8,i*8,0,i*4-6);ctx.stroke();}
  if(e==='bloodLance'){ctx.rotate(turn);shard(ctx,r*.65,0,3,18,Math.PI/2);}
  if(e==='bloodClaws'){for(let i=0;i<3;i++)stroke(ctx,[[i*10-17,-r*.8],[i*7-8,r*.35]]);}
 }else if(group(e,['vineWhip','vineHook','briarGarden','roseJaw','rootCage','briarMend','thornShield','briarstride','seed','thornstorm','bloom'])){
  ctx.strokeStyle=color;ctx.fillStyle=['roseJaw','bloom'].includes(e)?'#dc9cad':light;
  roots(ctx,r,t,['roseJaw','bloom'].includes(e),['rootCage','thornShield'].includes(e));
  if(e==='vineWhip'||e==='vineHook'){ctx.rotate(turn);ctx.beginPath();ctx.moveTo(-12,8);ctx.bezierCurveTo(5,-14,r*.7,20,r,0);ctx.stroke();}
 }else if(group(e,['waterFan','healingStream','currentStep','pressureCollapse','wellspring','delugeCrown','undertow','pressure','maelstrom'])){
  if(['waterFan','currentStep','undertow','pressure'].includes(e))ctx.rotate(turn);
  ctx.strokeStyle=color;water(ctx,r,t,e);if(e==='pressureCollapse'){ctx.strokeStyle=light;for(let i=0;i<4;i++){const a=i*TAU/4;stroke(ctx,[[Math.cos(a)*r*(1-t),Math.sin(a)*r*(1-t)*.5],[Math.cos(a)*7,Math.sin(a)*4]]);}}
 }else if(group(e,['gleamFlash','brokenHalo','rebukeRay','dawnFocus','firstSun','halo','overexposure','dawnstep'])){
  if(e==='rebukeRay'||e==='gleamFlash'||e==='dawnFocus'){ctx.rotate(turn);ctx.strokeStyle=light;ctx.lineWidth=e==='dawnFocus'?4:2;stroke(ctx,[[0,0],[r,0]]);for(let i=0;i<3;i++)shard(ctx,6+i*13,-6+(i%2)*12,2,7,Math.PI/4);}
  else if(e==='firstSun'){ctx.strokeStyle=light;for(let i=0;i<9;i++){const a=i*Math.PI/8+Math.PI;stroke(ctx,[[Math.cos(a)*17,Math.sin(a)*17],[Math.cos(a)*r,Math.sin(a)*r]]);}ctx.beginPath();ctx.arc(0,0,17,Math.PI,TAU);ctx.stroke();}
  else {for(let i=0;i<6;i++){const a=i*TAU/6+t*.6;shard(ctx,Math.cos(a)*r*.6,-17+Math.sin(a)*r*.22,2,7,a);}}
 }else if(group(e,['voidLanding','horrorGate','starCollapse','mawRift','conduit','fracture','angle','orbit'])){
  ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(-11,-r);ctx.lineTo(13,-r*.3);ctx.lineTo(-6,r*.3);ctx.lineTo(9,r*.6);ctx.lineTo(-17,4);ctx.closePath();ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle=light;
  if(e==='mawRift'||e==='horrorGate'){for(let i=-2;i<=2;i++){stroke(ctx,[[i*8-4,-15],[i*8,-2],[i*8+4,-15]]);stroke(ctx,[[i*8-4,13],[i*8,2],[i*8+4,13]]);}}
  else for(let i=0;i<(e==='starCollapse'?6:3);i++)branch(ctx,0,-7,r,i*TAU/(e==='starCollapse'?6:3)+t*.4,t,2);
 }else if(e==='holyMend'){
  for(let i=-1;i<=1;i++){ctx.strokeStyle=color;stroke(ctx,[[i*14,12],[i*12,-r*t]]);shard(ctx,i*12,-r*t,2,6);}ctx.strokeStyle=light;stroke(ctx,[[-6,-12],[6,-12]]);stroke(ctx,[[0,-18],[0,-6]]);
 }else if(e==='hellfireSeal'){
  ctx.fillStyle='#ee9450';for(let i=0;i<5;i++){const px=(i-2)*9;ctx.beginPath();ctx.moveTo(px-5,9);ctx.quadraticCurveTo(px-11,-8,px,-r*(.3+t*.5));ctx.quadraticCurveTo(px+3,-8,px+5,9);ctx.closePath();ctx.fill();}
 }else if(['chain','tether','hookLine'].includes(e)){ctx.rotate(turn);ctx.strokeStyle=light;stroke(ctx,[[-8,5],[r*.8,0],[r*.7,-7]]);spray(ctx,r*.7,t,3,.4);}
 else {spray(ctx,r*.75,t,5,turn);}
 // Mastery adds only a few peripheral details, never a larger implied hitbox.
 ctx.fillStyle=light;ctx.globalAlpha=fade*(mechanical?.55:.72);
 if(impact||tier)for(let i=0;i<Math.min(10,3+tier);i++){const a=i*2.4+profile.variant*.3;shard(ctx,Math.cos(a)*r*t,Math.sin(a)*r*t*.55,1,2.5,a);}
 ctx.restore();return true;
}

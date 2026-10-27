import {getOathVisualFamily} from './oathbladeProfiles.js';
// Authored, world-anchored pixel motifs. Presentation never supplies damage,
// hitboxes, movement or control; silhouettes follow the existing combat events.
const TAU=Math.PI*2;
const groundSeals=new Map();
export const OATH_PALETTES=Object.freeze({
  base:['#d8ad59','#fff1c6','#685647','#201e22'],
  holyknight:['#dfb854','#fff3ce','#817b64','#211e25'],
  sinner:['#9275ba','#d7eee5','#393548','#100f19']
});
const motifs={
  mace:['0001111000','0012332100','0123443210','0123443210','0012332100','0001221000','0001221000','0001221000','0001221000','0001111000'],
  shield:['011111110','123333321','123343321','123343321','123444321','012343210','012343210','001232100','000121000','000010000'],
  scripture:['000010000','000141000','001444100','000141000','011111110','123212321','123212321','123212321','123212321','011101110'],
  fracture:['000110000','001231100','012321100','012111000','001231000','000123100','000111210','000123210','001232100','000111000'],
  seal:['000111000','001232100','012343210','123444321','012343210','001232100','000111000']
};
const pixel=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
function glyph(c,name,x,y,p,unit=2){
 const rows=motifs[name]||motifs.seal,colors=['',p[3],p[2],p[0],p[1]];
 rows.forEach((row,j)=>[...row].forEach((v,i)=>{if(v!=='0')pixel(c,x+(i-row.length/2)*unit,y+(j-rows.length/2)*unit,unit,unit,colors[+v]);}));
}
function groundSeal(radius,p,emblem,family){
 const r=Math.round(radius),key=family+':'+r+':'+emblem;
 if(groundSeals.has(key))return groundSeals.get(key);
 if(r>256)return null;
 const size=r*2+48,canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(size,size):typeof document!=='undefined'?document.createElement('canvas'):null;
 if(!canvas)return null;canvas.width=canvas.height=size;
 const c=canvas.getContext('2d'),center=r+24;c.imageSmoothingEnabled=false;
 ring(c,center,center,r,p,0,family==='sinner');
 for(let i=0;i<4;i++){const a=i*TAU/4+Math.PI/4;glyph(c,emblem,center+Math.cos(a)*r*.7,center+Math.sin(a)*r*.7,p,2);}
 const tile={canvas,center};groundSeals.set(key,tile);
 if(groundSeals.size>24)groundSeals.delete(groundSeals.keys().next().value);
 return tile;
}
function path(c,points,color,width=2){
 // Rasterize lines into integer squares instead of antialiased canvas strokes.
 for(let j=1;j<points.length;j++){
  const [a,b]=[points[j-1],points[j]],dx=b[0]-a[0],dy=b[1]-a[1],count=Math.max(1,Math.ceil(Math.hypot(dx,dy)/2));
  for(let i=0;i<=count;i++)pixel(c,a[0]+dx*i/count-width/2,a[1]+dy*i/count-width/2,width,width,color);
 }
}
function ring(c,x,y,r,p,t=0,broken=false){
 const steps=Math.min(480,Math.max(24,Math.ceil(r*TAU/3)));
 for(let i=0;i<steps;i++){
  if(broken&&i%8>4)continue;
  const a=i/steps*TAU,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
  pixel(c,px-2,py-2,4,4,p[3]);pixel(c,px-1,py-1,3,3,i%13===Math.floor(t*13)%13?p[1]:p[0]);
 }
}
function sparks(c,x,y,r,p,t,n=10){
 for(let i=0;i<n;i++){
  const a=i*2.399,rr=r*(.2+.8*t),rise=Math.sin(t*Math.PI)*(i%3+1)*6;
  pixel(c,x+Math.cos(a)*rr,y+Math.sin(a)*rr*.7-rise,i%3?2:3,i%3?3:2,i%2?p[0]:p[1]);
 }
}
function fracture(c,x,y,r,p,t,n=6){
 for(let i=0;i<n;i++){
  const a=i/n*TAU,rr=r*(.45+.5*t),points=[[x,y],[x+Math.cos(a)*rr*.45,y+Math.sin(a)*rr*.45],[x+Math.cos(a+.12)*rr*.7,y+Math.sin(a+.12)*rr*.7],[x+Math.cos(a)*rr,y+Math.sin(a)*rr]];
  path(c,points,p[3],4);path(c,points,p[0],2);
 }
}
function impactStar(c,x,y,r,p,t){
 for(let i=0;i<8;i++){
  const a=i*TAU/8,inner=r*.18,outer=r*(.65+.35*t),bend=i%2?.06:-.06;
  const points=[[x+Math.cos(a)*inner,y+Math.sin(a)*inner],[x+Math.cos(a+bend)*outer,y+Math.sin(a+bend)*outer]];
  path(c,points,p[3],6);path(c,points,p[0],4);if(t<.45)path(c,points,p[1],2);
 }
}
function column(c,x,y,r,p,t){
 const height=Math.min(150,55+r*.55),unit=3;
 for(let j=0;j<height;j+=3){const width=Math.max(unit,Math.round((10+Math.sin(j*.23+t*8)*4)*(1-t*.5)));
  pixel(c,x-width/2-3,y-j,width+6,3,p[3]);pixel(c,x-width/2-1,y-j,width+2,3,p[0]);pixel(c,x-width/2+2,y-j,Math.max(3,width-4),3,p[1]);
 }
 glyph(c,'mace',x,y-height+8,p,3);
}
// Integer-pixel silhouettes keep death swords readable against both terrain
// and crowds. Their ivory edges and split black blades differ from holy maces.
const graveSwordRows=['0001000','0014100','0134310','0131310','0134310','1131311','0134310','0131310','0134310','0131310','0113110','1133311','0113110','0013100','0013100','0011100'];
function graveSword(c,x,y,p,angle=0,scale=2){
 const cos=Math.cos(angle),sin=Math.sin(angle),colors=['',p[3],p[2],p[0],p[1]];
 for(let j=0;j<graveSwordRows.length;j++)for(let i=0;i<7;i++){
  const v=+graveSwordRows[j][i];if(!v)continue;
  const u=(i-3)*scale,vv=(j-8)*scale;
  pixel(c,x+cos*u-sin*vv,y+sin*u+cos*vv,scale,scale,colors[v]);
 }
}
const kinds={oathkeeperOathStrike:'arc',templarHeavyCut:'arc',oathkeeperBastionBash:'bash',templarCleavingStep:'bash',
  oathkeeperDivineLeap:'leap',oathkeeperJudgmentSmite:'smite',radiantSmite:'smite',
  oathkeeperConsecratedGround:'field',oathkeeperBulwark:'ward',oathkeeperLastRite:'heal',oathkeeperHeavenbreaker:'judgment',oathBladesConjure:'blades',oathBladesImpact:'bladeImpact'};
export function isOathkeeperEffect(fx){return !!kinds[fx.kind]||fx.oathkeeper||String(fx.abilityId||'').startsWith('oathkeeper');}
export function drawOathkeeperEffect(c,fx,camera){
 if(!isOathkeeperEffect(fx))return false;
 // Actual hit contacts already have their own burst; avoid drawing it twice.
 if(fx.kind==='abilityPresentation'&&fx.phase==='impact')return true;
 const x=Math.round(fx.x),y=Math.round(fx.y),t=Math.min(1,(fx.age||0)/Math.max(.001,fx.ttl||.4));
 const p=OATH_PALETTES[fx.subclassId]||OATH_PALETTES.base;
 const r=Math.min(420,Math.max(12,fx.radius||fx.range||32));
 let g=fx.geometry||kinds[fx.kind]||fx.profile||'cast';
 if(fx.phase==='impact'&&g==='debt')g='burst';
 if(fx.phase==='impact'&&g==='mandate')g='smite';
 if(x-camera.x< -700||y-camera.y< -700||x-camera.x>c.canvas.width+700||y-camera.y>c.canvas.height+700)return true;
 c.save();c.translate(-Math.round(camera.x),-Math.round(camera.y));c.imageSmoothingEnabled=false;c.globalAlpha=(1-t)*.9;
 const emblem=fx.subclassId==='sinner'?'fracture':'shield';
 if(g==='oathWarning'){
  c.globalAlpha=.5+t*.35;ring(c,x,y,r,p,t,fx.subclassId==='sinner');
  if(fx.subclassId==='sinner')for(let i=0;i<6;i++){const a=i*TAU/6;graveSword(c,x+Math.cos(a)*r*.75,y+Math.sin(a)*r*.75,p,Math.PI,1);}
  else glyph(c,'mace',x,y-20,p,2);
 }else if(g==='oathDebt'){
  ring(c,x,y,38,p,t,true);glyph(c,'mace',x,y-32,p,2);
  for(let i=0;i<4;i++)pixel(c,x-13+i*8,y+12,5,3,i<Math.ceil((fx.chargeProgress||0)*4)?p[1]:p[2]);
 }else if(['graveBlades','graveSword','graveCleave','graveField','bladeProcession','swordGuard','graveReclaim','graveMark'].includes(g)){
  const field=g==='graveField',procession=g==='bladeProcession',guard=g==='swordGuard',cleave=g==='graveCleave';
  if(field||procession){
   c.globalAlpha=.6*Math.min(1,(1-t)*7);const tile=groundSeal(r,p,'fracture','sinner');
   if(tile)c.drawImage(tile.canvas,x-tile.center,y-tile.center);else ring(c,x,y,r,p,t,true);
  }
  if(guard)ring(c,x,y,42,p,t,true);
  const count=g==='graveSword'||g==='graveMark'?1:guard?Math.min(3,Math.max(1,fx.swordCount??3)):cleave||g==='graveReclaim'?3:6;
  const direction=Math.atan2(fx.dirY||0,fx.dirX??1);
  for(let i=0;i<count;i++){
   const a=cleave?direction-.55+i*.55:i/count*TAU+(procession?((fx.phaseTime||0)+(fx.age||0))*2:0);
   const dist=count===1&&!guard?0:guard?Math.min(50,r*.7):g==='graveReclaim'?26:cleave?r*.7:r*.65;
   const rise=field?Math.sin(Math.PI*t)*9:g==='graveReclaim'?t*55:g==='graveBlades'?(1-Math.min(1,t*3))*50:0;
   graveSword(c,x+Math.cos(a)*dist,y+Math.sin(a)*dist-rise,p,cleave?a+Math.PI/2:procession?a:Math.PI,guard?2:2);
  }
  if(g==='graveBlades'||g==='graveSword'){fracture(c,x,y,r*.65,p,t,5);sparks(c,x,y,r,p,t,9);}
  if(g==='graveReclaim')sparks(c,x,y,38,p,t,12);
 }else if(g==='holySlam'){
  column(c,x,y,r,p,t);ring(c,x,y,r*Math.min(1,.4+t*2),p,t);fracture(c,x,y,r*.75,p,t,7);sparks(c,x,y,r,p,t,12);
 }else if(g==='blades'){
  ring(c,x,y,r*(.3+t*.7),p,t,fx.subclassId==='sinner');ring(c,x,y,r*(.15+t*.45),p,t,true);sparks(c,x,y,r,p,t,18);
  if(fx.subclassId==='sinner')fracture(c,x,y,r*.7,p,t,5);
 }else if(g==='bladeImpact'){
  impactStar(c,x,y,20,p,t);ring(c,x,y,r*(.2+t*.8),p,t,fx.subclassId==='sinner');sparks(c,x,y,r,p,t,12);
  if(fx.subclassId==='sinner')fracture(c,x,y,r,p,t,4);
 }else if(fx.kind==='enemyContactImpact'||g==='impact'){
  const size=fx.dot?8:fx.heavy?27:17;
  if(!fx.dot)impactStar(c,x,y,size,p,t);sparks(c,x,y,size*1.1,p,t,fx.dot?3:fx.heavy?14:7);
  if(!fx.dot)ring(c,x,y,size*(.35+t*1.25),p,t,fx.subclassId==='sinner');
  if(t<.3){pixel(c,x-3,y-7,6,14,p[1]);pixel(c,x-7,y-3,14,6,p[1]);}
 }else if(g==='arc'||g==='melee'||g==='bash'){
  const a=Math.atan2(fx.dirY||0,fx.dirX??1),half=g==='bash'?.6:.85,lead=-half+2*half*Math.min(1,t*3);
  for(let i=0;i<25;i++){
   const angle=a-half+2*half*i/24;
   if(angle>a+lead)break;
   for(let j=0;j<3;j++)pixel(c,x+Math.cos(angle)*(r-5+j*3),y+Math.sin(angle)*(r-5+j*3),3,3,j===1?p[1]:p[j===0?3:0]);
  }
  glyph(c,g==='bash'?'shield':'mace',x+Math.cos(a+lead)*r*.82,y+Math.sin(a+lead)*r*.82,p,2);
  if(fx.subclassId==='sinner')fracture(c,x,y,r*.65,p,t,3);
 }else if(['chain','dash','leap','pierce','beam'].includes(g)){
  const ex=fx.endX??fx.targetX??fx.x+(fx.dirX||0)*(fx.range||r),ey=fx.endY??fx.targetY??fx.y+(fx.dirY||0)*(fx.range||r);
  const dx=ex-x,dy=ey-y,d=Math.hypot(dx,dy)||1,n=Math.min(60,Math.ceil(d/9));
  if(g==='beam'||g==='pierce'){
   path(c,[[x,y],[ex,ey]],p[3],9);path(c,[[x,y],[ex,ey]],p[0],6);path(c,[[x,y],[ex,ey]],p[1],2);
  }
  for(let i=0;i<n;i++){
   const u=i/n,px=x+dx*u,py=y+dy*u;
   if(g==='chain'){path(c,[[px-4,py],[px,py-3],[px+4,py],[px,py+3],[px-4,py]],p[i%2?0:1],2);}
   else if(g!=='beam'&&g!=='pierce'){pixel(c,px-3,py-3,6,6,p[3]);pixel(c,px-1,py-1,3,3,i%3?p[0]:p[1]);}
   else if(i%4===0){pixel(c,px-dy/d*7,py+dx/d*7,2,4,p[0]);pixel(c,px+dy/d*7,py-dx/d*7,2,4,p[1]);}
  }
  if(g==='leap'||g==='dash'){ring(c,ex,ey,Math.min(r,58)*(.7+.3*t),p,t);fracture(c,ex,ey,35,p,t);}
  else glyph(c,emblem,ex,ey,p,2);
 }else if(['field','aura','retaliation','burst','smite','judgment'].includes(g)){
  const field=['field','aura'].includes(g);
  if(field)c.globalAlpha=.65*Math.min(1,(1-t)*12);
  // Persistent fields keep their actual radius throughout their lifetime.
  const radius=field?r:r*Math.min(1,.35+t*2.5);
  const tile=field?groundSeal(radius,p,emblem,fx.subclassId||'base'):null;
  if(tile)c.drawImage(tile.canvas,x-tile.center,y-tile.center);
  else ring(c,x,y,radius,p,t,fx.subclassId==='sinner');
  if(!field){fracture(c,x,y,radius*.8,p,t,fx.kind==='oathkeeperHeavenbreaker'?9:6);sparks(c,x,y,radius,p,t,16);}
  if(!field)ring(c,x,y,radius*.72,p,t,fx.subclassId==='sinner');
  for(let i=0;!tile&&i<4;i++){
   const a=i*TAU/4+Math.PI/4,px=x+Math.cos(a)*radius*.7,py=y+Math.sin(a)*radius*.7;
   glyph(c,field?emblem:'seal',px,py,p,2);
  }
  if(field){
   for(let i=0;i<16;i++){const a=i*2.399,rr=r*(.28+(i%3)*.18),rise=((fx.age||0)*14+i*3)%16;
    pixel(c,x+Math.cos(a)*rr,y+Math.sin(a)*rr-rise,2,i%3?3:5,i%3?p[0]:p[1]);
   }
  }
  if(['smite','judgment'].includes(g)||fx.kind==='oathkeeperHeavenbreaker')column(c,x,y,r,p,t);
 }else if(['ward','heal','ritual','cast','mark','litany','debt','mandate'].includes(g)){
  const heal=['heal','ritual'].includes(g)||fx.kind==='oathkeeperLastRite';
  glyph(c,heal?'scripture':emblem,x,y-(heal?18:12),p,heal?3:2);
  ring(c,x,y,Math.min(r,50)*(.8+.2*t),p,t,fx.subclassId==='sinner');
  if(heal)for(let i=0;i<5;i++){const px=x+(i-2)*12,py=y-12-t*45+(i%2)*8;path(c,[[px-3,py],[px+3,py]],p[1],2);path(c,[[px,py-3],[px,py+3]],p[0],2);}
  else sparks(c,x,y,Math.min(r,38),p,t,6);
 }else{glyph(c,emblem,x,y-8,p,2);sparks(c,x,y,30,p,t,6);}
 c.restore();return true;
}
export function drawBluntContact(c,fx,camera){
 const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),t=Math.min(1,(fx.age||0)/(fx.ttl||.2)),p=OATH_PALETTES.base;
 c.save();c.globalAlpha=1-t;
 impactStar(c,x,y,fx.heavy?24:14,p,t);sparks(c,x,y,fx.heavy?30:17,p,t,fx.heavy?14:7);
 if(t<.25){pixel(c,x-3,y-5,6,10,p[1]);pixel(c,x-5,y-3,10,6,p[1]);}
 c.restore();
}
export function drawBluntGroundImpact(c,fx,camera){
 const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),t=Math.min(1,(fx.age||0)/(fx.ttl||.38));
 const p=fx.classId==='oathkeeper'?OATH_PALETTES[fx.subclassId]||OATH_PALETTES.base:['#afa086','#e4d6bb','#63574b','#252327'];
 c.save();c.globalAlpha=(1-t)*.7;fracture(c,x,y,fx.radius||30,p,t,7);
 ring(c,x,y,(fx.radius||30)*(.3+.7*t),p,t,true);sparks(c,x,y,fx.radius||30,p,t,10);c.restore();
}
export function drawBluntWeaponTrail(c,player,visual,camera){
 const move=visual.move;if(!['mace','hammer'].includes(visual.weaponType)||!move)return false;
 // The drawn weapon supplies the windup; a trail only accompanies its strike.
 if(!visual.active)return true;
 const x=player.x-camera.x,y=player.y-camera.y-4,r=move.range||48;
 const t=Math.max(0,Math.min(1,(visual.elapsed-move.activeStart)/Math.max(.001,move.activeEnd-move.activeStart)));
 const a=Math.atan2(visual.dirY||0,visual.dirX??1),half=(move.arcDegrees||96)*Math.PI/360;
 const p=player.classId==='oathkeeper'?OATH_PALETTES[getOathVisualFamily(player)]:['#aaa79e','#e8e0c9','#655c51','#252327'];
 c.save();c.globalAlpha=.7;
 if(move.kind==='circle')ring(c,x,y,move.radius||r,p,t);
 else for(let i=0;i<22;i++){
  const u=i/21,angle=a+(move.attackFamily==='maceBackhand'?1:-1)*half*(1-2*u);
  if(Math.abs(u-t)>.3)continue;
  pixel(c,x+Math.cos(angle)*r,y+Math.sin(angle)*r,move.finisher?5:3,move.finisher?5:3,u>.8?p[1]:p[0]);
 }
 c.restore();return true;
}
export function drawOathProjectile(c,shot,camera){
 if(shot.a?.classId!=='oathkeeper')return false;
 const p=OATH_PALETTES[shot.a.subclassId]||OATH_PALETTES.base,x=shot.x-camera.x,y=shot.y-camera.y;
 c.save();for(let i=1;i<=6;i++){c.globalAlpha=.65-i*.08;pixel(c,x-shot.aim.x*i*5,y-shot.aim.y*i*5,3,3,p[i%2?0:1]);}
 c.globalAlpha=1;
 if(shot.a.oathMorph&&shot.a.subclassId==='sinner')graveSword(c,x,y,p,Math.atan2(shot.aim.y,shot.aim.x)+Math.PI/2,2);
 else glyph(c,shot.a.subclassId==='sinner'?'fracture':'seal',x,y,p,1);
 c.restore();return true;
}
export function drawOathGuard(c,p,camera,family='base',channel=null){
 const buff=p.buffs?.defense;
 if(!(p.hp>0)||!channel&&(!(buff?.timer>0)||!String(buff.sourceAbilityId||'').startsWith('oathkeeper')))return;
 const colors=OATH_PALETTES[family]||OATH_PALETTES.base,x=Math.round(p.x-camera.x),y=Math.round(p.y-camera.y-18);
 c.save();c.globalAlpha=channel?.75:.5;
 glyph(c,family==='sinner'?'fracture':'shield',x+(channel?.dirX??p.dirX??1)*18,y+(channel?.dirY??p.dirY??0)*10,colors,1);
 c.restore();
}

import {asset} from './spriteArt.js';
import {isIronMire} from './ironMireDungeon.js';
const boss=asset('dungeon-iron-foreman'),machinery=asset('dungeon-iron-machinery');
const deaths=new WeakMap();
export function drawIronMireBoss(c,e,w,cam,fallback){
 if(!e.ironMireForeman)return fallback();
 if(!boss?.ready)return fallback();
 const now=performance.now()/1000,a=e.ironMireAttack,dead=e.hp<=0||e.dead;
 if(dead&&!deaths.has(e))deaths.set(e,now);
 const row=dead?5:e.hitFlash>0?4:a?(a.elapsed<a.tell?1:2):e.ironMireRecovery>0?3:0;
 const frame=dead?Math.min(3,Math.floor((now-deaths.get(e))/1.3*4)):
  a&&row===1?Math.min(3,Math.floor(a.elapsed/Math.max(.1,a.tell)*4)):
  a&&row===2?(a.key==='chain'?3:Math.min(2,1+Math.floor(Math.max(0,a.elapsed-a.tell)/.2))):Math.floor(now*6)%4;
 const x=Math.round(e.x-cam.x),y=Math.round(e.y-cam.y);
 c.save();c.imageSmoothingEnabled=false;c.fillStyle='rgba(3,9,11,.5)';c.beginPath();c.ellipse(x,y+14,66,18,0,0,Math.PI*2);c.fill();
 c.translate(x,y-228);if(e.dirX<0)c.scale(-1,1);c.drawImage(boss.image,frame*128,row*128,128,128,-128,0,256,256);c.restore();
}
export function drawIronMireObject(c,o,cam){
 if(o.ironMireProp==null)return false;
 if(!machinery?.ready)return true;
 const index=o.ironMireProp,scale=o.artScale||1,x=Math.round(o.x-cam.x),y=Math.round(o.y-cam.y);
 c.save();c.imageSmoothingEnabled=false;c.drawImage(machinery.image,index%4*96,Math.floor(index/4)*96,96,96,x-48*scale,y-90*scale,96*scale,96*scale);
 if(o.ironMireControl){
  c.fillStyle=o.activated?'#84a596':'#efd18c';c.fillRect(x-4,y-96*scale,8,8);
  c.font='bold 12px Georgia';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#10191c';c.strokeText(o.activated?'Station Secured':o.name,x,y-103*scale,220);c.fillText(o.activated?'Station Secured':o.name,x,y-103*scale,220);
 }
 c.restore();return true;
}
export function drawIronMireGround(c,w,cam){
 if(!isIronMire(w))return;
 c.save();c.imageSmoothingEnabled=false;
 const left=Math.max(0,Math.floor(cam.x/32)),right=Math.min(w.width,Math.ceil((cam.x+c.canvas.width)/32));
 const top=Math.max(0,Math.floor(cam.y/32)),bottom=Math.min(w.height,Math.ceil((cam.y+c.canvas.height)/32));
 for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
  const px=Math.round(x*32-cam.x),py=Math.round(y*32-cam.y),open=w.tiles[y][x].passable,n=(x*17+y*31)%7;
  c.fillStyle=open?['#343b3c','#343c3d','#30393a','#394040'][n%4]:'#10191e';c.fillRect(px,py,32,32);
  if(open){
   c.fillStyle='#455052';c.fillRect(px+2,py+2,28,1);c.fillStyle='#252e32';c.fillRect(px,py+30,32,2);
   if(n<3){c.fillStyle=w.floor===1?'#283d3e':'#243e42';c.fillRect(px+3,py+12,23,12);c.fillStyle='#3c5353';c.fillRect(px+6,py+13,13,1);}
   if(n===4){c.fillStyle='#64503e';c.fillRect(px+9,py+15,9,2);c.fillStyle='#252d2e';c.fillRect(px+11,py+17,11,3);}
  }else{
   c.fillStyle='#202b30';c.fillRect(px+1,py+3,27,10);c.fillStyle='#293338';c.fillRect(px+6,py+15,25,12);
   if(w.tiles[y+1]?.[x]?.passable){c.fillStyle='#526064';c.fillRect(px,py+25,32,3);c.fillStyle='#39474b';c.fillRect(px,py+28,32,4);}
  }
 }
 for(const r of w.rooms||[]){
  const x=Math.round(r.x*32-cam.x),y=Math.round(r.y*32-cam.y),width=r.w*32,height=r.h*32;
  if(x>c.canvas.width+200||x+width< -200||y>c.canvas.height+200||y+height< -200)continue;
  // Timber sleepers and paired rails establish the mine's circulation.
  const cy=Math.round(y+height*.72);c.fillStyle='#504438';for(let xx=x+36;xx<x+width-32;xx+=42)c.fillRect(xx,cy-18,10,50);
  c.fillStyle='#20282a';c.fillRect(x+30,cy-8,width-60,7);c.fillRect(x+30,cy+20,width-60,7);
  c.fillStyle='#786250';c.fillRect(x+30,cy-8,width-60,2);c.fillRect(x+30,cy+20,width-60,2);
  for(let xx=x+22;xx<x+width-10;xx+=128){c.fillStyle='#483c31';c.fillRect(xx,y,14,48);c.fillStyle='#75604a';c.fillRect(xx+2,y,3,46);c.fillStyle='#171f22';c.fillRect(xx-3,y+32,20,7);}
  if(r.id==='refuge'){
   c.fillStyle='#6d6048';c.fillRect(x+16,y+height-26,width-32,3);c.fillStyle='#a78957';c.fillRect(x+32,y+height-26,25,3);
  }
  if(['westPump','eastPump','westYard','eastForge'].includes(r.id)){
   const bx=x+42,by=y+52,bw=width*.4,bh=height*.33;
   c.fillStyle='#162b30';c.fillRect(bx-6,by-6,bw+12,bh+12);c.fillStyle='#243e41';c.fillRect(bx,by,bw,bh);
   c.fillStyle='#3b5150';for(let j=0;j<4;j++)c.fillRect(bx+18+j*21,by+25+j*13,36,1);
   c.fillStyle='#7a6250';c.fillRect(bx-7,by-7,bw+14,4);c.fillRect(bx-7,by+bh+3,bw+14,4);
   c.fillStyle='#334548';for(let xx=bx;xx<bx+bw;xx+=32)c.fillRect(xx,by+bh+8,3,16);
  }
  if(r.role==='boss'){
   c.strokeStyle='#80694b';c.lineWidth=4;c.strokeRect(x+22,y+22,width-44,height-44);
   const center=x+width/2,walk=width*.18;
   // Shallow flooded working beds flank the emergency deck. Attack overlays
   // alone mark damaging water; the quiet permanent floor remains traversable.
   c.fillStyle='#20383c';c.fillRect(x+34,y+34,width/2-walk/2-34,height-68);c.fillRect(center+walk/2,y+34,width/2-walk/2-34,height-68);
   for(let yy=y+45;yy<y+height-35;yy+=38){
    c.fillStyle='#2a4346';for(let xx=x+50;xx<x+width-40;xx+=91)c.fillRect(xx,yy+(Math.floor(xx)%3)*4,43,1);
    c.fillStyle='#2a2621';c.fillRect(center-walk/2,yy-8,walk,35);c.fillStyle='#50473a';c.fillRect(center-walk/2+3,yy-7,walk-6,31);
    c.fillStyle='#695740';c.fillRect(center-walk/2+4,yy-7,walk-8,2);c.fillStyle='#39382f';c.fillRect(center-walk/2+35,yy+7,walk-70,2);
   }
   for(const xx of [center-walk/2-8,center+walk/2+3]){
    c.fillStyle='#171f23';c.fillRect(xx-3,y+28,13,height-56);c.fillStyle='#78614b';c.fillRect(xx,y+28,4,height-56);
    for(let yy=y+40;yy<y+height-30;yy+=64){c.fillStyle='#a18760';c.fillRect(xx-3,yy,10,5);c.fillStyle='#302d28';c.fillRect(xx-2,yy+1,2,2);}
   }
  }
 }
 c.restore();
}
function shape(c,s,cam){
 c.save();c.translate(s.x-cam.x,s.y-cam.y);c.beginPath();
 if(s.type==='circle')c.arc(0,0,s.radius,0,Math.PI*2);
 if(s.type==='ring'){c.arc(0,0,s.radius,0,Math.PI*2);c.arc(0,0,s.inner,0,Math.PI*2,true);}
 if(s.type==='lane'){c.rotate(s.angle);c.rect(0,-s.width/2,s.length,s.width);}
 c.fill('evenodd');c.stroke();c.restore();
}
export function drawIronMireTells(c,w,cam){
 if(!isIronMire(w))return;const e=w.enemies.find(e=>e.ironMireForeman),a=e?.ironMireAttack;
 c.save();
 if(a){
  for(const event of a.events){
   if(event.released&&a.elapsed-event.at>.38)continue;
   c.fillStyle=event.released?'rgba(181,106,61,.56)':a.key==='flood'?'rgba(73,140,147,.28)':'rgba(214,164,82,.22)';
   c.strokeStyle=event.released?'#f3c58e':a.key==='flood'?'#a6d3ce':'#f0cc83';c.lineWidth=3;
   for(const s of event.shapes)shape(c,s,cam);
  }
  c.font='bold 16px Georgia';c.textAlign='center';c.fillStyle='#f1d6a5';c.strokeStyle='#152025';c.lineWidth=3;
  c.strokeText(a.name,c.canvas.width/2,92);c.fillText(a.name,c.canvas.width/2,92);
  if(a.key==='flood'){c.font='13px Georgia';c.fillStyle='#cae1d3';c.fillText(a.phase===3?'CENTRAL WALKWAY STAYS DRY':'MOVE TO THE UNMARKED HALF',c.canvas.width/2,112);}
 }
 for(const b of w.arenaBarriers||[]){c.fillStyle='#8b6e43';c.fillRect(b.x-cam.x,b.y-cam.y,b.w,b.h);}
 if(w.bossArena?.phase==='active'&&e?.hp>0){c.font='bold 14px Georgia';c.textAlign='center';c.fillStyle='#c4ac85';c.fillText(`THE DROWNED SHIFT · PHASE ${e.ironMirePhase||1}`,c.canvas.width/2,72);}
 c.restore();
}

import {sampleEnemyAttackPresentation} from './enemyAttackPresentation.js';
import {asset} from './spriteArt.js';
import {VEYREIGN_MOVES} from './veyreignCombat.js';
const bat=asset('veyreign-bat-beast'),deaths=new WeakMap();
export function drawVeyreignBat(c,e,x,y){
 if(!e.batBeast||!bat?.ready)return false;
 const now=performance.now()/1000,dead=e.hp<=0||e.dead,p=sampleEnemyAttackPresentation(e),row=dead?5:e.hitFlash>0?4:p?.phase==='execution'?2:p?.phase==='recovery'?3:p?1:0;
 if(dead&&!deaths.has(e))deaths.set(e,now);const col=dead?Math.min(15,Math.floor((now-deaths.get(e))/.9*16)):Math.floor(now*12)%16;
 c.save();c.imageSmoothingEnabled=false;c.drawImage(bat.image,col*60,row*80,60,80,Math.round(x-36),Math.round(y-82),72,96);c.restore();return true;
}
export function drawVeyreignGround(c,w,cam){
 if(!w.dungeonState?.veyreign)return;c.save();
 const floor=w.floor,tones=[['#302028','#13111c'],['#28232a','#11131c'],['#252838','#0e121e'],['#39212a','#160f1c'],['#2e1a25','#100b15']][floor-1];
 for(let y=Math.max(0,Math.floor(cam.y/32));y<Math.min(w.height,Math.ceil((cam.y+c.canvas.height)/32));y++)for(let x=Math.max(0,Math.floor(cam.x/32));x<Math.min(w.width,Math.ceil((cam.x+c.canvas.width)/32));x++){
  const px=x*32-cam.x,py=y*32-cam.y,open=w.tiles[y][x].passable;c.fillStyle=open?tones[0]:tones[1];c.fillRect(px,py,32,32);
  if(open){c.strokeStyle='#66515a';c.globalAlpha=.3;c.strokeRect(px+1,py+1,30,30);c.globalAlpha=1;if((x+y)%7===0){c.fillStyle='#8e6a4d';c.fillRect(px+13,py+13,6,6);}}
 }
 for(const r of w.rooms){const x=r.x*32-cam.x,y=r.y*32-cam.y,width=r.w*32,height=r.h*32;c.strokeStyle='#8c6e53';c.lineWidth=3;c.strokeRect(x+12,y+12,width-24,height-24);c.fillStyle='#571e32';c.fillRect(x+width/2-35,y+22,70,height-44);
  for(let i=0;i<r.w;i+=5){c.fillStyle='#332531';c.fillRect(x+i*32+24,y-32,30,62);c.fillStyle='#b98069';c.fillRect(x+i*32+30,y-25,18,4);c.fillStyle='#dbb87b';c.fillRect(x+i*32+37,y+32,3,9);}
  if(floor===1){for(const side of [-1,1]){const tx=x+width/2+side*(width/2-100);c.fillStyle='#17131a';c.fillRect(tx-23,y+90,46,height-180);c.fillStyle='#644739';c.fillRect(tx-20,y+80,40,height-180);for(let yy=120;yy<height-100;yy+=85){c.fillStyle='#ceb98d';c.fillRect(tx-9,y+yy,18,3);c.fillStyle='#431429';c.fillRect(tx-4,y+yy+8,8,6);c.fillStyle='#f5d89e';c.fillRect(tx-1,y+yy-15,2,8);}}}
  if(floor===2){for(let yy=90;yy<height-70;yy+=95)for(const xx of [55,width-55]){c.fillStyle='#100d16';c.fillRect(x+xx-23,y+yy-34,46,68);c.fillStyle='#5a4b56';c.fillRect(x+xx-18,y+yy-30,36,58);c.strokeStyle='#ad8973';c.strokeRect(x+xx-13,y+yy-24,26,44);c.fillStyle='#9c6b68';c.fillRect(x+xx-1,y+yy-12,2,22);c.fillRect(x+xx-7,y+yy-7,14,2);}}
  if(floor===3){c.strokeStyle='#526276';for(let i=0;i<7;i++){c.beginPath();c.moveTo(x+30+i*90,y+24);c.lineTo(x+width/2,y+height/2);c.stroke();}}
  if(floor===4){for(let i=0;i<6;i++){c.fillStyle='#9d294a';c.fillRect(x+35+i*70,y+40,18,35);c.fillStyle='#db7b71';c.fillRect(x+40+i*70,y+45,3,20);}}
  if(r.role==='boss'){const cx=r.cx*32-cam.x,cy=r.cy*32-cam.y;c.strokeStyle='#a87268';for(const rad of [150,270,420]){c.beginPath();c.arc(cx,cy,rad,0,Math.PI*2);c.stroke();}c.fillStyle='#8c624d';c.fillRect(cx-75,cy-260,150,80);c.fillStyle='#451a30';c.fillRect(cx-40,cy-280,80,90);for(const side of [-1,1])for(const dy of [-240,240]){c.fillStyle='#3e303e';c.fillRect(cx+side*440-20,cy+dy-60,40,95);c.fillStyle='#b78a62';c.fillRect(cx+side*440-25,cy+dy-65,50,8);c.fillStyle='#f4cd8b';c.fillRect(cx+side*440-3,cy+dy-82,6,13);}for(let i=0;i<5;i++){c.fillStyle=i%2?'#8f273f':'#284558';c.fillRect(x+60+i*230,y-50,50,100);}}
 }c.restore();
}
export function drawVeyreignEffects(c,w,cam){
 if(!w.dungeonState?.veyreign)return;c.save();const e=w.enemies.find(e=>e.veyreignLord),a=e?.veyreignAttack;
 for(const bat of w.enemies.filter(e=>e.batBeast&&e.hp>0&&e.batAttack)){const a=bat.batAttack;c.strokeStyle=a.released?'#ef7181':'#f0c17b';c.fillStyle=a.released?'rgba(180,35,65,.45)':'rgba(230,170,90,.2)';c.beginPath();c.arc(a.target.x-cam.x,a.target.y-cam.y,75,0,Math.PI*2);c.fill();c.stroke();}
 for(const b of w.arenaBarriers||[]){c.fillStyle='#a34052';c.fillRect(b.x-cam.x,b.y-cam.y,b.w,b.h);}
 if(a){c.strokeStyle=a.released?'#ffb5a4':'#f2c280';c.fillStyle=a.released?'rgba(183,28,59,.65)':'rgba(210,91,98,.25)';c.lineWidth=3;
  for(const s of a.shapes){c.save();c.translate(s.x-cam.x,s.y-cam.y);c.beginPath();if(s.type==='circle')c.arc(0,0,s.radius,0,Math.PI*2);if(s.type==='ring'){c.arc(0,0,s.radius,0,Math.PI*2);c.arc(0,0,s.inner,0,Math.PI*2,true);}if(s.type==='cone'){c.moveTo(0,0);c.arc(0,0,s.radius,s.angle-s.spread/2,s.angle+s.spread/2);c.closePath();}if(s.type==='lane'){c.rotate(s.angle);c.rect(0,-s.width/2,s.length,s.width);}c.fill();c.stroke();c.restore();}
  c.fillStyle='#ffe1bd';c.font='bold 16px Georgia';c.textAlign='center';c.fillText(VEYREIGN_MOVES[a.key].name,c.canvas.width/2,78);
 }
 if(w.bossArena?.phase==='active'){c.fillStyle='#f3c6b1';c.font='bold 16px Georgia';c.textAlign='center';c.fillText(`${e?.name||'Vampire Lord'} — Phase ${e?.veyreignPhase||1}`,c.canvas.width/2,54);}c.restore();
}

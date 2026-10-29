import {GROVE_MOVES} from './blightedGroveCombat.js';
import {dungeonCharacterAtlas,drawDungeonCharacter,drawDungeonNpc} from './dungeonCharacterSprites.js';
import {drawDungeonBossStage,drawDungeonBossMoveEffects} from './dungeonBossStageArt.js';
export function groveBossAtlas(){return dungeonCharacterAtlas('mother');}
export function drawGroveMother(c,e,w,camera,fallback){
 if(!e.groveMother)return fallback();
 if(!drawDungeonCharacter(c,'mother',e,e.x-camera.x,e.y-camera.y))fallback();
}
export function drawGroveSkull(c,o,camera){return drawDungeonNpc(c,{...o,groveSkull:true},camera);}
export function drawGroveGround(c,w,cam){
 if(!w.dungeonState?.grove)return;
 c.save();
 // This is an outdoor root labyrinth, not a reskinned stone crypt.
 for(let ty=Math.max(0,Math.floor(cam.y/32));ty<Math.min(w.height,Math.ceil((cam.y+c.canvas.height)/32));ty++)for(let tx=Math.max(0,Math.floor(cam.x/32));tx<Math.min(w.width,Math.ceil((cam.x+c.canvas.width)/32));tx++){
  const hash=(tx*17+ty*31)%7,px=tx*32-cam.x,py=ty*32-cam.y,open=w.tiles[ty][tx].passable;c.fillStyle=open?['#293529','#303a2b','#33382a'][hash%3]:'#0e1a16';c.fillRect(px,py,32,32);c.fillStyle=open?'#4c5838':'#203125';c.fillRect(px+hash*3,py+hash*4,open?9:4,3);c.fillRect(px+5,py+22,3,5);
 }
 for(const r of w.rooms||[]){const x=r.cx*32-cam.x,y=r.cy*32-cam.y;c.strokeStyle=r.role==='boss'?'#6e7145':'#576846';c.lineWidth=r.role==='boss'?5:2;c.beginPath();c.ellipse(x,y,r.w*12,r.h*10,0,0,Math.PI*2);c.stroke();
  if(r.id==='garden'){c.fillStyle='#1b4340';c.fillRect((r.x+3)*32-cam.x,(r.y+3)*32-cam.y,(r.w-6)*32,(r.h-6)*32);c.fillStyle='#6b885a';for(let i=0;i<12;i++)c.fillRect((r.x+4+i)*32-cam.x,(r.y+5+i%3)*32-cam.y,16,4);}
  for(let i=0;i<18;i++){const px=(r.x+2+(i*7)%(r.w-4))*32-cam.x,py=(r.y+2+(i*3)%(r.h-4))*32-cam.y;c.fillStyle=i%3?'#69714a':'#c7b987';c.fillRect(px,py,3,5);c.fillRect(px-3,py+1,9,2);}
 }
 // Impassable root hedges replace anonymous rectangular stone corridors.
 for(let y=1;y<w.height-1;y++)for(let x=1;x<w.width-1;x++)if(!w.tiles[y][x].passable&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>w.tiles[y+dy][x+dx].passable)){
  const px=x*32-cam.x,py=y*32-cam.y;if(px<-60||py<-60||px>c.canvas.width+60||py>c.canvas.height+60)continue;c.fillStyle='#192d22';c.fillRect(px,py-20,32,44);c.fillStyle='#465338';c.fillRect(px+7,py-25,9,43);c.fillStyle='#6d7444';c.fillRect(px+9,py-22,3,33);c.fillStyle='#34452b';c.fillRect(px-4,py-29,33,10);
 }c.restore();drawDungeonBossStage(c,w,cam);
}
export function drawGroveTells(c,w,cam){
 if(!w.dungeonState?.grove)return;const e=w.enemies.find(e=>e.groveMother),a=e?.groveAttack;
 c.save();
 for(const b of w.arenaBarriers||[]){c.fillStyle='#6d6940';c.fillRect(b.x-cam.x,b.y-cam.y,b.w,b.h);}
 if(a){c.fillStyle=a.released?'rgba(203,68,49,.55)':'rgba(220,170,76,.25)';c.strokeStyle=a.released?'#ef8763':'#edce8c';c.lineWidth=3;
  for(const s of a.shapes){c.save();c.translate(s.x-cam.x,s.y-cam.y);c.beginPath();if(s.type==='circle')c.arc(0,0,s.radius,0,Math.PI*2);if(s.type==='ring'){c.arc(0,0,s.radius,0,Math.PI*2);c.arc(0,0,s.inner,0,Math.PI*2,true);}if(s.type==='cone'){c.moveTo(0,0);c.arc(0,0,s.radius,s.angle-s.spread/2,s.angle+s.spread/2);c.closePath();}if(s.type==='lane'){c.rotate(s.angle);c.rect(0,-s.width/2,s.length,s.width);}c.fill();c.stroke();c.restore();}
  c.fillStyle='#f4d9a6';c.font='bold 15px Georgia';c.textAlign='center';c.fillText(GROVE_MOVES[a.key].name,e.x-cam.x,e.y-cam.y+50);
 }
 if(w.bossArena?.phase==='active'){c.font='bold 14px Georgia';c.fillStyle='#f1cf90';c.textAlign='center';c.fillText(`Mother of Briars — Phase ${e?.grovePhase||1} • Roots sealed`,c.canvas.width/2,52);}
 c.restore();drawDungeonBossMoveEffects(c,w,cam);
}

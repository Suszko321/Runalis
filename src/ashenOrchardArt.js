import {ORCHARD_MOVES} from './ashenOrchardCombat.js';
import {dungeonCharacterAtlas,drawDungeonCharacter} from './dungeonCharacterSprites.js';
import {drawDungeonBossStage,drawDungeonBossMoveEffects} from './dungeonBossStageArt.js';
export function orchardBossAtlas(){return dungeonCharacterAtlas('custodian');}
export function drawOrchardBoss(c,e,w,cam,fallback){
 if(!e.orchardCustodian)return fallback();
 if(!drawDungeonCharacter(c,'custodian',e,e.x-cam.x,e.y-cam.y))fallback();
}
export function drawOrchardGround(c,w,cam){
 if(!w.dungeonState?.orchard)return;c.save();
 for(let y=Math.max(0,Math.floor(cam.y/32));y<Math.min(w.height,Math.ceil((cam.y+c.canvas.height)/32));y++)for(let x=Math.max(0,Math.floor(cam.x/32));x<Math.min(w.width,Math.ceil((cam.x+c.canvas.width)/32));x++){
  const px=x*32-cam.x,py=y*32-cam.y,open=w.tiles[y][x].passable;c.fillStyle=open?['#414940','#454d43','#3e4841'][(x*7+y*3)%3]:'#141f1e';c.fillRect(px,py,32,32);if(open){c.fillStyle='#68705b';c.fillRect(px+3,py+2,26,1);c.fillStyle='#293a33';c.fillRect(px+1,py+30,31,2);}else{c.fillStyle='#283d35';c.fillRect(px+7,py+3,6,27);}
 }
 for(const r of w.rooms||[]){const x=r.x*32-cam.x,y=r.y*32-cam.y,width=r.w*32,height=r.h*32;
  c.strokeStyle=w.floor===1?'#bdb58c':'#8d9871';c.lineWidth=3;c.strokeRect(x+18,y+18,width-36,height-36);
  if(['settling','boss'].includes(r.id)){c.fillStyle='#1c4b48';for(let i=0;i<4;i++)c.fillRect(x+55+(i%2)*(width/2),y+55+Math.floor(i/2)*(height/2),width/2-110,height/2-110);}
  if(r.id==='triage'){c.fillStyle='#d1c7a2';for(let j=0;j<4;j++)c.fillRect(x+25+j*70,y+35,35,4);}
  if(r.id==='pumps'||r.id==='boss'){c.strokeStyle='#a5905e';c.lineWidth=8;for(let j=1;j<=3;j++){c.beginPath();c.moveTo(x+30,y+j*height/4);c.lineTo(x+width-30,y+j*height/4);c.stroke();}c.strokeStyle='#d0b475';c.lineWidth=2;c.strokeRect(x+30,y+30,width-60,height-60);}
  // Black roots follow the broken channels; white chalk marks the safe camp feed.
  c.strokeStyle='#625333';c.lineWidth=6;c.beginPath();c.moveTo(x+20,y+height-30);c.lineTo(x+width*.4,y+height*.65);c.lineTo(x+width*.6,y+height*.8);c.lineTo(x+width-25,y+height*.4);c.stroke();
 }
 c.restore();drawDungeonBossStage(c,w,cam);
}
export function drawOrchardTells(c,w,cam){
 if(!w.dungeonState?.orchard)return;const e=w.enemies.find(e=>e.orchardCustodian),a=e?.orchardAttack;c.save();
 if(a){c.fillStyle=a.released?'rgba(183,83,49,.6)':'rgba(206,178,91,.26)';c.strokeStyle=a.released?'#ed9b62':'#e9d49d';c.lineWidth=3;
  for(const s of a.shapes){c.save();c.translate(s.x-cam.x,s.y-cam.y);c.beginPath();if(s.type==='ring'){c.arc(0,0,s.radius,0,Math.PI*2);c.arc(0,0,s.inner,0,Math.PI*2,true);}else{c.rotate(s.angle);c.rect(0,-s.width/2,s.length,s.width);}c.fill();c.stroke();c.restore();}
  c.fillStyle='#f1ddb0';c.font='bold 15px Georgia';c.textAlign='center';c.fillText(ORCHARD_MOVES[a.key].name,e.x-cam.x,e.y-cam.y+52);
 }for(const b of w.arenaBarriers||[]){c.fillStyle='#a28d58';c.fillRect(b.x-cam.x,b.y-cam.y,b.w,b.h);}c.restore();drawDungeonBossMoveEffects(c,w,cam);
}

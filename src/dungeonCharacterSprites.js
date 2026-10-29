// Uses the game's shared asset cache and attack-presentation clocks. Source
// cells are 60x80; integer enlargement keeps the same crisp pixel grid.
import {asset} from './spriteArt.js';
import {sampleEnemyAttackPresentation} from './enemyAttackPresentation.js';
export const DUNGEON_CHARACTER_SPRITES=Object.freeze({width:60,height:80,frames:16,states:['idle','anticipation','execution','recovery','hit','death'],fps:12});
const names={mother:'dungeon-grove-mother',custodian:'dungeon-orchard-custodian',tamsin:'dungeon-sister-tamsin',edda:'dungeon-edda-skull'},motion=new WeakMap(),copies=new Map();
for(const name of Object.values(names))asset(name);
const clamp=x=>Math.max(0,Math.min(1,x)),frame=t=>Math.min(15,Math.floor(clamp(t)*16+1e-8));
export function dungeonCharacterAtlas(kind){
 const a=asset(names[kind]);if(!a?.ready)return null;
 if(!copies.has(kind)){const canvas=document.createElement('canvas');canvas.width=a.image.width;canvas.height=a.image.height;canvas.getContext('2d').drawImage(a.image,0,0);copies.set(kind,canvas);}return copies.get(kind);
}
export function sampleDungeonCharacter(actor,now=performance.now()/1000){
 let m=motion.get(actor);if(!m){m={hit:false,deathAt:null,recoveryMax:0};motion.set(actor,m);}
 const attack=actor.groveAttack||actor.orchardAttack,remaining=actor.groveRecovery||actor.orchardRecovery||0,presentation=sampleEnemyAttackPresentation(actor,now);
 if(actor.dead||actor.hp<=0){m.deathAt??=now;return {row:5,col:frame((now-m.deathAt)/.9),state:'death'};}
 m.deathAt=null;
 if(actor.hitFlash>0&&!m.hit){m.hitAt=now;m.hit=true;}if(!(actor.hitFlash>0))m.hit=false;
 if(m.hitAt!=null&&now-m.hitAt<.2)return {row:4,col:frame((now-m.hitAt)/.2),state:'hit'};
 if(attack){m.recoveryMax=0;const releasing=!!attack.released;return {row:releasing?2:1,col:frame(releasing?(attack.elapsed-attack.tell)/.3:attack.elapsed/attack.tell),state:releasing?'execution':'anticipation',pose:presentation?.pose};}
 if(remaining>0){m.recoveryMax=Math.max(m.recoveryMax,remaining);return {row:3,col:frame(1-remaining/Math.max(.01,m.recoveryMax)),state:'recovery'};}
 m.recoveryMax=0;return {row:0,col:Math.floor(now*12)%16,state:'idle'};
}
export function drawDungeonCharacter(c,kind,actor,x,y,{scale=kind==='mother'||kind==='custodian'?2:1,talking=false,portrait=false,now=performance.now()/1000}={}){
 const a=asset(names[kind]);if(!a?.ready)return false;
 const sample=talking?{row:2,col:Math.floor(now*12)%16}:sampleDungeonCharacter(actor,now);
 c.save();c.translate(Math.round(x),Math.round(y));c.imageSmoothingEnabled=false;
 // The rooted mother and nonhuman skull face the viewer. The Custodian's
 // asymmetrical press follows its attack direction without changing gameplay.
 if(kind==='custodian'&&actor.dirX<-.2)c.scale(-1,1);
 if(!portrait){c.fillStyle='rgba(4,6,9,.42)';c.beginPath();c.ellipse(0,3,kind==='edda'?18:20*scale,kind==='edda'?4:5*scale,0,0,Math.PI*2);c.fill();}
 c.drawImage(a.image,sample.col*60,sample.row*80,60,80,-30*scale,-76*scale,60*scale,80*scale);c.restore();return true;
}
export function isDungeonNpc(o){return o?.groveSkull||['groveRootkeeper','orchardTamsin'].includes(o?.npcId);}
export function drawDungeonNpc(c,o,cam,talking=false){
 const kind=o.groveSkull||o.npcId==='groveRootkeeper'?'edda':'tamsin',x=o.x-cam.x,y=o.y-cam.y;
 const drawn=drawDungeonCharacter(c,kind,o,x,y,{talking});if(!drawn)return false;
 if(o.name){c.save();c.font='12px Georgia';c.textAlign='center';c.fillStyle='#ddd4a4';c.fillText(o.name,Math.round(x),Math.round(y)-(kind==='edda'?48:76));c.restore();}return true;
}

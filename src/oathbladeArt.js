import {OATH_PALETTES} from './oathkeeperArt.js';
// Four hand-authored pixel swords. Their geometry, not just their colour,
// distinguishes a plain oath blade, broad crusader sword, scripture blade and
// a jagged black weapon split by crimson fissures.
export const OATH_BLADE_SHAPES=Object.freeze({
 base:['00000100000','00001310000','00013431000','00013431000','00013431000','00013431000','00013431000','00013431000','00013431000','00013431000','00013431000','00013431000','00013431000','00013431000','00013431000','00012321000','01112321110','12333333321','01112321110','00012321000','00012321000','00012321000','00013331000','00001110000'],
 holyknight:['00000100000','00001310000','00013331000','00133433100','01333433310','01333433310','01333433310','01333433310','01333433310','01333433310','01334443310','01333433310','01333433310','01333433310','01333433310','01333433310','00123332100','01123432110','12334443321','01123432110','00123332100','00012321000','00012321000','00013331000','00013431000','00001110000'],
 sinner:['0000001000000','0000013100000','0000131310000','0001331331000','0001314131000','0013311133100','0131311131310','0011314131100','0001311131000','0001314131000','0001311131000','0013311133100','0131314131310','0011311131100','0001314131000','0001331331000','0000131310000','0011111111100','1133331333311','1333114113331','0111111111110','0000123210000','0000123210000','0000123210000','0000133310000','0000011100000']
});
export function drawOathBlades(c,formation,camera,now){
 if(!formation||formation.until<=now)return;
 const family=formation.ability.oathBladeFamily||'base',p=OATH_PALETTES[family],rows=OATH_BLADE_SHAPES[family],colors=['',p[3],p[2],p[0],p[1]];
 c.save();c.imageSmoothingEnabled=false;
 for(const b of formation.blades){
  if(b.x-camera.x< -80||b.y-camera.y< -100||b.x-camera.x>c.canvas.width+80||b.y-camera.y>c.canvas.height+100)continue;
  const fade=Math.min(1,(formation.until-now)/.5),angle=Math.round((Math.atan2(b.dirY,b.dirX)+Math.PI/2)/(Math.PI/4))*(Math.PI/4),cos=Math.cos(angle),sin=Math.sin(angle);
  c.globalAlpha=fade*(b.phase==='return'?.5:1);
  if(b.phase==='flight'||b.phase==='return')for(let i=1;i<=5;i++){c.fillStyle=i%2?p[0]:p[3];c.fillRect(Math.round(b.x-camera.x-b.dirX*i*5),Math.round(b.y-camera.y-b.dirY*i*5),3,3);}
  for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++){
   const v=+rows[row][col];if(!v)continue;const u=(col-(rows[row].length-1)/2)*2,y=(row-rows.length/2)*2;
   c.fillStyle=colors[v];c.fillRect(Math.round(b.x+cos*u-sin*y)-Math.round(camera.x),Math.round(b.y+sin*u+cos*y)-Math.round(camera.y),2,2);
  }
  if(b.phase==='windup'){c.globalAlpha=fade*.8;c.fillStyle=p[1];for(let i=0;i<4;i++){const a=i*Math.PI/2+now*2;c.fillRect(Math.round(b.x+Math.cos(a)*17)-Math.round(camera.x),Math.round(b.y+Math.sin(a)*17)-Math.round(camera.y),3,3);}}
 }
 c.restore();
}

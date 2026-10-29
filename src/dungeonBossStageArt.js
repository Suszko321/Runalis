// Ground staging and deterministic move effects. Every flourish follows an
// existing hazard shape; nothing here adds collision or hidden damage.
const circle=(c,x,y,r)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);};
function gear(c,x,y,r,turn=0){c.save();c.translate(x,y);c.rotate(turn);c.strokeStyle='#79663f';c.lineWidth=7;circle(c,0,0,r);c.stroke();c.strokeStyle='#baa16a';c.lineWidth=2;circle(c,0,0,r-7);c.stroke();for(let i=0;i<12;i++){c.rotate(Math.PI/6);c.fillStyle='#625535';c.fillRect(r-2,-5,12,10);if(i%2===0){c.fillStyle='#8a7950';c.fillRect(0,-3,r-9,6);}}c.restore();}
export function drawDungeonBossStage(c,w,cam){
 const grove=!!w.dungeonState?.grove,orchard=!!w.dungeonState?.orchard&&w.floor===2;if(!grove&&!orchard)return;
 const a=w.bossArena||{x:26*32,y:3*32,w:30*32,h:22*32},now=performance.now()/1000,cx=a.x+a.w/2-cam.x,cy=a.y+a.h/2-cam.y;
 c.save();
 if(grove){
  const glow=c.createRadialGradient(cx,cy,20,cx,cy,a.w*.6);glow.addColorStop(0,'rgba(133,158,105,.15)');glow.addColorStop(1,'rgba(10,26,19,0)');c.fillStyle=glow;c.fillRect(a.x-cam.x,a.y-cam.y,a.w,a.h);
  // Nine interwoven oath roots around a burial crown and a pale petal floor.
  for(let i=0;i<9;i++){const angle=i*Math.PI*2/9;c.strokeStyle=i%2?'#43513a':'#6d7350';c.lineWidth=i%2?8:4;c.beginPath();for(let j=0;j<=20;j++){const t=j/20,r=70+t*280,theta=angle+t*1.5,x=cx+Math.cos(theta)*r,y=cy+Math.sin(theta)*r*.7;j?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}
  c.strokeStyle='#9b9b73';c.lineWidth=2;for(const r of [84,92]){c.beginPath();c.ellipse(cx,cy,r,r*.65,0,0,Math.PI*2);c.stroke();}
  for(let i=0;i<48;i++){const angle=i*2.399,r=130+i%7*33,x=cx+Math.cos(angle)*r,y=cy+Math.sin(angle)*r*.68;c.fillStyle=i%3?'#939d6c':'#d0c9a1';c.fillRect(Math.round(x),Math.round(y),2,4);}
  for(const side of [-1,1]){const x=cx+side*(a.w/2-26);c.strokeStyle='#273f2b';c.lineWidth=19;c.beginPath();c.moveTo(x,cy+a.h/2-25);c.bezierCurveTo(x-side*60,cy+60,x+side*30,cy-170,cx+side*130,cy-a.h/2+15);c.stroke();c.strokeStyle='#6c7750';c.lineWidth=4;c.stroke();}
 }else{
  // Monumental pressure wheels and four illuminated basins frame the arena.
  for(const sx of [-1,1])for(const sy of [-1,1]){const x=cx+sx*(a.w/2-92),y=cy+sy*(a.h/2-92);gear(c,x,y,62,(now*.08*sx));
   const g=c.createRadialGradient(x,y,3,x,y,115);g.addColorStop(0,'rgba(103,173,159,.18)');g.addColorStop(1,'rgba(56,94,86,0)');c.fillStyle=g;c.fillRect(x-115,y-115,230,230);c.strokeStyle='#507e76';c.lineWidth=1;for(let j=0;j<3;j++){c.beginPath();c.ellipse(x,y,74+j*10,18+j*4,0,0,Math.PI*2);c.stroke();}}
  c.strokeStyle='#9a8857';c.lineWidth=3;c.beginPath();c.ellipse(cx,cy,135,100,0,0,Math.PI*2);c.stroke();c.strokeStyle='#4b5c4c';c.lineWidth=11;c.beginPath();c.ellipse(cx,cy,127,92,0,0,Math.PI*2);c.stroke();
  for(let i=0;i<12;i++){const angle=i*Math.PI/6;c.save();c.translate(cx+Math.cos(angle)*146,cy+Math.sin(angle)*108);c.rotate(angle);c.fillStyle='#b4a073';c.fillRect(-2,-6,4,12);c.restore();}
 }
 // Edge lamps do not cover actors or imply unsafe regions in the floor.
 for(let i=0;i<8;i++){const x=a.x+45+i*(a.w-90)/7-cam.x,y=a.y+23-cam.y;c.fillStyle='#393b2b';c.fillRect(x-6,y-8,12,14);c.fillStyle=grove?'#b9c58a':'#e6c684';c.fillRect(x-2,y-12+Math.round(Math.sin(now*4+i)),4,7);}
 c.restore();
}
export function drawDungeonBossMoveEffects(c,w,cam){
 const e=(w.enemies||[]).find(e=>e.groveMother||e.orchardCustodian),a=e?.groveAttack||e?.orchardAttack;if(!a)return;
 const grove=!!e.groveMother,progress=Math.max(0,Math.min(1,a.elapsed/a.tell)),impact=a.released,age=Math.max(0,a.elapsed-a.tell),fade=impact?Math.max(0,1-age/.4):.5+progress*.35;
 c.save();c.globalAlpha=fade;c.lineWidth=2;
 for(const [index,s]of a.shapes.entries()){
  c.save();c.translate(Math.round(s.x-cam.x),Math.round(s.y-cam.y));c.strokeStyle=grove?'#b1bb83':'#d9c68f';c.fillStyle=grove?'#d2d4a0':'#e4dbb1';
  if(s.type==='lane'){
   c.rotate(s.angle);const segments=Math.min(24,Math.max(6,Math.floor(s.length/35)));
   for(let i=0;i<segments;i++){const x=(i+.5)*s.length/segments,wave=Math.sin(i*.9+a.elapsed*7),y=wave*s.width*.28;
    if(grove){const rise=impact?18+Math.sin(i)*8:progress*8;c.strokeStyle=impact?'#a2ad76':'#747d50';c.beginPath();c.moveTo(x-8,y+5);c.lineTo(x-2,y-rise);c.lineTo(x+7,y+5);c.stroke();if(impact)c.fillRect(x,y-rise,3,3);}
    else{c.strokeStyle=impact?'#a9d9ce':'#839f85';c.beginPath();c.moveTo(x-10,y);c.lineTo(x,y-(impact?12:4));c.lineTo(x+10,y);c.stroke();if(impact){c.fillRect(x+Math.sin(i)*8,y-22-age*30,2,5);c.fillRect(x-4,y+14+age*20,3,3);}}
   }
   if(impact){c.strokeStyle=grove?'#e2d5a4':'#ede2ba';c.lineWidth=3;c.beginPath();c.moveTo(0,0);c.lineTo(s.length,0);c.stroke();}
  }else if(s.type==='circle'){
   const r=s.radius*(impact?1:progress);for(let i=0;i<12;i++){const angle=i*Math.PI/6+index*.3,inner=r*.7,outer=r*(impact?1.06:.93);c.beginPath();c.moveTo(Math.cos(angle)*inner,Math.sin(angle)*inner);c.lineTo(Math.cos(angle+.08)*outer,Math.sin(angle+.08)*outer);c.stroke();}
   if(impact){c.strokeStyle='#d9d4ac';circle(c,0,0,r*(.4+age));c.stroke();}
  }else if(s.type==='ring'){
   // Ripple rings stay in the damaging annulus, leaving the safe heart clear.
   for(let i=0;i<4;i++){const r=s.inner+(s.radius-s.inner)*((i/4+a.elapsed*.25)%1);c.globalAlpha=fade*(.3+i*.15);c.strokeStyle=grove?'#9cae78':'#a4d4c4';c.lineWidth=impact?4:1;circle(c,0,0,r);c.stroke();}
  }else if(s.type==='cone'){
   c.strokeStyle=impact?'#e1d4a7':'#9ea872';for(let i=0;i<3;i++){c.lineWidth=impact?4:1;c.beginPath();c.arc(0,0,s.radius*(.45+i*.2),s.angle-s.spread/2,s.angle+s.spread/2);c.stroke();}
   if(impact)for(let i=0;i<16;i++){const theta=s.angle-s.spread/2+s.spread*i/15,r=s.radius*(.65+age);c.fillRect(Math.cos(theta)*r,Math.sin(theta)*r-4,3,5);}
  }
  c.restore();
 }
 c.restore();
}

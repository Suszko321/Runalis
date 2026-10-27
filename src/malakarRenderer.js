import {isMalakarSanctum,encounterState} from './malakarEncounter.js';
import {MALAKAR_MOVES} from './malakarCombat.js';
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function circle(c,x,y,r){c.beginPath();c.arc(x,y,r,0,Math.PI*2);}
export function drawMalakarGround(c,w,camera){
 if(!isMalakarSanctum(w)){
  const entrance=w.objects?.find(o=>o.malakarEntrance);if(!entrance)return;
  const x=entrance.x-camera.x,y=entrance.y-camera.y;
  c.save();rect(c,'#18131c',x-92,y-100,184,112);for(const dx of [-92,72]){rect(c,'#50434a',x+dx,y-110,20,128);rect(c,'#a67b59',x+dx,y-110,20,5);}rect(c,'#7b3b38',x-72,y-12,144,9);rect(c,'#df985c',x-64,y-7,128,2);c.fillStyle='#eed5a6';c.textAlign='center';c.font='14px Georgia';c.fillText('RITUAL SANCTUM',x,y-80);c.restore();return;
 }
 const s=encounterState(w)||{},ox=-camera.x,oy=-camera.y,t=s.elapsed||0;
 c.save();
 // A quiet stone carpet and ordered masonry keep the damaging graphics distinct.
 rect(c,'#29232b',128+ox,160+oy,1024,864);
 for(let y=160;y<1024;y+=64)for(let x=128;x<1152;x+=64){rect(c,(x+y)%128?'#302a32':'#352d35',x+ox+2,y+oy+2,60,60);rect(c,'#473a42',x+ox+3,y+oy+3,58,1);}
 rect(c,'#49303a',608+ox,288+oy,64,688);
 for(const x of [144,1104])for(let y=224;y<=896;y+=168){rect(c,'#17141b',x+ox-14,y+oy-84,48,100);rect(c,'#64565b',x+ox-10,y+oy-80,38,76);rect(c,'#a38872',x+ox-14,y+oy-84,48,8);rect(c,'#89736a',x+ox-18,y+oy-8,56,16);}
 if(s.sealed&&!['arrival','victory'].includes(s.mode)){rect(c,'#a84545',576+ox,1014+oy,128,7);rect(c,'#f3ba77',584+ox,1016+oy,112,2);}
 // Paired ceremonial standards and masonry detail remain outside the fighting floor.
 for(const x of [320,960]){rect(c,'#9b7458',x+ox,176+oy,5,155);rect(c,'#642e3e',x+ox+7,183+oy,50,106);rect(c,'#ba9270',x+ox+12,191+oy,40,3);c.strokeStyle='#b58b6d';c.lineWidth=2;circle(c,x+ox+32,224+oy,14);c.stroke();rect(c,'#2b1b29',x+ox+30,207+oy,4,35);}
 for(const x of [144,1104])for(let y=224;y<=896;y+=168)for(let j=0;j<6;j++){rect(c,j%2?'#887479':'#594951',x+ox-7,y+oy-73+j*12,30,2);rect(c,'#40343e',x+ox+(j%2?7:-1),y+oy-73+j*12,2,10);}
 // Stepped royal altar, high split throne and symmetrical infernal standards.
 for(let i=0;i<4;i++)rect(c,['#61505a','#6e5b63','#796773','#938075'][i],480+ox+i*15,224+oy-i*18,320-i*30,28);
 rect(c,'#1b141f',578+ox,126+oy,124,122);rect(c,'#75545a',586+ox,134+oy,108,108);rect(c,'#341f31',602+ox,148+oy,76,90);
 for(const x of [574,690]){rect(c,'#ba8c61',x+ox,105+oy,12,148);rect(c,'#dfb175',x+ox-4,100+oy,20,9);}rect(c,'#a7755d',574+ox,238+oy,128,13);for(const side of [-1,1]){c.fillStyle='#b69a79';c.beginPath();c.moveTo(640+side*57+ox,130+oy);c.lineTo(640+side*96+ox,84+oy);c.lineTo(640+side*73+ox,145+oy);c.closePath();c.fill();}for(let y=152;y<230;y+=12){rect(c,'#b7896b',592+ox,y+oy,5,6);rect(c,'#b7896b',685+ox,y+oy,5,6);}
 c.strokeStyle=s.phase===3?'#79556b':'#6c4750';c.lineWidth=3;circle(c,640+ox,576+oy,232);c.stroke();circle(c,640+ox,576+oy,210);c.stroke();
 for(let i=0;i<8;i++){const a=i*Math.PI/4;c.strokeStyle='#4d3845';c.lineWidth=1;c.beginPath();c.moveTo(640+ox+Math.cos(a)*70,576+oy+Math.sin(a)*70);c.lineTo(640+ox+Math.cos(a)*205,576+oy+Math.sin(a)*205);c.stroke();}
 for(let i=0;i<12;i++){const a=i*Math.PI/6,x=640+Math.cos(a)*220+ox,y=576+Math.sin(a)*220+oy;rect(c,'#74545c',x-3,y-7,6,14);}
 for(const [x,y]of [[384,448],[896,448],[384,704],[896,704]]){
  c.strokeStyle=s.mode==='ritual'&&t>=6?'#f6ac65':'#795560';circle(c,x+ox,y+oy,42);c.stroke();
  if(s.mode==='ritual'&&t>=9&&t<16){for(let i=0;i<8;i++){const h=30+((i*31+Math.floor(t*12))%60);rect(c,i%2?'#f5bd64':'#b84632',x+ox-25+i*7,y+oy-h,5,h);}if(t>=12){c.strokeStyle='#efc68c';c.lineWidth=3;c.beginPath();c.moveTo(x+ox,y+oy-35);c.quadraticCurveTo(640+ox,y+oy-150,640+ox,448+oy);c.stroke();}}
  if(['active','dying','victory'].includes(s.mode))rect(c,'#17151a',x+ox-26,y+oy-8,52,15);
 }
 if(s.mode==='ritual'&&t>13||s.mode==='dying'){const r=s.mode==='dying'?20+t*55:40+(t-13)*18;c.strokeStyle='#e7a876';c.lineWidth=3;circle(c,640+ox,448+oy,r);c.stroke();}
 if(s.mode==='victory'){c.strokeStyle='#76636e';c.lineWidth=3;for(let i=0;i<6;i++){c.beginPath();c.moveTo(640+ox,448+oy);c.lineTo(640+ox+Math.cos(i)*200,448+oy+Math.sin(i)*200);c.stroke();}}
 c.restore();
}
function path(c,shape,camera){const x=shape.x-camera.x,y=shape.y-camera.y;c.beginPath();
 if(shape.type==='circle')c.arc(x,y,shape.radius,0,Math.PI*2);
 if(shape.type==='ring'){c.arc(x,y,shape.radius,0,Math.PI*2);c.moveTo(x+shape.inner,y);c.arc(x,y,shape.inner,0,Math.PI*2,true);}
 if(shape.type==='cone'){c.moveTo(x,y);c.arc(x,y,shape.radius,shape.angle-shape.spread/2,shape.angle+shape.spread/2);c.closePath();}
 if(shape.type==='lane'){const dx=Math.cos(shape.angle),dy=Math.sin(shape.angle),rx=-dy*shape.width/2,ry=dx*shape.width/2;c.moveTo(x+rx,y+ry);c.lineTo(x+dx*shape.length+rx,y+dy*shape.length+ry);c.lineTo(x+dx*shape.length-rx,y+dy*shape.length-ry);c.lineTo(x-rx,y-ry);c.closePath();}
}
export function drawMalakarTelegraphs(c,w,camera){
 if(!isMalakarSanctum(w))return;const s=encounterState(w),a=s?.attack;c.save();
 if(a){const def=MALAKAR_MOVES[a.key],locked=!a.tracking;c.strokeStyle=locked?def.color:'#fff0c6';c.lineWidth=a.released?4:2;c.setLineDash(a.tracking?[7,7]:[]);
 const shapes=a.key==='charge'&&a.released?[{type:'circle',x:w.enemies[0]?.x||0,y:w.enemies[0]?.y||0,radius:43}]:a.shapes;
 for(const shape of shapes){path(c,shape,camera);c.globalAlpha=a.released?.32:.12;c.fillStyle=def.color;c.fill('evenodd');c.globalAlpha=1;c.stroke();}
 c.setLineDash([]);c.font='bold 15px Georgia';c.textAlign='center';c.fillStyle='#ffe5be';
 const label=a.key==='brand'?(a.tracking?'BRAND — TRACKING':'BRAND — LOCKED'):a.key==='rupture'?'RUPTURE — CLOSE IN OR MOVE OUT':a.key==='signature'?`FINAL SIEGE — FRACTURE ${a.step+1}/3`:a.key==='cleave'?`ROYAL CLEAVE — ${a.strikes} STRIKES`:def.name.toUpperCase();
 c.fillText(label,c.canvas.width/2,92,c.canvas.width*.65);
 const progress=Math.min(1,a.elapsed/a.tell);rect(c,'#201921',c.canvas.width/2-100,102,200,4);rect(c,def.color,c.canvas.width/2-100,102,200*progress,4);
 }
 if(s?.mode==='ritual'&&s.elapsed>=9&&s.elapsed<16){
  const t=s.elapsed;
  for(const [x,y]of [[384,448],[896,448],[384,704],[896,704]]){
   for(let i=0;i<7;i++){const xx=x-camera.x-24+i*8,h=35+18*Math.sin(t*9+i*2);c.fillStyle=i%2?'#f9c673':'#dc6b39';c.globalAlpha=.7;c.beginPath();c.moveTo(xx-5,y-camera.y);c.lineTo(xx+2,y-camera.y-h);c.lineTo(xx+9,y-camera.y-12);c.closePath();c.fill();}
   for(let i=0;i<10;i++){const u=((t*.65+i*.103)%1),xx=x+(640-x)*u+Math.sin(i*4+u*7)*18,yy=y+(448-y)*u-Math.sin(u*Math.PI)*85;rect(c,'#f6d6a0',xx-camera.x,yy-camera.y,3,3);}
  }c.globalAlpha=1;
 }
 if(s?.transition>0){c.fillStyle='#f3c790';c.font='bold 24px Georgia';c.textAlign='center';c.fillText(s.phase===2?'WRATH':'RUIN',c.canvas.width/2,140);}
 if(s?.mode==='active'&&s.grace>0){c.fillStyle='#f3d4a1';c.font='18px Georgia';c.textAlign='center';c.fillText('The seal holds. Move — Malakar is gathering his strength.',c.canvas.width/2,140);}
 c.restore();
}
export function drawMalakarActor(c,e,w,draw,camera={x:0,y:0}){
 const s=encounterState(w);if(!e.malakarSolo||!s)return draw();
 if(s.mode==='ritual'&&s.elapsed<14)return;
 c.save();if(s.attack?.key==='signature'&&!s.attack.released)c.translate(0,-Math.min(24,s.attack.elapsed*22));if(s.attack?.key==='cleave'&&!s.attack.released)c.translate(-Math.cos(s.attack.angle)*Math.min(7,s.attack.elapsed*9),-Math.sin(s.attack.angle)*Math.min(7,s.attack.elapsed*9));if(s.mode==='ritual')c.globalAlpha=Math.min(1,(s.elapsed-14)/4);if(s.mode==='dying')c.globalAlpha=Math.max(.05,1-s.elapsed/4);draw();c.restore();
}

import {drawGardenFlower} from './gardenGraveArt.js';
const TAU=Math.PI*2,colors=['','#231319','#8d2237','#ce3b53','#ffb2a0'];
const shapes=[['0110','1231','1341','0110'],['0010','0131','1341','1231','0110'],['01110','12331','01310'],['0010','0131','1341','0110']];
const pixel=(c,x,y,color,n=2)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),n,n);};
function petal(c,x,y,shape,bright,unit=2){const rows=shapes[shape%4];for(let j=0;j<rows.length;j++)for(let i=0;i<rows[j].length;i++){const v=+rows[j][i];if(v)pixel(c,x+(i-2)*unit,y+(j-2)*unit,colors[bright&&v===3?4:v],unit);}}
export function drawPetalStorm(c,fx,camera){
 const s=fx.stormVisual,p=s?.owner;if(!s?.active||!p||p.hp<=0||p.active===false||p.lifeState&&p.lifeState!=='alive')return;
 const t=s.elapsed||0;if(t>=7)return;const x=Math.round(p.x),y=Math.round(p.y),r=s.radius,front=fx.layer==='front',fade=Math.min(1,t/.25,(7-t)/.55);
 if(x-camera.x< -r-40||y-camera.y< -r-60||x-camera.x>c.canvas.width+r+40||y-camera.y>c.canvas.height+r+60)return;
 c.save();c.translate(-Math.round(camera.x),-Math.round(camera.y));c.imageSmoothingEnabled=false;c.globalAlpha=fade;
 if(!front){
  // The boundary uses the authoritative circular hit radius. Sparse thorn
  // segments and a clear centre leave enemy warnings and the player readable.
  for(let i=0,n=Math.ceil(TAU*r/4);i<n;i++){if(i%9>5)continue;const a=i/n*TAU;pixel(c,x+Math.cos(a)*r,y+Math.sin(a)*r,'#29151c',3);pixel(c,x+Math.cos(a)*r,y+Math.sin(a)*r,'#bd4156',1);}
  for(let i=0;i<12;i++){const a=i*TAU/12+t*.35,rr=r*.82;for(let j=0;j<8;j++){const aa=a+j*.008;pixel(c,x+Math.cos(aa)*rr,y+Math.sin(aa)*rr,'#42613b',2);}const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;pixel(c,px+Math.cos(a+.4)*5,py+Math.sin(a+.4)*5,'#f08389',2);}
  for(let i=0;i<4;i++){const a=i*TAU/4-t*.45;drawGardenFlower(c,x+Math.cos(a)*r*.76,y+Math.sin(a)*r*.76,'petalknight',1);}
  c.globalAlpha=fade*.5;
  for(let ribbon=0;ribbon<3;ribbon++)for(let j=0;j<52;j++){
   const u=j/51,a=ribbon*TAU/3-t*.85+u*1.15,rr=r*(.35+u*.5),px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr;
   pixel(c,px,py,'#28121c',4);pixel(c,px+1,py+1,j%8<2?'#f2848d':'#a83751',2);
  }c.globalAlpha=fade;
 }
 const count=front?16:50;for(let i=0;i<count;i++){
  const ring=i%3,a=i*2.399963+(front?1:-1)*t*(.65+ring*.22),rr=Math.min(r-9,48+(r-58)*((i*.618033)%1));
  const px=x+Math.cos(a)*rr,py=y+Math.sin(a)*rr-(front?9+Math.sin(t*3+i)*7:0);
  if(front&&Math.hypot(px-x,py-y)<42)continue;
  if(i%4===0){c.globalAlpha=fade*.32;pixel(c,px-Math.cos(a+.8)*6,py-Math.sin(a+.8)*6,'#9e2944',2);c.globalAlpha=fade;}
  petal(c,px,py,(i+Math.floor(t*3))%4,front&&i%3===0,i%9===0?3:2);
 }
 if(front){c.globalAlpha=fade*.55;pixel(c,x-16,y+3,'#c83953',2);pixel(c,x+15,y+3,'#c83953',2);
  if(s.startedAt+t-s.lastHealAt<.22){pixel(c,x-5,y+7,'#97ac79',1);pixel(c,x+5,y+5,'#d8dca5',1);}
 }
 c.restore();
}

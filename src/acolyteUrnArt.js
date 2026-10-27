// Dedicated filled pixel sprites for thrown clay and three seeking wraiths.
// Positions remain in world space; animation changes poses, never limb scale.
const P=['','#161c29','#42415c','#6d7591','#7cbaaF','#b4f2dd','#f0ffe8','#bd9274'];
const U=['','#1b1923','#493543','#87636b','#b08a83','#a4eedd','#f4e2b3','#d2bc90'];
const URN=['0001222100000','0017666710000','0001333100000','0001333100000','0012333210000','0123333321000','1233444332100','1233454332100','1233543432100','1233445332100','1233453432100','0123333321000','0012333210000','0012333210000','0001222100000','0001222100000','0000111000000'];
const GHOST=[
 ['0000111000000','0001232100000','0012353210000','0123565321000','0125666521000','0125616521000','0125656521000','0012555210000','0001232100000','0111232111000','1232343232100','0123454321000','0013454310000','0012343210000','0012343210000','0123323321000','1232101232100','0121000121000','0010000010000'],
 ['0000111000000','0001232100000','0012353210000','0123565321000','0125666521000','0125616521000','0125656521000','0012555210000','0001232100000','0011232110000','0122343221000','1233454332100','0123454321000','0012343210000','0012343210000','0012333210000','0123212321000','1231000123100','0100000001000'],
 ['0000111000000','0001232100000','0012353210000','0123565321000','0125666521000','0125616521000','0125656521000','0012555210000','0001232100000','0111232111000','1232343232100','0123454321000','0013454310000','0012343210000','0122333221000','1232132123100','0121012101000','0010001000000','0000000100000']
];
const pixel=(c,x,y,color,n=2)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),n,n);};
const sprites=new Map();
function sprite(rows,key,palette=P){if(sprites.has(key))return sprites.get(key);const canvas=document.createElement('canvas');canvas.width=13;canvas.height=rows.length;const c=canvas.getContext('2d');for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(+rows[y][x])pixel(c,x,y,palette[+rows[y][x]],1);sprites.set(key,canvas);return canvas;}
function urnPose(turn){const key='spin'+turn;if(sprites.has(key))return sprites.get(key);const canvas=document.createElement('canvas');canvas.width=canvas.height=48;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.translate(24,24);c.rotate(turn*Math.PI/16);c.drawImage(sprite(URN,'urn',U),-12,-17,26,34);sprites.set(key,canvas);return canvas;}
export function drawSpectralUrnFlight(c,urn,camera){
 const t=urn.progress||0,x=Math.round(urn.x),y=Math.round(urn.y-20-Math.sin(t*Math.PI)*52),image=urnPose(Math.round(Math.sin(t*Math.PI)*3));
 c.save();c.imageSmoothingEnabled=false;c.translate(-Math.round(camera.x),-Math.round(camera.y));
 c.globalAlpha=.45;for(let i=0;i<16;i++){const a=i*Math.PI/8;pixel(c,x+Math.cos(a)*10,urn.y+Math.sin(a)*4,P[1],2);}c.globalAlpha=1;
 for(let i=1;i<=5;i++){const back=Math.max(0,t-i*.025),px=urn.startX+(urn.endX-urn.startX)*back,py=urn.startY+(urn.endY-urn.startY)*back-20-Math.sin(back*Math.PI)*52;c.globalAlpha=(6-i)*.1;pixel(c,px,py,i%2?P[5]:P[3],3);}
 c.globalAlpha=1;c.drawImage(image,x-24,y-24);c.restore();
}
export function drawUrnSpirit(c,spirit,camera,now){
 if(now>=spirit.until)return;
 const age=Math.max(0,now-spirit.born),x=Math.round(spirit.x),y=Math.round(spirit.y-15+Math.sin(age*7+spirit.index)*2),attacking=spirit.hitUntil>now;
 c.save();c.imageSmoothingEnabled=false;c.translate(-Math.round(camera.x),-Math.round(camera.y));c.globalAlpha=Math.min(1,age/.12,(spirit.until-now)/.35);
 const trail=spirit.trail||[];for(let i=0;i<trail.length;i++){const p=trail[i];c.globalAlpha*=.7;pixel(c,p.x,p.y-10,i%2?P[4]:P[3],3);c.globalAlpha=Math.min(1,age/.12,(spirit.until-now)/.35);}
 const frame=[0,1,2,1][Math.floor(age*10)%4],image=sprite(GHOST[frame],'ghost'+frame);
 c.drawImage(image,x-12,y-30,26,38);
 if(attacking){const target=spirit.target,angle=Math.atan2((target?.y??spirit.y)-spirit.y,(target?.x??spirit.x+1)-spirit.x);for(let lane=-1;lane<=1;lane++)for(let i=0;i<7;i++){const d=8+i*3,side=lane*(6-i*.5);pixel(c,x+Math.cos(angle)*d-Math.sin(angle)*side,y-8+Math.sin(angle)*d+Math.cos(angle)*side,i%3===0?P[6]:P[4],2);}}
 c.restore();
}
export function drawUrnEffect(c,fx,camera){
 if(!['urnShatter','urnSpiritHit','urnSpiritFade'].includes(fx.geometry))return false;
 const t=Math.min(1,(fx.age||0)/(fx.ttl||.3));if(t>=1)return true;const x=Math.round(fx.x),y=Math.round(fx.y),burst=fx.geometry==='urnShatter';
 c.save();c.imageSmoothingEnabled=false;c.translate(-Math.round(camera.x),-Math.round(camera.y));c.globalAlpha=1-t;
 const count=burst?18:8;for(let i=0;i<count;i++){const a=i*2.399963,d=(burst?38:20)*t,px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.65-Math.sin(t*Math.PI)*(burst?18:8);pixel(c,px-1,py-1,P[1],4);pixel(c,px,py,burst&&i%3===0?P[7]:i%2?P[5]:P[3],2);}
 if(burst){for(let i=0;i<3;i++){const a=i*Math.PI*2/3-Math.PI/2,d=12+t*22;pixel(c,x+Math.cos(a)*d-3,y-15+Math.sin(a)*d,P[1],7);pixel(c,x+Math.cos(a)*d-2,y-14+Math.sin(a)*d,P[5],5);pixel(c,x+Math.cos(a)*d,y-12+Math.sin(a)*d,P[6],1);}}
 c.restore();return true;
}

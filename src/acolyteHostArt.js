// Authored canvas pixel effects: a moving congregation, woven soul ribbons,
// casting seal and a protective shell. Fixed sample counts keep long beams cheap.
const TAU=Math.PI*2;
const C={ink:'#17202b',violet:'#665785',shade:'#497f89',mint:'#90dfcd',light:'#d9ffee',white:'#fff5db'};
const FACES=[
 ['000111000','001222100','012333210','123444321','123141321','123333321','012333210','001232100','001232100','010222010','100121001','000010000'],
 ['000111000','001222100','012333210','123444321','123141321','123333321','012333210','001232100','010222010','100121001','001010100','010000010'],
 ['000111000','001222100','012333210','123444321','123141321','123333321','012333210','001232100','001222100','010121010','100010001','001000100']
];
const palette=['',C.ink,C.shade,C.mint,C.light];
function pixel(ctx,x,y,size=2,color=C.light){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),size,size);}
function spirit(ctx,x,y,phase,unit=2){
 const rows=FACES[((Math.floor(phase*9)%3)+3)%3];
 for(let r=0;r<rows.length;r++)for(let c=0;c<9;c++){
  const shade=+rows[r][c];if(shade)pixel(ctx,x+(c-4)*unit,y+(r-5)*unit,unit,palette[shade]);
 }
}
function seal(ctx,x,y,rx,ry,phase,alpha=1){
 ctx.globalAlpha=alpha;
 for(let i=0;i<36;i++){
  const a=i*TAU/36;
  pixel(ctx,x+Math.cos(a)*rx,y+Math.sin(a)*ry,2,i%3===0?C.white:C.mint);
 }
 for(let i=0;i<6;i++){
  const a=i*TAU/6+phase*.35,px=x+Math.cos(a)*rx,py=y+Math.sin(a)*ry;
  pixel(ctx,px-3,py-4,2,C.violet);pixel(ctx,px+3,py-4,2,C.light);
  pixel(ctx,px,py,3,C.white);pixel(ctx,px,py+5,2,C.mint);
 }
}
export function drawSpectralHostWard(ctx,p,camera,phase=0){
 const x=Math.round(p.x-camera.x),y=Math.round(p.y-camera.y);
 ctx.save();ctx.imageSmoothingEnabled=false;
 ctx.globalAlpha=.1;
 for(let row=-8;row<=8;row++)for(let col=-5;col<=5;col++){
  if((col/5)**2+(row/8)**2<=1&&(row+col)%3===0)pixel(ctx,x+col*5,y-26+row*5,3,C.mint);
 }
 // Broken edges preserve the player silhouette inside the shield.
 seal(ctx,x,y-26,27,39,phase,.64);
 seal(ctx,x,y-2,34,12,-phase,.6);
 for(let i=0;i<5;i++){
  const a=i*TAU/5+phase*1.25;
  pixel(ctx,x+Math.cos(a)*29,y-26+Math.sin(a)*40,3,C.white);
 }
 ctx.restore();
}
export function drawSpectralHost(ctx,fx,camera){
 const x=fx.x-camera.x,y=fx.y-camera.y-13,range=Math.max(0,fx.range||0);
 if(range<4)return;
 const dx=fx.dirX??1,dy=fx.dirY||0,nx=-dy,ny=dx,phase=(fx.phaseTime||0)+(fx.age||0);
 const opacity=.55+.45*Math.max(0,1-(fx.age||0)/(fx.ttl||.18));
 ctx.save();ctx.imageSmoothingEnabled=false;
 // Two discontinuous braided ribbons, stamped on the pixel grid rather than
 // a smooth solid laser. They converge at the tip and pulse out from the seal.
 const steps=Math.min(160,Math.max(1,Math.ceil(range/5)));
 for(let lane=-1;lane<=1;lane+=2)for(let i=0;i<=steps;i++){
  const d=i/steps*range,f=d/range,envelope=Math.sin(f*Math.PI)*.65+.35;
  const offset=lane*(7+Math.sin(d*.065-phase*9)*6)*envelope;
  const px=x+dx*d+nx*offset,py=y+dy*d+ny*offset;
  ctx.globalAlpha=opacity*(i%4===0?.8:.42);
  pixel(ctx,px-2,py-2,6,C.ink);pixel(ctx,px,py,4,i%5===0?C.light:lane<0?C.mint:C.violet);
  if(i%6===0){ctx.globalAlpha=opacity*.7;pixel(ctx,px+nx*6,py+ny*6,2,C.white);}
 }
 const count=Math.min(8,Math.max(2,Math.ceil(range/85)));
 for(let i=0;i<count;i++){
  const d=((i/count+phase*.52)%1)*range;
  if(d<24||d>range-12)continue;
  const offset=Math.sin(phase*6+i*1.9)*10;
  const px=x+dx*d+nx*offset,py=y+dy*d+ny*offset;
  // Short pixel comet tails make their travel direction clear.
  for(let t=5;t>0;t--){ctx.globalAlpha=opacity*(.12+.05*(6-t));pixel(ctx,px-dx*t*6,py-dy*t*6,3,t%2?C.mint:C.violet);}
  ctx.globalAlpha=opacity*.95;spirit(ctx,px,py,phase+i*.3,2);
 }
 seal(ctx,x+dx*19,y+dy*19,dy===0?9:20,dy===0?22:10,phase,opacity*.8);
 const tipX=x+dx*range,tipY=y+dy*range;
 for(let i=0;i<6;i++){
  const a=i*TAU/6+phase*3;
  ctx.globalAlpha=opacity*.6;pixel(ctx,tipX+Math.cos(a)*9,tipY+Math.sin(a)*9,2,i%2?C.mint:C.white);
 }
 ctx.restore();
}
export function drawSpectralHostImpact(ctx,fx,camera){
 const t=Math.min(1,(fx.age||0)/(fx.ttl||.22)),x=fx.x-camera.x,y=fx.y-camera.y;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=(1-t)*.85;
 for(let i=0;i<7;i++){
  const a=i*TAU/7,d=4+t*20;
  pixel(ctx,x+Math.cos(a)*d,y+Math.sin(a)*d,2,i%2?C.mint:C.white);
 }
 pixel(ctx,x-2,y-5,3,C.light);pixel(ctx,x-5,y-2,3,C.violet);pixel(ctx,x+3,y-2,2,C.mint);
 ctx.restore();
}

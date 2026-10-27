// Fixed-size pixel motifs and bounded particle counts; the outer seal matches
// the actual world-space damage circle instead of compressing it into an ellipse.
const TAU=Math.PI*2;
const C=['','#181724','#514564','#957cbb','#9ee9db','#efffe9'];
const FLAMES=[
  ['0004000','0043400','0043400','0032300','0321230','0324230','1235321','0123210','0011100'],
  ['0000400','0004300','0043400','0032300','0321230','0324230','1235321','0123210','0011100'],
  ['0040000','0034000','0043400','0032300','0321230','0324230','1235321','0123210','0011100']
];
const SOUL=[
 '00001110000','00012321000','00123432100','00124542100','00124242100',
 '00123432100','00012321000','01112321110','12323432321','01233433210',
 '00123332100','00012321000','00012321000','00121012100','01210001210','00100000100'
];
function pixel(ctx,x,y,size,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),size,size);}
function sprite(ctx,rows,x,y,unit=2){
  for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++)if(+rows[r][c])
    pixel(ctx,x+(c-Math.floor(rows[r].length/2))*unit,y+(r-rows.length+1)*unit,unit,C[+rows[r][c]]);
}
function ring(ctx,x,y,r,alpha,time){
  ctx.globalAlpha=alpha;
  for(let i=0;i<160;i++){
    const a=i*TAU/160,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;
    pixel(ctx,px-2,py-2,5,C[1]);pixel(ctx,px,py,2,i%8<2?C[5]:C[3]);
    if(i%8===0)pixel(ctx,x+Math.cos(a)*(r-6),y+Math.sin(a)*(r-6),2,C[4]);
  }
  // Eight etched soul runes remain anchored to the ground.
  for(let i=0;i<8;i++){
    const a=i*TAU/8,px=x+Math.cos(a)*(r-22),py=y+Math.sin(a)*(r-22);
    ctx.globalAlpha=alpha*(.7+.3*Math.sin(time*3+i)**2);
    for(const [dx,dy] of [[0,-5],[-3,-2],[3,-2],[0,1],[0,4],[-3,7],[3,7]])pixel(ctx,px+dx,py+dy,2,C[4]);
  }
}
export function drawSoulSiphonField(ctx,fx,camera){
  const v=fx.soulVisual;if(!v?.active)return;
  const time=(fx.soulAge||0)+(fx.age||0),remaining=v.duration-time;if(remaining<=0)return;
  const x=Math.round(fx.x-camera.x),y=Math.round(fx.y-camera.y),r=fx.radius;
  if(x+r<0||y+r<0||x-r>ctx.canvas.width||y-r>ctx.canvas.height)return;
  const fade=Math.min(1,time/.22,remaining/.6),phase=Math.floor(time*12)/12;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.globalAlpha=.13*fade;ctx.fillStyle=C[2];ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  ring(ctx,x,y,r,.8*fade,phase);
  ring(ctx,x,y,r*.68,.22*fade,phase);
  const pulse=(time%.8)/.8;
  ring(ctx,x,y,r*(.2+.78*pulse),.18*(1-pulse)*fade,phase);
  ctx.globalAlpha=.3*fade;
  for(let arm=0;arm<6;arm++)for(let i=0;i<25;i++){
    const d=r*(.18+i/25*.65),a=arm*TAU/6+i/25*.8-phase*.3;
    pixel(ctx,x+Math.cos(a)*d,y+Math.sin(a)*d,2,i%6===Math.floor(phase*8)%6?C[4]:C[3]);
  }
  // Sparkling soul-fire islands, never a solid screen-obscuring sheet.
  for(let i=0;i<30;i++){
    const a=i*2.39996,d=r*Math.sqrt((i+.5)/30)*.88;
    const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d;
    ctx.globalAlpha=(.45+.25*Math.sin(phase*4+i)**2)*fade;
    sprite(ctx,FLAMES[(Math.floor(phase*12)+i)%3],px,py,2);
    pixel(ctx,px+Math.sin(i)*5,py-15-(phase*13+i*7)%16,2,C[4]);
  }
  for(let i=0;i<6;i++){
    const a=i*TAU/6+phase*.22,d=r*.82;
    ctx.globalAlpha=.85*fade;sprite(ctx,SOUL,x+Math.cos(a)*d,y+Math.sin(a)*d-4+Math.round(Math.sin(phase*3+i)*3));
  }
  if(time<.6)ring(ctx,x,y,r*Math.min(1,time/.45),.7*(1-time/.6),phase);
  ctx.restore();
}
export function drawSoulBurn(ctx,x,y,time,alpha=1){
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;
  const frame=Math.floor(time*10);
  sprite(ctx,FLAMES[frame%3],x-7,y,1);sprite(ctx,FLAMES[(frame+1)%3],x+6,y-2,1);
  pixel(ctx,x-5,y-10-(frame%6),1,C[4]);ctx.restore();
}
export function drawSoulBurnImpact(ctx,fx,camera){
  const t=(fx.age||0)/(fx.ttl||.22),x=fx.x-camera.x,y=fx.y-camera.y;
  drawSoulBurn(ctx,x,y,(fx.age||0)+.3,1-t);
  ctx.save();ctx.globalAlpha=(1-t)*.7;
  for(let i=0;i<5;i++){const a=i*TAU/5;pixel(ctx,x+Math.cos(a)*(4+t*16),y+Math.sin(a)*(4+t*16),2,C[i%2?4:3]);}
  ctx.restore();
}

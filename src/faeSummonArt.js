// Exact palette variants of the shipped pixel atlases. All four authored body
// frames, silhouettes, transparent edges and contact poses stay intact.
const variants=new WeakMap();
const outlinedFrames=new WeakMap();
const bark=['#34283f','#76558d','#a17abb','#c29bd3','#dfbee6','#f3d9ef'];
const leaves=['#274644','#467f7e','#70b5af','#9bdbcf','#c5f0dc','#e8ffe9'];
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const ramps=[bark.map(rgb),leaves.map(rgb)];
export function faeSummonAtlas(image,row,width,height){
  let rows=variants.get(image);if(!rows){rows=new Map();variants.set(image,rows);}
  const key=`${row}:${width}:${height}`;if(rows.has(key))return rows.get(key);
  const canvas=document.createElement('canvas');canvas.width=width*4;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
  ctx.drawImage(image,0,row*height,width*4,height,0,0,width*4,height);
  const frame=ctx.getImageData(0,0,canvas.width,canvas.height),d=frame.data;
  for(let i=0;i<d.length;i+=4){
    if(!d[i+3])continue;
    const [r,g,b]=[d[i],d[i+1],d[i+2]],light=r*.299+g*.587+b*.114;
    const foliage=g>r*1.04&&g>b*1.18;
    const color=ramps[foliage?1:0][Math.min(5,Math.floor(light/38))];
    [d[i],d[i+1],d[i+2]]=color;
  }
  ctx.putImageData(frame,0,0);rows.set(key,canvas);return canvas;
}
export function faeSummonOutlinedFrame(atlas,frame,width,height,drawWidth,drawHeight){
  let frames=outlinedFrames.get(atlas);if(!frames){frames=new Map();outlinedFrames.set(atlas,frames);}
  const key=`${frame}:${drawWidth}:${drawHeight}`;if(frames.has(key))return frames.get(key);
  // Outline after nearest-neighbor scaling so even small thornlings receive a
  // slim one-game-pixel edge. Cardinal neighbors avoid thick diagonal corners.
  const canvas=document.createElement('canvas');canvas.width=drawWidth+2;canvas.height=drawHeight+2;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
  ctx.drawImage(atlas,frame*width,0,width,height,1,1,drawWidth,drawHeight);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),source=new Uint8ClampedArray(pixels.data),out=pixels.data;
  for(let y=1;y<=drawHeight;y++)for(let x=1;x<=drawWidth;x++){
    if(source[(y*canvas.width+x)*4+3]<32)continue;
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
      const i=((y+dy)*canvas.width+x+dx)*4;if(source[i+3])continue;
      out[i]=10;out[i+1]=9;out[i+2]=15;out[i+3]=255;
    }
  }
  ctx.putImageData(pixels,0,0);frames.set(key,canvas);return canvas;
}
const WINGS=[
  ['0000000100','0000011210','0000123321','0001234321','0012343210','0123432100','1234321000','0123210000','0012100000','0001000000'],
  ['0000000000','0000000100','0000001210','0000012321','0000124321','0001233210','0012332100','0001221000','0000110000','0000000000'],
  ['0000000000','0000000000','0000000100','0000001210','0000012321','0000014321','0000012321','0000001210','0000000100','0000000000']
];
export function drawFaeSummonWings(ctx,stage,now){
  const elder=stage==='elderThornbeast'||stage==='thornTitan',unit=elder?2:1;
  const rows=WINGS[[0,1,2,1][Math.floor(now*6)%4]],palette=['','#100c17','#b493ca','#bce5df','#f0f2df'];
  const y=elder?-35:-28,x=elder?-10:0;
  for(const [row,cells] of rows.entries())for(let col=0;col<cells.length;col++){
    if(cells[col]==='0')continue;ctx.fillStyle=palette[Number(cells[col])];
    for(const side of [-1,1])ctx.fillRect(x+side*(col+2)*unit,y+(row-8)*unit,unit,unit);
  }
}

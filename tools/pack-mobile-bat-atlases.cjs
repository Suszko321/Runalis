// Lossless repack of already-authored pixels, plus the existing allied palette.
// Runtime never needs the wide authoring sheets or a palette readback canvas.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require(process.env.RUNALIS_CANVAS_MODULE||'../tmp/bat-evolution/node_modules/@napi-rs/canvas');
(async()=>{
 const {batAtlasColumn,BAT_ATLASES}=await import('../src/batAtlas.js');
 for(const [family,name,w,h,frames,rows]of [['bat','veyreign-bat-beast',96,80,16,6],['royal','veyreign-royal-blood-beast',112,80,48,7]]){
  const original=await loadImage(`assets/art/sprites/${name}.png`),source=createCanvas(original.width,original.height),sc=source.getContext('2d');sc.drawImage(original,0,0);
  const compact=createCanvas(w*4,h*rows),cc=compact.getContext('2d');cc.imageSmoothingEnabled=false;
  for(let row=0;row<rows;row++)for(let pose=0;pose<4;pose++){
   const frame=family==='bat'?pose*4:(row===0||row===6)?pose*12:pose*3;
   cc.drawImage(original,frame*w,row*h,w,h,pose*w,row*h,w,h);
  }
  for(let row=0;row<rows;row++)for(let frame=0;frame<frames;frame++)assert.deepEqual(sc.getImageData(frame*w,row*h,w,h).data,cc.getImageData(batAtlasColumn(family,row,frame)*w,row*h,w,h).data,`${family} ${row}/${frame}`);
  const meta={source:`assets/art/sprites/${name}.png`,width:w,height:h,columns:4,rows,timeSlots:frames,fps:12,pivot:[w/2,74],pixelIdenticalToSource:true};
  fs.writeFileSync(`assets/art/sprites/${BAT_ATLASES[family]}.png`,compact.toBuffer('image/png'));
  fs.writeFileSync(`assets/art/sprites/${BAT_ATLASES[family]}.json`,JSON.stringify(meta,null,2)+'\n');
  if(family==='royal'){
   const frame=cc.getImageData(0,0,compact.width,compact.height),d=frame.data,ramp=[[18,46,64],[38,88,115],[82,151,178],[145,211,222],[213,244,244]];
   for(let i=0;i<d.length;i+=4){if(!d[i+3]||d[i]<35||d[i]<=d[i+1]*1.18||d[i]<=d[i+2]*1.07)continue;[d[i],d[i+1],d[i+2]]=ramp[Math.min(4,Math.floor(d[i]/58))];}
   cc.putImageData(frame,0,0);fs.writeFileSync(`assets/art/sprites/${BAT_ATLASES.allied}.png`,compact.toBuffer('image/png'));
   fs.writeFileSync(`assets/art/sprites/${BAT_ATLASES.allied}.json`,JSON.stringify({...meta,palette:'Original runtime allied silver-blue ramp; alpha unchanged'},null,2)+'\n');
  }
  console.log(`PASS ${family}: ${rows*frames} source/time-slot matches; ${compact.width}×${compact.height} runtime sheet`);
 }
})().catch(e=>{console.error(e);process.exitCode=1;});

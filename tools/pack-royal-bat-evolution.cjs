// Mechanical extraction of the authored ImageGen sheet; never draws replacement figures.
const fs=require('node:fs');
const {createCanvas,loadImage}=require(process.env.RUNALIS_CANVAS_MODULE||'../tmp/bat-evolution/node_modules/@napi-rs/canvas');
(async()=>{
 const source=process.argv[2]||'assets/art/source/royal-bat-evolution/master.png';
 const image=await loadImage(source),canvas=createCanvas(image.width,image.height),c=canvas.getContext('2d');c.drawImage(image,0,0);
 const pixels=c.getImageData(0,0,canvas.width,canvas.height),d=pixels.data,w=canvas.width,h=canvas.height;
 const seen=new Uint8Array(w*h),parts=[];
 for(let at=0;at<w*h;at++)if(!seen[at]&&d[at*4+3]>=150){
  const todo=[at],points=[];seen[at]=1;
  while(todo.length){const n=todo.pop();points.push(n);const x=n%w,y=Math.floor(n/w);
   for(const next of [x?n-1:-1,x<w-1?n+1:-1,y?n-w:-1,y<h-1?n+w:-1])if(next>=0&&!seen[next]&&d[next*4+3]>=150){seen[next]=1;todo.push(next);}
  }parts.push(points);
 }
 const figures=parts.filter(p=>p.length>500);if(figures.length!==28)throw Error('Expected 28 isolated poses, found '+figures.length);
 const bounds=p=>({x:Math.min(...p.map(n=>n%w)),y:Math.min(...p.map(n=>Math.floor(n/w))),right:Math.max(...p.map(n=>n%w)),bottom:Math.max(...p.map(n=>Math.floor(n/w)))});
 figures.sort((a,b)=>bounds(a).y-bounds(b).y);
 const sorted=[];for(let row=0;row<7;row++)sorted.push(...figures.slice(row*4,row*4+4).sort((a,b)=>bounds(a).x-bounds(b).x));
 const centers=sorted.map(p=>({x:p.reduce((s,n)=>s+n%w,0)/p.length,y:p.reduce((s,n)=>s+Math.floor(n/w),0)/p.length}));
 for(const fragment of parts.filter(p=>p.length<=500&&p.length>=3)){
  const n=fragment[0],x=n%w,y=Math.floor(n/w);let best=0;for(let i=1;i<28;i++)if(Math.hypot(x-centers[i].x,y-centers[i].y)<Math.hypot(x-centers[best].x,y-centers[best].y))best=i;
  sorted[best].push(...fragment);
 }
 const boxes=sorted.map(bounds),scale=Math.min(104/Math.max(...boxes.map(b=>b.right-b.x+1)),70/Math.max(...boxes.map(b=>b.bottom-b.y+1)));
 const cells=sorted.map((points,i)=>{
  const b=boxes[i],crop=createCanvas(b.right-b.x+1,b.bottom-b.y+1),ctx=crop.getContext('2d'),frame=ctx.createImageData(crop.width,crop.height);
  for(const n of points){const j=((Math.floor(n/w)-b.y)*crop.width+n%w-b.x)*4;for(let k=0;k<3;k++)frame.data[j+k]=Math.round(d[n*4+k]/17)*17;frame.data[j+3]=255;}
  ctx.putImageData(frame,0,0);const cell=createCanvas(112,80),cc=cell.getContext('2d');cc.imageSmoothingEnabled=false;
  const width=Math.round(crop.width*scale),height=Math.round(crop.height*scale);cc.drawImage(crop,Math.floor((112-width)/2),74-height,width,height);return cell;
 });
 // Quantize the extracted native cells together, keeping one shared 32-color ramp.
 const histogram=new Map(),frames=cells.map(cell=>cell.getContext('2d').getImageData(0,0,112,80));
 for(const frame of frames)for(let i=0;i<frame.data.length;i+=4)if(frame.data[i+3]){const key=frame.data[i]*65536+frame.data[i+1]*256+frame.data[i+2];histogram.set(key,(histogram.get(key)||0)+1);}
 let boxesPalette=[[...histogram].map(([key,count])=>({rgb:[key>>16,key>>8&255,key&255],count,key}))];
 const spread=b=>Math.max(...[0,1,2].map(k=>Math.max(...b.map(c=>c.rgb[k]))-Math.min(...b.map(c=>c.rgb[k]))));
 while(boxesPalette.length<32){
  boxesPalette.sort((a,b)=>spread(b)-spread(a));const box=boxesPalette.shift();if(box.length<2){boxesPalette.push(box);break;}
  const ranges=[0,1,2].map(k=>Math.max(...box.map(c=>c.rgb[k]))-Math.min(...box.map(c=>c.rgb[k]))),axis=ranges.indexOf(Math.max(...ranges));box.sort((a,b)=>a.rgb[axis]-b.rgb[axis]);
  const half=box.reduce((n,c)=>n+c.count,0)/2;let weight=0,cut=1;for(let i=0;i<box.length-1;i++){weight+=box[i].count;if(weight>=half){cut=i+1;break;}}
  boxesPalette.push(box.slice(0,cut),box.slice(cut));
 }
 const palette=boxesPalette.map(box=>{const weight=box.reduce((n,c)=>n+c.count,0);return [0,1,2].map(k=>Math.round(box.reduce((n,c)=>n+c.rgb[k]*c.count,0)/weight));});
 const lookup=new Map([...histogram.keys()].map(key=>{const rgb=[key>>16,key>>8&255,key&255];const best=palette.reduce((a,b)=>b.reduce((n,v,k)=>n+(v-rgb[k])**2,0)<a.reduce((n,v,k)=>n+(v-rgb[k])**2,0)?b:a);return [key,best];}));
 frames.forEach((frame,n)=>{const d=frame.data;for(let i=0;i<d.length;i+=4)if(d[i+3]){const color=lookup.get(d[i]*65536+d[i+1]*256+d[i+2]);[d[i],d[i+1],d[i+2]]=color;}cells[n].getContext('2d').putImageData(frame,0,0);});
 const sheet=createCanvas(5376,560),sc=sheet.getContext('2d');
 for(let row=0;row<7;row++)for(let frame=0;frame<48;frame++){const pose=row===0||row===6?Math.floor(frame/12):Math.floor(frame%12/3);sc.drawImage(cells[row*4+pose],frame*112,row*80);}
 fs.writeFileSync('assets/art/sprites/veyreign-royal-blood-beast.png',sheet.toBuffer('image/png'));
 fs.writeFileSync('assets/art/sprites/veyreign-royal-blood-beast.json',JSON.stringify({width:112,height:80,frames:48,states:['transformation','idle','anticipation','execution','recovery','hit','death'],fps:12,transformSeconds:4,palette:'obsidian fur, crimson membranes, antique gold regalia; allied runtime palette variant',authoredPosesPerState:4,pivot:[56,74],artRevision:'royal-bat-mastery-2026-10-31'},null,2)+'\n');
 fs.mkdirSync('docs/bat-mastery-evolution',{recursive:true});const review=createCanvas(448,560),rc=review.getContext('2d');for(let i=0;i<28;i++)rc.drawImage(cells[i],i%4*112,Math.floor(i/4)*80);fs.writeFileSync('docs/bat-mastery-evolution/poses.png',review.toBuffer('image/png'));
 console.log('Packed 28 authored poses into 336 slots; kept 112×80 cells, 48 columns and seven states.');
})().catch(e=>{console.error(e);process.exitCode=1;});

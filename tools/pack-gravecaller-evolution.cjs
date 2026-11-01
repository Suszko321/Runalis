// Mechanical export of generated art. Palette and pixels come from inspected
// source sprites; this tool extracts, aligns and packs, never draws characters.
const fs=require('node:fs');
const {createCanvas,loadImage}=require(process.env.RUNALIS_CANVAS_MODULE||'../tmp/bat-evolution/node_modules/@napi-rs/canvas');
const configs=[
 ['skeleton','skeleton-forge',96,112,0,192,112,[94,94,94,94]],
 ['bound-specter','bound-dead-specter',96,112,0,160,160,[44,54,75,87]],
 ['bound-knight','bound-dead-knight',96,112,0,160,160,[47,58,79,92]],
 ['lich','summons-core',96,112,3,160,160,[43,52,73,86]],
 ['lich-specter','lich-acolyte',96,112,0,160,160,[52,63,87,101]],
 ['lich-knight','lich-deathknight',128,144,0,192,192,[65,79,109,126]]
];
function bounds(points,w){let l=w,r=-1,t=Infinity,b=-1;for(const n of points){const x=n%w,y=Math.floor(n/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return {l,r,t,b};}
async function sourcePalette(name,w,h,row){
 const im=await loadImage(`assets/art/sprites/${name}.png`),c=createCanvas(w*4,h),x=c.getContext('2d');x.drawImage(im,0,row*h,w*4,h,0,0,w*4,h);
 const d=x.getImageData(0,0,c.width,c.height).data,hist=new Map();
 for(let i=0;i<d.length;i+=4)if(d[i+3]>=200){const key=d[i]*65536+d[i+1]*256+d[i+2];hist.set(key,(hist.get(key)||0)+1);}
 let boxes=[[...hist].map(([key,count])=>({rgb:[key>>16,key>>8&255,key&255],count}))];
 const ranges=box=>[0,1,2].map(k=>Math.max(...box.map(c=>c.rgb[k]))-Math.min(...box.map(c=>c.rgb[k])));
 while(boxes.length<32){boxes.sort((a,b)=>Math.max(...ranges(b))-Math.max(...ranges(a)));const box=boxes.shift();if(box.length<2){boxes.push(box);break;}const r=ranges(box),axis=r.indexOf(Math.max(...r));box.sort((a,b)=>a.rgb[axis]-b.rgb[axis]);const half=box.reduce((n,c)=>n+c.count,0)/2;let sum=0,cut=1;for(let i=0;i<box.length-1;i++){sum+=box[i].count;if(sum>=half){cut=i+1;break;}}boxes.push(box.slice(0,cut),box.slice(cut));}
 return boxes.map(box=>{const weight=box.reduce((n,c)=>n+c.count,0);return [0,1,2].map(k=>Math.round(box.reduce((n,c)=>n+c.rgb[k]*c.count,0)/weight));});
}
(async()=>{for(const [name,ref,rw,rh,rr,w,h,heights]of configs){
 const source=`assets/art/source/gravecaller-evolution/${name}.png`,im=await loadImage(source),c=createCanvas(im.width,im.height),cx=c.getContext('2d');cx.drawImage(im,0,0);
 const d=cx.getImageData(0,0,c.width,c.height).data,seen=new Uint8Array(c.width*c.height),parts=[];
 for(let at=0;at<seen.length;at++)if(!seen[at]&&d[at*4+3]>=200){const queue=[at],part=[];seen[at]=1;while(queue.length){const n=queue.pop(),x=n%c.width,y=Math.floor(n/c.width);part.push(n);for(const k of [x?n-1:-1,x<c.width-1?n+1:-1,y?n-c.width:-1,y<c.height-1?n+c.width:-1])if(k>=0&&!seen[k]&&d[k*4+3]>=200){seen[k]=1;queue.push(k);}}parts.push(part);}
 const bodies=parts.filter(p=>p.length>=1000);if(bodies.length!==16)throw Error(name+': expected sixteen bodies, got '+bodies.length);
 bodies.sort((a,b)=>bounds(a,c.width).t-bounds(b,c.width).t);const poses=[];
 for(let row=0;row<4;row++)poses.push(...bodies.slice(row*4,row*4+4).sort((a,b)=>bounds(a,c.width).l-bounds(b,c.width).l));
 const centers=poses.map(p=>{const b=bounds(p,c.width);return [(b.l+b.r)/2,(b.t+b.b)/2];});
 for(const part of parts.filter(p=>p.length<1000&&p.length>=3)){const n=part[0],x=n%c.width,y=Math.floor(n/c.width);let best=0;for(let i=1;i<16;i++)if(Math.hypot(x-centers[i][0],y-centers[i][1])<Math.hypot(x-centers[best][0],y-centers[best][1]))best=i;poses[best].push(...part);}
 const palette=await sourcePalette(ref,rw,rh,rr),lookup=new Map(),sheet=createCanvas(w*4,h*4),ctx=sheet.getContext('2d'),rects=[];
 const crops=poses.map(part=>{const b=bounds(part,c.width),crop=createCanvas(b.r-b.l+1,b.b-b.t+1),x=crop.getContext('2d'),pixels=x.createImageData(crop.width,crop.height);for(const n of part){const at=n*4,key=d[at]*65536+d[at+1]*256+d[at+2];let color=lookup.get(key);if(!color){const rgb=[d[at],d[at+1],d[at+2]];color=palette.reduce((a,v)=>v.reduce((sum,k,i)=>sum+(k-rgb[i])**2,0)<a.reduce((sum,k,i)=>sum+(k-rgb[i])**2,0)?v:a);lookup.set(key,color);}pixels.data.set([...color,255],((Math.floor(n/c.width)-b.t)*crop.width+n%c.width-b.l)*4);}x.putImageData(pixels,0,0);return crop;});
 for(let row=0;row<4;row++){
  const group=crops.slice(row*4,row*4+4),scale=Math.min(heights[row]/group[0].height,(w-12)/Math.max(...group.map(p=>p.width)),(h-12)/Math.max(...group.map(p=>p.height)));
  group.forEach((crop,col)=>{const dw=Math.round(crop.width*scale),dh=Math.round(crop.height*scale),idleWidth=Math.round(group[0].width*scale);
   // Match the torso through a reach: additional weapon width extends right.
   // Unarmed left-facing skeletons align their rightmost body edge at x=68.
   const x=name==='skeleton'?w/2+20-dw:Math.floor((w-idleWidth)/2)-(col===3?Math.round(Math.max(0,dw-idleWidth)*.2):Math.round((dw-idleWidth)/2));
   if(x<2||x+dw>w-2)throw Error('Pose exceeds cell '+name+row+col+' x='+x+' width='+dw);
   const y=h-6-dh;ctx.imageSmoothingEnabled=false;ctx.drawImage(crop,col*w+x,row*h+y,dw,dh);rects.push([col*w+x,row*h+y,dw,dh]);
  });
 }
 const path=`assets/art/sprites/grave-evolution-${name}`;
 fs.writeFileSync(path+'.png',sheet.toBuffer('image/png'));
 fs.writeFileSync(path+'.json',JSON.stringify({name:`grave-evolution-${name}`,source,reference:`assets/art/sprites/${ref}.png`,cellWidth:w,cellHeight:h,columns:4,rows:4,masteryRows:[1,5,20,50],originalMastery:10,poses:['idle','walk1','walk2','attack'],pivot:[w/2,h-6],palette,rects},null,2)+'\n');console.log('Packed '+name+' (16 authored poses, '+palette.length+' source colors)');
}})().catch(e=>{console.error(e);process.exitCode=1;});

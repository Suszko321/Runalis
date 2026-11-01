// Mechanical export of generated poses: alpha extraction, shared row scale,
// source-palette quantization and nearest-neighbour packing; no invented art.
const fs=require('node:fs');
const {createCanvas,loadImage}=require(process.env.RUNALIS_CANVAS_MODULE||'../tmp/bat-evolution/node_modules/@napi-rs/canvas');
const root='assets/art/source/summon-evolution/';
const configs=[['fae-thornling',128,[32,40,62,76]],['fae-elder',160,[36,45,72,90]],['rose-siegebeast',160,[44,60,92,108]]];
const faePalette=['0a090f','34283f','76558d','a17abb','c29bd3','dfbee6','f3d9ef','274644','467f7e','70b5af','9bdbcf','c5f0dc','e8ffe9'].map(hex=>[0,2,4].map(n=>parseInt(hex.slice(n,n+2),16)));
async function rosePalette(){
 const im=await loadImage('assets/art/sprites/petalknight-rose-siegebeast.png'),c=createCanvas(im.width,im.height),x=c.getContext('2d');x.drawImage(im,0,0);
 const d=x.getImageData(0,0,c.width,c.height).data,hist=new Map();
 for(let i=0;i<d.length;i+=4)if(d[i+3]>150){const key=[d[i],d[i+1],d[i+2]].map(v=>Math.round(v/24)*24).join(',');hist.set(key,(hist.get(key)||0)+1);}
 return [...hist].sort((a,b)=>b[1]-a[1]).slice(0,40).map(([key])=>key.split(',').map(Number));
}
(async()=>{
 const rose=await rosePalette();
 for(const [name,width,heights]of configs){
  const im=await loadImage(root+name+'.png'),source=createCanvas(im.width,im.height),sc=source.getContext('2d');sc.drawImage(im,0,0);
  const all=sc.getImageData(0,0,im.width,im.height).data,seen=new Uint8Array(im.width*im.height),parts=[];
  for(let at=0;at<seen.length;at++)if(!seen[at]&&all[at*4+3]>=200){
   const queue=[at],points=[];seen[at]=1;
   while(queue.length){const n=queue.pop(),x=n%im.width,y=Math.floor(n/im.width);points.push(n);
    for(const k of [x?n-1:-1,x<im.width-1?n+1:-1,y?n-im.width:-1,y<im.height-1?n+im.width:-1])if(k>=0&&!seen[k]&&all[k*4+3]>=200){seen[k]=1;queue.push(k);}
   }parts.push(points);
  }
  const bounds=points=>{let l=im.width,r=-1,t=im.height,b=-1;for(const n of points){const x=n%im.width,y=Math.floor(n/im.width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return {l,r,t,b};};
  const bodies=parts.filter(p=>p.length>=1000);if(bodies.length!==16)throw Error(name+': expected sixteen bodies, got '+bodies.length);
  bodies.sort((a,b)=>bounds(a).t-bounds(b).t);
  const ordered=[];for(let row=0;row<4;row++)ordered.push(...bodies.slice(row*4,row*4+4).sort((a,b)=>bounds(a).l-bounds(b).l));
  const centers=ordered.map(p=>{const b=bounds(p);return [(b.l+b.r)/2,(b.t+b.b)/2];});
  for(const part of parts.filter(p=>p.length<1000&&p.length>=3)){
   const n=part[0],x=n%im.width,y=Math.floor(n/im.width);let best=0;
   for(let i=1;i<16;i++)if(Math.hypot(x-centers[i][0],y-centers[i][1])<Math.hypot(x-centers[best][0],y-centers[best][1]))best=i;
   ordered[best].push(...part);
  }
  const sheet=createCanvas(width*4,144*4),ctx=sheet.getContext('2d'),rects=[],palette=name.startsWith('fae')?faePalette:rose;
  for(let row=0;row<4;row++){
   const poses=[];
   for(let col=0;col<4;col++){
    const points=ordered[row*4+col],{l,t,r,b}=bounds(points);
    if(r<l)throw Error('Empty pose '+name+row+col);
    const crop=createCanvas(r-l+1,b-t+1),cc=crop.getContext('2d'),pixels=cc.createImageData(crop.width,crop.height);
    for(const n of points){
     const x=n%im.width,y=Math.floor(n/im.width),at=n*4,out=((y-t)*crop.width+x-l)*4;
     const rgb=[all[at],all[at+1],all[at+2]],color=palette.reduce((a,v)=>v.reduce((n,k,i)=>n+(k-rgb[i])**2,0)<a.reduce((n,k,i)=>n+(k-rgb[i])**2,0)?v:a);
     pixels.data.set([...color,255],out);
    }
    cc.putImageData(pixels,0,0);poses.push(crop);
   }
   const scale=Math.min(heights[row]/Math.max(...poses.map(p=>p.height)),(width-8)/Math.max(...poses.map(p=>p.width)));
   poses.forEach((pose,col)=>{
    const w=Math.round(pose.width*scale),h=Math.round(pose.height*scale),x=Math.floor((width-w)/2),y=138-h;
    ctx.save();ctx.imageSmoothingEnabled=false;
    // The reference elder's second stride faces left. Normalize it at export.
    if(name==='fae-elder'&&col===1){ctx.translate((col+1)*width,0);ctx.scale(-1,1);ctx.drawImage(pose,x,row*144+y,w,h);}
    else ctx.drawImage(pose,col*width+x,row*144+y,w,h);
    ctx.restore();rects.push([col*width+x,row*144+y,w,h]);
   });
  }
  const path='assets/art/sprites/summon-evolution-'+name;
  fs.writeFileSync(path+'.png',sheet.toBuffer('image/png'));
  fs.writeFileSync(path+'.json',JSON.stringify({name:'summon-evolution-'+name,source:root+name+'.png',cellWidth:width,cellHeight:144,columns:4,rows:4,masteryRows:[1,5,20,50],retainedOriginalMastery:10,poses:['idle','walk1','walk2','attack'],pivot:[width/2,138],palette,rects},null,2)+'\n');
  console.log('Packed '+name+': 16 poses, '+palette.length+' colors, hard alpha.');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});

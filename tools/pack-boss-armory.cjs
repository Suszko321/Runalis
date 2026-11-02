// Mechanical alpha extraction, palette reduction and grip registration of the
// built-in ImageGen masters. Does not draw or invent equipment/projectile art.
const fs=require('node:fs'),{createCanvas,loadImage}=require(process.env.RUNALIS_CANVAS_MODULE||'../tmp/bat-evolution/node_modules/@napi-rs/canvas');
const configs=[['roseReaper',[32,90],[.25,.72],112,.72],['gravebellMaul',[48,92],[.5,.75],112,.62],['cindervowBow',[44,64],[.32,.51],112,.65],['dawnwardSpear',[44,78],[.27,.60],112,.72],...['roseboundCodex','mortuaryGrimoire','ashenScripture','dawnLitany'].map(id=>[id,[48,110],[.42,.88],80,.34])];
function cropAlpha(image,sx=0,sy=0,sw=image.width,sh=image.height){
 sx=Math.floor(sx);sy=Math.floor(sy);sw=Math.floor(sw);sh=Math.floor(sh);
 const cv=createCanvas(sw,sh),ctx=cv.getContext('2d');ctx.drawImage(image,sx,sy,sw,sh,0,0,sw,sh);const d=ctx.getImageData(0,0,sw,sh).data;let l=sw,r=-1,t=sh,b=-1;
 for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)if(d[(y*sw+x)*4+3]>=200){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 if(r<l)throw Error('Empty source');const out=createCanvas(r-l+1,b-t+1),oc=out.getContext('2d'),pixels=oc.createImageData(out.width,out.height);
 for(let y=t;y<=b;y++)for(let x=l;x<=r;x++){const at=(y*sw+x)*4;if(d[at+3]<200)continue;pixels.data.set([d[at],d[at+1],d[at+2],255],((y-t)*out.width+x-l)*4);}oc.putImageData(pixels,0,0);return out;
}
function quantize(canvas){
 const ctx=canvas.getContext('2d'),frame=ctx.getImageData(0,0,canvas.width,canvas.height),d=frame.data,hist=new Map();
 for(let i=0;i<d.length;i+=4)if(d[i+3]){const key=d[i]*65536+d[i+1]*256+d[i+2];hist.set(key,(hist.get(key)||0)+1);}
 let boxes=[[...hist].map(([key,count])=>({key,rgb:[key>>16,key>>8&255,key&255],count}))];
 const ranges=box=>[0,1,2].map(k=>Math.max(...box.map(c=>c.rgb[k]))-Math.min(...box.map(c=>c.rgb[k])));
 while(boxes.length<32){boxes.sort((a,b)=>Math.max(...ranges(b))-Math.max(...ranges(a)));const box=boxes.shift();if(box.length<2){boxes.push(box);break;}const r=ranges(box),axis=r.indexOf(Math.max(...r));box.sort((a,b)=>a.rgb[axis]-b.rgb[axis]);let sum=0,cut=1;const half=box.reduce((n,c)=>n+c.count,0)/2;for(let i=0;i<box.length-1;i++){sum+=box[i].count;if(sum>=half){cut=i+1;break;}}boxes.push(box.slice(0,cut),box.slice(cut));}
 const palette=boxes.map(box=>{const weight=box.reduce((n,c)=>n+c.count,0);return [0,1,2].map(k=>Math.round(box.reduce((n,c)=>n+c.rgb[k]*c.count,0)/weight));}),lookup=new Map();
 for(const key of hist.keys()){const rgb=[key>>16,key>>8&255,key&255];lookup.set(key,palette.reduce((a,v)=>v.reduce((n,k,i)=>n+(k-rgb[i])**2,0)<a.reduce((n,k,i)=>n+(k-rgb[i])**2,0)?v:a));}
 for(let i=0;i<d.length;i+=4)if(d[i+3]){const color=lookup.get(d[i]*65536+d[i+1]*256+d[i+2]);[d[i],d[i+1],d[i+2]]=color;}ctx.putImageData(frame,0,0);return palette;
}
(async()=>{const profiles={};
 for(const [id,grip,fraction,height,scale]of configs){
  const source=`assets/art/source/boss-armory/${id}.png`,im=await loadImage(source),crop=cropAlpha(im),factor=Math.min(height/crop.height,84/crop.width),w=Math.round(crop.width*factor),h=Math.round(crop.height*factor),x=Math.round(grip[0]-fraction[0]*w),y=Math.round(grip[1]-fraction[1]*h);
  if(x<2||x+w>94||y<2||y+h>126)throw Error('Clipped grip export '+id+' '+[x,y,w,h]);
  const cv=createCanvas(96,128),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(crop,x,y,w,h);const palette=quantize(cv),sheet='boss-armory-'+id;
  fs.writeFileSync(`assets/art/sprites/${sheet}.png`,cv.toBuffer('image/png'));const profile={sheet,width:96,height:128,gripX:grip[0],gripY:grip[1],scale};profiles[id]=profile;
  fs.writeFileSync(`assets/art/sprites/${sheet}.json`,JSON.stringify({...profile,source,rect:[x,y,w,h],palette},null,2)+'\n');console.log('Packed '+id);
 }
 const source='assets/art/source/boss-armory/focusProjectiles.png',im=await loadImage(source),atlas=createCanvas(128,128),ctx=atlas.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let i=0;i<16;i++){const crop=cropAlpha(im,i%4*im.width/4,Math.floor(i/4)*im.height/4,im.width/4,im.height/4),factor=Math.min(28/crop.width,26/crop.height),w=Math.round(crop.width*factor),h=Math.round(crop.height*factor),cell=createCanvas(32,32),cc=cell.getContext('2d');cc.imageSmoothingEnabled=false;cc.drawImage(crop,Math.floor((32-w)/2),Math.floor((32-h)/2),w,h);quantize(cell);ctx.drawImage(cell,i%4*32,Math.floor(i/4)*32);}
 fs.writeFileSync('assets/art/sprites/focus-projectiles.png',atlas.toBuffer('image/png'));fs.writeFileSync('assets/art/sprites/focus-projectiles.json',JSON.stringify({source,width:32,height:32,columns:4,rows:4,identityCount:16,pivot:[16,16],direction:'right'},null,2)+'\n');
 fs.writeFileSync('src/bossArmoryArtData.js',`// Generated grip registration; reproduce with tools/pack-boss-armory.cjs.\nimport {LEGENDARY_WEAPON_ART} from './legendaryWeaponData.js';\nexport const BOSS_ARMORY_ART=Object.freeze({...LEGENDARY_WEAPON_ART,...(${JSON.stringify(profiles,null,2)})});\n`);console.log('Packed sixteen unique focus projectiles');
})().catch(e=>{console.error(e);process.exitCode=1;});

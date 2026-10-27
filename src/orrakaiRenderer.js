import {TILE} from './data.js';
import {inBuilding} from './orrakaiLayout.js';
import {drawTownDetailArt,drawEnvironmentProp} from './environmentArt.js';
import {drawPropSprite,terrainPattern,asset} from './spriteArt.js';

const cache=new WeakMap(),fades=new WeakMap();
let rects=[],civicRects=[];
let atlas=null,ready=false;
let civic=null,civicReady=false;
async function loadKit(file,names,loaded){
 if(typeof Image==='undefined')return;
 try{
  const url=new URL('../assets/environment/orrakai/'+file,import.meta.url),response=await fetch(url);
  if(!response.ok)throw new Error('Missing Orrakai manifest: '+file);
  const manifest=await response.json(),image=new Image();
  image.onload=()=>loaded(image,names.map(name=>manifest.sprites[name]));
  image.onerror=()=>console.warn('Orrakai art unavailable:',manifest.image);
  image.src=new URL(manifest.image,url).href;
 }catch(error){console.warn(error);}
}
loadKit('manifest.json',['guildRoof','smithRoof','shrineRoof','timberRoof','retainingWall','timberWall','gate','stairs'],(image,regions)=>{atlas=image;rects=regions;ready=true;});
loadKit('civic-manifest.json',['burgundyMarket','ochreMarket','cliff','cliffVariant','openDoor','window','walkway','well'],(image,regions)=>{civic=image;civicRects=regions;civicReady=true;});
export function orrakaiArtReady(){return ready&&civicReady;}
function sprite(c,i,x,y,w,h){if(!ready)return false;c.drawImage(atlas,...rects[i],Math.round(x),Math.round(y),Math.round(w),Math.round(h));return true;}
function civicSprite(c,i,x,y,w,h){if(!civicReady)return false;c.drawImage(civic,...civicRects[i],Math.round(x),Math.round(y),Math.round(w),Math.round(h));return true;}
function box(c,color,x,y,w,h){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function noise(x,y){let n=Math.imul(x+31,374761393)^Math.imul(y+19,668265263);n=Math.imul(n^(n>>>13),1274126177);return (n>>>0)/4294967295;}
function masonry(c,x,y,w,h,timber=false,camera={x:0,y:0}){
 box(c,'#27251f',x,y,w,h);
 for(let j=0;j<h;j+=14)for(let i=-((j/14)%2)*14;i<w;i+=28){const left=Math.max(0,i),width=Math.min(i+26,w)-left;if(width<=0)continue;const n=noise(Math.round(x+camera.x+i),Math.round(y+camera.y+j));box(c,['#575247','#615b4e','#6e6554','#494940'][Math.floor(n*4)],x+left,y+j,width,12);box(c,'#827866',x+left,y+j,width,2);}
 box(c,'#9b8c70',x,y,w,4);box(c,'#302920',x,y+h-4,w,4);
 if(timber){for(let i=0;i<w;i+=64){box(c,'#211d18',x+i,y,9,h);box(c,'#68503a',x+i+2,y+2,3,h-4);}box(c,'#3b2b20',x,y+h-12,w,8);}
}
function wall(c,x,y,w,h=62,timber=false,camera={x:0,y:0}){
 if(!ready){masonry(c,x,y,w,h,timber,camera);return;}
 const count=Math.ceil(w/(timber?126:150)),width=w/count;
 for(let i=0;i<count;i++)sprite(c,timber?5:4,x+i*width,y,width+1,h);
}
function cobbles(c,x,y,w,h){
 const texture=terrainPattern(c,2);if(texture){c.fillStyle=texture;c.fillRect(x,y,w,h);box(c,'rgba(96,67,34,.2)',x,y,w,h);return;}
 box(c,'#494537',x,y,w,h);
 for(let row=0;row<h;row+=13)for(let col=-12;col<w;col+=25){const px=col+(row/13%2)*12,n=noise(px+x,row+y);c.fillStyle=['#716652','#756b57','#655e4d','#807159','#5d594b'][Math.floor(n*5)];c.beginPath();c.roundRect(x+px+1,y+row+1,22,10,3);c.fill();if(n>.7)box(c,'#948164',x+px+4,y+row+2,12,1);}
}
// Shared material kit for the same surviving architecture in the frontier.
export function drawOrrakaiWallArt(c,x,y,w,h=72,vertical=false,camera={x:0,y:0}){
 if(vertical)masonry(c,x,y,w,h,false,camera);else wall(c,x,y,w,h,false,camera);
}
export function drawOrrakaiStairArt(c,x,y,w,h){return sprite(c,7,x,y,w,h);}
function groundCanvas(world){
 const surface=document.createElement('canvas');surface.width=world.width*TILE;surface.height=world.height*TILE;
 const c=surface.getContext('2d');c.imageSmoothingEnabled=false;
 box(c,'#171f20',0,0,surface.width,surface.height);
 // Bounded authored cliff faces frame the playable plateau.
 for(let y=0;y<surface.height;y+=155)for(const x of [0,60,2150,2220])civicSprite(c,2+(y%2),x,y,155,210);
 for(let x=0;x<surface.width;x+=140)for(const y of [0,1420])civicSprite(c,2+(x%3?1:0),x,y,170,220);
 c.save();c.beginPath();c.rect(5*TILE,6*TILE,62*TILE,39*TILE);c.clip();cobbles(c,5*TILE,6*TILE,62*TILE,39*TILE);c.restore();
 // Green edge gardens and earthen cart aprons are broad authored surfaces.
 for(const [x,y,w,h] of [[5,6,5,12],[5,21,2,10],[5,35,10,9],[59,35,8,9],[47,6,19,11]]){
  c.fillStyle=terrainPattern(c,0)||'#434c34';c.fillRect(x*TILE,y*TILE,w*TILE,h*TILE);
  box(c,'rgba(21,24,14,.22)',x*TILE,y*TILE,w*TILE,h*TILE);
 }
 // Worn cart routes and irregular garden verges break up the broad paving.
 for(const [cx,cy,rx,ry,index] of [[36,39,4,4,1],[43,40,3,3,1],[11,38,5,4,1],[54,11,6,4,1],[63,25,2,5,0],[31,25,1.2,3,1]]){
  c.save();c.beginPath();for(let i=0;i<18;i++){const a=i*Math.PI/9,r=.87+noise(i,cx)*.13;const x=(cx+Math.cos(a)*rx*r)*TILE,y=(cy+Math.sin(a)*ry*r)*TILE;i?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.clip();c.fillStyle=terrainPattern(c,index)||'#61543c';c.fill();c.restore();
 }
 // Staggered stair landings and the maintained paving describe the route through the square.
 for(const t of world.terraces){
  for(let x=5;x<67;){
   const connector=t.stairs.find(([a,b])=>x>=a&&x<=b);
   if(connector){const [a,b]=connector;const sx=a*TILE,sy=t.y*TILE,sw=(b-a+1)*TILE;
    // Stair art fills precisely the traversable connector, not an arbitrary prop footprint.
    if(!sprite(c,7,sx,sy,sw,t.h*TILE))for(let j=0;j<12;j++){box(c,j%2?'#5a5142':'#9b8e72',sx,sy+j*8,sw,8);}
    x=b+1;
   }else{let end=x+1;while(end<67&&!t.stairs.some(([a,b])=>end>=a&&end<=b))end++;wall(c,x*TILE,t.y*TILE,(end-x)*TILE,t.h*TILE);box(c,'#b29a73',x*TILE,t.y*TILE-4,(end-x)*TILE,5);box(c,'rgba(15,17,17,.35)',x*TILE,(t.y+t.h)*TILE,(end-x)*TILE,14);x=end;}
  }
 }
 // Town perimeter is a genuine inaccessible edge, rather than scattered ruined props.
 for(const y of [5,44]){wall(c,4*TILE,y*TILE-45,29*TILE,76);wall(c,40*TILE,y*TILE-45,28*TILE,76);}
 for(const x of [4,67]){const spans=x===67?[[6,21],[30,14]]:[[6,38]];for(const [y,h] of spans){masonry(c,x*TILE,y*TILE,32,h*TILE);box(c,'#94856b',x*TILE,y*TILE,8,h*TILE);}}
 // The south approach stays visibly traversable beyond the arch.
 c.save();c.beginPath();c.rect(35*TILE,44*TILE,3*TILE,3*TILE);c.clip();cobbles(c,35*TILE,44*TILE,3*TILE,3*TILE);c.restore();
 for(const [x,y] of [[5,18],[10,18],[46,32],[51,32],[56,32],[61,32]])civicSprite(c,2+(x%2),x*TILE,y*TILE-7,5*TILE,3*TILE+18);
 civicSprite(c,6,5*TILE,6*TILE-20,5*TILE,3*TILE+20);
 // Pine silhouettes are rooted only in inaccessible margins, never across streets.
 for(const [x,y,s] of [[2,10,1.7],[2,24,1.9],[1,36,1.8],[70,16,1.5],[70,30,1.8],[69,44,1.5],[5,47,1.7],[18,47,1.4],[57,47,1.8]])drawPropSprite(c,9,x*TILE,y*TILE,s);
 for(const b of world.buildings){
  const x=b.x*TILE,y=b.y*TILE,w=b.w*TILE,h=b.h*TILE;
  box(c,'rgba(12,12,10,.3)',x+14,y+16,w+16,h+10);
  box(c,'#352b22',x,y,w,h);
  c.fillStyle=terrainPattern(c,b.id==='shrine'?4:3)||'#67503b';c.fillRect(x,y,w,h);
  box(c,'rgba(32,23,17,.22)',x,y,w,h);
  if(b.id==='shrine'||b.id==='guild'){
    const rx=x+(b.door-.5)*TILE,ry=y+30,rh=h-42;box(c,b.id==='shrine'?'#a39578':'#663b35',rx,ry,3*TILE,rh);
    for(const dx of [4,88])box(c,'#bc995e',rx+dx,ry+2,3,rh-4);
    for(let j=12;j<rh-10;j+=28){for(const dx of [10,82]){box(c,'#aa8452',rx+dx,ry+j,4,6);}const cy=ry+j;c.strokeStyle=b.id==='shrine'?'#c2b38b':'#885445';c.lineWidth=2;c.beginPath();c.moveTo(rx+48,cy-7);c.lineTo(rx+58,cy);c.lineTo(rx+48,cy+7);c.lineTo(rx+38,cy);c.closePath();c.stroke();}
  }
  const dx=(b.x+b.door)*TILE,dy=(b.y+b.h-1)*TILE;
  box(c,'#b3a080',dx,dy,64,32);box(c,'#e0c08c',dx+2,dy+25,60,3);
 }
 return surface;
}
export function drawOrrakaiGround(c,world,camera){
 if(!world.orrakaiRevision)return false;
 const loaded=ready&&civicReady&&!!asset('terrain-core')?.ready&&!!asset('props-core')?.ready;
 let record=cache.get(world);if(!record||record.ready!==loaded){record={ready:loaded,surface:groundCanvas(world)};cache.set(world,record);}
 // One immutable 13.5 MiB surface per live capital, released with the world.
 const sx=Math.max(0,Math.floor(camera.x)),sy=Math.max(0,Math.floor(camera.y));
 const w=Math.min(c.canvas.width+2,record.surface.width-sx),h=Math.min(c.canvas.height+2,record.surface.height-sy);
 if(w>0&&h>0)c.drawImage(record.surface,sx,sy,w,h,sx-camera.x,sy-camera.y,w,h);
 return true;
}
function frontSegments(b){const x=b.x*TILE,y=(b.y+b.h)*TILE,w=b.w*TILE;return [[x,y,b.door*TILE],[(b.x+b.door+2)*TILE,y,w-(b.door+2)*TILE]];}
function visible(c,b,cam){return (b.x+b.w)*TILE>cam.x-100&&b.x*TILE<cam.x+c.canvas.width+100&&(b.y+b.h)*TILE>cam.y-100&&b.y*TILE<cam.y+c.canvas.height+150;}
function side(c,x,y,h,camera){c.fillStyle=terrainPattern(c,5,camera)||'#484339';c.fillRect(x,y-55,18,h+55);box(c,'rgba(21,18,14,.26)',x,y-55,18,h+55);box(c,'#81735b',x,y-55,4,h+55);for(let j=0;j<h+55;j+=20)box(c,'#9e8d6e',x,y-55+j,10,2);}
export function drawOrrakaiWalls(c,world,cam,player){
 if(!world.orrakaiRevision)return;
 // Snap the texture origin and its wall geometry together, including smooth
 // fractional camera movement. Offscreen ground canvases keep their zero origin.
 cam={x:Math.round(cam.x),y:Math.round(cam.y)};
 for(const gy of [6,44])sprite(c,6,32*TILE-cam.x,gy*TILE-190-cam.y,9*TILE,190);
 for(const b of world.buildings){if(!visible(c,b,cam))continue;const x=b.x*TILE-cam.x,y=b.y*TILE-cam.y,w=b.w*TILE,h=b.h*TILE;
  wall(c,x,y-48,w,74,b.id!=='shrine',cam);side(c,x,y,h-14,cam);side(c,x+w-18,y,h-14,cam);
  if(b.id==='shrine')for(const dx of [56,144,280,384])civicSprite(c,5,x+dx,y-40,22,61);
  const alpha=fades.get(world)?.get(player)?.values[b.id]??(inBuilding(b,player.x,player.y,8)?0:1);
  c.save();c.globalAlpha=.16+.84*alpha;
  for(const [sx,sy,sw] of frontSegments(b))wall(c,sx-cam.x,sy-cam.y-62,sw,68,true,cam);
  c.restore();
  const dx=(b.x+b.door)*TILE-cam.x,dy=(b.y+b.h)*TILE-cam.y;
  civicSprite(c,4,dx-10,dy-64,84,72);
  // Partition endpoints follow collision, with an actual two-cell interior doorway.
  const px=(b.x+b.partition)*TILE-cam.x;
  side(c,px,y+TILE,(b.h-5)*TILE,cam);side(c,px,y+(b.h-2)*TILE,TILE-14,cam);
 }
}
function overlap(actor,x,y,w,h){return actor&&actor.x+15>x&&actor.x-15<x+w&&actor.y>y&&actor.y-54<y+h;}
function outline(c,p,cam){const x=Math.round(p.x-cam.x),y=Math.round(p.y-cam.y);c.save();c.strokeStyle='rgba(255,224,161,.8)';c.lineWidth=2;c.beginPath();c.moveTo(x-6,y-43);c.lineTo(x+6,y-43);c.lineTo(x+9,y-31);c.lineTo(x+14,y-14);c.lineTo(x+7,y-12);c.lineTo(x+5,y+2);c.lineTo(x-5,y+2);c.lineTo(x-7,y-12);c.lineTo(x-14,y-14);c.lineTo(x-9,y-31);c.closePath();c.stroke();c.restore();}
export function drawOrrakaiOverhead(c,world,player,cam,actors=[]){
 if(!world.orrakaiRevision)return;
 const depthActors=[...actors,...world.objects.filter(o=>o.kind==='npc')];
 let views=fades.get(world);if(!views){views=new WeakMap();fades.set(world,views);}let state=views.get(player);const now=performance.now();if(!state){state={time:now,values:{}};views.set(player,state);}const dt=Math.min(.05,(now-state.time)/1000);state.time=now;
 let obstructed=false;
 for(const b of world.buildings){if(!visible(c,b,cam))continue;
  const x=b.x*TILE,y=b.y*TILE,w=b.w*TILE,h=b.h*TILE;
  const inside=inBuilding(b,player.x,player.y,8),roofOverlap=overlap(player,x-8,y-58,w+16,h+6);
  const target=inside||roofOverlap?0:1;
  const prior=state.values[b.id]??target,alpha=prior+(target-prior)*(1-Math.exp(-dt*16));state.values[b.id]=alpha;
  // Each front wall sorts at its own feet; do not redraw it over actors standing in front.
  for(const [sx,sy,sw] of frontSegments(b))if(depthActors.some(a=>a.y<sy&&overlap(a,sx,sy-62,sw,68))){
    c.save();c.globalAlpha=Math.min(.16+.84*alpha,overlap(player,sx,sy-62,sw,68)&&player.y<sy ? .13 : 1);wall(c,sx-cam.x,sy-cam.y-62,sw,68,true);c.restore();
  }
  if(alpha>.008){c.save();c.globalAlpha=alpha;
    if(!sprite(c,b.roof,x-12-cam.x,y-66-cam.y,w+24,h+8)){box(c,'#583f37',x-12-cam.x,y-66-cam.y,w+24,h+8);}
    c.restore();if(roofOverlap&&alpha>.2)obstructed=true;
  }
  // Warm threshold lamps and restrained pools of light identify open doorways.
  const dx=(b.x+b.door+1)*TILE-cam.x,dy=(b.y+b.h)*TILE-cam.y;
  const glow=c.createRadialGradient(dx,dy-12,2,dx,dy-12,67);glow.addColorStop(0,'rgba(245,162,64,.19)');glow.addColorStop(1,'rgba(245,162,64,0)');c.fillStyle=glow;c.fillRect(dx-67,dy-79,134,134);
  box(c,'#2b251c',dx-41,dy-35,9,16);box(c,'#ffd18b',dx-39,dy-33,5,10);
  c.font='11px Georgia';c.textAlign='center';c.fillStyle='#d9c294';c.fillText(b.workshopName||b.name,dx,dy+19);
  // The front room is a workshop; the existing campaign house entrance remains.
  if(b.workshopName){c.font='9px Georgia';c.fillStyle='#b4aa91';c.fillText(b.name,dx,dy+31);}
 }
 for(const o of world.objects){
  if(o.kind==='marketStall'&&player.y<o.y&&overlap(player,o.x-70,o.y-115,140,124)){c.save();c.globalAlpha=.2;civicSprite(c,o.id==='orrakaiFoodStall'?1:0,o.x-70-cam.x,o.y-115-cam.y,140,124);c.restore();}
  if(o.propType==='forge'||o.propType==='candleCluster'||o.propType==='purificationBrazier'){
    const x=o.x-cam.x,y=o.y-cam.y-15;if(x<-100||x>c.canvas.width+100||y<-100||y>c.canvas.height+100)continue;
    const radius=o.propType==='forge'?100:42,g=c.createRadialGradient(x,y,2,x,y,radius);g.addColorStop(0,o.propType==='forge'?'rgba(255,113,36,.25)':'rgba(255,211,117,.17)');g.addColorStop(1,'rgba(255,158,64,0)');c.fillStyle=g;c.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
 }
 // The arch has a real opening; fade only when it overlaps this viewer's actor.
 for(const gy of [6,44]){
  const x=32*TILE,y=gy*TILE,w=9*TILE,h=190,obscures=overlap(player,x,y-h,w,h);
  if(!depthActors.some(a=>a.y<y&&overlap(a,x,y-h,w,h)))continue;
  c.save();
  if(obscures){c.beginPath();c.rect(x-cam.x,y-h-cam.y,w,h);c.rect(player.x-22-cam.x,player.y-60-cam.y,44,67);c.clip('evenodd');}
  sprite(c,6,x-cam.x,y-h-cam.y,w,h);c.restore();
  if(obscures&&player.y<y){c.save();c.beginPath();c.rect(player.x-22-cam.x,player.y-60-cam.y,44,67);c.clip();c.globalAlpha=.16;sprite(c,6,x-cam.x,y-h-cam.y,w,h);c.restore();}
 }
 if(obstructed)outline(c,player,cam);
 if(world.orrakaiDebug){
   c.save();c.strokeStyle='#71d9d0';c.lineWidth=1;for(const b of world.buildings)c.strokeRect(b.x*TILE-cam.x,b.y*TILE-cam.y,b.w*TILE,b.h*TILE);
   for(let y=Math.max(0,Math.floor(cam.y/TILE));y<Math.min(world.height,(cam.y+c.canvas.height)/TILE);y++)for(let x=Math.max(0,Math.floor(cam.x/TILE));x<Math.min(world.width,(cam.x+c.canvas.width)/TILE);x++)if(world.tiles[y][x].passable===false){c.fillStyle='rgba(242,56,64,.25)';c.fillRect(x*TILE-cam.x,y*TILE-cam.y,TILE,TILE);}c.restore();
 }
}
export function getOrrakaiCutawayState(world,player){return {...fades.get(world)?.get(player)?.values};}

// Existing objects remain interaction targets; their presentation becomes a workstation.
export function drawOrrakaiFixture(c,o,cam,player){
 if(!o.orrakaiFixture)return false;const x=o.x-cam.x,y=o.y-cam.y;
 switch(o.kind){
 case 'blacksmithService':drawTownDetailArt(c,7,x,y,34,34);break;
 case 'alchemistService':drawTownDetailArt(c,8,x,y,52,45);break;
 case 'guildClerk':drawTownDetailArt(c,9,x,y,58,44);break;
 case 'classTrainerService':drawTownDetailArt(c,5,x,y,38,59);break;
 case 'shrine':drawEnvironmentProp(c,'runestone',x,y,{scale:1.4});drawTownDetailArt(c,10,x-28,y,25,37);break;
 case 'bankService':drawPropSprite(c,14,x,y+8,.45);break;
 case 'marketStall':{
  if(civicSprite(c,o.id==='orrakaiFoodStall'?1:0,x-70,y-115,140,124))break;
  box(c,'#38281e',x-43,y-65,5,71);box(c,'#38281e',x+38,y-65,5,71);box(c,'#6b3433',x-48,y-72,96,29);for(let i=0;i<6;i++)box(c,i%2?'#ad7750':'#804742',x-48+i*16,y-72,16,5);box(c,'#33251d',x-43,y-22,86,29);box(c,'#916640',x-45,y-26,90,9);for(let i=0;i<7;i++)box(c,['#d0a565','#668451','#a96549'][i%3],x-33+i*10,y-31,7,7);break;
 }
 default:drawEnvironmentProp(c,'signpost',x+38,y,{scale:.8});break;
 }
 if(player&&Math.hypot(player.x-o.x,player.y-o.y)<150){const labelY=y-(o.kind==='marketStall'?128:62);c.save();c.font='bold 11px Georgia';c.textAlign='center';c.fillStyle='#181713';c.fillRect(x-66,labelY-13,132,18);c.fillStyle='#eddbb4';c.fillText(o.name,x,labelY);c.restore();}
 return true;
}

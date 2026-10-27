// Landmark-scale authored places. Coordinates are in tiles; layouts never depend on loot RNG.
import {TILE,BIOMES} from './data.js';
import {terrainPattern} from './spriteArt.js';

export const LANDSCAPES=[
 {id:'cinder-terraces',name:'The Cinder Terraces',x:132,y:124,type:'orchard',lore:'Irrigation channels divide living kitchen gardens from a burned orchard. The last harvest was carried uphill.',reward:'ashrose'},
 {id:'bellwater',name:'Bellwater Cloister',x:278,y:145,type:'cloister',lore:'The river took the cloister floor. Three bells remain above the water; the choir’s offering is still sealed.',reward:'lumenQuartz'},
 {id:'hanging-quarry',name:'The Hanging Quarry',x:492,y:218,type:'quarry',lore:'A descending haul road follows the cut faces. The lowest rail ends at a sealed workers’ refuge.',reward:'blackironOre'},
 {id:'reed-procession',name:'The Drowned Procession',x:217,y:364,type:'marsh',lore:'Processional statues face a chapel that sank. Raised planks follow the old route through the reeds.',reward:'lanternMoss'},
 {id:'split-caravan',name:'The Split Caravan',x:175,y:118,type:'caravan',lore:'The wagons were pulled apart from opposite ends. A line of spilled medicine leads away from the road.',reward:'fieldRations'},
 {id:'rootbound-chapel',name:'The Rootbound Chapel',x:137,y:187,type:'root',lore:'The chapel was built around the tree. Its roots now occupy the nave, but someone still tends the candles.',reward:'spiritwoodSplinter'},
 {id:'saltwell-mill',name:'Saltwell Mill',x:99,y:384,type:'mill',lore:'A millrace runs past the drying yard. The water still turns over, but the workers’ houses are empty.',reward:'riverReed'},
 {id:'oathbreakers-court',name:'The Oathbreakers’ Court',x:519,y:371,type:'ritual',lore:'Every statue has been turned away from the central oath. Only one still looks toward the road.',reward:'paleEssence'}
];
const rough=[[-15,-9],[-11,-14],[-2,-13],[5,-15],[14,-10],[16,-1],[13,8],[5,12],[-5,13],[-14,7],[-17,-1]];
const water=[[-12,-7],[-4,-10],[8,-8],[13,-2],[10,7],[2,10],[-9,7],[-14,0]];
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return ((h^(h>>>16))>>>0)/4294967296;};
const pass=(w,x,y)=>{const t=w.tiles?.[Math.floor(y)]?.[Math.floor(x)];return t&&t.passable!==false&&BIOMES[t.biome]?.passable!==false&&!['wall','water','void'].includes(t.biome);};
function inside(x,y,points){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function poly(ctx,points,x,y,scale=1){ctx.beginPath();points.forEach(([px,py],i)=>i?ctx.lineTo(x+px*scale,y+py*scale):ctx.moveTo(x+px*scale,y+py*scale));ctx.closePath();}
function critical(o){return /Entrance|Gate|Exit|navStone|npc|Service|Investigation|Quest|shrine/.test(o.kind||'')||o.questId||o.poiId;}

export function applyAuthoredLandscapes(world){
 if(world.mode!=='overworld'||world.width<300||world.landscapeVersion)return world;
 world.landscapeVersion=1;world.landscapes=[];
 for(const definition of LANDSCAPES){
  const site={...definition,x:definition.x*TILE,y:definition.y*TILE,radius:18*TILE};
  world.landscapes.push(site);
  const protectedObjects=world.objects.filter(critical);
  // Retire generic dressing in this footprint. Existing actors, quests and entrances remain.
  world.objects=world.objects.filter(o=>!((o.kind==='worldDressing'||o.decorative||['treeCluster','pineCluster','shrub','tallGrassPatch'].includes(o.kind))&&!critical(o)&&Math.hypot(o.x-site.x,o.y-site.y)<site.radius));
  const reserved=(x,y,r=60)=>protectedObjects.some(o=>Math.abs(o.x-x)<r&&Math.abs(o.y-y)<r);
  let serial=0;
  const place=(propType,dx,dy,scale=1,extra={})=>{
    const x=site.x+dx*TILE,y=site.y+dy*TILE;
    const shallow=['cloister','marsh','mill'].includes(site.type)&&['column','statue','reed','ruinWall','brokenStainedGlass'].includes(propType);
    if((!pass(world,x/TILE,y/TILE)&&!shallow)||reserved(x,y))return;
    world.objects.push({id:`land-${site.id}-${serial++}`,kind:'worldDressing',propType,x,y,scale,interactable:false,decorative:true,drawRadius:420,...extra});
  };
  const resource=(kind,itemId,dx,dy,stableId=null)=>{
    let x=site.x+dx*TILE,y=site.y+dy*TILE;
    // Named survivor supplies are content contracts even when a watershed moves.
    if(stableId&&(!pass(world,x/TILE,y/TILE)||reserved(x,y))){
      let best=null,distance=Infinity;
      for(let py=Math.floor(y/TILE)-8;py<=Math.floor(y/TILE)+8;py++)for(let px=Math.floor(x/TILE)-8;px<=Math.floor(x/TILE)+8;px++){
        const wx=(px+.5)*TILE,wy=(py+.5)*TILE,d=Math.hypot(wx-x,wy-y);
        if(d<distance&&pass(world,px,py)&&!reserved(wx,wy)){best={x:wx,y:wy};distance=d;}
      }
      if(best){x=best.x;y=best.y;}
    }
    if(pass(world,x/TILE,y/TILE)&&!reserved(x,y)){const generatedId=`land-${site.id}-supply-${serial++}`;world.objects.push({id:stableId||generatedId,kind,itemId,name:`${site.name} · ${itemId}`,x,y,r:12,respawnTime:600});}
  };
  const wet=['cloister','marsh','mill'].includes(site.type);
  site.wetCells=[];
  // Water is actual collision, with a three-tile-wide cross-shaped causeway and islands.
  if(wet)for(let dy=-11;dy<=11;dy++)for(let dx=-15;dx<=15;dx++){
    if(!inside(dx,dy,water)||Math.abs(dx)<=1||Math.abs(dy)<=1||Math.hypot(dx+7,dy+5)<3||Math.hypot(dx-7,dy-4)<3)continue;
    const x=definition.x+dx,y=definition.y+dy,t=world.tiles[y]?.[x];
    if(!t||t.biome==='path'||reserved((x+.5)*TILE,(y+.5)*TILE,100))continue;
    if(world.objects.some(o=>o.interactable!==false&&Math.hypot(o.x-(x+.5)*TILE,o.y-(y+.5)*TILE)<65)||(world.enemies||[]).some(e=>Math.hypot(e.x-(x+.5)*TILE,e.y-(y+.5)*TILE)<65))continue;
    t.biome='water';site.wetCells.push([x,y]);
  }
  // Explicit causeway collision follows the rendered planks, connecting every island.
  if(wet)for(let i=-15;i<=15;i++)for(let d=-1;d<=1;d++)for(const [dx,dy] of [[i,d],[d,i]]){
    const t=world.tiles[definition.y+dy]?.[definition.x+dx];if(t&&!reserved((definition.x+dx)*TILE,(definition.y+dy)*TILE,45)){t.biome='path';delete t.passable;}
  }
  // A reachable center, even where an authored site crosses the old hidden water grid.
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const t=world.tiles[definition.y+dy]?.[definition.x+dx];if(t&&!reserved((definition.x+dx)*TILE,(definition.y+dy)*TILE,45)){t.biome='ruin';delete t.passable;}}
  if(site.type==='orchard'){
    for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){
      const seed=hash(`${row}:${col}`),dx=col*5+(row%2)*.5+(seed-.5),dy=row*4+(hash(`${col}:${row}`)-.5)*1.2;
      if(Math.abs(dx)<2)continue;
      place(seed<.13?'stump':row<0?'diseasedOrchardTree':seed>.7?'diseasedOrchardTree':'willow',dx,dy,1.15+seed*.85);
      if(row===1)resource('ashFruit','ashFruit',dx+1.5,dy+1);
    }
    place('townBuilding',-10,-9,1,{buildingIndex:0,buildingHeight:160});place('ancientSluice',0,-11,2);
    place('harvestCart',9,9,1.7);place('crate',11,8,1.3);place('childToy',-8,-5,1.3);
    for(const x of [-12,12])for(let y=-6;y<10;y+=4)place('ruinWall',x,y,1.6);
    resource('forage','bitterroot',-8,9);
  }else if(site.type==='cloister'){
    place('townBuilding',0,-11,1,{buildingIndex:6,buildingHeight:275});
    for(const x of [-8,8])for(const y of [-6,-2,3,7])place('column',x,y,2.1);
    place('brokenStainedGlass',-5,-10,2);place('ruinWall',8,-10,2);place('statue',0,9,2);
    for(const [id,dx,dy] of [['west',-7,-5],['east',7,4],['choir',0,-8]]){
      // Island bell pedestals connect to the processional walk via short planks.
      const x=definition.x+dx,y=definition.y+dy;
      for(let by=-1;by<=1;by++)for(let bx=-1;bx<=1;bx++){const t=world.tiles[y+by]?.[x+bx];if(t){t.biome='ruin';delete t.passable;}}
      for(let bx=Math.min(0,dx);bx<=Math.max(0,dx);bx++){const t=world.tiles[y]?.[definition.x+bx];if(t){t.biome='path';delete t.passable;}}
      world.objects.push({id:`bellwater-${id}`,kind:'worldRelic',name:`${id==='choir'?'Choir':id==='west'?'West':'East'} Bell`,x:x*TILE+16,y:y*TILE+16,r:14,propType:'warningBell',lore:'A low note carries across the drowned courtyard.'});
    }
  }else if(site.type==='quarry'){
    place('modular',0,-11,1,{artIndex:12,artWidth:220,artHeight:220});
    for(let terrace=0;terrace<3;terrace++)for(let i=0;i<8;i++){
      const seed=hash(i+':'+terrace),dx=-13+i*3.8,dy=-9+terrace*8+(seed-.5)*2;
      if(Math.abs(dx)<3)continue;
      place('smallBoulder',dx,dy,1.4+seed*2.7);place('smallBoulder',dx+1,dy+1,.6+seed);
    }
    place('harvestCart',5,5,1.8);place('timberSupport',-3,-8,1.5);place('warningBell',-10,10,1.8);
    place('quarantineTent',11,8,1.7);place('infirmaryCot',13,10,1.2);resource('ore','blackironOre',-10,-5);resource('crystal','lumenQuartz',11,-6);
  }else if(site.type==='marsh'){
    place('townBuilding',0,-11,1,{buildingIndex:6,buildingHeight:210,ruined:true});
    for(const x of [-4,4])for(const y of [-8,0,8])place('statue',x,y,1.8);
    for(let i=0;i<26;i++){const angle=i*2.4;place('reed',Math.cos(angle)*(12+hash(i)*3),Math.sin(angle)*(9+hash(i)*3),1.4);}
    place('sickWagon',-12,2,1.8);place('memorialStone',12,2,1.5);resource('forage','lanternMoss',-11,8);
  }else if(site.type==='caravan'){
    for(const [x,y,a] of [[-9,-5,-15],[-3,-2,8],[5,3,-23],[11,6,18]]){place('sickWagon',x,y,2,{rotation:a});place('crate',x+2,y+2,1.3);place('deadLivestock',x-1,y+3,1.3);}
    place('quarantineTent',-13,8,1.5);place('medicineCrates',-10,9,1.5);place('plagueMarker',-15,5,1.6);
    for(let i=0;i<8;i++)place(i%2?'bone':'crate',3+i*.9,5+i*.65,.7);
  }else if(site.type==='root'){
    place('townBuilding',0,-6,1,{buildingIndex:6,buildingHeight:290,ruined:true});place('modular',0,-3,1,{artIndex:13,artWidth:240,artHeight:275});
    for(let i=0;i<17;i++){const a=i*2.4;place(i%3?'pine':'deadRoot',Math.cos(a)*13,Math.sin(a)*10,1.6+hash(i)*.7);}
    for(const x of [-6,6])for(const y of [-5,2,8])place('column',x,y,1.7);
    place('altar',0,5,1.9);place('candleCluster',-2,6,1.4);place('candleCluster',2,6,1.4);resource('rareTree','spiritwoodSplinter',10,-7,'land-rootbound-chapel-supply-28');
    for(const [dx,dy,angle] of [[-3,-1,18],[3,0,-24],[-5,4,-12],[4,6,35]])place('deadRoot',dx,dy,1.8,{rotation:angle});
  }else if(site.type==='mill'){
    place('townBuilding',-9,-8,1,{buildingIndex:0,buildingHeight:215});place('ancientSluice',-6,-5,2.5);
    place('townBuilding',9,-8,1,{buildingIndex:1,buildingHeight:170});
    for(const y of [4,8])for(const x of [-10,-6,6,10])place('woodPile',x,y,1.5);
    place('harvestCart',12,11,1.8);place('laundryLine',-9,-2,1.2);resource('reed','riverReed',12,4);
  }else{
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;place('statue',Math.cos(a)*10,Math.sin(a)*8,2);}
    place('modular',0,-4,1,{artIndex:9,artWidth:170,artHeight:260});place('altar',0,3,2.3);
    place('ruinWall',-12,-8,2);place('ruinWall',12,-8,2);place('bone',6,5,1.4);
  }
  site.approach=connectApproach(world,definition.x,definition.y);
  const lore={...site,id:`landmark-${site.id}`,kind:'poiMarker',authoredSite:true,locationId:site.id,interactable:false,decorative:true};
  world.objects.push(lore);world.authoredLocations.push(site);
  // The concealed reward is off the central approach, reached by following the scene.
  const dx=['cloister','marsh','mill'].includes(site.type)?0:12,dy=site.type==='cloister'?-9:9;
  if(pass(world,definition.x+dx,definition.y+dy))world.objects.push({id:`landmark-secret-${site.id}`,kind:'worldSecret',name:site.type==='cloister'?'The Choir’s Offering':'Concealed survivor’s cache',x:site.x+dx*TILE,y:site.y+dy*TILE,r:15,propType:'blockedAlcove',reward:site.reward,rewardQty:site.type==='caravan'?4:3,requires:site.type==='cloister'?['bellwater-west','bellwater-east','bellwater-choir']:[],lore:site.type==='cloister'?'The three notes release the choir’s last offering.':'Following the traces of the former occupants reveals a hidden supply recess.'});
 }
 return world;
}

function connectApproach(world,sx,sy){
 const width=world.width,start=sy*width+sx,queue=[start],parents=new Map([[start,null]]);let end=null;
 for(let head=0;head<queue.length&&head<15000;head++){
  const n=queue[head],x=n%width,y=Math.floor(n/width);
  if(Math.hypot(x-sx,y-sy)>20&&world.tiles[y]?.[x]?.biome==='path'){end=n;break;}
  for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){const nx=x+dx,ny=y+dy,id=ny*width+nx;if(nx<1||ny<1||nx>=width-1||ny>=world.height-1||parents.has(id)||!pass(world,nx,ny))continue;parents.set(id,n);queue.push(id);}
 }
 const points=[];for(let n=end;n!==null&&n!==undefined;n=parents.get(n)){const x=n%width,y=Math.floor(n/width);world.tiles[y][x].biome='path';points.push([(x+.5)*TILE,(y+.5)*TILE]);}
 return points;
}

export function drawAuthoredGround(ctx,world,camera){
 const sites=world.landscapes||(world.objects||[]).filter(o=>o.authoredSite&&o.type&&o.radius);
 for(const s of sites){const x=s.x-camera.x,y=s.y-camera.y;
  if(x<-650||y<-650||x>ctx.canvas.width+650||y>ctx.canvas.height+650)continue;
  ctx.save();
  if(s.approach?.length){ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#6b6246';ctx.lineWidth=30;ctx.beginPath();s.approach.forEach(([px,py],i)=>i?ctx.lineTo(px-camera.x,py-camera.y):ctx.moveTo(px-camera.x,py-camera.y));ctx.stroke();ctx.strokeStyle='#8a7b53';ctx.lineWidth=1;ctx.stroke();}
  const fill=s.type==='quarry'?'#4c4941':s.type==='orchard'?'#45372a':['cloister','ritual','root'].includes(s.type)?'#373a32':'#343c2f';
  const outline=rough.map(([px,py],i)=>[px+(hash(s.id+i)-.5)*3,py+(hash(i+s.id)-.5)*3]);
  poly(ctx,outline,x,y,TILE);ctx.fillStyle=fill;ctx.globalAlpha=.76;ctx.fill();ctx.globalAlpha=1;
  ctx.save();ctx.clip();const texture=terrainPattern(ctx,s.type==='quarry'?7:['cloister','ritual','root'].includes(s.type)?2:1,camera);if(texture){ctx.globalAlpha=.45;ctx.fillStyle=texture;ctx.fillRect(x-600,y-600,1200,1200);}ctx.restore();
  // Ground layers define the former use of a place before any prop is drawn.
  if(s.type==='orchard'){
    for(let row=-2;row<=2;row++){
      const py=y+row*128;
      stoneCourse(ctx,x-380,py+18,760,18,`terrace-${row}`,true);
      for(let col=-11;col<=11;col++){ctx.strokeStyle=row<0?'#514733':'#6b713d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+col*32,py-55);ctx.lineTo(x+col*32+10,py+12);ctx.stroke();}
    }
    ctx.globalAlpha=.58;ctx.fillStyle='#79684a';ctx.fillRect(x-34,y-390,68,770);ctx.globalAlpha=1;ctx.fillStyle='#263c37';ctx.fillRect(x+40,y-390,12,770);
  }else if(s.type==='quarry'){
    for(let i=0;i<3;i++){
      const py=y-280+i*240;stoneCourse(ctx,x-410,py,820,42,`quarry-${i}`,false);
    }
    rails(ctx,x-40,y-335,x+180,y+320);
  }else if(['cloister','marsh','mill'].includes(s.type)){
    ctx.fillStyle='#142e33';
    for(const [tx,ty] of s.wetCells||[])if(world.tiles[ty]?.[tx]?.biome==='water'){ctx.fillRect(tx*TILE-camera.x,ty*TILE-camera.y,TILE+1,TILE+1);}
    const waterTexture=terrainPattern(ctx,6,camera);if(waterTexture){ctx.fillStyle=waterTexture;ctx.globalAlpha=.28;for(const [tx,ty] of s.wetCells||[])if(world.tiles[ty]?.[tx]?.biome==='water')ctx.fillRect(tx*TILE-camera.x,ty*TILE-camera.y,TILE,TILE);ctx.globalAlpha=1;}
    ctx.lineWidth=8;ctx.strokeStyle='#354a3b';ctx.lineCap='round';ctx.beginPath();
    for(const [tx,ty] of s.wetCells||[])if(world.tiles[ty]?.[tx]?.biome==='water'){
      const px=tx*TILE-camera.x,py=ty*TILE-camera.y;
      if(world.tiles[ty-1]?.[tx]?.biome!=='water'){ctx.moveTo(px,py);ctx.lineTo(px+32,py);}
      if(world.tiles[ty+1]?.[tx]?.biome!=='water'){ctx.moveTo(px,py+32);ctx.lineTo(px+32,py+32);}
      if(world.tiles[ty]?.[tx-1]?.biome!=='water'){ctx.moveTo(px,py);ctx.lineTo(px,py+32);}
      if(world.tiles[ty]?.[tx+1]?.biome!=='water'){ctx.moveTo(px+32,py);ctx.lineTo(px+32,py+32);}
    }ctx.stroke();
    ctx.strokeStyle='#527476';ctx.lineWidth=1;
    for(let i=0;i<55;i++){const px=x+(hash(s.id+i)-.5)*780,py=y+(hash(i+s.id)-.5)*530;const tile=world.tiles[Math.floor((py+camera.y)/TILE)]?.[Math.floor((px+camera.x)/TILE)];if(tile?.biome==='water'){ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+12,py);ctx.stroke();}}
    planks(ctx,x-480,y-32,960,64,false);planks(ctx,x-32,y-480,64,960,true);
    if(s.type==='cloister'){planks(ctx,x-224,y-160,224,32,false);planks(ctx,x,y+128,224,32,false);}
  }else if(s.type==='caravan'){
    ctx.strokeStyle='#66543b';ctx.lineWidth=5;
    for(const offset of [-14,14]){ctx.beginPath();ctx.moveTo(x-460,y-230+offset);ctx.bezierCurveTo(x-100,y-120+offset,x+130,y+80+offset,x+430,y+260+offset);ctx.stroke();}
    ctx.strokeStyle='#482827';ctx.lineWidth=5;ctx.setLineDash([5,9,2,18]);ctx.beginPath();ctx.moveTo(x+80,y+150);ctx.lineTo(x+380,y+288);ctx.stroke();ctx.setLineDash([]);
  }else{
    const r=s.type==='root'?230:290;ctx.strokeStyle=s.type==='root'?'#78755a':'#8c6750';ctx.lineWidth=4;ctx.globalAlpha=.5;ctx.setLineDash([61,8,13,5,29,15]);
    ctx.beginPath();ctx.ellipse(x,y+20,r,r*.72,0,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth=2;for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*(r-18),y+20+Math.sin(a)*(r-18)*.72);ctx.lineTo(x+Math.cos(a)*(r+18),y+20+Math.sin(a)*(r+18)*.72);ctx.stroke();}
    ctx.globalAlpha=1;
  }
  ctx.restore();
 }
 if(['dungeon','tower','sideZone'].includes(world.mode))drawRoomGround(ctx,world,camera);
}
function planks(ctx,x,y,w,h,vertical){ctx.fillStyle='#20261f';ctx.fillRect(x-4,y-4,w+8,h+8);for(let i=0;i<(vertical?h:w);i+=11){const seed=hash(i+':plank'),j=(seed-.5)*5;ctx.fillStyle=['#5b503e','#6d5e48','#73664c','#514a3b'][Math.floor(seed*4)];ctx.fillRect(x+(vertical?j:i),y+(vertical?i:j),vertical?w:10,vertical?10:h);ctx.fillStyle='#948568';if(vertical)ctx.fillRect(x+j+4,y+i,w-8,1);else ctx.fillRect(x+i,y+j+4,1,h-8);ctx.fillStyle='#2e3028';if(vertical){ctx.fillRect(x+5,y+i+4,2,2);ctx.fillRect(x+w-7,y+i+4,2,2);}else{ctx.fillRect(x+i+4,y+5,2,2);ctx.fillRect(x+i+4,y+h-7,2,2);}}}
function stoneCourse(ctx,x,y,width,height,seed,ordered){
 for(let i=0;i<width;i+=ordered?27:39){const n=hash(seed+i),j=(n-.5)*(ordered?5:24),h=height*(.6+n*.6);ctx.fillStyle='#202722';ctx.fillRect(x+i,y+j,ordered?26:42,h);ctx.fillStyle=['#6c6753','#77705b','#5c5a4c','#8a8066'][Math.floor(n*4)];ctx.beginPath();ctx.moveTo(x+i,y+j);ctx.lineTo(x+i+23,y+j-3);ctx.lineTo(x+i+30,y+j+6);ctx.lineTo(x+i+27,y+j+h*.65);ctx.lineTo(x+i+2,y+j+h*.65);ctx.closePath();ctx.fill();ctx.fillStyle='#a19574';ctx.fillRect(x+i+3,y+j+1,19,2);}
}
function rails(ctx,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;ctx.strokeStyle='#5a4430';ctx.lineWidth=5;for(let i=0;i<len;i+=18){const f=i/len;ctx.beginPath();ctx.moveTo(x1+dx*f+nx*20,y1+dy*f+ny*20);ctx.lineTo(x1+dx*f-nx*20,y1+dy*f-ny*20);ctx.stroke();}ctx.strokeStyle='#999285';ctx.lineWidth=3;for(const sign of [-1,1]){ctx.beginPath();ctx.moveTo(x1+nx*14*sign,y1+ny*14*sign);ctx.lineTo(x2+nx*14*sign,y2+ny*14*sign);ctx.stroke();}}
function drawRoomGround(ctx,w,camera){for(const r of w.rooms||[]){const x=r.x*TILE-camera.x,y=r.y*TILE-camera.y,width=r.w*TILE,height=r.h*TILE;if(x>ctx.canvas.width||y>ctx.canvas.height||x+width<0||y+height<0)continue;
 ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();const purpose=r.historicalPurpose||'';
 if(/Extraction|Repair/.test(purpose)){rails(ctx,x+width*.45,y+24,x+width*.6,y+height-24);ctx.fillStyle='rgba(153,116,63,.08)';ctx.fillRect(x,y,width,height);}
 else if(/chapel|Ceremonial|burial/.test(purpose)){ctx.fillStyle='rgba(115,54,49,.3)';ctx.fillRect(x+width*.4,y+25,width*.2,height-50);ctx.strokeStyle='#7d6c47';ctx.lineWidth=2;ctx.strokeRect(x+width*.4+6,y+30,width*.2-12,height-60);}
 else if(/quarters/.test(purpose)){ctx.fillStyle='rgba(93,71,45,.22)';ctx.fillRect(x+32,y+32,Math.min(200,width-64),Math.min(170,height-64));}
 ctx.restore();
}}

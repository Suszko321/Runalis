// Stable geography and reusable, deliberately composed scenes. No gameplay RNG here.
import {TILE, BIOMES} from './data.js';
import {ACT1_LANDMARKS} from './overworldUtils.js';

export const ECOLOGIES = {
  woodland: {name:'Echoryn Woodland', plants:['pine','shrub','tallGrassPatch','log','stump'], forage:['echorynGreenleaf','bitterroot','amberResin'], mineral:['ironScrap','thornstone'], weather:['clear','clear','overcast','rain'], life:'birds'},
  orchard: {name:'Ashen Orchard', plants:['diseasedOrchardTree','deadRoot','ashFruit','shrub'], forage:['ashFruit','ashrose','bitterroot'], mineral:['ironScrap','fieldstone'], weather:['clear','overcast','rain'], life:'crows'},
  marsh: {name:'Lantern Marsh', plants:['reed','gravecap','deadRoot','smallBoulder'], forage:['lanternMoss','bloodmoss','gravecap'], mineral:['tideglassCrystal','ironOre'], weather:['fog','fog','clear','rain'], life:'fireflies'},
  river: {name:'Riverlands', plants:['willow','reed','shrub','smallBoulder','log'], forage:['riverReed','orrakaiMint','moonpetal'], mineral:['tideglassCrystal','fieldstone'], weather:['clear','rain','fog','clear'], life:'birds'},
  highland: {name:'Watcher Ridge', plants:['smallBoulder','smallBoulder','stump','tallGrassPatch'], forage:['bitterroot','dawnsage','emberleaf'], mineral:['blackironOre','lumenQuartz','deepstone'], weather:['clear','overcast','rain','clear'], life:'crows'},
  burial: {name:'Old Blighted', plants:['graveMarker','deadRoot','gravecap','brokenWall'], forage:['gravecap','spiritFern','moonpetal'], mineral:['boneShard','hollowGem'], weather:['fog','overcast','clear'], life:'crows'},
  redseal: {name:'Last Dawn Wilds', plants:['deadRoot','runestone','smallBoulder','stump'], forage:['redSealPoppy','bloodmoss','blackSap'], mineral:['arcaneDust','deepstone'], weather:['overcast','clear','rain'], life:'motes'},
  aureate: {name:'Aureate Marches', plants:['column','prayerRibbons','shrub','tallGrassPatch'], forage:['dawnsage','moonpetal','fieldRations'], mineral:['lumenQuartz','ironOre'], weather:['clear','clear','rain'], life:'birds'},
  ascension: {name:'Ascension Wastes', plants:['column','echoFragment','ruinWall','runestone'], forage:['spiritFern','paleEssence','dawnsage'], mineral:['arcaneDust','veyrglassShard'], weather:['ash','clear','overcast'], life:'motes'}
};
export function ecologyAt(world,x,y) {
  if(world.continentEcologyAt)return world.continentEcologyAt(x,y);
  if(world.regionId==='aureateMarches')return 'aureate';
  if(world.regionId==='ascensionWastes')return 'ascension';
  const tx=x/TILE,ty=y/TILE,region=world.tiles?.[Math.floor(ty)]?.[Math.floor(tx)]?.region;
  if(world.terrainFeatures?.echorynRevision){
    if(Math.hypot(tx-ACT1_LANDMARKS.ashenOrchard[0],ty-ACT1_LANDMARKS.ashenOrchard[1])<26)return 'orchard';
    if(region==='highDanger')return 'redseal';
    if(region==='hunterReach')return 'highland';
    if(['gravefields','oldHollow','chapelRuins'].includes(region))return 'burial';
    if(region==='ironMire')return 'marsh';
    if(region==='riverlands')return 'river';
    return 'woodland';
  }
  if(tx>430&&ty>250)return 'redseal';
  if(tx>460&&ty>115&&ty<250)return 'highland';
  if(tx>300&&ty>230||['gravefields','oldHollow','chapelRuins'].includes(region))return 'burial';
  if(region==='ironMire'||tx>155&&tx<305&&ty>265)return 'marsh';
  if(region==='riverlands')return 'river';
  if(tx>80&&tx<155&&ty>65&&ty<120)return 'orchard';
  return 'woodland';
}
export function hashWorld(value) {let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)/4294967296;}
export function openTile(world,x,y) {const t=world.tiles?.[Math.floor(y)]?.[Math.floor(x)];return !!t&&t.passable!==false&&BIOMES[t.biome]?.passable!==false&&!['wall','water','void','cliff','deepWater'].includes(t.biome);}
function anchor(world,x,y) {
  for(let r=0;r<12;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===r&&openTile(world,x+dx,y+dy)&&openTile(world,x+dx-1,y+dy)&&openTile(world,x+dx+1,y+dy)&&openTile(world,x+dx,y+dy-1)&&openTile(world,x+dx,y+dy+1))return [x+dx,y+dy];
  return null;
}
function navAnchor(world,x,y){
  const foes=(world.enemies||[]).filter(e=>e.hp>0&&!e.dead);
  // Stones sit on the quiet approach to a landmark, outside its guard formation.
  for(let r=0;r<=26;r+=2)for(let dy=-r;dy<=r;dy+=2)for(let dx=-r;dx<=r;dx+=2){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    const tx=x+dx,ty=y+dy;
    if(!openTile(world,tx,ty)||!openTile(world,tx+1,ty)||!openTile(world,tx,ty+1))continue;
    if(foes.some(e=>Math.hypot(e.x-(tx+.5)*TILE,e.y-(ty+.5)*TILE)<680))continue;
    return [tx,ty];
  }
  return anchor(world,x,y);
}
const PREFABS = {
  logging:[['log',-3,0],['log',-3,1],['stump',-1,-2],['harvestCart',3,-1],['woodPile',3,1],['campfire',0,2],['crate',2,-3]],
  pilgrim:[['avarranOathStone',0,-2],['prayerRibbons',-2,-1],['candleCluster',1,-1],['bench',-3,2],['memorialStone',3,1]],
  caravan:[['sickWagon',-2,-1],['crate',2,0],['medicineCrates',3,2],['deadLivestock',-4,2],['bone',1,3],['log',4,-2]],
  graves:[['graveMarker',-3,-2],['graveMarker',0,-3],['freshGrave',3,-1],['memorialStone',-1,2],['prayerRibbons',2,2],['brokenWall',-4,1]],
  quarry:[['smallBoulder',-4,-2],['smallBoulder',-3,0],['harvestCart',3,1],['crate',2,-2],['campfire',-1,3],['warningBell',4,-2]],
  garden:[['herbPlanter',-3,-1],['herbPlanter',-3,1],['washBasin',2,1],['harvestCart',3,-2],['diseasedOrchardTree',-1,-4],['childToy',1,3]],
  fishing:[['reed',-4,1],['reed',-3,2],['bench',-1,-1],['campfire',1,2],['crate',3,0],['log',2,-3]],
  ritual:[['altar',0,-2],['runestone',-3,-2],['runestone',3,-2],['bone',-2,1],['candleCluster',2,1],['echoFragment',0,-4]],
  refuge:[['quarantineTent',-3,-2],['infirmaryCot',3,-1],['washBasin',2,2],['medicineCrates',-2,1],['campfire',0,3],['plagueMarker',4,2]],
  ruin:[['ruinWall',-3,-2],['column',3,-3],['brokenStainedGlass',-4,1],['bench',0,2],['shrub',3,1],['rotMemorial',0,-4]],
  workshop:[['forge',-3,-2],['anvil',-1,0],['weaponRack',3,-2],['woodPile',-3,2],['crate',3,1]],
  barracks:[['infirmaryCot',-3,-2],['infirmaryCot',3,-2],['weaponRack',-3,2],['mapTable',1,1],['crate',3,3]]
};
// Specific authored waypoints, with stable IDs independent of placement order.
export const FRONTIER_SCENES = [
 ['outpost-workyard','Outpost Workyard',22,33,'workshop','Axes are sharpened facing the road; the woodpile faces home.'],
 ['lantern-rest','Lantern Rest',36,24,'pilgrim','Ribbons have been renewed on a much older oath stone.'],
 ['hollow-cut','Blighted Cut',67,55,'logging','The last load never reached the outpost.'],
 ['orchard-garden','The Last Garden',106,82,'garden','A child’s toy lies beside the irrigation workers’ last harvest.'],
 ['orchard-infirmary','Orchard Infirmary',121,98,'refuge','Beds face away from the diseased trees.'],
 ['west-caravan','Splintered Caravan',150,92,'caravan','Medicine survived; the draught animals did not.'],
 ['oath-rest','Pilgrims’ Vigil',223,62,'pilgrim','Each traveler left a candle before crossing.'],
 ['bridge-masons','Bridge Masons’ Yard',243,109,'quarry','Cut stone waits for a bridge that no one repairs.'],
 ['chapel-offerings','Chapel Offering Yard',437,80,'pilgrim','New ribbons cover older military insignia.'],
 ['veyr-barracks','Veyr Muster Yard',552,112,'barracks','Supply crates point toward the fortress, abandoned in retreat.'],
 ['thornwood-cut','Thornwood Logging Halt',91,161,'logging','Roots have reached the axe block before the woodcutters returned.'],
 ['river-rest','Riverbend Hearth',77,209,'fishing','A warm hearth and reeds mark the old fishing landing.'],
 ['mirror-shrine','Mirror Grove Vigil',118,276,'ritual','Offerings face the water; the altar faces away.'],
 ['salt-garden','Saltwell Kitchen Garden',111,359,'garden','Herbs grow in washed stone beds above the salt.'],
 ['mine-yard','Abandoned Mine Yard',226,308,'quarry','The warning bell was moved outside after the collapse.'],
 ['marsh-refuge','Lantern Refuge',252,332,'refuge','Raised cots and medicine crates stand above the mire.'],
 ['iron-wreck','Iron Mire Convoy',294,346,'caravan','Ore shipments became barricades.'],
 ['hunter-hearth','Hunters’ Hearth',400,167,'logging','Fresh-cut timber surrounds an old hunting fire.'],
 ['ridge-quarry','Watcher Quarry',502,198,'quarry','The ridge supplied stone to both chapel and fortress.'],
 ['hollow-burials','Unclaimed Graves',379,333,'graves','The markers have names; the newer graves do not.'],
 ['seal-vigil','The Last Vigil',548,381,'ritual','Oath stones have been turned inward toward the seal.'],
 ['marsh-road-shrine','Drowned Road Shrine',199,276,'pilgrim','The road was raised twice; the shrine was not.'],
 ['north-ruin','Broken Survey House',335,86,'ruin','A column bears the same oath marks as the roadside stones.'],
 ['east-refuge','Red Road Refuge',474,319,'refuge','The tents face back toward the frontier.'],
 ['river-graves','Boatmen’s Graves',96,243,'graves','Reeds grow through offerings left by the river families.'],
 ['hollow-workshop','Silent Forge',367,294,'workshop','Finished tools lie beside an unused furnace.'],
 ['ridge-vigil','Ridge Watch',483,171,'pilgrim','Three candles shelter in the lee of a broken monument.'],
 ['fallen-cart','Rootbound Wagon',162,186,'caravan','Roots have grown around a healer’s wagon.']
];
const reservedPositions=new WeakMap();
function dressing(world,id,type,x,y,scale=1) {
  if(!openTile(world,x,y))return;
  // Keep interaction/entry footprints and combat centers legible.
  if((reservedPositions.get(world)||[]).some(o=>Math.abs(o.x-(x+.5)*TILE)<45&&Math.abs(o.y-(y+.5)*TILE)<45))return;
  world.objects.push({id,kind:'worldDressing',propType:type,x:(x+.5)*TILE,y:(y+.5)*TILE,scale,interactable:false,decorative:true,drawRadius:Math.max(280,scale*160)});
}
function compose(world,id,name,x,y,prefab,lore,large=false) {
  let p=anchor(world,x,y);if(!p)return;
  // Shift camp centers onto a roadside clearing rather than covering the road.
  if(world.mode!=='capital'&&world.tiles[p[1]]?.[p[0]]?.biome==='path'){
    for(const [dx,dy] of [[0,6],[6,0],[0,-6],[-6,0],[6,6],[-6,-6]]){
      const q=anchor(world,x+dx,y+dy);
      if(q&&world.tiles[q[1]]?.[q[0]]?.biome!=='path'){p=q;break;}
    }
  }
  [x,y]=p;
  const location={id,name,x:(x+.5)*TILE,y:(y+.5)*TILE,lore,ecology:ecologyAt(world,x*TILE,y*TILE)};
  world.authoredLocations.push(location);
  world.objects.push({...location,id:`site-${id}`,locationId:id,kind:'poiMarker',authoredSite:true,interactable:false,decorative:true});
  PREFABS[prefab].forEach(([type,dx,dy],i)=>dressing(world,`auth-${id}-${i}`,type,x+dx,y+dy,.92+hashWorld(id+i)*.22));
  if(large)dressing(world,`auth-${id}-anchor`,['quarry','barracks'].includes(prefab)?'tower':prefab==='garden'?'diseasedOrchardTree':'brokenBellTower',x,y-5,2.1);
  // A quiet site may offer only its story. Others carry actual profession nodes.
  const eco=ECOLOGIES[ecologyAt(world,x*TILE,y*TILE)];
  if(['logging','garden','quarry','fishing'].includes(prefab)) {
    const kind={logging:'log',garden:'forage',quarry:'ore',fishing:'reed'}[prefab];
    const itemId={logging:'echorynSoftwood',garden:eco.forage[0],quarry:'ironOre',fishing:'riverReed'}[prefab];
    const q=anchor(world,x+4,y+3);
    if(q)world.objects.push({id:`auth-${id}-resource`,kind,name:`${name} supplies`,itemId,x:(q[0]+.5)*TILE,y:(q[1]+.5)*TILE,r:12,respawnTime:420});
  }
  if(['logging','fishing','refuge'].includes(prefab))world.objects.push({id:`auth-${id}-hearth`,kind:'campfire',name:`${name} hearth`,x:(x+.5)*TILE,y:(y+3.5)*TILE,r:14});
}
export function dressWorld(world) {
  if(!world?.tiles?.length||world.authorshipVersion===1)return world;
  world.authorshipVersion=1;world.authoredLocations=[];world.navStones=[];
  reservedPositions.set(world,world.objects.filter(o=>o.interactable!==false&&!o.decorative&&o.kind!=='worldDressing'));
  if(world.objects.some(o=>o.id?.startsWith('room-dress-'))){
    world.authoredLocations=world.objects.filter(o=>o.authoredSite).map(o=>({...o,id:o.locationId}));
    const rooms=world.objects.filter(o=>o.groundRoom).map(o=>o.groundRoom);if(rooms.length)world.rooms=rooms;
    return world;
  }
  if(['dungeon','tower','sideZone'].includes(world.mode)){dressDungeon(world);return world;}
  if(!['overworld','travelRoute','capital'].includes(world.mode))return world;
  const frontier=world.mode==='overworld'&&world.width>300;
  if(!frontier&&world.mode!=='capital'){
    // A single road spine with spurs to existing destinations; no progression gates move.
    for(let x=5;x<world.width-5;x++)for(let dy=-1;dy<=1;dy++)if(openTile(world,x,28+dy))world.tiles[28+dy][x].biome='path';
    for(const o of world.objects.filter(o=>/Entrance|Gate|shrine|campfire/.test(o.kind))){
      const x=Math.floor(o.x/TILE),end=Math.floor(o.y/TILE);
      for(let y=Math.min(28,end);y<=Math.max(28,end);y++)if(openTile(world,x,y))world.tiles[y][x].biome='path';
    }
  }
  const scenes=frontier?FRONTIER_SCENES:world.mode==='capital'?[
    ['orrakai-workyard','Orrakai Workyard',24,32,'workshop','Tools repaired for the frontier.'],['orrakai-garden','Kitchen Gardens',44,34,'garden','Food and medicine share these beds.'],['orrakai-refuge','Pilgrim Shelter',46,22,'refuge','Fresh linen hangs near beds for arriving pilgrims.']
  ]:[
    ['gate-rest','Gate Rest',15,24,'pilgrim','The old route markers survived the new order.'],['convoy','Abandoned Convoy',38,36,'caravan','Supplies left between the safe gate and the ruins.'],['wayyard','Road Workyard',60,22,'quarry','Road stone and ore share the same carts.'],['witness-yard','Witness Yard',82,37,world.regionId==='ascensionWastes'?'ritual':'ruin','Older foundations remain beneath the new monuments.'],['far-vigil','Far Vigil',103,26,'pilgrim','The last maintained candles before the wilderness.']
  ];
  for(const [i,s] of scenes.entries())compose(world,...s,frontier?[3,8,9,18,19,22].includes(i):i===3);
  const navs=frontier?[
    ['outpost','Outpost Crossroads',26,28],['ashenOrchard','Ashen Orchard Road',104,94],['pilgrimBridge','Pilgrim Crossing',253,103],['hunterCamp','Hunters’ Reach',392,165],['watcherRidge','Watcher Ridge',505,193],['mirrorGrove','Mirror Grove',109,274],['lanternMarsh','Lantern Marsh Road',241,329],['oldHollow','Old Blighted',380,344],['demonCultLair','Last Dawn Approach',549,378]
  ]:world.mode==='overworld'?[['west','Western Oath Stone',18,28],['east','Eastern Vigil',99,28]]:[];
  for(const [id,name,tx,ty] of navs){const p=navAnchor(world,tx,ty);if(!p)continue;const o={id:`nav-${world.regionId}-${id}`,kind:'navStone',name,region:world.name,x:(p[0]+.5)*TILE,y:(p[1]+.5)*TILE,r:18};world.objects.push(o);world.navStones.push(o);
    // Paired cairns form a visual breadcrumb trail back toward the named approach.
    for(let i=1;i<=4;i++){const f=i/5;dressing(world,`${o.id}-cairn-${i}`,'smallBoulder',p[0]+(tx-p[0])*f+1.5,p[1]+(ty-p[1])*f,.7);}
  }
  // Frame existing roads with ecology-specific groups, leaving the road itself open.
  const stride=frontier?11:9;
  for(let y=6;y<world.height-6;y+=stride)for(let x=6;x<world.width-6;x+=stride){
    const seed=hashWorld(`${world.regionId}:${x}:${y}`);if(seed<.25)continue;
    const px=x+(seed-.5)*7,py=y+(hashWorld(`${y}:${x}`)-.5)*7;
    if(!openTile(world,px,py))continue;
    const t=world.tiles[Math.floor(py)][Math.floor(px)];if(['path','ruin'].includes(t.biome))continue;
    // A transition band samples the adjoining ecology, rather than drawing a border.
    const ecology=ECOLOGIES[ecologyAt(world,(px+(seed-.5)*18)*TILE,(py+(seed-.5)*18)*TILE)];
    const members=3+Math.floor(seed*5);
    for(let i=0;i<members;i++){const dx=Math.sin(i*2.4+seed*6)*(1.2+seed*2.7),dy=Math.cos(i*2.4+seed*6)*(1+seed*2);
      if(world.tiles[Math.floor(py+dy)]?.[Math.floor(px+dx)]?.biome==='path')continue;
      dressing(world,`edge-${x}-${y}-${i}`,ecology.plants[(i+Math.floor(seed*4))%ecology.plants.length],px+dx,py+dy,.85+hashWorld(`${x},${y},${i}`)*.7);
    }
  }
  // Paired worn milestones identify the actual existing road surface.
  for(let y=8;y<world.height-8;y+=17)for(let x=8;x<world.width-8;x+=13)if(world.tiles[y][x].biome==='path'&&world.tiles[y+3][x].biome!=='path')dressing(world,`milestone-${x}-${y}`,'avarranOathStone',x,y+3,.62);
  return world;
}
export function dressDungeon(world) {
  const theme=String((world.name||'')+' '+(world.theme||'')+' '+(world.dungeonId||'')).toLowerCase();
  const types=/mine/.test(theme)?['quarry','workshop','barracks']:/crypt|tomb|grave/.test(theme)?['graves','pilgrim','ritual']:/cave|hollow/.test(theme)?['quarry','logging','ritual']:/cult|temple|chapel|seal/.test(theme)?['pilgrim','ritual','refuge']:['barracks','workshop','ruin'];
  for(const [i,r] of (world.rooms||[]).entries()){
    const type=types[i%types.length];r.historicalPurpose={quarry:'Extraction and sorting',workshop:'Repair workshop',barracks:'Garrison quarters',graves:'Family burial chamber',pilgrim:'Offering chapel',ritual:'Ceremonial chamber',refuge:'Makeshift infirmary',ruin:'Abandoned living quarters',logging:'Timber supports and stores'}[type];
    // Dressing hugs two corners; all central routes, doors and boss arenas stay clear.
    for(const [j,[prop,dx,dy]] of PREFABS[type].entries()){
      const px=j%2?r.x+r.w-3-Math.abs(dx)*.35:r.x+2+Math.abs(dx)*.35;
      const py=r.y+2+(j>>1)*1.3;
      if(py<r.y+r.h-3)dressing(world,`room-dress-${i}-${j}`,prop,px,py,1.3);
    }
    // Support lines and rear-wall working areas repeat architecture, not room contents.
    const architecture=/mine/.test(theme)?'timberSupport':/grave|crypt/.test(theme)?'graveMarker':/thorn|cave/.test(theme)?'smallBoulder':'column';
    for(let edge=3;edge<r.w-2;edge+=5){
      dressing(world,`room-edge-${i}-${edge}`,architecture,r.x+edge,r.y+1,1.4);
      if(edge!==Math.floor(r.w/2))dressing(world,`room-rear-${i}-${edge}`,edge%2?'crate':'candleCluster',r.x+edge,r.y+r.h-2,1.15);
    }
    const location={id:`room-${i}`,name:r.historicalPurpose,x:r.cx*TILE,y:r.cy*TILE,lore:`${r.historicalPurpose}: traces of the original occupants remain along the walls.`};
    world.authoredLocations.push(location);
    world.objects.push({...location,id:`room-ground-${i}`,locationId:location.id,kind:'poiMarker',groundRoom:{...r},authoredSite:true,interactable:false,decorative:true});
    if(i>0&&i%4===2){const p=anchor(world,r.x+r.w-3,r.y+r.h-3);if(p)world.objects.push({id:`secret-${world.dungeonId||world.theme}-${world.floor||1}-${i}`,kind:'worldSecret',name:'Loose offering stone',x:(p[0]+.5)*TILE,y:(p[1]+.5)*TILE,r:10,propType:'blockedAlcove',lore:'Scrape marks beneath the old masonry reveal a concealed offering.',reward:'arcaneDust'});}
  }
}

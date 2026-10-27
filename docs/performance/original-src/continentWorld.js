import {configureEncounterEnemy,geographicEncounterProfile} from './encounterData.js';
import {TILE} from './data.js';
import {createOverworldMap} from './overworldMap.js';
import {normalizeWorld} from './world.js';
import {createLegacyRegionWorld,createLegacyTravelRouteWorld} from './regionWorlds.js';
import {createContinentalScenes} from './continentScenes.js';
import {createOrrakaiExterior} from './orrakaiExterior.js';
import {packAuthoredTiles,createContinentalTiles} from './continentTiles.js';
import {createContinentalRuntime} from './continentStreaming.js';
import {enemyXPForLevel} from './enemyProgression.js';
import {routeDistance} from './echorynGeography.js';
import {CONTINENT_VERSION,CONTINENT_WIDTH,CONTINENT_HEIGHT,CONTINENT_REGIONS,CONTINENT_ROADS,CONTINENT_RIVERS,CONTINENT_LAKES,CONTINENT_ESCARPMENTS,CONTINENT_SPAWNS,migrateContinentalPosition,continentEcologyAt} from './continentDefinition.js';
let blueprint=null;
const copy=value=>JSON.parse(JSON.stringify(value));
const critical=o=>o.npcId||o.questId||o.poiId||o.majorPoiId||o.kind?.endsWith('Entrance')||['capitalGate','navStone','campfire','shrine','worldSecret','worldCache','worldRelic','poiInvestigation'].includes(o.kind);
function buildBlueprint(){
 const echoryn=normalizeWorld(createOverworldMap());
 const objects=echoryn.objects.map(o=>({...o,sourceRegionId:'hearthmereFrontier',sourceWorldMode:'overworld'})),enemies=echoryn.enemies.map(e=>({...e,sourceRegionId:'hearthmereFrontier'})),locations=echoryn.authoredLocations.map(o=>({...o,sourceRegionId:'hearthmereFrontier'}));
 for(const regionId of ['aureateMarches','ascensionWastes','pilgrimRoad','severedCauseway']){
  const route=['pilgrimRoad','severedCauseway'].includes(regionId),old=route?createLegacyTravelRouteWorld(regionId):createLegacyRegionWorld(regionId),sourceRegionId=route?regionId+'Route':regionId;
  const move=o=>({...o,...migrateContinentalPosition(regionId,o.x,o.y),sourceRegionId,sourceWorldMode:route?'travelRoute':'overworld',...(route?{sourceRouteId:regionId}:{}),forceLabel:false});
  objects.push(...old.objects.map(move));enemies.push(...old.enemies.map(move));locations.push(...(old.authoredLocations||[]).map(move));
 }
 const scene=createContinentalScenes(),orrakai=createOrrakaiExterior();
 for(const o of orrakai.objects){if(o.w&&!o.artWidth)o.artWidth=o.w;if(o.h&&!o.artHeight)o.artHeight=o.h;if(o.theme)o.style=o.theme;}
 objects.push(...scene.objects,...orrakai.objects);locations.push(...scene.locations);
 // Old compact maps reused dressing IDs. Keep unique quest identities intact,
 // and retain the old regional identity as an alias for saved harvests.
 const used=new Set();
 for(const o of [...objects,...enemies]){
  const original=o.id;if(used.has(original)){o.sourceEntityId=original;o.id=`${o.sourceRegionId}:${original}`;let n=2;while(used.has(o.id))o.id=`${o.sourceRegionId}:${original}:${n++}`;}
  used.add(o.id);
 }
 const locationIds=new Set();for(const l of locations){if(locationIds.has(l.id)){l.sourceEntityId=l.id;l.id=`${l.sourceRegionId}:${l.id}`;}locationIds.add(l.id);}
 for(const e of enemies)if(['aureateMarches','ascensionWastes','pilgrimRoadRoute','severedCausewayRoute'].includes(e.sourceRegionId)){
  // Retain the established combat stats while fixing the old compact maps'
  // default level-one labels and rewards to their authored geographic range.
  const ranges={aureateMarches:[18,42,956],ascensionWastes:[42,65,1656],pilgrimRoadRoute:[12,22,615],severedCausewayRoute:[30,46,1300]},range=ranges[e.sourceRegionId];
  e.combatLevel=e.level=range[0]+Math.round(Math.min(1,Math.max(0,(e.x/TILE-range[2])/304))*(range[1]-range[0]));
  e.baseCombatXp=e.xp=Math.max(e.xp||0,enemyXPForLevel(e.combatLevel,e.elite?1.4:1));
 }
 const south=objects.find(o=>o.id==='capital-gate-prototype');if(south)Object.assign(south,{gateId:'south',propType:'continentGate',artWidth:170,artHeight:165,style:'orrakai',hideLabel:true});
 // A retained quest POI had no discovery marker in the old implementation.
 if(!objects.some(o=>o.poiId==='lanternMarsh'))objects.push({id:'lanternMarsh-discovery',kind:'poiMarker',poiId:'lanternMarsh',name:'Lantern Marsh',x:245*TILE,y:325*TILE,sourceRegionId:'hearthmereFrontier',decorative:true,interactable:false,hideLabel:true});
 // Required witnesses remain available after a player resolves the Chapel early.
 for(const o of objects)if(['chapelHermit','sisterElyra'].includes(o.id)||['chapelHermit','sisterElyra'].includes(o.npcId)){delete o.requiresPoiUnresolved;if(o.poiStateCondition)delete o.poiStateCondition.requiresPoiUnresolved;}
 const navStones=objects.filter(o=>o.kind==='navStone');
 const clearings=[...scene.clearings,...orrakai.clearings,...objects.filter(critical).map(o=>({x:o.x/TILE,y:o.y/TILE,r:o.kind?.endsWith('Entrance')?3:2}))];
 const structures=[...scene.structures,...orrakai.structures];
 const packed=packAuthoredTiles(echoryn.tiles);
 const newRoads=CONTINENT_ROADS.filter(r=>['continental-pilgrim-road','black-pine-ridge','blackfen-crossing'].includes(r.id));
 const trees=echoryn.echorynTrees.filter(t=>!newRoads.some(r=>routeDistance(t.x/TILE,t.y/TILE,r)<r.width/2+2));
 const treeBuckets=new Map();for(const t of trees)for(let by=Math.floor((t.y-20)/512);by<=Math.floor((t.y+20)/512);by++)for(let bx=Math.floor((t.x-20)/512);bx<=Math.floor((t.x+20)/512);bx++){const key=`${bx},${by}`,bucket=treeBuckets.get(key)||[];bucket.push(t);treeBuckets.set(key,bucket);}
 return {objects,enemies,locations,navStones,clearings,structures,packed,encounterAreas:scene.encounterAreas,echoryn:{terrainFeatures:echoryn.terrainFeatures,trees,treeBuckets,revision:echoryn.echorynRevision},landscapes:echoryn.landscapes||[]};
}
export function createContinentalWorld(options={}){
 blueprint ||= buildBlueprint();
 const objects=copy(blueprint.objects),enemies=copy(blueprint.enemies),locations=copy(blueprint.locations),spawnTile=CONTINENT_SPAWNS[options.spawnRegionId]||CONTINENT_SPAWNS.hearthmereFrontier;
 const terrain=createContinentalTiles(blueprint.packed,blueprint);
 // Preserve player-sized landing space around retained interactions. This is a
 // local bay, never a whole erased river, cliff or building.
 for(const o of objects.filter(critical))for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const x=Math.floor(o.x/TILE)+dx,y=Math.floor(o.y/TILE)+dy,t=terrain.get(x,y);if(t?.passable===false)terrain.set(x,y,{...t,biome:t.biome==='water'?'path':'grass',passable:true,bridge:t.biome==='water',interactionLanding:o.id});
 }
 // Some legacy gathering spots were authored in the middle of solid rivers or
 // ore outcrops. Preserve their saved identities and yields, but put unreachable
 // targets within interaction range of a real bank or walking surface.
 const footOpen=(x,y)=>[[0,0],[-12,0],[12,0],[0,-12],[0,12]].every(([dx,dy])=>{
  const px=x+dx,py=y+dy,t=terrain.get(Math.floor(px/TILE),Math.floor(py/TILE));
  return t&&t.passable!==false&&!['water','wall','cliff'].includes(t.biome)&&!(blueprint.echoryn.treeBuckets.get(`${Math.floor(px/512)},${Math.floor(py/512)}`)||[]).some(tree=>Math.hypot(px-tree.x,py-tree.y)<9*tree.size);
 });
 for(const o of objects.filter(o=>['ore','reed','bone','fish','log','tree','deadwood','forage','herb','ashFruit','lanternMoss'].includes(o.kind)&&o.interactable!==false)){
  const reach=50+(o.r||o.radius||0);let accessible=false,bank=null,distance=Infinity;
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=o.x+dx*16,y=o.y+dy*16;if(Math.hypot(x-o.x,y-o.y)<reach&&footOpen(x,y))accessible=true;}
  if(accessible)continue;
  for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){const x=(Math.floor(o.x/TILE)+dx+.5)*TILE,y=(Math.floor(o.y/TILE)+dy+.5)*TILE,d=Math.hypot(x-o.x,y-o.y);if(d<distance&&footOpen(x,y)){bank={x,y};distance=d;}}
  if(bank){const old={x:o.x,y:o.y},d=Math.max(1,distance);o.x=bank.x+(old.x-bank.x)/d*16;o.y=bank.y+(old.y-bank.y)/d*16;}
 }
 const regionId=options.spawnRegionId&&['aureateMarches','ascensionWastes'].includes(options.spawnRegionId)?options.spawnRegionId:'hearthmereFrontier';
 const world={continentId:'runalis',geographyVersion:CONTINENT_VERSION,mode:'overworld',name:'Runalis',regionId,theme:'runalis',width:CONTINENT_WIDTH,height:CONTINENT_HEIGHT,tileSize:TILE,tiles:terrain.tiles,objects:[],enemies:[],drops:[],effects:[],combatEffects:[],safeZone:false,
  spawn:{x:(spawnTile[0]+.5)*TILE,y:(spawnTile[1]+.5)*TILE},continentRegions:CONTINENT_REGIONS,continentStructures:blueprint.structures,continentClearings:blueprint.clearings,encounterAreas:blueprint.encounterAreas,authoredLocations:locations,navStones:objects.filter(o=>o.kind==='navStone'),landscapes:copy(blueprint.landscapes),
  continentLocations:objects.filter(critical),echorynRevision:blueprint.echoryn.revision,echorynTrees:blueprint.echoryn.trees,echorynTreeBuckets:blueprint.echoryn.treeBuckets,
  continentEcologyAt:(x,y)=>continentEcologyAt(x/TILE,y/TILE),
  terrainFeatures:{version:4,continentRevision:CONTINENT_VERSION,worldPixelWidth:CONTINENT_WIDTH*TILE,worldPixelHeight:CONTINENT_HEIGHT*TILE,roads:CONTINENT_ROADS.map(r=>({...r,width:r.width*TILE,points:r.points.map(p=>p.map(v=>v*TILE))})),rivers:CONTINENT_RIVERS.map(r=>({...r,width:r.width*TILE,points:r.points.map(p=>p.map(v=>v*TILE))})),lakes:CONTINENT_LAKES.map(l=>({...l,x:l.x*TILE,y:l.y*TILE,rx:l.rx*TILE,ry:l.ry*TILE})),escarpments:CONTINENT_ESCARPMENTS,biomeBlobs:[],forestMasses:[],cliffs:[],ruinFields:[],detailFields:[]},
  mapMeta:{version:10,title:'Runalis',description:'A continuous authored continent. Narrative Acts do not divide the geography.',regions:CONTINENT_REGIONS},editorSkipPublishedOverride:!!options.skipPublishedOverride};
 for(const e of enemies)configureEncounterEnemy(e,geographicEncounterProfile(e.x/TILE,e.y/TILE),e.id);
 world.echorynPresentation={...world,terrainFeatures:blueprint.echoryn.terrainFeatures};
 world.continentRuntime=createContinentalRuntime(world,{objects,enemies,terrain});
 world.continentRuntime.activate([{x:world.spawn.x,y:world.spawn.y}],options.player);
 return world;
}

import {TILE} from './data.js';
import {ACT1_LANDMARKS} from './overworldUtils.js';

// Offsets are relative to the one authoritative content anchor, including moved descents.
export const ECHORYN_ENTRANCES={
 ashenOrchardCellarEntrance:{anchor:'ashenOrchard',offset:[0,0],type:'cellar'},
 orchardSluiceShortcut:{anchor:'ashenOrchard',offset:[9,9],type:'sluice'},
 thornrootDungeonEntrance:{anchor:'thornrootHollow',offset:[0,0],type:'root'},
 mirrorGroveUnderrootEntrance:{anchor:'mirrorGrove',offset:[0,0],type:'root'},
 pilgrimCryptEntrance:{anchor:'pilgrimBridge',offset:[-12,9],type:'crypt'},
 watcherRidgeVaultEntrance:{anchor:'watcherRidge',offset:[0,2],type:'vault'},
 oldHollowDungeonEntrance:{anchor:'oldHollow',offset:[0,0],type:'tomb'},
 ironMireDungeonEntrance:{anchor:'ironMire',offset:[0,0],type:'mine'},
 'hearthmere-abandoned-mine':{anchor:'abandonedMine',offset:[0,0],type:'mine'}
};
export function composeEchorynRegions(world){
 // Working relief bays and hostile arenas are different spaces. Keep encounter IDs
 // and their state contracts, but place them in the geography they now belong to.
 const placements={
  ashenOrchard:{wanderingHerbalist:[-12,-7],orchardReliefEngineer:[-8,-6],ashenOrchardKeeper:[6,18],orchardRotBoar:[12,23],orchardLastDawnSaboteur:[17,17],
   'hollowling-orchard-hollowling-115-71-0':[-5,17],'hollowling-orchard-hollowling-123-78-1':[3,22],'hollowling-orchard-hollowling-129-73-2':[14,13],'gravebound-gravebound-119-68-5':[24,-13]},
  pilgrimBridge:{sableCartographer:[-15,-7],bridgeLampKeeper:[-13,-4],covenantConvoySurvivor:[-17,-6],
   'pilgrim-bridge-traveling-merchant':[-16,-8],'pilgrim-bridge-sign':[-11,-2],'pilgrim-crossroads-sign':[14,5],
   act1BridgeWreckedWagon:[-14,4],act1BridgeScatteredMedicine:[-13,6],act1BridgeBarricade:[13,3],act1BridgeBurnedRecords:[-13,11],act1BridgeRedSealEvidence:[-13,3],
   'pilgrim-bridge-pillar-1':[1,-2],pilgrimBridgeWarden:[12,-1],lastDawnBridgeSaboteur:[17,8],
   'gravebound-gravebound-170-63-4':[19,-12],'gravebound-pilgrim-gravebound-176-73-0':[16,-6],'gravebound-pilgrim-gravebound-188-82-1':[21,6],
   'shieldKnight-pilgrim-shield-knight-181-78-0':[19,-3],'pilgrimRoadAmbush-road-ambusher-0':[26,1],'pilgrimRoadAmbush-road-ambusher-1':[23,9],'pilgrimRoadAmbush-road-ambusher-2':[28,6]}
 };
 for(const [anchor,actors] of Object.entries(placements))for(const [id,[dx,dy]] of Object.entries(actors)){
  const a=ACT1_LANDMARKS[anchor],o=world.objects.find(o=>o.id===id)||world.enemies.find(e=>e.id===id);
  if(o){o.x=(a[0]+dx+.5)*TILE;o.y=(a[1]+dy+.5)*TILE;}
 }
 const open=(x,y)=>{const t=world.tiles[y]?.[x];return t&&t.passable!==false&&!['water','wall','cliff'].includes(t.biome);};
 const critical=world.objects.filter(o=>o.interactable!==false&&!o.decorative);
 const prop=(anchor,id,type,dx,dy,scale=1,extra={})=>{
  const a=ACT1_LANDMARKS[anchor],x=a[0]+dx,y=a[1]+dy;if(!open(x,y)||critical.some(o=>Math.hypot(o.x-(x+.5)*TILE,o.y-(y+.5)*TILE)<42))return;
  world.objects.push({id:`echoryn-scene-${anchor}-${id}`,kind:'worldDressing',propType:type,x:(x+.5)*TILE,y:(y+.5)*TILE,scale,decorative:true,interactable:false,hideLabel:true,...extra});
 };
 const kit=(anchor,id,index,x,y,w,h)=>prop(anchor,id,'forestKit',x,y,1,{kitIndex:index,artWidth:w,artHeight:h});
 // Root architecture and natural boss clearings have uneven edges and open centers.
 for(const name of ['thornrootHollow','mirrorGrove']){
  for(const [i,[x,y]] of [[-7,-4],[-10,3],[7,-5],[10,5]].entries())kit(name,'buried-stone-'+i,12,x,y,90,80);
  kit(name,'fallen-trunk',11,-7,6,185,92);kit(name,'thorn-bank',13,8,0,135,80);
  prop(name,'old-pillar','column',-5,-1,1.3);prop(name,'swallowed-wall','ruinWall',5,-2,1.15);
 }
 prop('hollowGrove','quiet-oath','avarranOathStone',0,-4,1.1);kit('hollowGrove','fallen-old-trunk',11,-7,3,160,76);
 // Riverbend is a temporary crossing hearth, Saltwell is a working fishing community.
 for(const [i,[type,x,y]] of [['supplyWagon',-5,-3],['bedroll',4,-4],['lantern',-4,3],['bench',5,2]].entries())prop('riverbendCamp','crossing-'+i,type,x,y,1.2);
 for(const [i,[type,x,y]] of [['townBuilding',0,-7],['townBuilding',7,-5],['woodPile',5,4],['barrels',-7,4],['laundryLine',4,0],['crate',-7,1],['lantern',-5,3],['campfire',2,3]].entries())prop('saltwellCamp','fishery-'+i,type,x,y,1.1,type==='townBuilding'?{buildingIndex:i?1:0,buildingHeight:160}:{});
 prop('saltwellCamp','nets','fishingRack',-9,2,1.3);prop('saltwellCamp','smokehouse-rack','fishingRack',3,-3,1.2);
 // Hunter work areas are separated from sleeping shelters and their open hearth.
 for(const [i,[type,x,y]] of [['quarantineTent',-7,-5],['quarantineTent',6,-7],['weaponRack',8,-2],['woodPile',-7,2],['deadLivestock',7,3],['fishingRack',8,6],['campfire',0,5],['lantern',-5,5]].entries())prop('hunterCamp','hunter-'+i,type,x,y,1.15);
 prop('watcherRidge','watch-pillar-w','column',-7,-7,1.8);prop('watcherRidge','watch-pillar-e','column',7,-7,1.8);
 prop('watcherRidge','vault-station','townBuilding',0,-2,1,{buildingIndex:3,buildingHeight:128});
 prop('watcherRidge','overlook-w','ruinWall',-6,-12,1.4);prop('watcherRidge','overlook-e','ruinWall',6,-12,1.4);
 // Low-detail, geographically oriented skyline cues on the overlook's far plane.
 for(const [id,index,x,y,w,h] of [['veyr',2,15,-15,75,112],['chapel',6,-9,-15,55,78],['tower',2,-16,-14,32,67]])prop('watcherRidge','sightline-'+id,'distantLandmark',x,y,1,{artIndex:index,landmarkIndex:id==='veyr'?0:id==='chapel'?2:undefined,artWidth:w,artHeight:h});
 for(const [i,[type,x,y]] of [['quarantineTent',-5,-5],['campfire',0,4],['prayerRibbons',4,-3],['lantern',-7,2],['lantern',7,2],['medicineCrates',-5,4]].entries())prop('lanternMarsh','refuge-'+i,type,x,y,1.2);
 for(const [i,[type,x,y]] of [['timberSupport',-6,-4],['timberSupport',6,-4],['harvestCart',-7,4],['woodPile',8,3],['cable',-7,-2],['cable',7,-2],['warningBell',-10,2],['crate',8,6]].entries())prop('ironMire','mine-yard-'+i,type,x,y,1.5);
 prop('abandonedMine','sorting-cart','harvestCart',5,5,1.1);prop('abandonedMine','ore-stores','crate',7,5,1.1);
 for(const [i,[x,y]] of [[-8,-5],[-6,6],[7,5],[9,-4]].entries()){prop('oldHollow','burial-monument-'+i,'memorialStone',x,y,1.8);kit('oldHollow','ancient-stone-'+i,12,x+2,y,110,100);}
 prop('oldHollow','sealed-arch','blockedAlcove',0,-3,2.2);prop('oldHollow','forgotten-gate','ruinWall',-5,-3,1.5);
 // Architectural eras are exposed on the chapel outskirts; existing chapel complex survives.
 prop('brokenChapel','foundation-oath','avarranOathStone',-17,-6,1.6);prop('brokenChapel','older-pillar','column',-17,-2,1.9);
 prop('brokenChapel','burned-relief','sickWagon',-14,12,1.3);prop('brokenChapel','lost-archives','crate',12,8,1.3);
 for(const [i,[x,y]] of [[-12,12],[-8,14],[8,13],[13,11]].entries())prop('brokenChapel','graveyard-'+i,'graveMarker',x,y,1.4);
 // Veyr's estate wall, cemetery and hamlet create an approach before the fortress.
 for(const [i,[x,y]] of [[-25,15],[-18,17],[-11,18],[12,16]].entries())prop('castleVeyr','estate-wall-'+i,'ruinWall',x,y,2);
 prop('castleVeyr','estate-home','townBuilding',-19,11,1,{buildingIndex:0,buildingHeight:140,ruined:true});
 for(const [i,[x,y]] of [[-12,10],[-9,13],[10,10],[13,12]].entries())prop('castleVeyr','cemetery-'+i,'graveMarker',x,y,1.5);
 // Last Dawn clears its roads and has visibly organized occupation, rather than red soil.
 for(const [i,[x,y]] of [[-26,-12],[-21,-15],[-17,-12],[-12,-15]].entries()){
  prop('demonCultLair','controlled-road-banner-'+i,'banner',x,y,1.5,{color:'#803f35'});
  prop('demonCultLair','controlled-road-stores-'+i,'crate',x+1,y+2,1.1);
 }
 prop('demonCultLair','staging-rack','weaponRack',-19,-7,1.6);prop('demonCultLair','ritual-engine','sealEngine',-9,-9,1.5);
 // Physical descent positions are centralized and protected after all scene composition.
 for(const o of world.objects){const e=ECHORYN_ENTRANCES[o.id];if(!e)continue;const a=ACT1_LANDMARKS[e.anchor];o.x=(a[0]+e.offset[0]+.5)*TILE;o.y=(a[1]+e.offset[1]+.5)*TILE;o.echorynEntrance=e.type;}
 // Keep the Orchard destination west of the crowded relief camp, away from
 // the farmhouse, tents, witnesses and investigation props. Preserve its ID
 // so existing attunements still work when the authored world is rebuilt.
 const orchardStone=world.objects.find(o=>o.id==='nav-hearthmereFrontier-ashenOrchard');
 if(orchardStone)Object.assign(orchardStone,{x:(ACT1_LANDMARKS.ashenOrchard[0]-21+.5)*TILE,y:(ACT1_LANDMARKS.ashenOrchard[1]+3+.5)*TILE,name:'Ashen Orchard Nav Stone',forceLabel:true,labelPriority:12});
 const keepStone=world.objects.find(o=>o.id==='nav-hearthmereFrontier-demonCultLair');
 if(keepStone)Object.assign(keepStone,{x:(ACT1_LANDMARKS.demonCultLair[0]+.5)*TILE,y:(ACT1_LANDMARKS.demonCultLair[1]-15+.5)*TILE,name:'Last Dawn Keep Nav Stone',forceLabel:true,labelPriority:12});
 if(!world.objects.some(o=>o.id==='nav-hearthmereFrontier-castleVeyr'))world.objects.push({id:'nav-hearthmereFrontier-castleVeyr',kind:'navStone',name:'Castle Veyreign Nav Stone',region:world.name,x:(ACT1_LANDMARKS.castleVeyr[0]+.5)*TILE,y:(ACT1_LANDMARKS.castleVeyr[1]+10+.5)*TILE,r:18,forceLabel:true,labelPriority:12});
 const bridgeFire=world.objects.find(o=>o.id==='pilgrimBridgeCampfire');if(bridgeFire){bridgeFire.x=(ACT1_LANDMARKS.pilgrimBridge[0]-10+.5)*TILE;bridgeFire.y=(ACT1_LANDMARKS.pilgrimBridge[1]-5+.5)*TILE;}
 const carve=(x,y)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const t=world.tiles[y+dy]?.[x+dx];if(t)Object.assign(t,{biome:'path',passable:true});}};
 // Bank stair from the west bridge landing to the crypt embedded below its foundation.
 for(let y=100;y<=109;y++)carve(238,y);
 for(let x=238;x<=245;x++)carve(x,100);
 for(const o of world.objects.filter(o=>o.echorynEntrance))carve(Math.floor(o.x/TILE),Math.floor(o.y/TILE));
 world.terrainFeatures.localRoutes=[{id:'crypt-bank-stair',width:3*TILE,points:[[245.5*TILE,100.5*TILE],[238.5*TILE,100.5*TILE],[238.5*TILE,109.5*TILE]]}];
 // Saltwell's pier projects into the actual backwater, with a timber apron
 // on the dry bank. The walkable deck and its renderer share these cells.
 const saltwell=ACT1_LANDMARKS.saltwellCamp;
 for(let x=saltwell[0]-14;x<=saltwell[0]-8;x++)for(let y=saltwell[1]-1;y<=saltwell[1]+1;y++){
  const t=world.tiles[y][x];Object.assign(t,{biome:'path',passable:true,bridge:true,echorynDock:true,elevation:0});
 }
 prop('saltwellCamp','dock-lantern','lantern',-7,2,1.2);prop('saltwellCamp','dock-stores','barrels',-7,-2,1);
 return world;
}

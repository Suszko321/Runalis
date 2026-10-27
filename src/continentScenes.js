// Deliberately composed continental places. Stable identities and authored tile
// coordinates are independent of enemy, loot and weather randomness.
import {TILE} from './data.js';

const SCENE_VERSION=1;
const point=(x,y)=>({x:Math.round((x+.5)*TILE),y:Math.round((y+.5)*TILE)});

// Bounds and gaps describe actual solid footprints in tile coordinates.
// All other object/location coordinates use the normal runtime pixel units.
export function createContinentalScenes(){
 const objects=[],locations=[],navStones=[],encounterAreas=[],structures=[],clearings=[];
 const site=(id,name,x,y,region,lore,r=11)=>{
  const value={id:`continent-${id}`,name,...point(x,y),tileX:x,tileY:y,sourceRegionId:region,regionId:region,lore,description:lore,sceneVersion:SCENE_VERSION,discoveryRadius:Math.max(180,r*TILE)};
  locations.push(value);clearings.push({id:value.id,x,y,r:['saint-orvane','zarynth-trade-ward'].includes(id)?r:Math.min(r,8)});
  objects.push({...value,id:`${value.id}-marker`,locationId:value.id,kind:'poiMarker',authoredSite:true,decorative:true,interactable:false,hideLabel:true});
  return value;
 };
 const art=(site,id,type,x,y,extra={})=>{
  objects.push({id:`${site.id}-${id}`,kind:'worldDressing',propType:`continent${type}`,...point(x,y),sourceRegionId:site.sourceRegionId,decorative:true,interactable:false,hideLabel:true,drawRadius:Math.max(420,Number(extra.artWidth||0)/2+32,Number(extra.artHeight||0)+32),...extra});
 };
 const wall=(site,id,x,y,w,h,extra={})=>{
  const record={id:`${site.id}-${id}`,x,y,w,h,height:extra.height||2,...extra};structures.push(record);
  art(site,id,'Wall',x+w/2-.5,y+h/2-.5,{tileWidth:w,tileHeight:h,style:extra.style||'frontier',vertical:h>w,artWidth:w*TILE,artHeight:Math.max(64,h*TILE),...extra});
 };
 const building=(site,id,x,y,w,h,style='timber',extra={})=>{
  const gap={x:x+Math.floor(w/2)-1,y:y+h-1,w:2,h:2};
  structures.push({id:`${site.id}-${id}`,x,y,w,h,height:2,gaps:[gap]});
  art(site,id,extra.type||'House',x+w/2-.5,y+h-.5,{tileWidth:w,tileHeight:h,artWidth:w*TILE+18,artHeight:(h+3)*TILE,style,fadeBehind:true,...extra});
 };
 const interactive=(site,id,kind,name,x,y,extra={})=>{
  const object={id:`${site.id}-${id}`,kind,name,...point(x,y),r:18,radius:18,sourceRegionId:site.sourceRegionId,labelPriority:7,...extra};objects.push(object);return object;
 };
 const resource=(site,id,kind,itemId,x,y,name)=>interactive(site,id,kind,name,x,y,{itemId,depleted:false,respawnTime:360,resourceAreaId:site.id});
 const hearth=(site,x,y,name=site.name)=>interactive(site,'hearth','campfire',`${name} Hearth`,x,y,{r:16});
 const stone=(site,x,y,name=site.name)=>{
  const object=interactive(site,'nav','navStone',name,x,y,{region:site.name,r:18});navStones.push(object);return object;
 };
 const sign=(site,x,y,text,heading=site.name)=>{
  art(site,'sign','Sign',x,y,{text,heading,lore:text,artWidth:58,artHeight:90});
  Object.assign(objects.at(-1),{kind:'signpost',name:heading,talk:text,decorative:false,interactable:true,r:14});
 };
 const encounter=(site,id,x,y,rx,ry,tier,kinds)=>encounterAreas.push({id:`${site.id}-${id}`,sourceRegionId:site.sourceRegionId,regionId:site.sourceRegionId,x,y,rx,ry,r:Math.max(rx,ry),worldX:(x+.5)*TILE,worldY:(y+.5)*TILE,tier,enemyKinds:kinds,quietRoad:true,roadBuffer:7,maxActive:4});
 const grove=(site,id,x,y,count,type='Pine',extra={})=>{
  // Authored staggered silhouette groups, deliberately leaving a walkable center.
  for(let i=0;i<count;i++)art(site,`${id}-${i}`,type,x+(i%3-1)*4+(i%2)*1.5,y+Math.floor(i/3)*4,{variant:i%4,artWidth:100+(i%3)*14,artHeight:150+(i%4)*16,...extra});
 };

 // Pass views change from an inhabited forest verge to a narrow saddle and a
 // broad view of the white road. No new obstacles cover the existing road.
 let s=site('pine-switchback','Black Pine Switchback',651,154,'pilgrimRoadRoute','The old trade road climbs around a broken retaining wall. Fresh wagon ruts remain between the cairns.',14);
 wall(s,'retaining',639,162,13,2,{style:'frontier',height:1});
 art(s,'broken-cart','Wagon',648,156,{artWidth:100,artHeight:80,damaged:true});
 grove(s,'west-pines',633,133,6,'Pine',{style:'pass'});grove(s,'east-pines',670,154,4,'Pine',{style:'pass'});
 resource(s,'resin','forage','amberResin',646,157,'Windfall Amber Resin');
 sign(s,646,145,'Pilgrim Road east. Orrakai and Echoryn west. Black Pine Pass rises ahead.');
 encounter(s,'ravine-wolves',678,135,13,10,3,['ashWolf','stalkerWolf']);

 s=site('pass-lantern','Pass Lantern Shelter',716,214,'pilgrimRoadRoute','A timber lean-to shelters a repaired bell. Travelers leave dry wood above the stream flood mark.',12);
 building(s,'shelter',704,217,7,4,'pass',{openFront:true});
 art(s,'wood','TimberStack',713,222,{artWidth:82,artHeight:54});hearth(s,712,219);stone(s,710,209);
 resource(s,'ore','ore','ironOre',704,224,'Pass Iron Outcrop');
 art(s,'bell','Bell',720,218,{artWidth:54,artHeight:95});
 sign(s,718,212,'The white road is beyond the saddle. Shelter here when the north wind rises.');

 s=site('saddle-watch','The Open Saddle',797,178,'pilgrimRoadRoute','Pine crowns end abruptly at the crest. Across the valley the Covenant road cuts through amber fields.',15);
 wall(s,'watch-parapet',789,166,16,2,{style:'frontier',height:1});
 art(s,'watch-tower','Tower',791,164,{style:'pass',artWidth:150,artHeight:250,fadeBehind:true});
 art(s,'cairn-a','Cairn',804,172,{artWidth:64,artHeight:56});art(s,'cairn-b','Cairn',812,182,{artWidth:48,artHeight:42});
 sign(s,798,182,'Aureate Marches east. The ridge trail turns north. Leave the marked road only with supplies.');
 encounter(s,'bandit-cut',821,205,13,11,3,['roadlessBandit','archer']);

 s=site('northern-ridge','The North Ridge Refuge',815,105,'ridgePass','An abandoned survey station overlooks both watersheds. Two stone cairns identify the narrow ridge route.',12);
 building(s,'survey-house',806,74,8,5,'pass',{ruined:true});
 wall(s,'low-wall',807,81,10,1,{height:1});grove(s,'shelter-pines',798,76,4,'Pine',{style:'pass'});
 hearth(s,818,101);resource(s,'quartz','crystal','lumenQuartz',816,94,'Ridge Quartz');
 sign(s,822,108,'Ridge trail: western pass behind; Marches ahead. Exposed ground, no patrols.');
 encounter(s,'ridge-pack',862,92,18,12,4,['ashWolf','stalkerWolf']);

 // Saint Orvane is a large exterior adjacent to, rather than a replacement for,
 // the existing arrival services and companion positions near x960..1040,y200.
 s=site('saint-orvane','Saint Orvane Outer Court',995,196,'aureateMarches','Ivory ramparts enclose the pilgrimage court. Wagon scales, water channels and confession walls reveal the work behind the promise of safety.',32);
 wall(s,'north-rampart',957,153,76,2,{style:'aureate',height:3});
 wall(s,'west-rampart',957,155,2,36,{style:'aureate',height:3});
 wall(s,'east-rampart',1031,155,2,36,{style:'aureate',height:3});
 wall(s,'south-west',957,191,33,2,{style:'aureate',height:3});
 wall(s,'south-east',1001,191,32,2,{style:'aureate',height:3});
 art(s,'pilgrimage-paving','Court',995,191,{style:'aureate',artWidth:70*TILE,artHeight:36*TILE,sortY:-1});
 art(s,'arrival-apron','Court',991,204,{style:'aureate',artWidth:32*TILE,artHeight:10*TILE,sortY:-1,variant:1});
 for(const [id,x,y] of [['nw',958,155],['ne',1032,155],['sw',958,192],['se',1032,192]])art(s,`tower-${id}`,'Tower',x,y,{style:'aureate',artWidth:180,artHeight:280,fadeBehind:true});
 art(s,'arrival-arch','Gate',995,192,{style:'aureate',artWidth:288,artHeight:200,openWidth:180});
 building(s,'abbey-wing',973,158,12,8,'aureate',{type:'Abbey'});
 building(s,'records-wing',1004,160,12,7,'aureate');
 art(s,'confession-wall','InscribedWall',1018,179,{style:'aureate',artWidth:160,artHeight:86});
 art(s,'court-water','Fountain',995,176,{style:'aureate',artWidth:115,artHeight:75});
 art(s,'scales','Scales',978,188,{artWidth:92,artHeight:96});
 sign(s,987,196,'Saint Orvane pilgrimage court. Quartermaster and companions on the south approach. Confession is recorded.');

 s=site('gilded-granary','The Gilded Granary',1085,246,'aureateMarches','Raised granaries face the canal. Sealed stores stand above fields still being worked by pilgrim families.',17);
 building(s,'granary-a',1073,232,9,7,'aureate',{type:'Granary'});
 building(s,'granary-b',1090,237,8,6,'aureate',{type:'Granary'});
 art(s,'wheat-a','Farm',1065,245,{style:'wheat',artWidth:320,artHeight:200});
 art(s,'wheat-b','Farm',1104,252,{style:'wheat',artWidth:288,artHeight:160});
 art(s,'stores','TimberStack',1083,245,{style:'grain',artWidth:100,artHeight:60});
 resource(s,'dawnsage','forage','dawnsage',1083,253,'Canal Dawnsage');
 resource(s,'wheat','forage','fieldRations',1090,253,'Pilgrim Grain Stores');
 sign(s,1091,251,'Grain for the confession cities. Imperial road southeast; pilgrimage road north.');
 encounter(s,'granary-patrol',1123,254,15,11,4,['shieldKnight','cultist']);

 s=site('blueglass-aqueduct','Blueglass Aqueduct',1174,215,'aureateMarches','The canal drops beneath a raised stone aqueduct. Blue holy glass catches the light above a maintenance stair.',17);
 for(let i=0;i<5;i++)art(s,`aqueduct-${i}`,'Aqueduct',1159+i*7,209,{style:'aureate',artWidth:224,artHeight:176,variant:i%2});
 // Piers occupy the dry shoulders, preserving the central road and maintenance route.
 for(const [id,x,y] of [['west',1154,204],['east',1186,204]])wall(s,`pier-${id}`,x,y,2,7,{style:'aureate',height:3});
 resource(s,'glass','runestone','veyrglassShard',1170,225,'Blueglass Spill');
 art(s,'maintenance','Stairs',1184,215,{style:'aureate',artWidth:128,artHeight:90});
 sign(s,1167,222,'Aqueduct service path. Keep the crossing clear for the water carts.');

 s=site('clean-hands','Abbey Road Shelter',1224,292,'aureateMarches','White stone arches shelter a roadside ward. The clean outward wall hides soot around the inward-facing braziers.',15);
 building(s,'ward',1214,277,10,6,'aureate',{type:'Abbey'});art(s,'brazier','Brazier',1228,287,{style:'aureate',artWidth:64,artHeight:84});
 hearth(s,1223,298);stone(s,1227,299,'Aureate Road Shelter');
 resource(s,'ore','ore','ironOre',1236,286,'Sanctified Iron Outcrop');
 sign(s,1224,302,'Shattered Choir northeast. Imperial road southeast. Causeway warding station north.');

 // A broken causeway alternates solid supports and absence. Existing route
 // objects/checkpoint remain owned by the migration module.
 s=site('causeway-wards','Causeway Ward Yard',1345,216,'severedCausewayRoute','The road enters a field of abandoned ward stakes. Spare stone lies where the original causeway lost its southern arch.',15);
 art(s,'pier','CausewayPier',1335,211,{artWidth:160,artHeight:224,style:'cosmic'});
 art(s,'ward-line','WardStakes',1353,220,{artWidth:224,artHeight:95});
 art(s,'broken-span','Ruin',1341,202,{style:'cosmic',artWidth:176,artHeight:128,variant:1});
 resource(s,'dust','runestone','arcaneDust',1350,228,'Broken Ward Dust');
 sign(s,1348,218,'Severed Causeway. Road continues through the surviving piers. The Imperial road remains south.');
 encounter(s,'ward-failures',1370,207,12,10,5,['wraith','shieldKnight']);

 s=site('choir-bridge','Choir Bridge Ruins',1451,177,'severedCausewayRoute','Broken choir arches stand over a silent ravine. A worn maintenance lane joins the surviving stones beneath the shattered parapet.',16);
 for(const [i,x,y] of [[0,1433,163],[1,1450,164],[2,1472,183]])art(s,`pier-${i}`,'CausewayPier',x,y,{artWidth:144,artHeight:240,style:'cosmic',variant:i});
 art(s,'fallen-arch','Ruin',1464,187,{style:'cosmic',artWidth:176,artHeight:112,variant:2});
 art(s,'memorial','InscribedWall',1442,183,{style:'cosmic',artWidth:96,artHeight:65});
 resource(s,'fragment','runestone','towerFragment',1468,192,'Choir Masonry Fragment');
 sign(s,1453,175,'Last Lantern crossing east. Turn back while the ward marks still have names.');

 s=site('last-lantern-overlook','Last Lantern Overlook',1578,250,'severedCausewayRoute','A mortal hearth burns beneath a leaning lookout. Beyond it the city foundations have become pale and indistinguishable.',14);
 art(s,'lookout','Tower',1564,234,{style:'cosmic',artWidth:140,artHeight:245,variant:2});
 hearth(s,1573,257);stone(s,1574,256,'Last Lantern Crossing');
 sign(s,1581,256,'Ascension Wastes east. Keep to the broken road and shelter between storms.');

 s=site('nameless-market','The Nameless Market',1775,279,'ascensionWastes','Empty stalls form a civic grid around erased plaques. One roof still shades a table laid for people no one can name.',18);
 for(const [i,x,y] of [[0,1765,263],[1,1780,266],[2,1767,291]])art(s,`stall-${i}`,'Market',x,y,{style:'cosmic',artWidth:144,artHeight:128,variant:i});
 art(s,'plaque','InscribedWall',1788,282,{style:'cosmic',artWidth:96,artHeight:72});
 art(s,'grid-foundation','Ruin',1775,269,{style:'cosmic',artWidth:300,artHeight:112,variant:3});
 resource(s,'memory','bone','graveAsh',1783,287,'Name-Eaten Remains');
 encounter(s,'market-echoes',1810,292,15,11,7,['wraith','cultist']);

 s=site('worldroot-scar','Worldroot Scar',1846,177,'ascensionWastes','Black glass rises through the foundation of a pale temple. The broken slabs point inward toward a wound that swallowed the old inscription.',18);
 for(let i=0;i<6;i++)art(s,`glass-${i}`,'Spire',1830+i*6,176+(i%2)*7,{style:'blackglass',artWidth:72+(i%3)*18,artHeight:130+(i%3)*45,variant:i});
 art(s,'temple','Ruin',1849,158,{style:'cosmic',artWidth:352,artHeight:200,variant:2});
 resource(s,'blackglass','ore','veyrglassShard',1847,189,'Worldroot Black Glass');
 sign(s,1838,190,'Worldroot survey boundary. The shrine road lies south.');
 encounter(s,'scar-knights',1868,190,15,11,7,['shieldKnight','wraith']);

 // Wetland alternative has ferrymen's work, not a road copied through empty water.
 s=site('blackfen-landing','Blackfen Landing',744,550,'blackfenBasin','Raised drying racks and rope-marked posts face the fen channel. The broad road has become a narrow plank landing.',16);
 art(s,'landing','Boardwalk',744,546,{artWidth:288,artHeight:128,style:'fen'});
 building(s,'ferryman-house',731,532,7,5,'fen');
 for(const [i,x,y] of [[0,733,562],[1,751,542],[2,746,559]])art(s,`reed-${i}`,'ReedBed',x,y,{artWidth:155,artHeight:95,variant:i});
 art(s,'drying-rack','FishRack',745,553,{artWidth:100,artHeight:100});hearth(s,739,554);stone(s,738,555,'Blackfen Landing');
 resource(s,'reed','reed','riverReed',744,557,'Blackfen River Reeds');
 resource(s,'moss','forage','lanternMoss',735,559,'Blackfen Lantern Moss');
 sign(s,743,552,'Echoryn west. Fen road east toward the Marches. Water crossings are marked by paired posts.');
 encounter(s,'fen-stalkers',746,559,14,11,4,['stalkerWolf','gravebound']);

 s=site('blackfen-sluice','The Old Fen Sluice',819,484,'blackfenBasin','A stone sluice splits the water into old drainage cuts. Willows grip the surviving banks beside an abandoned toll shelter.',15);
 art(s,'sluice','Sluice',814,480,{artWidth:160,artHeight:144});
 grove(s,'willows',803,470,4,'Willow',{artWidth:145,artHeight:170});
 building(s,'toll-shelter',826,474,6,4,'fen',{ruined:true});
 resource(s,'mint','forage','orrakaiMint',821,493,'Bank Mint');
 art(s,'planks','Boardwalk',818,486,{artWidth:224,artHeight:96,style:'fen'});
 sign(s,820,487,'Old drainage road. Follow the raised banks; flooded cuts have no footing.');

 // The independent eastern route alternates a watershed crossing, provincial
 // settlements, open farm country and guarded capital supply approaches.
 s=site('provincial-milehouse','The Provincial Milehouse',1435,480,'imperialHeartlands','The pilgrimage markers give way to freight milestones. A low inn surrounds a wagon yard beside the first eastern toll stone.',17);
 building(s,'milehouse',1415,449,12,7,'imperial');
 art(s,'yard-wagon','Wagon',1428,486,{artWidth:124,artHeight:100});
 art(s,'yard-well','Fountain',1440,478,{style:'imperial',artWidth:92,artHeight:78});
 hearth(s,1436,489);stone(s,1438,491,'Provincial Milehouse');
 resource(s,'sage','forage','dawnsage',1447,483,'Milehouse Garden Sage');
 sign(s,1440,485,'Zarynth: eastern trade road through the river provinces. Aureate Marches northwest. Ascension road northeast.');
 encounter(s,'freight-ambush',1478,511,15,12,4,['roadlessBandit','archer']);

 s=site('broadwater-bridge','Broadwater Bridge Yard',1646,576,'imperialHeartlands','A long stone crossing joins flood terraces. Carpenters store planks above the flood line; fishing paths follow the bank below.',18);
 art(s,'bridge-arch','Aqueduct',1641,570,{style:'imperial',artWidth:288,artHeight:144});
 art(s,'pier-west','CausewayPier',1627,559,{style:'imperial',artWidth:128,artHeight:170});
 art(s,'pier-east','CausewayPier',1665,580,{style:'imperial',artWidth:128,artHeight:170});
 art(s,'timber','TimberStack',1636,585,{artWidth:140,artHeight:65});
 art(s,'fishing','FishRack',1658,588,{artWidth:100,artHeight:95});
 resource(s,'reed','reed','riverReed',1661,593,'Broadwater Reeds');
 sign(s,1648,580,'Broadwater Crossing. Provincial road east. Flood stair and fishing landing south.');

 s=site('amberfields','Amberfield Grange',1837,627,'imperialHeartlands','Long fields follow the dry terrace contours. Grain stores, an orchard and a maintained well show a province still feeding the distant capital.',23);
 building(s,'grange',1823,610,11,7,'imperial');
 building(s,'grain-house',1842,618,7,5,'imperial',{type:'Granary'});
 for(const [id,x,y,w,h] of [['north',1827,596,300,176],['east',1860,625,340,200],['south',1834,649,288,160]])art(s,`fields-${id}`,'Farm',x,y,{style:'wheat',artWidth:w,artHeight:h,variant:id==='east'?1:0});
 art(s,'well','Fountain',1836,626,{style:'imperial',artWidth:85,artHeight:70});
 resource(s,'grain','forage','fieldRations',1850,633,'Grange Grain');hearth(s,1831,635);
 sign(s,1837,632,'Amberfield Grange. Zarynth freight road turns northeast beyond the orchard.');
 encounter(s,'field-wolves',1901,651,19,14,4,['ashWolf','stalkerWolf']);

 s=site('kingsway-watch','Kingsway Watch',2113,511,'imperialHeartlands','A watchtower covers the saddle between two farming valleys. The old provincial milestone carries newer capital distances.',16);
 art(s,'watch','Tower',2100,494,{style:'imperial',artWidth:176,artHeight:285,fadeBehind:true});
 wall(s,'wall-west',2100,514,15,2,{style:'imperial',height:2});wall(s,'wall-east',2133,514,9,2,{style:'imperial',height:2});
 art(s,'gate','Gate',2124,514,{style:'imperial',artWidth:240,artHeight:176,openWidth:150});
 hearth(s,2110,522);stone(s,2109,523,'Kingsway Watch');
 sign(s,2121,520,'Capital supply district east. Amberfield and Broadwater west. Public road remains open.');
 encounter(s,'watch-road-bandits',2166,539,15,12,5,['roadlessBandit','archer']);

 s=site('eastwind-market','Eastwind Caravan Yard',2366,573,'imperialHeartlands','Freight wagons gather below red roofs. Imported timber, grain and cloth wait outside the gate before the final capital approach.',20);
 building(s,'warehouse',2353,554,12,7,'imperial',{useExistingArt:true,buildingIndex:4});
 for(const [id,x,y,v] of [['cloth',2372,568,0],['food',2352,575,1]])art(s,`market-${id}`,'Market',x,y,{style:'imperial',artWidth:150,artHeight:130,variant:v});
 art(s,'freight','Wagon',2377,583,{artWidth:144,artHeight:112});
 art(s,'stores','TimberStack',2349,583,{artWidth:128,artHeight:72});
 hearth(s,2364,586);resource(s,'supplies','forage','fieldRations',2360,580,'Caravan Yard Supplies');
 sign(s,2370,580,'Zarynth arrival ward northeast. This yard handles travelers and freight before the capital walls.');

 s=site('capital-mile','The Last Capital Mile',2579,486,'zarynthApproach','Maintained walls and a widening freight road replace isolated milestones. The outer ward is visible beyond the last sheltering windbreak.',17);
 grove(s,'windbreak',2566,473,5,'Pine',{style:'imperial'});
 art(s,'milestone','InscribedWall',2576,491,{style:'imperial',artWidth:90,artHeight:80});
 art(s,'capital-beacon','Tower',2595,469,{style:'imperial',artWidth:180,artHeight:260,fadeBehind:true});
 resource(s,'mint','forage','orrakaiMint',2586,495,'Roadside Mint');
 sign(s,2581,493,'Zarynth Eastern Trade Ward. Public camp, market and traveler shrine beyond the outer gate.');

 // This is a real playable arrival ward, explicitly not a claim to have built
 // the whole capital. Existing service kinds work without a new hub transition.
 s=site('zarynth-trade-ward','Zarynth Trade Ward',2732,436,'zarynthApproach','The capital begins here with customs yards, red roof stores and a traveler shrine. Merchants receive arriving caravans in this ward while the northern city gates remain closed.',38);
 art(s,'trade-court-paving','Court',2733,447,{style:'imperial',artWidth:66*TILE,artHeight:56*TILE,sortY:-1});
 wall(s,'north-wall',2698,389,70,2,{style:'imperial',height:3});
 wall(s,'west-wall',2698,391,2,43,{style:'imperial',height:3});
 wall(s,'west-foot',2698,447,2,2,{style:'imperial',height:3});
 wall(s,'east-wall',2766,391,2,58,{style:'imperial',height:3});
 wall(s,'south-west',2698,447,20,2,{style:'imperial',height:3});
 wall(s,'south-east',2744,447,24,2,{style:'imperial',height:3});
 for(const [id,x,y] of [['nw',2699,391],['ne',2767,391],['sw',2699,449],['se',2767,449]])art(s,`tower-${id}`,'Tower',x,y,{style:'imperial',artWidth:180,artHeight:288,fadeBehind:true});
 art(s,'south-gate','Gate',2731,448,{style:'imperial',artWidth:288,artHeight:208,openWidth:170});
 art(s,'west-toll-post','Tower',2699,433,{style:'imperial',artWidth:100,artHeight:165,fadeBehind:true});
 building(s,'customs-house',2706,397,15,8,'imperial');
 building(s,'grain-store',2748,399,12,8,'imperial',{type:'Granary'});
 building(s,'traveler-shrine',2730,396,11,8,'aureate',{type:'Abbey'});
 building(s,'wayfarer-rooms',2707,427,10,7,'imperial');
 art(s,'court-well','Fountain',2733,421,{style:'imperial',artWidth:120,artHeight:92});
 art(s,'cloth-market','Market',2722,434,{style:'imperial',artWidth:160,artHeight:132,variant:0});
 art(s,'food-market','Market',2748,433,{style:'imperial',artWidth:160,artHeight:132,variant:1});
 art(s,'freight-yard','Wagon',2754,420,{artWidth:144,artHeight:105});
 interactive(s,'market','marketStall','Zarynth Traveler Market',2745,436,{forceLabel:true});
 interactive(s,'shrine','shrine','Wayfarers Shrine',2735,407,{forceLabel:true});
 hearth(s,2727,437,'Zarynth Traveler');stone(s,2727,439,'Zarynth Trade Ward');
 interactive(s,'steward','npc','Trade Ward Steward',2721,414,{npcId:'zarynthTradeWardSteward',disposition:'friendly',factionId:'zarynth',shirt:'#7f4136',pants:'#453d36',dirX:0,dirY:1,talk:'Welcome to Zarynth’s Trade Ward. The market, traveler hearth and shrine are open. The northern city gates remain sealed; arrivals lodge in these courts.',ambientWander:false,forceLabel:true});
 for(const [id,name,x,y,talk] of [['porter','Caravan Porter',2736,433,'The Longwater wagons bring grain. Those from Black Pine carry timber. Leave the shrine lane clear.'],['innkeeper','Wayfarer Innkeeper',2725,433,'Warm yourself at the hearth. The market sells traveling supplies, and the shrine can restore you before the return journey.'],['gate-watch','Trade Ward Watch',2701,438,'The west toll passage and the southern freight arch both lead to the highway. Orrakai lies far beyond the western pass.']])interactive(s,id,'npc',name,x,y,{npcId:`zarynth-${id}`,disposition:'friendly',factionId:'zarynth',shirt:id==='gate-watch'?'#b3a479':'#926d54',pants:'#453d36',talk,ambientWander:false});
 sign(s,2735,443,'Zarynth Trade Ward: travelers welcome. Market east, hearth west, shrine north. Greater capital districts lie beyond the closed northern wall.','Zarynth Arrival Ward');

 return {version:SCENE_VERSION,objects,locations,navStones,encounterAreas,structures,clearings};
}

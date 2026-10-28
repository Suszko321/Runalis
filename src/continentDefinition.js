// Hand-authored continental geography. Coordinates are hidden 32px gameplay cells.
// Acts belong to the story; region difficulty and physical routes exist independently.
import {TILE} from './data.js';
import {ORRAKAI_SOUTH_ROAD} from './orrakaiExterior.js';
import {ECHORYN_ROADS,ECHORYN_RIVERS,ECHORYN_LAKES,routeDistance,echorynRegionAt,echorynGroundColor} from './echorynGeography.js';
export const CONTINENT_VERSION=1;
export const CONTINENT_WIDTH=2880,CONTINENT_HEIGHT=960;
export const CONTINENT_REGIONS=[
 {id:'hearthmereFrontier',name:'Echoryn Forest',x:290,y:235,rx:365,ry:285,ecology:'woodland',levels:[1,26],color:'#394b31',climate:'temperate',faction:'Covenant relief',description:'Relief roads, old-growth woods and the Lantern watershed surround Orrakai.'},
 {id:'blackPinePass',name:'Black Pine Pass',x:747,y:170,rx:175,ry:145,ecology:'highland',levels:[12,22],color:'#445047',climate:'wind and rain',faction:'contested',description:'Two roads cross the escarpment: a guarded pilgrim switchback and an exposed ridge trail.'},
 {id:'blackfenBasin',name:'Blackfen Basin',x:770,y:550,rx:230,ry:190,ecology:'marsh',levels:[12,24],color:'#344942',climate:'wet fog',faction:'independent',description:'A drowned trade road skirts broad reed beds. Raised causeways and old ferrymen’s rests survive.'},
 {id:'aureateMarches',name:'The Aureate Marches',x:1150,y:305,rx:325,ry:245,ecology:'aureate',levels:[18,42],color:'#757349',climate:'bright with rain',faction:'Covenant',description:'Wheat terraces and white-stone roads lead to Saint Orvane, its confession yards and the Shattered Choir.'},
 {id:'severedCauseway',name:'The Severed Causeway',x:1460,y:210,rx:155,ry:115,ecology:'ascension',levels:[30,46],color:'#64606b',climate:'ash and lightstorm',faction:'fractured Covenant',description:'Broken holy infrastructure spans a ravine. A lower maintenance trail reconnects the shattered road.'},
 {id:'ascensionWastes',name:'The Ascension Wastes',x:1830,y:235,rx:315,ry:220,ecology:'ascension',levels:[42,65],color:'#48414f',climate:'ash',faction:'the network',description:'Interrupted aqueducts, dead courtyards and a distant spire mark the territory beyond Last Lantern.'},
 {id:'imperialHeartlands',name:'Zarynth Heartlands',x:2070,y:610,rx:750,ry:205,ecology:'aureate',levels:[30,55],color:'#69704d',climate:'open wind',faction:'imperial',description:'A long stone highway follows the southern watershed through granaries, river crossings and provincial watchposts.'},
 {id:'zarynth',name:'Zarynth Arrival Ward',x:2715,y:430,rx:160,ry:175,ecology:'aureate',levels:[35,60],color:'#73705b',climate:'coastal rain',faction:'imperial',description:'The west trade ward is a playable destination with a market, refuge and ancient Nav Stone. The greater capital lies beyond.'}
];
export const CONTINENT_ROADS=[
 ORRAKAI_SOUTH_ROAD,
 ...ECHORYN_ROADS.map(r=>({...r,roadClass:r.width>=4?'rural':'trail',sourceRegionId:'hearthmereFrontier'})),
 {id:'continental-pilgrim-road',name:'Pilgrim Road',roadClass:'provincial',width:5,points:[[565,115],[603,131],[641,154],[673,175],[715,209],[757,204],[793,179],[825,195],[848,225],[880,260],[920,240],[956,208],[992,196],[1016,215],[1056,235],[1100,260],[1140,249],[1190,275],[1244,276],[1280,304]]},
 {id:'black-pine-ridge',name:'Old Ridge Road',roadClass:'ancient',width:2.5,points:[[603,131],[638,99],[680,86],[721,98],[762,77],[805,89],[848,104],[899,95],[940,112],[931,140],[932,177],[956,208],[992,196]]},
 {id:'blackfen-crossing',name:'Drowned Trade Road',roadClass:'trail',width:2.5,points:[[560,390],[612,398],[656,431],[689,475],[727,507],[773,527],[813,514],[852,477],[892,446],[936,423],[976,378],[1000,342],[1056,235]]},
 {id:'fen-river-loop',name:'Boatmen’s Causeway',roadClass:'ancient',width:2,points:[[689,475],[673,533],[713,584],[767,601],[814,574],[813,514]]},
 {id:'severed-causeway',name:'Severed Causeway',roadClass:'ancient',width:4,points:[[1244,276],[1280,242],[1330,212],[1387,170],[1425,181],[1470,222],[1510,206],[1555,223],[1600,260],[1656,251],[1690,220],[1740,196],[1790,210],[1835,233],[1890,205],[1964,192]]},
 {id:'causeway-maintenance',name:'Lower Choir Walk',roadClass:'trail',width:2,points:[[1330,212],[1352,260],[1410,282],[1464,275],[1510,253],[1555,223]]},
 {id:'imperial-highway',name:'Zarynth Highway',roadClass:'imperial',width:6,points:[[1280,304],[1318,362],[1370,415],[1440,489],[1490,516],[1550,552],[1640,570],[1700,604],[1760,620],[1830,605],[1880,630],[1950,619],[2000,584],[2068,544],[2124,514],[2137,525],[2190,530],[2250,565],[2310,583],[2370,570],[2430,543],[2490,541],[2535,519],[2580,490],[2640,474],[2680,446],[2730,430]]},
 {id:'heartland-river-road',name:'South Bank Road',roadClass:'rural',width:3,points:[[1550,552],[1590,651],[1660,713],[1740,722],[1800,692],[1880,630]]},
 {id:'west-lantern-road',name:'Last Lantern Track',roadClass:'trail',width:2.5,points:[[1600,260],[1610,324],[1660,376],[1720,430],[1760,482],[1760,620]]},
 {id:'zarynth-outskirts',name:'Zarynth West Approach',roadClass:'imperial',width:7,points:[[2580,490],[2630,518],[2680,512],[2715,485],[2730,450],[2730,430],[2760,408]]}
 ,{id:'aureate-quarry-trail',name:'East Quarry Trail',roadClass:'trail',width:2,points:[[1190,275],[1220,252],[1240,221],[1214,162]]}
 ,{id:'choir-shrine-walk',name:'Choir Shrine Walk',roadClass:'ancient',width:2.5,points:[[1438,191],[1437.5,201]]}
];
export const CONTINENT_RIVERS=[
 ...ECHORYN_RIVERS,
 {id:'black-pine-water',name:'Pinewater',width:8,points:[[718,30],[730,78],[740,116],[732,159],[749,195],[758,234],[747,280],[729,331],[714,390],[720,455],[745,503],[758,541],[783,578],[802,625],[787,690],[806,737],[838,805]]},
 {id:'aureate-river',name:'Aureate Water',width:10,points:[[1105,65],[1085,104],[1098,154],[1116,202],[1098,248],[1107,297],[1120,351],[1156,405],[1190,450],[1238,484],[1285,542],[1321,605],[1301,679],[1338,753],[1391,810]]},
 {id:'choir-ravine',name:'Choir Ravine',width:12,points:[[1390,52],[1400,94],[1408,146],[1434,189],[1446,233],[1452,270],[1480,308],[1510,341],[1520,397],[1542,450]]},
 {id:'imperial-watershed',name:'The Longwater',width:13,points:[[2052,160],[2070,210],[2040,267],[2048,310],[2066,355],[2040,419],[2058,473],[2075,526],[2050,583],[2032,644],[2068,706],[2120,748],[2194,800]]},
 {id:'zarynth-estuary',name:'Zarynth Estuary',width:17,points:[[2510,173],[2484,244],[2502,297],[2521,365],[2510,425],[2535,465],[2570,491],[2608,540],[2610,600],[2640,662],[2690,722],[2750,788]]}
];
export const CONTINENT_LAKES=[...ECHORYN_LAKES,
 {id:'fen-mere',x:793,y:568,rx:49,ry:33},
 {id:'pilgrim-mirror',x:1001,y:319,rx:31,ry:24},
 {id:'name-eaten-lake',x:1830,y:335,rx:40,ry:32},
 {id:'longwater-lake',x:2080,y:680,rx:55,ry:36}
];
export const CONTINENT_ESCARPMENTS=[
 {id:'pine-lower',x:652,y:151,w:190,h:4,level:1,gaps:[[13,27],[93,114]]},
 {id:'pine-upper',x:665,y:99,w:222,h:4,level:2,gaps:[[28,48],[93,108],[172,189]]},
 {id:'fen-bank',x:630,y:493,w:230,h:3,level:-1,gaps:[[62,83],[138,155],[180,198]]},
 {id:'aureate-terraces',x:965,y:258,w:238,h:3,level:1,gaps:[[76,95],[125,145],[172,195]]},
 {id:'choir-fault',x:1370,y:235,w:226,h:4,level:2,gaps:[[0,12],[68,100],[140,162],[178,198]]},
 {id:'wastes-upper',x:1680,y:176,w:335,h:4,level:2,gaps:[[34,62],[120,142],[248,275]]},
 {id:'longwater-bluff',x:1930,y:555,w:235,h:4,level:1,gaps:[[60,90],[126,150],[198,222]]},
 {id:'capital-west-rise',x:2650,y:478,w:175,h:3,level:1,gaps:[[12,27],[64,88]]}
];
export function continentRegionAt(x,y){
 if(x<640&&y<480)return CONTINENT_REGIONS[0];
 let result=CONTINENT_REGIONS[1],best=Infinity;
 for(const r of CONTINENT_REGIONS.slice(1)){const d=((x-r.x)/r.rx)**2+((y-r.y)/r.ry)**2;if(d<best){best=d;result=r;}}
 return result;
}
export function continentEcologyAt(x,y){
 if(x<640&&y<480){const r=echorynRegionAt(x,y).id;return r==='highDanger'?'redseal':r==='hunterReach'?'highland':['gravefields','oldHollow','chapelRuins'].includes(r)?'burial':r==='ironMire'?'marsh':r==='riverlands'?'river':Math.hypot(x-110,y-90)<26?'orchard':'woodland';}
 return continentRegionAt(x,y).ecology;
}
export function continentGroundColor(x,y){
 if(x<640&&y<480)return echorynGroundColor(x,y);
 const list=CONTINENT_REGIONS.slice(1).map(r=>({r,d:((x-r.x)/r.rx)**2+((y-r.y)/r.ry)**2})).sort((a,b)=>a.d-b.d).slice(0,3),rgb=[0,0,0];let sum=0;
 for(const {r,d} of list){const weight=Math.exp((list[0].d-d)*7);sum+=weight;for(let i=0;i<3;i++)rgb[i]+=parseInt(r.color.slice(1+i*2,3+i*2),16)*weight;}
 return '#'+rgb.map(v=>Math.round(v/sum).toString(16).padStart(2,'0')).join('');
}
export function continentRoadAt(x,y,buffer=0){return CONTINENT_ROADS.find(r=>routeDistance(x,y,r)<r.width/2+.45+buffer);}
export function migrateContinentalPosition(regionId,x,y){
 const tx=Number(x||0)/TILE,ty=Number(y||0)/TILE;
 if(regionId==='aureateMarches')return {x:(900+tx*4)*TILE,y:(200+(ty-28)*4)*TILE};
 if(regionId==='ascensionWastes')return {x:(1600+tx*4)*TILE,y:(220+(ty-28)*4)*TILE};
 if(regionId==='pilgrimRoadRoute'||regionId==='pilgrimRoad')return {x:(615+tx*2.5)*TILE,y:(165+(ty-28)*2)*TILE};
 if(regionId==='severedCausewayRoute'||regionId==='severedCauseway')return {x:(1300+tx*2.5)*TILE,y:(205+(ty-28)*2)*TILE};
 return {x:Number(x||0),y:Number(y||0)};
}
export const CONTINENT_SPAWNS={hearthmereFrontier:[10,5],aureateMarches:[940,200],ascensionWastes:[1656,220],pilgrimRoad:[645,165],severedCauseway:[1330,205],blackfenBasin:[727,507],blackPinePass:[715,209],imperialHeartlands:[1640,570],zarynth:[2730,430]};

// Act I's geographic contract. Macro placement is authored; noise only textures it.
// Tile coordinates here also feed collision, the survey map and visual terrain.
export const ECHORYN_REVISION = 1;
export const ECHORYN_ROADS = [
 {id:'hollow-road',name:'Blighted Road',width:4,points:[[17,36],[26,42],[35,44],[42,51],[52,52],[60,60],[68,63],[76,72],[88,73],[98,81],[110,90]]},
 {id:'pilgrim-road',name:'Pilgrim Road',width:4,points:[[110,90],[135,95],[160,89],[185,91],[210,104],[238,100],[250,100],[265,100],[287,94],[320,91],[345,83],[380,88],[409,82],[429,83],[445,80],[445,72]]},
 {id:'grave-road',name:'Gravefields Road',width:3,points:[[88,73],[119,58],[148,49],[181,54],[213,61],[235,55],[231,76],[238,90],[238,100],[250,100]]},
 {id:'tower-road',name:'Tower Vigil',width:3,points:[[26,42],[32,33],[44,27]]},
 {id:'expedition-road',name:'Frontier Road',width:4,points:[[32,33],[37,21],[48,18],[53,8],[70,3]]},
 {id:'thornwood-trail',name:'South Fen Road',width:3,points:[[60,60],[68,88],[75,112],[70,137],[82,165],[77,186],[72,204],[87,231],[98,248],[112,270],[106,304],[115,327],[105,355]]},
 {id:'hollow-grove-trail',name:'Blighted Grove Trail',width:2,points:[[68,63],[73,58],[76,51]]},
 {id:'hunter-road',name:'Hunter Reach Road',width:3,points:[[265,100],[292,124],[326,133],[355,147],[380,151],[395,160],[422,168],[448,175],[477,190],[496,202],[510,190]]},
 {id:'veyr-estate-road',name:'Veyr Estate Road',width:4,points:[[445,80],[467,92],[490,96],[512,106],[533,118],[550,122],[565,115],[565,105]]},
 {id:'mire-road',name:'Iron Mire Road',width:3,points:[[105,355],[134,357],[158,341],[184,337],[211,329],[233,315],[245,325],[267,331],[285,345],[309,357],[338,352],[364,345],[385,340]]},
 {id:'old-hollow-road',name:'Old Blighted Road',width:3,points:[[395,160],[406,193],[402,222],[413,252],[400,281],[396,310],[385,340]]},
 {id:'last-dawn-road',name:'Last Dawn Road',width:4,points:[[385,340],[414,354],[445,350],[472,359],[495,360],[520,373],[540,375],[560,382],[560,390]]},
 {id:'ridge-shortcut',name:'Watchers’ Steps',width:2,points:[[510,190],[525,209],[532,244],[515,275],[507,314],[495,360]]},
 {id:'creek-shortcut',name:'Orchard Irrigation Walk',width:2,points:[[98,81],[97,102],[105,109],[119,99],[132,124]]}
];
export const ECHORYN_RIVERS = [
 {id:'lantern-river',name:'Lantern River',width:9,points:[[250,0],[247,36],[255,65],[250,100],[232,128],[209,153],[170,171],[130,190],[94,214],[77,242],[75,277],[81,316],[88,350],[81,389],[96,438],[108,480]]},
 {id:'thorn-creek',name:'Thorn Creek',width:3,points:[[18,80],[32,98],[40,124],[46,151],[61,178],[73,194],[94,214]]},
 {id:'orchard-millrace',name:'Orchard Millrace',width:2,points:[[125,76],[122,85],[119,99],[110,115],[104,145],[94,178],[94,214]]},
 {id:'iron-waterway',name:'Ironwater',width:7,points:[[181,273],[202,294],[219,322],[245,345],[276,364],[306,394],[336,433],[355,480]]}
];
export const ECHORYN_LAKES = [
 {id:'mirror-water',x:122,y:275,rx:10,ry:14},
 {id:'saltwell-backwater',x:86,y:366,rx:10,ry:17},
 {id:'mire-sink',x:272,y:355,rx:15,ry:10},
 {id:'lantern-backwater',x:239,y:337,rx:9,ry:6}
];
// Lobes follow watersheds and approaches. Overlapping ellipses avoid rectangular zones.
export const ECHORYN_REGIONS = [
 {id:'outpost',name:'Orrakai Frontier',x:21,y:31,rx:28,ry:26,color:'#53613d',density:.15},
 {id:'hollowRoad',name:'Blighted Road',x:71,y:62,rx:66,ry:42,color:'#405334',density:.52},
 {id:'thornwood',name:'Thornwood',x:71,y:151,rx:67,ry:96,color:'#243d33',density:.86},
 {id:'thornwood',name:'Mirror Grove',x:116,y:267,rx:49,ry:61,color:'#344b3d',density:.68},
 {id:'gravefields',name:'Gravefields',x:204,y:57,rx:101,ry:58,color:'#5c5b47',density:.18},
 {id:'chapelRuins',name:'Chapel Ruins',x:422,y:68,rx:105,ry:65,color:'#565b4e',density:.28},
 {id:'hunterReach',name:'Hunter Reach',x:401,y:174,rx:117,ry:91,color:'#344736',density:.6},
 {id:'riverlands',name:'Riverlands',x:101,y:350,rx:75,ry:119,color:'#506840',density:.3},
 {id:'ironMire',name:'Iron Mire',x:249,y:360,rx:101,ry:91,color:'#35493e',density:.22},
 {id:'oldHollow',name:'Old Blighted',x:389,y:341,rx:93,ry:113,color:'#2c3935',density:.75},
 {id:'highDanger',name:'Last Dawn Territory',x:554,y:377,rx:103,ry:113,color:'#45463a',density:.27}
];
export const ECHORYN_ESCARPMENTS = [
 {id:'hollow-cut',x:46,y:57,w:20,h:2,level:1,gaps:[[7,12]]},
 {id:'orchard-terrace',x:93,y:96,w:36,h:2,level:1,gaps:[[12,18],[25,29]]},
 {id:'thorn-ledge',x:63,y:145,w:32,h:3,level:1,gaps:[[5,10],[19,24]]},
 {id:'watcher-lower',x:482,y:200,w:51,h:3,level:1,gaps:[[10,17],[38,44]]},
 {id:'watcher-upper',x:487,y:184,w:48,h:3,level:2,gaps:[[20,27]]},
 {id:'veyr-rise',x:528,y:114,w:67,h:3,level:2,gaps:[[30,41]]},
 {id:'mire-descent',x:255,y:336,w:50,h:2,level:-1,gaps:[[22,30]]},
 {id:'hollow-burial',x:362,y:326,w:49,h:2,level:1,gaps:[[18,27]]}
];
// Forest walls are deliberately placed landforms. Clear roads and occasional
// explicit game trails cut through them; ordinary woodland remains traversable.
export const ECHORYN_FOREST_WALLS = [
 {id:'hollow-bell-thicket',x:47,y:74,rx:12,ry:15,kind:'oak',cuts:[]},
 {id:'thorn-west-bank',x:52,y:141,rx:14,ry:25,kind:'oak',cuts:[]},
 {id:'thorn-root-wall',x:109,y:161,rx:16,ry:25,kind:'oak',cuts:[[[99,152],[107,158],[117,163]]]},
 {id:'mirror-old-growth',x:154,y:248,rx:23,ry:22,kind:'oak',cuts:[]},
 {id:'hunter-pine-wall',x:443,y:142,rx:24,ry:18,kind:'pine',cuts:[[[426,143],[439,141],[458,148]]]},
 {id:'hollow-remembered-wood',x:360,y:285,rx:27,ry:18,kind:'dead',cuts:[]},
 {id:'hollow-crossroad-bank',x:357,y:359,rx:18,ry:20,kind:'dead',cuts:[]},
 {id:'red-seal-eastern-wood',x:588,y:350,rx:20,ry:36,kind:'dead',cuts:[]},
 {id:'eastern-frontier-wall',x:606,y:184,rx:24,ry:72,kind:'pine',cuts:[]}
];
export function echorynRegionAt(x,y){
 let best=ECHORYN_REGIONS[1],score=Infinity;
 for(const r of ECHORYN_REGIONS){const d=((x-r.x)/r.rx)**2+((y-r.y)/r.ry)**2;if(d<score){score=d;best=r;}}
 return best;
}
export function echorynGroundColor(x,y){
 const samples=ECHORYN_REGIONS.map(r=>({r,d:((x-r.x)/r.rx)**2+((y-r.y)/r.ry)**2})).sort((a,b)=>a.d-b.d).slice(0,3),sum=[0,0,0];let total=0;
 for(const {r,d} of samples){const weight=Math.exp((samples[0].d-d)*5);total+=weight;for(let i=0;i<3;i++)sum[i]+=parseInt(r.color.slice(1+i*2,3+i*2),16)*weight;}
 return '#'+sum.map(v=>Math.round(v/total).toString(16).padStart(2,'0')).join('');
}
export function segmentDistance(x,y,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
export function routeDistance(x,y,route){let d=Infinity;for(let i=1;i<route.points.length;i++)d=Math.min(d,segmentDistance(x,y,route.points[i-1],route.points[i]));return d;}
export function alongRoute(route,step,fn){
 let carry=0;
 for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);for(let s=carry;s<=len;s+=step)fn(a[0]+dx*s/len,a[1]+dy*s/len,-dy/len,dx/len,i);carry=(carry-len)%step;if(carry<0)carry+=step;}
}

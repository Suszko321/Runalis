const MARCHES='aureateMarches';
const HEARTLANDS='imperialHeartlands';
const APPROACH='zarynthApproach';

const wolf=['stalkerWolf','Road Hound'];
const raider=['roadlessBandit','Freight Raider'];
const bow=['archer','Roadside Bow'];
const knight=['shieldKnight','Forsworn Sentinel'];
const cult=['cultist','Failed Purifier'];
const dead=['gravebound','Siltbound Dead'];
const shade=['wraith','Burial Echo'];
const brute=['brute','Road Breaker'];

export function dressAct2Overworld({site,art,sign,pack,interactive}){
 const piece=(s,id,type,x,y,style,artWidth,artHeight,extra={})=>
  art(s,id,type,x,y,{style,artWidth,artHeight,fadeBehind:true,...extra});
 const cache=(s,name,x,y,rewards)=>{
  s.authoredGarrison=true;
  interactive(s,'cache','worldCache',name,x,y,{discoveryId:s.id,discoveryGuardRadius:340,rewards});
 };

 let s=site('saffron-steps','The Saffron Steps',1049,214,MARCHES,'A banner marks the old harvest stair above the pilgrimage road. The storehouse watch has deserted its post.',10);
 piece(s,'standard','SignalStandard',1048,212,'aureate',152,185);
 for(const [i,x,y] of [[0,1041,213],[1,1053,211],[2,1043,218]])piece(s,`harvest-${i}`,'Farm',x,y,'wheat',124,82,{sortY:-1,fadeBehind:false});
 piece(s,'stores','TimberStack',1054,215,'aureate',98,54);
 sign(s,1053,221,'Harvest stair north. Pilgrim wagons keep to the road below.');
 pack('saffron-steps',MARCHES,1049,214,21,[[...knight,-4,0],[...bow,2,-3],[...wolf,3,2],[...cult,-2,-4]]);
 cache(s,'Harvest Stores',1053,213,[['fieldRations',8],['ashCoin',45]]);

 s=site('blueglass-overlook','The Blueglass Headworks',1172,198,MARCHES,'The raised settling yard controls the Blueglass Aqueduct. The intake wheel is trapped beneath years of mineral deposits.',11);
 piece(s,'intake','Waterwheel',1172,196,'aureate',249,206);
 for(const [i,x,y] of [[0,1167,199],[1,1177,201],[2,1180,194]])piece(s,`feed-${i}`,'Sluice',x,y,'aureate',80,72);
 sign(s,1175,207,'The headworks have two stairs. Keep the aqueduct crossing clear.');
 pack('blueglass-headworks',MARCHES,1172,198,25,[['shieldKnight','Blueglass Turncoat',-3,2,'bulwark'],[...cult,2,3],[...bow,4,-2],[...brute,-5,-3]]);
 cache(s,'Headworks Fittings',1175,197,[['veyrglassShard',2],['ironScrap',5]]);

 s=site('bastion-signal-ridge','The Last Banner Signal Ridge',1460,459,HEARTLANDS,'An iron signal frame rises above the old military road. The last relief banner still hangs from its crossbeam.',11);
 piece(s,'signal','SignalStandard',1460,457,'imperial',174,236);
 piece(s,'old-freight','Wagon',1456,458,'frontier',120,91,{damaged:true});
 for(const [i,x] of [1455,1465].entries())piece(s,`banked-fire-${i}`,'Brazier',x,461,'imperial',68,97);
 sign(s,1461,468,'The signal stair leads up. The Bastion entrance lies southeast, below the ridge.');
 pack('last-banner-ridge',HEARTLANDS,1460,459,26,[['shieldKnight','Forsworn Standard-Bearer',-3,1,'bulwark'],[...bow,3,-2],[...raider,4,2],[...wolf,0,-4]]);
 cache(s,'Abandoned Signal Stores',1463,459,[['ironOre',6],['ashCoin',75]]);

 s=site('ossuary-bell-bank','The Bell Bank',1806,637,HEARTLANDS,'A broken funeral bell hangs above the low burial road. The banks below it are studded with nameless stones.',11);
 piece(s,'broken-bell','BellFrame',1806,635,'blackglass',250,218,{damaged:true});
 for(const [i,x,y] of [[0,1801,635],[1,1810,640],[2,1797,640],[3,1811,633]])piece(s,`grave-${i}`,'Cairn',x,y,'blackglass',70+i*5,90+i*11);
 sign(s,1813,646,'The bank steps climb to the broken bell. Follow the low road east to the Ossuary.');
 pack('bell-bank',HEARTLANDS,1806,637,28,[['gravePriest','Drowned Bellkeeper',-2,-3,'regenerator'],[...dead,2,3],[...shade,4,-1],[...dead,-5,2]]);
 cache(s,'Bellkeeper’s Offerings',1807,635,[['graveAsh',5],['paleEssence',3]]);

 s=site('parallax-shelf','The Parallax Shelf',2314,548,HEARTLANDS,'A second instrument stands above the road to the Unfinished Hour. Its brass rings turn around a lens that reflects no sky.',10);
 piece(s,'broken-lens','StarInstrument',2314,546,'cosmic',270,235,{damaged:true});
 for(const [i,x,y] of [[0,2309,549],[1,2318,550],[2,2312,543]])piece(s,`shard-${i}`,'Spire',x,y,'blackglass',67+i*8,108+i*17,{variant:i});
 sign(s,2314,557,'Stairs to the old instrument. The observatory entrance is east of this shelf.');
 pack('parallax-shelf',HEARTLANDS,2314,548,31,[['wraith','Lens Splinter',-3,0,'vortex'],[...shade,2,-4],[...bow,4,2],[...cult,-5,-4]]);
 cache(s,'Surveyor’s Lens Case',2315,546,[['lumenQuartz',2],['arcaneDust',3]]);

 s=site('estuary-spillway','The Drowned Spillway',2570,520,APPROACH,'The freight road passes above a silt-choked spillway. Rot has reached the old estuary pumps.',11);
 piece(s,'stranded-wheel','Waterwheel',2570,518,'fen',278,234,{damaged:true});
 for(const [i,x,y] of [[0,2563,521],[1,2574,522],[2,2576,515]])piece(s,`reeds-${i}`,'ReedBed',x,y,'fen',112,67);
 sign(s,2567,528,'Spillway stairs ahead. Use the freight road north for Zarynth.');
 pack('drowned-spillway',APPROACH,2570,520,36,[['brute','Spillway Hauler',-4,1,'artillery'],[...dead,2,-2],[...shade,4,1],[...dead,-3,-4]]);
 cache(s,'Spillway Salvage',2569,518,[['oathsteelShard',1],['ashCoin',110]]);

 // These groups sit close enough to threaten the road, with room to circle on the far shoulder.
 const roadPacks=[
  ['west-wagon-cut',MARCHES,930,224,19,wolf,wolf,raider,'frontier'],
  ['grain-bank',MARCHES,1070,229,22,raider,bow,wolf,'aureate'],
  ['lower-canal',MARCHES,1130,246,23,cult,knight,cult,'aureate'],
  ['quarry-trail',MARCHES,1218,239,26,brute,bow,raider,'aureate'],
  ['white-road-cut',MARCHES,1260,282,27,knight,bow,wolf,'aureate'],
  ['first-freight-climb',HEARTLANDS,1323,359,24,raider,bow,wolf,'imperial'],
  ['broken-vintners',HEARTLANDS,1378,416,25,raider,cult,bow,'imperial'],
  ['red-cart-cut',HEARTLANDS,1524,528,26,brute,raider,bow,'imperial'],
  ['broadwater-west',HEARTLANDS,1600,553,27,wolf,raider,bow,'imperial'],
  ['stone-freight-bend',HEARTLANDS,1727,604,28,raider,bow,knight,'imperial'],
  ['longwater-west',HEARTLANDS,1994,579,30,dead,brute,cult,'imperial'],
  ['longwater-ford',HEARTLANDS,2076,548,31,dead,shade,dead,'fen'],
  ['east-kingsway',HEARTLANDS,2186,522,32,knight,bow,raider,'imperial'],
  ['old-toll-scrape',HEARTLANDS,2256,560,33,brute,bow,wolf,'imperial'],
  ['quay-cut',APPROACH,2452,529,35,dead,cult,shade,'fen'],
  ['estuary-west-bank',APPROACH,2524,518,36,brute,dead,shade,'fen'],
  ['outer-freight-cut',APPROACH,2643,482,38,knight,bow,cult,'imperial']
 ];
 for(const [index,[id,region,x,y,level,front,ranged,flank,style]] of roadPacks.entries()){
  pack(id,region,x,y,level,[[...front,-3,1],[...ranged,2,-2],[...flank,3,2]]);
  const verge={id:`act2-overworld-${id}`,sourceRegionId:region};
  const prop=style==='fen'?['WardStakes','Sluice'][index%2]:['Wagon','Ruin','SignalStandard'][index%3];
  piece(verge,'roadside-prop',prop,x,y-1,style,117,83,{damaged:true,variant:index%4});
  if(style==='aureate'){
   piece(verge,'fallow-field','Farm',x+5,y+2,'wheat',174,106,{sortY:-1,fadeBehind:false});
   piece(verge,'store','TimberStack',x+3,y-2,style,92,55);
  }else{
   piece(verge,'verge',style==='fen'?'ReedBed':'Cairn',x+4,y-2,style,92,55);
  }
 }
}

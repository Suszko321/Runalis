import {EASTERN_WAYSTATIONS} from './easternWaystations.js';
import {makeEnemy} from './overworldUtils.js';
import {configureEncounterEnemy,geographicEncounterProfile} from './encounterData.js';
import {TILE} from './data.js';

const marches='aureateMarches', heartlands='imperialHeartlands';
const causeway='severedCausewayRoute', wastes='ascensionWastes';

// The roadside workers give directions to optional hunts in their own words.
const workplaces=[
 ['madder-yard','Madder Yard',marches,1155,246,'aureate','DyeLine','MadderBed','TimberStack','Iven, Vat Tender','The red on these sheets is madder. Those hoofprints beyond the quarry are another matter.','dawnsage','Dyer’s Dawnsage'],
 ['flax-landing','Flax Landing',heartlands,1678,587,'imperial','DyeLine','Boardwalk','FishRack','Rilla, Flax Dresser','We soak the stalks downriver. Hear that chain on the south bank? The tollman still makes his rounds.','riverReed','Retting Reeds'],
 ['pigeon-post','The Pigeon Post',heartlands,2210,542,'imperial','SignalStandard','Wagon','TimberStack','Hessa, Dispatch Rider','I can beat a grain wagon to the capital. Still can’t beat a pigeon.','fieldRations','Courier Provisions'],
 ['listening-yard','The Listening Yard',causeway,1509,247,'cosmic','StormHarp','CausewayPier','Cairn','Sen, Wire Mender','We tuned these wires to the wind. If the low one sings on a still day, get off the lower walk.','arcaneDust','Tuning Dust'],
 ['wick-house','The Last Wick House',wastes,1714,207,'blackglass','DyeLine','Brazier','Wagon','Nell, Wick Maker','A wick has to dry straight. They all lean east when the Cantor passes.','fieldRations','Lamplighters’ Provisions'],
 ['still-air-array','The Still-Air Array',wastes,1909,207,'cosmic','StormHarp','StarInstrument','GlassBloom','Orra, Sounder','The east harp answers the west one a beat too early. I keep the readings anyway.','lumenQuartz','Resonant Quartz']
];

const hunts=[
 ['gleaners',marches,1199,266,26,'roadlessBandit','Sable Nessa, the Gleaner','molten','archer','Tithe Bow','stalkerWolf','Gleaner’s Hound'],
 ['ferrymen',heartlands,1621,682,32,'brute','Orlo Nine-Knots','bulwark','gravebound','Silt Hauler','archer','Bank Lookout'],
 ['weighhouse',heartlands,2401,549,36,'shieldKnight','The False Assayer','shocker','roadlessBandit','Scale Thief','brute','Freight Wrestler'],
 ['chain-watch',causeway,1399,279,36,'shieldKnight','Veska of the Last Link','waller','cultist','Chain Cantor','archer','Splice Watch'],
 ['ash-hounds',causeway,1530,217,40,'stalkerWolf','Kiln-Tooth','molten','ashWolf','Cinder Cur','ashWolf','Clinker Hound'],
 ['reed-choir',wastes,1686,233,44,'gravePriest','The Unvoiced Deacon','regenerator','gravebound','Mute Pilgrim','wraith','Displaced Voice'],
 ['mirror-guard',wastes,1760,210,48,'veyrWraith','The Second Reflection','vortex','cultist','Silver Witness','exploder','Spent Lens'],
 ['ash-register',wastes,1813,215,51,'archer','Tallis, Name Collector','artillery','shieldKnight','Register Guard','gravebound','Struck Name'],
 ['glass-vein',wastes,1871,216,54,'brute','The Hollow Lapidary','freezer','wraith','Glass Sliver','exploder','Cracked Geode'],
 ['spire-beat',wastes,1942,201,58,'shieldKnight','The Ninth Footfall','bulwark','veyrWraith','Afterimage','cultist','Pulse Tender']
];

const bosses=[
 ['ochre-hart','ochreTine','The Ochre Hart',marches,'stalkerWolf','hollowElk',29,1850,32,[[1209,252],[1218,248],[1223,254],[1214,259]]],
 ['chain-tollman','lastTollLink','The Chain Tollman',heartlands,'brute','redSealExecutioner',35,2550,39,[[1706,711],[1717,714],[1721,722],[1710,720]]],
 ['span-eater','spanTooth','The Span Eater',causeway,'basicBeast','graveMawBear',41,3000,43,[[1367,265],[1379,268],[1382,276],[1370,274]]],
 ['hush-cantor','stillPitch','Cantor of the Hush',wastes,'gravePriest','veyrWarden',55,3700,48,[[1841,242],[1852,238],[1857,245],[1846,250]]]
];

// Notices stand on the approach, outside the patrol's detection radius.
const huntNotices={
 'ochre-hart':[1230,238,'Antlers in the madder fields. Look for the Ochre Hart west of the quarry trail, where the plants have been stripped bare.'],
 'chain-tollman':[1692,718,'South Bank toll suspended. The man dragging a chain along the north shoulder has been dead for seven years.'],
 'span-eater':[1350,254,'Lower Walk crew: leave the fallen pier to the Span Eater. It circles back along the north bank.'],
 'hush-cantor':[1821,226,'Sounders: when the road goes quiet, watch the glass beds to the south. The Cantor walks there.']
};

export function dressEasternRoads({site,art,resource,interactive,sign,enemies,stone,hearth}){
 for(const station of EASTERN_WAYSTATIONS){
  const {id,name,region,style,trail,fixtures,verge,supply,people}=station;
  const [x,y]=trail.at(-1),[jx,jy]=trail[0];
  const s=site(id,name,x,y,region,station.lore,9);
  s.navLandmark=true;
  Object.assign(stone(s,x+2,y+2,name),{navSafeRadius:720,forceLabel:true});
  for(const [i,[type,dx,dy,artWidth,artHeight]] of fixtures.entries()){
   art(s,'fixture-'+i,type,x+dx,y+dy,{style,artWidth,artHeight,fadeBehind:true});
  }
  for(const [i,[dx,dy]] of [[-7,1],[-6,3],[6,4]].entries())
   art(s,'verge-'+i,verge,x+dx,y+dy,{style,variant:i,artWidth:88,artHeight:64});
  for(const [i,[resident,talk]] of people.entries()){
   const key='resident-'+i;
   interactive(s,key,'npc',resident,x+(i?4:-4),y+2,{npcId:s.id+'-'+key,disposition:'friendly',talk,
    shirt:i?'#8e7267':'#788467',ambientWander:true,wanderRadiusTiles:1.5,wanderSpeed:15});
  }
  hearth(s,x-3,y+4);
  resource(s,'stores',supply[0],supply[1],x+5,y+3,supply[2]);
  // Repeat the destination's material along its spur so the next turn reads in the field.
  for(let i=1;i<trail.length;i++){
   const [ax,ay]=trail[i-1],[bx,by]=trail[i],distance=Math.hypot(bx-ax,by-ay);
   for(let d=9;d<distance-4;d+=14){
    const tx=ax+((bx-ax)*d-(by-ay)*2.6)/distance,ty=ay+((by-ay)*d+(bx-ax)*2.6)/distance;
    art(s,'track-'+i+'-'+d,verge,tx,ty,{style,variant:i%4,artWidth:62,artHeight:48});
   }
  }
  sign(s,jx+2,jy+2,name+' — follow the marked track to the Nav Stone.',name+' Track');
 }
 for(const [id,name,region,x,y,style,landmark,side,small,worker,talk,item,gather] of workplaces){
  const s=site(id,name,x,y,region,talk,7);
  art(s,'workframe',landmark,x-2,y-1,{style,artWidth:162,artHeight:133,fadeBehind:true});
  art(s,'yard',side,x+4,y+1,{style,artWidth:123,artHeight:88,fadeBehind:true});
  art(s,'stock',small,x-5,y+2,{style,artWidth:96,artHeight:64});
  const growth=region===marches?'MadderBed':region===heartlands?'ReedBed':'GlassBloom';
  for(const [i,[dx,dy]] of [[-6,-3],[-4,-4],[5,3],[7,4]].entries()){
   art(s,'bed-'+i,growth,x+dx,y+dy,{style,variant:i,artWidth:82+i*9,artHeight:38+i*5});
  }
  interactive(s,'worker','npc',worker,x+1.8,y+1.8,{npcId:s.id+'-worker',talk,disposition:'friendly',shirt:style==='cosmic'?'#827991':'#9c7254',ambientWander:true,wanderRadiusTiles:2,wanderSpeed:16});
  resource(s,'supply',item==='lumenQuartz'?'crystal':'forage',item,x+2,y+3,gather);
 }
 for(const [id,region,x,y,level,kind,name,modifier,escort,escortName,flank,flankName] of hunts){
  const group=[[kind,name,0,0],[escort,escortName,-3,2],[flank,flankName,3,-1]];
  const profile={...geographicEncounterProfile(x,y),levels:[level,level]};
  for(const [i,[species,title,dx,dy]] of group.entries()){
   const e=makeEnemy(species,`eastern-hunt-${id}-${i}`,title,x+dx,y+dy,{sourceRegionId:region});
   configureEncounterEnemy(e,profile,e.id,{rank:i===0?'elite':'ordinary'});
   if(i===0)Object.assign(e,{namedExteriorElite:true,eliteModifier:modifier,eliteModifiers:[modifier]});
   enemies.push(e);
  }
  const s={id:'eastern-hunt-'+id,sourceRegionId:region};
  art(s,'trace',region===wastes?'GlassBloom':region===causeway?'Ruin':'Wagon',x-3,y-3,{style:region===wastes?'blackglass':region===causeway?'cosmic':'imperial',artWidth:118,artHeight:82,damaged:true});
 }
 for(const [id,trophy,name,region,kind,visual,level,hp,damage,route] of bosses){
  const [x,y]=route[0];
  const trail={id:'eastern-trail-'+id,sourceRegionId:region,name};
  const [sx,sy,notice]=huntNotices[id];
  sign(trail,sx,sy,notice,'Field Notice · '+name);
  const trace={aureateMarches:'MadderBed',imperialHeartlands:'WardStakes',severedCausewayRoute:'CausewayPier',ascensionWastes:'GlassBloom'}[region];
  for(const [i,[tx,ty]] of route.entries()){
   art(trail,'trace-'+i,trace,tx-2,ty+2,{style:region===marches?'aureate':region===heartlands?'imperial':'blackglass',artWidth:94,artHeight:74,variant:i,fadeBehind:true});
  }
  const e=makeEnemy(kind,'eastern-roamer-'+id,name,x,y,{worldBoss:true,isBoss:true,bossId:id,bossName:name,firstKillTrophy:trophy,bossRenderType:visual,guardRole:'worldBoss',sourceRegionId:region,level,combatLevel:level,hp,damage,r:24,scale:1.35,aggroRange:255,
   patrolRoute:route.map(([tx,ty])=>({x:(tx+.5)*TILE,y:(ty+.5)*TILE})),patrolIndex:1});
  configureEncounterEnemy(e,{...geographicEncounterProfile(x,y),levels:[level,level]},e.id);
  enemies.push(e);
 }
}

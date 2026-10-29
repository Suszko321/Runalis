// Authored town geometry, in hidden gameplay cells. Narrative identities stay in hubSystem.
import {TILE} from './data.js';

export const ORRAKAI_REVISION = 3;
export const ROOT_RETORT = Object.freeze({stairs:{x:55,y:39},arrival:{x:55,y:40},counter:{x:49,y:39}});
// Open paving, clear of gate arches, roofs, stalls and terrace foregrounds.
export const ORRAKAI_WATCH_POSTS = [
 {id:'orrakaiLowerGateGuardObject',npcId:'orrakaiLowerGateGuard',name:'South Road Guard',x:34,y:36},
 {id:'orrakaiMarketGuardObject',npcId:'orrakaiMarketGuard',name:'Market Watch Guard',x:31,y:30},
 {id:'orrakaiInfirmaryGuardObject',npcId:'orrakaiInfirmaryGuard',name:'Infirmary Watch Guard',x:12,y:42},
 {id:'orrakaiHallGuardObject',npcId:'orrakaiHallGuard',name:'Hall Watch Guard',x:45,y:16},
 {id:'frontierRoadWatch',npcId:'orrakaiNorthGateGuard',name:'North Gate Guard',x:47,y:9}
];
export const ORRAKAI_BUILDINGS = [
  {id:'guild',name:'Warden’s Hall',x:29,y:8,w:15,h:9,door:6,roof:0,partition:9,rooms:['Guild chamber','Records room']},
  {id:'shrine',name:'Covenant Sanctuary',x:10,y:8,w:15,h:9,door:6,roof:2,partition:9,rooms:['Sanctuary','Vestry']},
  {id:'bank',name:'Counting House',x:17,y:22,w:12,h:9,door:3,roof:3,partition:6,rooms:['Counting room','Strongroom']},
  {id:'smith',name:'Aren’s Forge',x:47,y:22,w:15,h:9,door:6,roof:1,partition:10,rooms:['Forge','Tool store']},
  {id:'infirmary',name:'Covenant Infirmary',x:16,y:36,w:14,h:7,door:6,roof:2,partition:9,rooms:['Receiving room','Recovery ward']},
  {id:'alchemist',name:'The Root & Retort',x:46,y:36,w:12,h:7,door:3,roof:1,partition:6,rooms:['Apothecary','Herb store']},
  {id:'home',name:'Corin’s Workshop',workshopName:'Corin’s Workshop',x:7,y:23,w:8,h:8,door:1,roof:3,partition:4,rooms:['Workshop','Living quarters']}
];
export const ORRAKAI_TERRACES = [
  {id:'upper',y:18,h:3,level:2,stairs:[[33,39],[58,62]],name:'Warden’s Rise'},
  {id:'middle',y:32,h:3,level:1,stairs:[[36,42],[10,14]],name:'Market Steps'}
];
const placements = {
 orrakaiSouthGate:[36,44],orrakaiEastGate:[66,28],orrakaiFrontierRoadGate:[36,6],orrakaiGuildClerk:[33,12],warden:[45,43],
 orrakaiNoticeBoard:[40,26],orrakaiFrontierRoadBoard:[46,7],frontierRoadQuartermaster:[43,6],frontierRoadWatch:[7,6],
 orrakaiMarket:[33,25],orrakaiFoodStall:[40,23],orrakaiMarketVendor:[32,26],orrakaiBank:[20,26],orrakaiBanker:[21,25],
 orrakaiBlacksmith:[50,26],smith:[52,27],orrakaiAlchemist:[49,39],orrakaiAlchemistApprentice:[50,38],
 orrakaiTrainingYard:[54,12],orrakaiPvpArena:[62,13],mercenaryTrainer:[53,15],necromancerTrainer:[56,10],
 orenFenwickObject:[49,39],waveriderTrainer:[50,13],lightbringerTrainer:[57,15],templarTrainer:[18,13],
 orrakaiWeatheredShrine:[14,11],orrakaiTownHearth:[40,38],orrakaiTrialTower:[63,39],
 orrakaiSickVillagerObject:[27,38],orrakaiWellStoresAttendantObject:[31,28],orrakaiWaterDistributionObject:[31,37],
 orrakaiLowerGateGuardObject:[34,36],orrakaiRefugeeParentObject:[20,39],lightwardenCaelenObject:[13,17],
 covenantHealingRiteObject:[17,15],plagueTentAttendant:[24,40],refugeeReliefWorker:[20,41],
 covenantPhysician:[24,38],covenantReliefSister:[44,39],covenantPeacekeeper:[15,40],maskedOrrakaiChild:[18,40],
 orrakaiGraveTender:[9,13],covenantTeacher:[23,12],covenantHistorian:[41,12],covenantEnvoy:[38,14],
 orrakaiCaravanMemorial:[8,16],orrakaiBurnedLedger:[41,14],orrakaiGuildRunner:[38,24],orrakaiRoadPorter:[44,36],
 orrakaiBreadCarrier:[31,30],orrakaiLampTender:[44,28],orrakaiNorthSign:[32,6],orrakaiSouthSign:[41,43],
 'auth-orrakai-workyard-resource':[60,28],'auth-orrakai-garden-resource':[60,41],'auth-orrakai-refuge-hearth':[13,39]
};
const fixtures = ['capitalExit','travelRouteGate','guildClerk','marketStall','bankService','blacksmithService','alchemistService','classTrainerService','arenaGate','shrine'];
const point=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
export function inBuilding(b,x,y,pad=0){return x>=b.x*TILE-pad&&x<(b.x+b.w)*TILE+pad&&y>=b.y*TILE-pad&&y<(b.y+b.h)*TILE+pad;}
export function orrakaiWalkLevel(x,y){return y<18*TILE?2:y<21*TILE?2-(y/TILE-18)/3:y<32*TILE?1:y<35*TILE?1-(y/TILE-32)/3:0;}

export function reconstructOrrakai(world){
 if(world.mode!=='capital'||world.orrakaiRevision===ORRAKAI_REVISION)return world;
 world.orrakaiRevision=ORRAKAI_REVISION;world.safeZone=true;
 world.buildings=ORRAKAI_BUILDINGS.map(b=>({...b}));world.terraces=ORRAKAI_TERRACES;
 world.spawn=point(36,40);
 for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++){
   const inside=x>=5&&x<=66&&y>=6&&y<=44;
   const gate=x>=35&&x<=37&&(y===5||y>=43&&y<=46)||x>=65&&x<=69&&y>=27&&y<=29;
   const paved=inside&&(x>=15&&x<=62||y>=15&&y<=17||y>=27&&y<=31);
   world.tiles[y][x]={biome:inside||gate?(paved||gate?'path':'grass'):'wall',passable:inside||gate,walkLevel:Math.round(orrakaiWalkLevel(x*TILE,y*TILE)),variant:(x*3+y*5)%2,orrakai:true};
 }
 const block=(x,y)=>{const t=world.tiles[y]?.[x];if(t){t.passable=false;t.biome='wall';}};
 for(let x=5;x<=66;x++)if(x<35||x>37)block(x,44);
 for(const y of [5,43])for(const x of [33,34,38,39,40])block(x,y);
 for(const terrace of world.terraces)for(let y=terrace.y;y<terrace.y+terrace.h;y++)for(let x=5;x<=66;x++){
   if(terrace.stairs.some(([a,b])=>x>=a&&x<=b)){world.tiles[y][x].connector=terrace.id;world.tiles[y][x].walkLevel=orrakaiWalkLevel(x*TILE,(y+.5)*TILE);}else block(x,y);
 }
 for(const b of world.buildings){
   for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
     const door=y===b.y+b.h-1&&(x===b.x+b.door||x===b.x+b.door+1);
     const partition=x===b.x+b.partition&&y>b.y&&y<b.y+b.h-1&&![b.y+b.h-3,b.y+b.h-4].includes(y);
     if(!door&&(x===b.x||x===b.x+b.w-1||y===b.y||y===b.y+b.h-1||partition))block(x,y);
     else Object.assign(world.tiles[y][x],{biome:'ruin',passable:true,interiorId:b.id});
   }
 }
 // Ilyra stands beside her book stall on the market terrace, off the main road.
 if (!world.objects.some(o=>o.id==='orrakaiSkillMerchant')) world.objects.push({
   id:'orrakaiSkillMerchant',kind:'npc',name:'Ilyra, Pact Scribe',skillMerchant:true,
   ...point(43,28),r:14,orrakaiResident:true,stationary:true,
   talk:'The pact is a promise, not a pedigree. Any traveller can call a wolf.'
 });
 if (!world.objects.some(o=>o.id==='orrakaiPactStall')) world.objects.push({
   id:'orrakaiPactStall',kind:'marketStall',name:'Ilyra’s Pacts',skillMerchant:true,...point(43,27),r:22
 });
 // Retire obsolete presentation only. All NPCs, services, evidence, resources and exits survive.
 world.objects=world.objects.filter(o=>!(o.decorative||o.kind==='worldDressing'||['treeCluster','shrub','smallBoulder','brokenWall','ruinPillar','graveMarker'].includes(o.kind))||o.npcId||o.questId||o.poiId||o.kind==='poiInvestigation');
 const smith=world.objects.find(o=>o.id==='smith');
 if(smith)Object.assign(smith,{name:'Aren the Smith',bodyType:'male',workshopService:'blacksmith',workshopName:'Aren’s Forge',workRole:'smith',stationary:true,dirX:1,dirY:0,r:14});
 const oldSmithFixture=world.objects.find(o=>o.id==='orrakaiBlacksmith');
 if(oldSmithFixture)Object.assign(oldSmithFixture,{serviceMarkerOnly:true,hideOnRadar:true,interactable:false,hideLabel:true});
 if(!world.objects.some(o=>o.id==='orrakaiCraftsman'))world.objects.push({id:'orrakaiCraftsman',npcId:'orrakaiCraftsman',kind:'npc',name:'Corin Reed, Craftsman',...point(9,26),r:14,workshopService:'craftsman',workshopName:'Corin’s Workshop',workRole:'craftsman',stationary:true,orrakaiResident:true,disposition:'friendly',factionId:'orrakai',dirX:-1,dirY:0,shirt:'#927449',pants:'#403c31',talk:'Good tools, proper materials, and patience. Bring your supplies to the bench; we will make something that lasts.'});
 for(const o of world.objects){
   if(placements[o.id])Object.assign(o,point(...placements[o.id]));
   if(fixtures.includes(o.kind))o.orrakaiFixture=true;
   if(o.kind==='npc')o.orrakaiResident=true;
   o.forceLabel=false;
   if(o.ambientWander)o.wanderRadiusTiles=Math.min(1,Number(o.wanderRadiusTiles||1));
 }
 const prop=(id,propType,x,y,extra={})=>world.objects.push({id:'orrakai-kit-'+id,kind:'townProp',propType,...point(x,y),r:0,decorative:true,interactable:false,hideLabel:true,...extra});
 const props=[
 ['forge','forge',49,23],['anvil','anvil',53,27],['smith-tools','weaponRack',59,24],['fuel','woodPile',59,29],
 ['smith-crates','crateStack',60,27],['bank-vault','bankChest',27,24],['bank-shelves','crateStack',27,28],
 ['guild-table','mapTable',32,10],['guild-map','mapTable',41,10],['guild-supplies','crateStack',42,14],
 ['altar-candles','candleCluster',13,10],['sanctuary-candles','candleCluster',17,10],['vestry','alchemyTable',22,10],
 ['cot-a','infirmaryCot',27,37],['cot-b','infirmaryCot',27,41],['medicine','medicineCrates',18,37],['wash','washBasin',24,37],
 ['retort','alchemyTable',48,37],['herbs','herbPlanter',56,37],['apothecary-sacks','sacks',56,40],
 ['home-bed','infirmaryCot',13,24],['home-table','contractTable',8,25],['home-fuel','woodPile',10,29],
 ['craft-tools','weaponRack',10,24],['craft-supplies','sacks',13,28],['quench','barrels',51,23],
 ['smith-sign','workshopSign',55,31,{service:'blacksmith'}],['craft-sign','workshopSign',10,31,{service:'craftsman'}],
 ['well','well',31,27],['stall-sacks','sacks',32,23],['stall-barrels','barrels',41,21],
 ['market-bench','bench',41,29],['market-crates','crateStack',42,23],['notice','noticePapers',40,27],
 ['caravan','supplyWagon',44,40],['relief-cart','sickWagon',10,38],['caravan-crates','crateStack',43,42],
 ['relief-supply','medicineCrates',12,40],['relief-banner','banner',15,37,{color:'#e9dcbd'}],
 ['dummy-a','practiceDummy',51,9],['dummy-b','practiceDummy',55,8],['training-rack','weaponRack',60,9],
 ['memorial','memorialStone',7,14],['grave-a','freshGrave',7,10],['grave-b','freshGrave',9,10]
 ];
 for(const [id,type,x,y,extra] of props)prop(id,type,x,y,extra);
 for(const [i,[x,y]] of [[31,42],[41,42],[34,34],[44,34],[31,20],[41,20],[27,17],[46,17],[15,31],[63,31],[46,6]].entries())prop('light-'+i,'lantern',x,y,{glow:'#ffc477',scale:1.15});
 for(const [i,[x,y]] of [[30,43],[42,43],[29,18],[45,18]].entries())prop('banner-'+i,'banner',x,y,{color:'#793e3b',accent:'#c2a36c'});
 // Large furnishings have physical footprints. Service anchors remain on the open customer side.
 const solidProps=new Set(['forge','anvil','weaponRack','crateStack','bankChest','contractTable','mapTable','alchemyTable','infirmaryCot','well','supplyWagon','sickWagon']);
 for(const o of world.objects.filter(o=>o.id.startsWith('orrakai-kit-')&&solidProps.has(o.propType))){
   const x=Math.floor(o.x/TILE),y=Math.floor(o.y/TILE);block(x,y);world.tiles[y][x].furniture=true;
 }
 for(const o of world.objects.filter(o=>o.kind==='marketStall')){
   const x=Math.floor(o.x/TILE),y=Math.floor(o.y/TILE);for(let dx=-1;dx<=1;dx++)block(x+dx,y-1);
 }
 // Preserve the three established town discoveries in their new physical locations.
 world.authoredLocations=[['orrakai-workyard','Orrakai Workyard',54,27],['orrakai-garden','Kitchen Gardens',61,41],['orrakai-refuge','Pilgrim Shelter',22,40]].map(([id,name,x,y])=>({id,name,...point(x,y),lore:'A working refuge at the edge of the frontier.'}));
 world.enemies=[];
 ensureRootRetortAccess(world);
 ensureOrrakaiWatchPosts(world);
 return world;
}

// Reapply only these story anchors after older published object placements.
// Keep their legacy IDs, services and quests; never rebuild edited terrain here.
export function ensureOrrakaiStoryNpcPositions(world){
 if(world?.mode!=='capital')return world;
 ensureOrrakaiWatchPosts(world);
 // The square's eastern approach is in direct view from the apothecary door.
 // The Cardinal receives visitors on the sanctuary's quiet front terrace.
 for(const [id,x,y,dirX] of [['warden',45,43,1],['lightwardenCaelenObject',13,17,1]]){
  const npc=world.objects.find(o=>o.id===id);if(!npc)continue;
  Object.assign(npc,{...point(x,y),stationary:true,ambientWander:false,forceLabel:true,hideLabel:false,labelPriority:20,dirX,dirY:0});
  delete npc.wanderTargetX;delete npc.wanderTargetY;
 }
 return world;
}

export function ensureOrrakaiWatchPosts(world){
 if(world?.mode!=='capital')return world;
 for(const [i,post]of ORRAKAI_WATCH_POSTS.entries()){
  let guard=world.objects.find(o=>o.id===post.id);
  if(!guard){guard={id:post.id,kind:'npc'};world.objects.push(guard);}
  Object.assign(guard,{...point(post.x,post.y),npcId:post.npcId,name:post.name,kind:'npc',role:'guard',orrakaiWatch:true,orrakaiResident:true,factionId:'orrakai',disposition:'friendly',dialogueId:'orrakaiLowerGateGuardAid',deferTalkObjective:true,stationary:true,ambientWander:false,interactable:true,forceLabel:true,hideLabel:false,hideOnRadar:false,labelPriority:16,r:14,radius:14,bodyType:i===2?'female':'male',skin:i===1?'#b78361':'#d7bda2',hair:i===3?'#a6a098':'#463a30',shirt:'#526b86',pants:'#343e4b',boots:'#292722',dirX:0,dirY:1,equipment:{weapon:'blackIronSword',helm:null,chest:'leatherVest',legs:null,trinket:'ironwoodShield'}});
  delete guard.wanderTargetX;delete guard.wanderTargetY;
 }
 return world;
}

export function ensureArenSmithIdentity(world){
 if(world?.mode!=='capital')return world;
 const smith=world.objects.find(o=>o.id==='smith');
 if(smith)Object.assign(smith,{name:'Aren the Smith',displayName:'Aren the Smith',bodyType:'male',workshopName:'Aren’s Forge'});
 const forge=world.buildings?.find(b=>b.id==='smith');if(forge)forge.name='Aren’s Forge';
 return world;
}

// Retire the old postern even when published town data still contains it.
export function ensureOrrakaiSouthGate(world){
 if(world?.mode!=='capital')return world;
 world.objects=world.objects.filter(o=>o.id!=='orrakaiEastGate'&&!(o.kind==='capitalExit'&&o.gateId==='east'));
 for(let y=27;y<=29;y++)if(world.tiles[y]?.[66])Object.assign(world.tiles[y][66],{passable:false,biome:'wall'});
 return world;
}

export function ensureRootRetortAccess(world){
 if(world?.mode!=='capital')return world;
 const fixture=world.objects.find(o=>o.id==='orrakaiAlchemist');
 if(fixture)Object.assign(fixture,{name:'Root & Retort Medicines',serviceMarkerOnly:true,hideOnRadar:true,interactable:false,hideLabel:true,presentationRetired:true});
 // Published town snapshots can still contain the old downstairs Mara.
 world.objects=world.objects.filter(o=>o.npcId!=='maraVell'&&o.id!=='thornbinderTrainer');
 let alchemist=world.objects.find(o=>o.id==='orenFenwickObject');
 if(!alchemist){alchemist={id:'orenFenwickObject',kind:'npc'};world.objects.push(alchemist);}
 Object.assign(alchemist,{...point(ROOT_RETORT.counter.x,ROOT_RETORT.counter.y),npcId:'orenFenwick',name:'Oren Fenwick',role:'Resident Alchemist',dialogueId:'orenFenwickShop',factionId:'orrakai',disposition:'friendly',apothecaryService:true,stationary:true,interactable:true,r:14,radius:14,labelPriority:8,bodyType:'male',hairStyle:'short',skin:'#bd9171',hair:'#b9b4a5',shirt:'#a27a3f',pants:'#493d35',boots:'#29221e',dirX:0,dirY:1,talk:'Oren Fenwick: “Fresh medicine downstairs. Mara’s advice upstairs. Mind the drying herbs by the stairs.”'});
 let stairs=world.objects.find(o=>o.id==='maraHomeEntrance');
 if(!stairs){stairs={id:'maraHomeEntrance',kind:'signpost'};world.objects.push(stairs);}
 Object.assign(stairs,{...point(ROOT_RETORT.stairs.x,ROOT_RETORT.stairs.y),name:'Upstairs — Mara’s Room',campaignAction:'maraHome',townStairs:true,direction:'up',r:18,radius:18,labelPriority:8,talk:'Mara’s recovery room is upstairs above the Root & Retort.'});
 return world;
}

// Static geography is rebuilt on load. Only position/revision changes; story state is untouched.
export function migrateOrrakaiPosition(world,player){
 if(!world?.orrakaiRevision||!player)return false;
 const open=(x,y)=>[[0,0],[-12,0],[12,0],[0,-12],[0,12]].every(([dx,dy])=>world.tiles[Math.floor((y+dy)/TILE)]?.[Math.floor((x+dx)/TILE)]?.passable===true);
 let moved=false;
 for(const actor of [player,...(player.coop?.players||[])]){
   if(!actor)continue;
   if(actor.orrakaiLayoutRevision!==ORRAKAI_REVISION||!open(actor.x,actor.y)){Object.assign(actor,world.spawn);actor.currentPosition={...world.spawn};actor.moveTarget=null;moved=true;}
   if(actor.lastSafeLocation?.worldMode==='capital'&&!open(actor.lastSafeLocation.x,actor.lastSafeLocation.y))Object.assign(actor.lastSafeLocation,world.spawn);
   actor.orrakaiLayoutRevision=ORRAKAI_REVISION;
 }
 return moved;
}

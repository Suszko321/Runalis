import {TILE} from './data.js';
import {SERAPH_TRIALS} from './seraphTrialData.js';
import {makeEnemy} from './overworldUtils.js';
import {ENCOUNTER_VERSION} from './encounterData.js';
import {enemyXPForLevel} from './enemyProgression.js';
import {ACT2_BEHEMOTH, SERAPH_DOMAINS, ZARYNTH_CAPITAL} from './act2CampaignData.js';

const point = (x,y) => ({x:(x+.5)*TILE,y:(y+.5)*TILE});
export const ACT2_ROOT_HEARTS = ['westHeart','eastHeart','northHeart'];
const maps = {
  lastStandBastion: {
    size:[79,79], spawn:[39,69], floor:'stone',
    rooms:[['gate',30,64,19,12],['hall',27,44,25,15],['west',5,37,18,19],['east',56,37,18,19],['muster',7,15,15,13],['shelf',55,64,17,11],['relief',58,55,14,8],['ring',26,7,27,23,'boss']],
    halls:[[[39,68],[39,49]],[[13,49],[64,49]],[[13,49],[13,21]],[[39,49],[39,22]],[[43,69],[64,69],[64,57],[64,49]]]
  },
  forgottenOssuary: {
    size:[89,88], spawn:[44,81], floor:'stone',
    rooms:[['landing',34,75,21,10],['march',33,57,23,13],['flood',5,49,21,19],['archive',63,45,21,21],['alcoves',5,21,22,18],['memorial',33,37,23,13],['cloister',57,68,23,13],['reliquary',61,20,20,15],['sanctum',30,6,29,24,'boss']],
    halls:[[[44,81],[44,63]],[[44,62],[15,62],[15,30]],[[44,63],[73,63],[73,53]],[[44,62],[44,18]],[[15,30],[15,43],[44,43]],[[44,78],[69,78],[69,73],[68,73],[68,59]],[[52,43],[63,43],[63,26],[73,26]]]
  },
  unfinishedHour: {
    size:[89,86], spawn:[44,77], floor:'stone',
    rooms:[['observatory',34,71,21,11],['bridge',35,54,19,11],['caravan',5,52,20,17],['orrakai',63,36,20,18],['covenant',5,24,20,17],['dawn',64,65,18,13],['dusk',7,69,15,12],['midnight',62,15,17,13],['lookingGlass',30,5,29,22,'boss']],
    halls:[[[44,77],[44,59],[15,59],[15,31]],[[44,59],[73,59],[73,44]],[[15,31],[44,31],[44,17]],[[73,44],[44,44],[44,59]],[[44,31],[44,44]],[[15,59],[15,75],[44,75],[72,75],[72,59]],[[73,44],[73,20]]]
  },
  capital: {
    size:[87,73], spawn:[43,63], floor:'stone',
    rooms:[['gate',32,57,23,13],['market',24,35,43,19],['hospital',4,36,18,18],['garden',9,8,22,19],['council',56,7,25,20],['refuge',69,38,14,16],['records',5,57,19,11]],
    halls:[[[43,63],[43,19],[66,19]],[[13,43],[75,43]],[[20,18],[43,18]],[[13,61],[43,61]]]
  },
  aqueduct: {
    size:[91,87], spawn:[45,79], floor:'stone',
    rooms:[['sluice',31,68,29,15],['westValve',5,43,23,17],['eastValve',64,43,22,17],['junction',34,46,23,15],['northValve',62,15,23,17],['walk',35,34,21,9],['cistern',29,6,32,23,'boss']],
    halls:[[[45,78],[45,19]],[[15,52],[74,52],[74,24]],[[74,24],[74,38],[45,38]]]
  }
};

function buildMap(world, layout) {
  const [width,height] = layout.size;
  Object.assign(world,{width,height,spawn:point(...layout.spawn),rooms:[],halls:[]});
  world.tiles = Array.from({length:height},() => Array.from({length:width},() => ({biome:'wall',passable:false})));
  function carve(x,y) {
    if (world.tiles[y]?.[x]) world.tiles[y][x] = {biome:layout.floor,passable:true,variant:(x*11+y*17)%4};
  }
  for (const [id,x,y,w,h,role='combat'] of layout.rooms) {
    world.rooms.push({id,x,y,w,h,role,cx:x+Math.floor(w/2),cy:y+Math.floor(h/2)});
    for (let ty=y;ty<y+h;ty++) for (let tx=x;tx<x+w;tx++) carve(tx,ty);
  }
  const halfWidth = layout === maps.unfinishedHour ? 1 : 2;
  for (const route of layout.halls) for (let i=1;i<route.length;i++) {
    const [x1,y1]=route[i-1], [x2,y2]=route[i];
    world.halls.push({x1,y1,x2,y2});
    const length=Math.max(Math.abs(x2-x1),Math.abs(y2-y1));
    for (let j=0;j<=length;j++) {
      const x=x1+j*Math.sign(x2-x1), y=y1+j*Math.sign(y2-y1);
      for (let dy=-halfWidth;dy<=halfWidth;dy++) for (let dx=-halfWidth;dx<=halfWidth;dx++) carve(x+dx,y+dy);
    }
  }
  // Surface motifs follow individual rooms. These are visual, so existing drop
  // coordinates and arena exits stay valid when an earlier save is loaded.
  const surfaces={
    lastStandBastion:{shelf:'timber',relief:'timber',west:'mud',ring:'standard'},
    forgottenOssuary:{flood:'waterline',cloister:'waterline',memorial:'tombs',reliquary:'tombs',sanctum:'waterline'},
    unfinishedHour:{caravan:'starlight',orrakai:'starlight',covenant:'starlight',dawn:'glass',dusk:'glass',midnight:'glass',lookingGlass:'glass'}
  }[world.dungeonId];
  if(surfaces)for(const room of world.rooms){
    const surface=surfaces[room.id];
    if(!surface)continue;
    for(let y=room.y;y<room.y+room.h;y++)for(let x=room.x;x<room.x+room.w;x++)world.tiles[y][x].seraphSurface=surface;
  }
}

function object(world,id,kind,name,x,y,extra={}) {
  const entry={id:`act2-${world.dungeonId}-${id}`,kind,name,...point(x,y),r:19,...extra};
  world.objects.push(entry);
  return entry;
}

function npc(world,id,name,x,y,dialogueId,talk,shirt='#83619b',extra={}) {
  return object(world,id,'npc',name,x,y,{npcId:`act2-${id}`,dialogueId,talk,shirt,
    pants:'#403a47',hair:'#baa184',stationary:true,ambientWander:false,forceLabel:true,...extra});
}

function station(world,id,name,x,y,message,extra={}) {
  return object(world,id,'dungeonPuzzle',name,x,y,{act2Station:id,message,forceLabel:true,...extra});
}

function cache(world,id,name,x,y,loot,guard) {
  object(world,id,'dungeonChest',name,x,y,{tier:3,chestType:'sideTreasure',locked:!!guard,
    act2CacheGuard:guard,loot,rewards:loot,lockedMessage:'Defeat the nearby defenders to reach the supplies.'});
}

export function act2Enemy(world, id, kind, name, x, y, level, stats={}) {
  const enemy=makeEnemy(kind,`act2-${world.dungeonId}-${id}`,name,x,y,{
    combatLevel:level,level,hp:155+level*13,damage:9+Math.round(level*.82),
    xp:enemyXPForLevel(level),noRespawn:true,homeGuard:true,homeX:point(x,y).x,homeY:point(x,y).y,
    leashRange:390,homeRadius:310,encounterStatsVersion:ENCOUNTER_VERSION,
    encounterRegion:world.dungeonId,encounterTier:'ordinary',...stats
  });
  enemy.baseCombatXp=enemy.xp;
  world.enemies.push(enemy);
  return enemy;
}

function pack(world, group, x, y, level, roles, names) {
  const offsets=[[-3,-2],[2,1],[-1,4],[4,-4],[-5,3],[0,-5],[5,4]];
  const extra=Math.max(0,(world.dungeonState.coopPlayerCount||1)-1);
  for (let i=0;i<Math.min(offsets.length,roles.length+extra);i++) {
    const [dx,dy]=offsets[i];
    const role=roles[i%roles.length];
    const enemy=act2Enemy(world,`${group}-${i}`,role,names[i%names.length],x+dx,y+dy,level,{...seraphMobStats(world.dungeonId,role,level),act2Group:group});
    applySeraphMob(enemy,world.dungeonId);
  }
}

const MOB_ROLES = {
  lastStandBastion:{
    stalkerWolf:['coalHound','Coal Hound','spectralLunge','#f69263'],
    basicBeast:['coalHound','Ash Hound','spectralLunge','#f69263'],
    brute:['ironbreaker','Freightbreaker',null,'#f6b266'],
    burrower:['coalHound','Cistern Crawler','rootBurrowCharge','#f69263'],
    shieldKnight:['bannerGuard','Standard Revenant','shieldCharge','#eeb372'],
    archer:['bannerGuard','Ashen Crossbow',null,'#eeb372'],
    gravebound:['bannerGuard','Muster Deserter',null,'#eeb372']
  },
  forgottenOssuary:{
    gravebound:['urnBearer','Silt Pallbearer',null,'#84d2c7'],
    wraith:['graveEcho','Nameless Wake','spectralLunge','#92d9e7'],
    gravePriest:['graveEcho','Crypt Cantor',null,'#92d9e7'],
    shieldKnight:['urnBearer','Sepulchre Warden','shieldCharge','#84d2c7'],
    brute:['grafter','Memorial Eater',null,'#82ddd1']
  },
  unfinishedHour:{
    wraith:['shardShade','Fractured Double','spectralLunge','#dfa7ff'],
    archer:['glassBow','Unfired Arrow',null,'#dfa7ff'],
    stalkerWolf:['shardShade','Borrowed Hound','spectralLunge','#dfa7ff'],
    shieldKnight:['glassBow','Still-Watch Reflection','judgmentCharge','#dfa7ff'],
    gravePriest:['glassBow','Unrealised Healer',null,'#dfa7ff']
  }
};

function seraphMobStats(id,kind,level){
  const hp=155+level*13;
  if(id==='lastStandBastion'){
    if(kind==='brute'||kind==='shieldKnight')return {hp:Math.round(hp*1.24),speed:46};
    if(kind==='stalkerWolf'||kind==='basicBeast')return {hp:Math.round(hp*.78),speed:91};
  }
  if(id==='forgottenOssuary'){
    if(kind==='gravePriest')return {hp:Math.round(hp*.87),attackRate:1.42,aggroRange:335};
    if(kind==='gravebound')return {hp:Math.round(hp*1.23),speed:44};
  }
  if(id==='unfinishedHour'){
    if(kind==='archer')return {hp:Math.round(hp*.81),attackRate:1.2,aggroRange:325};
    if(kind==='wraith')return {hp:Math.round(hp*.88),speed:79};
  }
  return {};
}

function applySeraphMob(enemy,id){
  if(enemy.seraphSprite||!MOB_ROLES[id])return;
  const role=MOB_ROLES[id][enemy.kind];
  if(!role)return;
  const [sprite,name,charge,chargeColor]=role;
  Object.assign(enemy,{seraphSprite:sprite,name});
  if(charge)Object.assign(enemy,{chargeThreat:true,chargeAttackKind:charge,chargeColor});
}

const sceneProps={
  lastStandBastion:[['Gate',39,66,223,161],['Wagon',10,53,130,96],['TimberStack',69,51,130,83],['Brazier',33,30,68,87],['Brazier',46,30,68,87],['InscribedWall',15,18,140,105]],
  forgottenOssuary:[['Cairn',37,77,90,110],['Bell',51,39,111,147],['InscribedWall',12,24,152,110],['WardStakes',70,54,116,91],['Cairn',39,17,100,145],['Cairn',49,17,100,145]],
  unfinishedHour:[['Spire',42,74,185,245],['Wagon',15,58,151,104],['Abbey',76,43,214,172],['Gate',9,32,177,132],['Fountain',44,16,122,139]],
  capital:[['Gate',43,59,310,217],['Abbey',16,39,240,210],['Market',53,40,150,122],['Market',36,48,170,121],['Fountain',20,19,146,104],['Tower',60,14,180,245],['Tower',77,14,180,245],['Granary',77,43,195,144],['House',16,59,175,138],['Brazier',39,36,72,96],['Brazier',47,36,72,96],['Market',31,40,177,120],['Market',60,46,155,117],['Scales',38,46,88,75],['Fountain',43,41,158,115],['Wagon',58,51,156,99],['Wagon',9,47,118,82],['Willow',26,22,137,183],['Willow',14,25,108,153],['Cairn',19,16,76,91],['InscribedWall',68,11,221,113],['WardStakes',79,45,118,82],['Brazier',56,18,83,95],['Brazier',75,18,83,95]],
  aqueduct:[['Sluice',50,75,153,114],['Aqueduct',45,43,197,166],['Sluice',8,50,100,104],['Sluice',81,50,100,104],['Ruin',52,13,187,175],['WardStakes',33,30,130,118]]
};

const trialPoints={
  lastStandBastion:[[58,70],[67,68],[66,59]],
  forgottenOssuary:[[62,74],[68,51],[73,26]],
  unfinishedHour:[[74,71],[12,74],[73,19]]
};

function dressTrial(w,id) {
  const trial=SERAPH_TRIALS[id];
  for(const [index,[key,name,text]] of trial.stages.entries()){
    station(w,key,name,...trialPoints[id][index],text,{seraphTrial:trial.key,seraphOrder:index,seraphProp:trial.key});
  }
  if(id==='lastStandBastion'){
    npc(w,'quartermaster','Quartermaster Vara',56,67,'act2Vara',null,'#936849');
    station(w,'reliefCharter','The Relief Charter',43,66,trial.hint,{seraphProp:'plaque'});
    const cart=object(w,'convoy','worldDressing','Relief Freight Cradle',68,72,{propType:'continentWagon',style:'frontier',artWidth:170,artHeight:102,decorative:true,interactable:false,hideLabel:true});
    cart.seraphFixture=true;
  }
  if(id==='forgottenOssuary'){
    station(w,'riteStone','The Rite of the Three Names',55,77,trial.hint,{seraphProp:'plaque'});
    npc(w,'scribe','Nin, Last Ossuary Scribe',66,26,'act2Nin',null,'#3d7179');
  }
  if(id==='unfinishedHour'){
    npc(w,'astronomer','An Astronomer Who Never Was',46,74,'act2Astronomer',null,'#7164ac');
    station(w,'nightChart','The Still-Star Chart',64,20,trial.hint,{seraphProp:'plaque'});
  }
}

function dressProps(world,key) {
  const style={lastStandBastion:'frontier',forgottenOssuary:'blackglass',unfinishedHour:'cosmic',capital:'aureate',aqueduct:'fen'}[key];
  for(const [i,[type,x,y,artWidth,artHeight]] of sceneProps[key].entries()){
    object(world,`scenery-${i}`,'worldDressing','',x,y,{propType:`continent${type}`,style,artWidth,artHeight,
      drawRadius:artHeight+80,interactable:false,decorative:true,hideLabel:true,fadeBehind:true});
  }
}

function dressBastion(w,level) {
  npc(w,'keeper',SERAPH_DOMAINS.lastStandBastion.guardian,39,35,'act2-lastStandBastion-keeper',null,'#a3694f',{scale:1.3});
  npc(w,'iria','Captain Iria',29,50,'act2Iria',null,'#a97b55',{bodyType:'female'});
  npc(w,'denn','Marshal Denn',49,50,'act2Denn',null,'#715c51');
  npc(w,'refugees','Refugee Cartwright',34,69,null,'The watch has water for horses. It’s the children I’m worried about.','#806452');
  station(w,'water','East Cistern Bypass',66,46,'Fresh water flows into the outer cistern. Denn can screen the sick without sharing the main well.',{guard:'stores'});
  station(w,'warRoll','Two Rolls of Victory',13,22,'The same battle. The same casualties. Two different commanders both named as the bearer of the same divine order.');
  pack(w,'road',13,44,level,['stalkerWolf','basicBeast','brute','stalkerWolf'],['Blighted Pursuer','Rot-sick Hound','Wagon Breaker']);
  pack(w,'stores',64,50,level,['brute','stalkerWolf','burrower'],['Blighted Quartermaster','Cistern Stalker','Cistern Larva']);
  pack(w,'muster',12,20,level+1,['shieldKnight','archer','gravebound'],['Fallen Banner Guard','Rot-marked Crossbow','Ruined Veteran']);
  cache(w,'paychest','Sealed Muster Pay',17,19,[{itemId:'ashCoin',qty:135},{itemId:'ironOre',qty:8}],'muster');
  object(w,'hearth','campfire','Refugee Fire',46,68);
}

function dressOssuary(w,level) {
  npc(w,'keeper',SERAPH_DOMAINS.forgottenOssuary.guardian,44,35,'act2-forgottenOssuary-keeper',null,'#466d76',{bodyType:'female',scale:1.25});
  station(w,'crypt','Flooded Burial Record',15,55,'The reign of King Erastien is remembered as a golden age. Beneath the silt, a witness records the decree ordering three streets emptied by fire.',{guard:'flood'});
  station(w,'archive','Dry Archive Record',76,49,'The court praised Erastien for bringing the city safely through winter. Behind the seal is an order to remove the names of those who died.',{guard:'archive'});
  station(w,'memorial','Memorial of the Last Names',44,40,'The central inscription dries. Eight alcoves bear Accord symbols. The ninth is clean, unbroken, and utterly empty.',{guard:'memorial'});
  station(w,'blankNames','The Ninth Alcove',10,25,'The ages and causes of death are legible. The space where each name belongs is perfectly smooth.');
  pack(w,'flood',15,60,level,['gravebound','wraith','gravePriest','gravebound'],['Silt Drowned','Unmoored Shade','Flooded Cantor']);
  pack(w,'archive',73,55,level,['gravePriest','shieldKnight','wraith'],['Ledger Keeper','Erastien’s Guard','Erased Courtier']);
  pack(w,'alcoves',16,30,level+1,['wraith','gravebound','gravePriest'],['Unmarked Watch','Crypt Revenant','Collector of Names']);
  act2Enemy(w,'memorialEater','brute','Memorial Eater',44,46,level+1,{act2Group:'memorial',hp:1700,elite:true,isElite:true,eliteModifiers:['bulwark'],r:23});
  cache(w,'offers','Sealed Offerings',19,25,[{itemId:'ashCoin',qty:155},{itemId:'paleEssence',qty:6}],'alcoves');
}

function dressHour(w,level) {
  npc(w,'keeper',SERAPH_DOMAINS.unfinishedHour.guardian,44,34,'act2-unfinishedHour-keeper',null,'#8057aa',{bodyType:'female',scale:1.2});
  station(w,'caravan','A Caravan That Arrived',10,65,'Everyone survived the road. One passenger asks why the gates will not let her go home. The city remembers your promise to keep them safe.',{guard:'caravan'});
  station(w,'orrakai','An Orrakai Without Fever',77,40,'No one in the infirmary is sick. A woman comes every day to ask for the son the dream removed so she would never have to mourn him.',{guard:'orrakai'});
  station(w,'covenant','The Witness of Perfect Light',9,27,'The crowd rises when you speak. A child has forgotten how to disagree with you. Behind him, nine shadows stand up. Only eight sit back down.',{guard:'covenant'});
  station(w,'telescope','The Impossible Instrument',49,75,'The lens shows the observatory from above. Something standing behind you is looking through the other end.');
  pack(w,'caravan',15,59,level,['wraith','archer','stalkerWolf'],['Road Echo','Unfired Arrow','Borrowed Hound']);
  pack(w,'orrakai',73,45,level,['shieldKnight','wraith','gravePriest'],['Unquestioning Watch','Perfect Patient','Imagined Healer']);
  pack(w,'covenant',15,32,level+1,['gravePriest','archer','wraith','wraith'],['Echo of Applause','Devoted Archer','Reflected Pilgrim']);
  cache(w,'drawer','The Astronomer’s Locked Drawer',19,27,[{itemId:'ashCoin',qty:170},{itemId:'towerFragment',qty:2}],'covenant');
}

function dressCapital(w) {
  npc(w,'gateWatch','Concordant Watch',40,60,null,'Once the Ward takes your testimony, it returns each relic to its custodian. Your name stays in the register.','#a38858');
  npc(w,'zephyr','Zephyr Light',12,41,'act2Zephyr',null,'#dece90');
  npc(w,'patientA','Transport Patient',11,43,null,'He’s so cold. The healers say to keep talking to him.','#867866');
  npc(w,'patientB','Patient’s Sister',14,43,null,'I was told this hospital was full. They found a bed anyway.','#686d8b',{bodyType:'female'});
  npc(w,'seraphel','Seraphel',19,15,'act2Seraphel',null,'#cbcaa1',{scale:1.36});
  npc(w,'cassian','Emperor Cassian',67,14,'act2Cassian',null,'#aa5642');
  npc(w,'maelReports','Warden Mael',12,60,'act2MaelReports',null,'#8f7547');
  npc(w,'refugeSteward','Refuge Steward',75,46,null,'We are short on blankets again. The queue for bread is twice as long as yesterday.','#82925c',{bodyType:'female'});
  npc(w,'merchant','Thousand Banners Porter',38,41,null,'Grain prices are set by the council. Whether any grain gets here is up to the river.','#735c4e');
  for(const [id,name,x,y,talk,shirt] of [
    ['weaver','Market Weaver',31,45,'The palace wants gold thread. The hospital asks for plain blankets. Both orders are overdue.','#915254'],
    ['porterGrain','Grain Porter',54,47,'The morning tally was thirty sacks. By noon the hospital had taken twenty.','#697a58'],
    ['quartermaster','Ration Clerk',71,44,'Tell me the names of everyone in your household. We count the people who arrived yesterday too.','#8c7954'],
    ['healer','Ward Healer',17,44,'If you can stand, bring water to the west beds. Leave the silk curtains for the patients who can still see them.','#c4b994'],
    ['gardener','Imperial Gardener',24,21,'The Emperor ordered this court kept open to the public. The guards keep telling me to put the benches away.','#697c5c'],
    ['clerk','Council Clerk',60,20,'Refuge lists on the left, troop rolls on the right. The Emperor wants both before he hears the next argument.','#8a795c']
  ])npc(w,id,name,x,y,null,talk,shirt);
  object(w,'market','marketStall','Thousand Banners Market',48,46,{forceLabel:true});
  object(w,'shrine','shrine','Saint Velis’s Garden Shrine',14,15,{forceLabel:true});
  object(w,'stairs','dungeonStairs','Refuge Aqueduct Stairs',63,46,{direction:'down',targetFloor:2,forceLabel:true,locked:true,
    lockedMessage:'Cassian’s authorization is required to enter the aqueduct.'});
  object(w,'hearth','campfire','Refuge Hearth',78,48);
}

function dressAqueduct(w) {
  npc(w,'tavia','Engineer Tavia',45,70,'act2Sluice',null,'#a77b55',{bodyType:'female'});
  npc(w,'renn','Captain Renn',40,72,null,'I can bring down both arches. Every minute we wait puts another street at risk.','#896a51');
  npc(w,'neve','Sister Neve',51,72,null,'I heard them answering from the north ledge. Give me a clear route and I can get them out.','#b4b494',{bodyType:'female'});
  npc(w,'aftercare','Zephyr Light',48,69,'act2Aftermath',null,'#dece90',{hidden:true,presentationRetired:true,interactable:false});
  station(w,'westValve','West Emergency Valve',12,48,'The west gallery diverts water away from the inhabited tunnels.',{guard:'west'});
  station(w,'eastValve','East Emergency Valve',78,48,'The eastern isolation gate closes. The bypass will now take the pressure from both sides.',{guard:'east'});
  station(w,'maintenance','Aqueduct Work Ledger',75,29,'Routine inspections continue through midsummer. The following three entries have been lifted cleanly out of the folio.');
  pack(w,'west',15,52,30,['gravebound','brute','stalkerWolf','gravebound'],['Rooted Labourer','Sluice Hulk','Blight Stray']);
  pack(w,'east',75,53,30,['gravePriest','gravebound','brute','wraith'],['Spore Tender','Rooted Labourer','Sluice Hulk','Drain Wisp']);
  pack(w,'north',73,24,31,['gravePriest','brute','gravebound'],['Root Chorister','Sediment Breaker','Overgrown Soldier']);
  pack(w,'junction',45,53,30,['stalkerWolf','gravebound','gravePriest'],['Spore Hound','Rooted Labourer','Spore Tender']);
  for (const [i,coords] of [[18,47],[68,48],[77,20]].entries()) {
    act2Enemy(w,ACT2_ROOT_HEARTS[i],'brute','Exposed Root Heart',...coords,30+i,{act2Heart:ACT2_ROOT_HEARTS[i],
      hp:1150+i*125,r:23,speed:0,aggroRange:1,attackRange:1,leashRange:1,attackRate:10});
  }
  cache(w,'stores','Abandoned Expedition Stores',80,17,[{itemId:'fieldRations',qty:12},{itemId:'ashCoin',qty:210}],'north');
  object(w,'stairs','dungeonStairs','Ascend to Zarynth',45,81,{direction:'up',targetFloor:1});
}

export function buildAct2Instance(options, state, floor) {
  const {dungeonId, entranceId, seed, tier, depth}=options;
  const domain=SERAPH_DOMAINS[dungeonId];
  const capital=dungeonId===ZARYNTH_CAPITAL;
  const name=domain?.name||(floor===1?'Zarynth · City of a Thousand Banners':'Zarynth · The Bloom Beneath the Walls');
  const world={mode:'dungeon',name,theme:domain?.theme||(floor===1?'holy':'grave'),tileSize:TILE,
    seed,floorSeed:`${seed}-floor-${floor}`,dungeonId,entranceId,poiId:dungeonId,floor,totalFloors:state.totalFloors,
    regionId:capital?'zarynth':'imperialHeartlands',
    depth,baseDepth:depth,tier,dungeonState:state,dungeonClassification:state.classification,objects:[],enemies:[],drops:[],effects:[],combatEffects:[],safeZone:capital&&floor===1};
  buildMap(world,maps[domain?.id||(floor===1?'capital':'aqueduct')]);
  const [sx,sy]=maps[domain?.id||(floor===1?'capital':'aqueduct')].spawn;
  if (floor===1) world.exit=object(world,'exit','dungeonExit',capital?'Return to the Trade Ward':'Return to the Highway',sx,sy+2,{act2SurfaceExit:true});
  const saved=state.floorStates?.[floor];
  if (saved?.objects?.some(o=>o.id?.startsWith(`act2-${dungeonId}-`))) {
    world.objects=saved.objects;
    world.enemies=saved.enemies||[];
    world.drops=saved.drops||[];
  } else if (capital) {
    if (floor===1) dressCapital(world);
    else dressAqueduct(world);
  } else {
    ({lastStandBastion:dressBastion,forgottenOssuary:dressOssuary,unfinishedHour:dressHour})[dungeonId](world,domain.level);
  }
  if (!saved?.objects?.some(o=>o.id?.startsWith(`act2-${dungeonId}-`))) dressProps(world,domain?.id||(floor===1?'capital':'aqueduct'));
  repairSeraphWorld(world,true);
  const room=world.rooms.find(r=>r.role==='boss');
  if (room) world.bossRoomCenter=point(room.cx,room.cy);
  return world;
}

export function repairSeraphWorld(world,mapBuilt=false) {
  const domain=SERAPH_DOMAINS[world?.dungeonId];
  if(!domain)return;
  if(!mapBuilt&&!world.tiles?.[Math.floor(world.bossRoomCenter?.y/TILE)]?.[Math.floor(world.bossRoomCenter?.x/TILE)]?.seraphSurface){
    buildMap(world,maps[domain.id]);
    const room=world.rooms.find(r=>r.role==='boss');
    world.bossRoomCenter=point(room.cx,room.cy);
  }
  if(world.objects.filter(o=>o.seraphTrial).length!==SERAPH_TRIALS[domain.id].stages.length){
    const staged={dungeonId:domain.id,objects:[]};
    dressTrial(staged,domain.id);
    const present=new Set(world.objects.map(o=>o.id));
    world.objects.push(...staged.objects.filter(o=>!present.has(o.id)));
  }
  for(const enemy of world.enemies){
    if(enemy.act2Boss===domain.id)enemy.seraphSprite=domain.id;
    if(enemy.act2Group)applySeraphMob(enemy,domain.id);
  }
  const keeper=world.objects.find(o=>o.npcId==='act2-keeper');
  if(keeper)keeper.seraphSprite=domain.id;
}

export function summonAct2Guardian(world) {
  const domain=SERAPH_DOMAINS[world.dungeonId];
  const id=domain?.id||ACT2_BEHEMOTH;
  const level=domain?domain.level+2:33;
  const room=world.rooms.find(r=>r.role==='boss');
  return act2Enemy(world,`${id}-manifestation`,domain?.bossKind||'brute',domain?.guardian||'Root-Crowned Behemoth',
    room.cx,room.cy,level,{
      hp:({lastStandBastion:6400,forgottenOssuary:6800,unfinishedHour:7200})[id]||11600,
      damage:domain?42:51,speed:domain?.id==='lastStandBastion'?63:domain?67:47,r:domain?23:36,
      isBoss:true,isDungeonMainBoss:true,bossId:id,bossType:id,act2Boss:id,arenaDormant:true,seraphSprite:domain?.id,
      xp:enemyXPForLevel(level,4),encounterTier:'boss'
    });
}

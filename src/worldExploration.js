import {TILE,ITEMS} from './data.js';
import {ECOLOGIES,ecologyAt,hashWorld,openTile} from './worldAuthorship.js';
import {addQuestText} from './floatingText.js';
import {addItem,countItem,removeItem} from './player.js';
import {playSfx,playEnvironmentCue} from './audioSystem.js';
import {ACT1_WORLD_MAP} from './worldMapData.js';
import {revealSurvey} from './mapSurvey.js';

export function worldMemory(player) {
  const m=player.worldMemory ||= {};
  for(const key of ['stones','locations','secrets','harvests','inscriptions','surveys'])if(!m[key]||typeof m[key]!=='object'||Array.isArray(m[key]))m[key]={};
  m.elapsed=Math.max(0,Number(m.elapsed)||0);m.version=1;
  return m;
}
const keyOf=w=>['overworld','capital'].includes(w.mode)?`${w.mode}:${w.regionId||w.name}`:`${w.mode}:${w.dungeonId||w.sideZoneType||w.routeId||w.infiniteDungeonId||w.theme||w.name}:${w.floor||1}`;
// Harvests and discovered sites belong to their original physical identity,
// even while a continuous world's player moves through several regions.
export function worldEntityMemoryKey(world,entity){
  if(world.continentId==='runalis'){
    const source=entity?.sourceRegionId||world.regionId||'hearthmereFrontier';
    const route=entity?.sourceRouteId||({pilgrimRoadRoute:'pilgrimRoad',severedCausewayRoute:'severedCauseway'})[source];
    if(entity?.sourceWorldMode==='travelRoute'||route)return `travelRoute:${route||source}:${entity?.sourceFloor||1}`;
    return `overworld:${source}`;
  }
  return keyOf(world);
}
export function worldEntityMemoryId(entity){return entity?.sourceEntityId||entity?.id;}
const previousHealth=new WeakMap();
export function updateWorldExploration(game,dt) {
  const w=game.world,p=game.player;if(!w||!p)return;
  // Transitions/save migration reconstruct worlds from their object lists.
  w.navStones ||= (w.objects||[]).filter(o=>o.kind==='navStone');
  w.authoredLocations ||= (w.objects||[]).filter(o=>o.authoredSite).map(o=>({...o,id:o.locationId}));
  w.landscapes ||= w.authoredLocations.filter(o=>o.type&&o.radius);
  if(!w.rooms&&['dungeon','tower','sideZone'].includes(w.mode))w.rooms=(w.objects||[]).filter(o=>o.groundRoom).map(o=>o.groundRoom);
  const m=worldMemory(p);m.elapsed+=Math.max(0,dt||0);
  const local=ecologyAt(w,p.x,p.y),epoch=Math.floor(m.elapsed/210);
  const indoor=['dungeon','tower','sideZone'].includes(w.mode);
  const options=ECOLOGIES[local].weather;
  w.worldAtmosphere={ecology:local,time:m.elapsed,night:(m.elapsed%1200)>780,weather:indoor?'indoor':options[Math.floor(hashWorld(`${local}:${epoch}`)*options.length)]};
  w.explorationTick=(w.explorationTick||0)-dt;if(w.explorationTick>0)return;w.explorationTick=.4;
  const party=[p,...(p.coop?.players||[]).filter(a=>a.active!==false&&a.joined!==false&&!a.dead)];
  revealSurvey(m,w,party.filter(a=>!a.dead&&a.hp>0));
  for(const a of party){
    if(a.hp<(previousHealth.get(a)??a.hp)||a.combatState?.attacking||a.hitFlash>0)m.lastDanger=m.elapsed;
    previousHealth.set(a,a.hp);
  }
  if(w.mode==='overworld'&&w.width>300)for(const marker of ACT1_WORLD_MAP.markers){
    const radius=marker.type==='dungeon'&&/Castle|Keep/.test(marker.name)?560:/Tower|Chapel|Bridge/.test(marker.name)?360:/Cellar|Sluice/.test(marker.name)?100:220;
    if(!m.locations['map:'+marker.id]&&party.some(a=>Math.hypot(a.x-marker.x*TILE,a.y-marker.y*TILE)<radius))m.locations['map:'+marker.id]={name:marker.name,x:marker.x*TILE,y:marker.y*TILE};
  }
  for(const stone of w.navStones||[]){
    if(m.stones[stone.id]&&w.continentId==='runalis')Object.assign(m.stones[stone.id],{x:stone.x,y:stone.y,sourceRegionId:stone.sourceRegionId,world:worldEntityMemoryKey(w,stone)});
    if(party.some(a=>Math.hypot(a.x-stone.x,a.y-stone.y)<100))discoverStone(game,stone);
  }
  for(const site of w.authoredLocations||[]){const key=`${worldEntityMemoryKey(w,site)}:${worldEntityMemoryId(site)}`;
    if(!m.locations[key]&&party.some(a=>Math.hypot(a.x-site.x,a.y-site.y)<(site.discoveryRadius||180))){
      m.locations[key]={name:site.name,x:site.x,y:site.y,sourceRegionId:site.sourceRegionId};addQuestText(p,site.name,{color:'#dfcc9e',ttl:2,size:18});game.log?.(`${site.name}${site.lore?': '+site.lore:''}`);
    }else if(m.locations[key]&&w.continentId==='runalis'){
      Object.assign(m.locations[key],{x:site.x,y:site.y,sourceRegionId:site.sourceRegionId});
    }
  }
  for(const o of w.objects||[]){
    const harvestKey=`${worldEntityMemoryKey(w,o)}:${worldEntityMemoryId(o)}`,expiry=m.harvests[harvestKey];
    if(expiry>m.elapsed){o.depleted=true;o.respawn=expiry-m.elapsed;}
    else if(expiry&&party.every(a=>Math.hypot(a.x-o.x,a.y-o.y)>700)){o.depleted=false;delete m.harvests[harvestKey];}
    if(o.kind==='worldSecret'&&(m.secrets[o.id]||m.secrets[worldEntityMemoryId(o)]))o.claimed=true;
  }
  if(m.elapsed>(w.memoryPruneAt||0)){
    w.memoryPruneAt=m.elapsed+60;
    const activeKeys=new Set((w.objects||[]).map(o=>`${worldEntityMemoryKey(w,o)}:${worldEntityMemoryId(o)}`));
    for(const [key,expiry] of Object.entries(m.harvests))if(expiry<=m.elapsed&&!activeKeys.has(key))delete m.harvests[key];
  }
  if(m.elapsed>(w.nextAmbientCue||0)){w.nextAmbientCue=m.elapsed+8+Math.random()*10;playEnvironmentCue(indoor?(/mine/.test(w.theme||'')?'mine':'crypt'):w.worldAtmosphere.night?'night':local);}
}
export function discoverStone(game,stone) {
  if(!(game.world.navStones||[]).includes(stone))return false;
  const owner=(game.hostGame||game).player;
  if(![owner,...(owner.coop?.players||[])].some(a=>a.active!==false&&a.hp>0&&Math.hypot(a.x-stone.x,a.y-stone.y)<=110))return false;
  const m=worldMemory((game.hostGame||game).player);
  if(m.stones[stone.id]){Object.assign(m.stones[stone.id],{x:stone.x,y:stone.y,sourceRegionId:stone.sourceRegionId});return false;}
  m.stones[stone.id]={name:stone.name,region:stone.region,x:stone.x,y:stone.y,sourceRegionId:stone.sourceRegionId,world:worldEntityMemoryKey(game.world,stone)};
  stone.activated=true;
  addQuestText(game.player,`${stone.name} · Nav Stone discovered`,{color:'#a9e1de',ttl:2.5,size:18});
  game.world.effects.push({kind:'enemyPulse',x:stone.x,y:stone.y,color:'#9be5df',radius:100,ttl:1.2,age:0,layer:'front'});
  game.log?.(`Nav Stone discovered: ${stone.name} — ${stone.region}. Fast travel unlocked. Use the world map while beside a stone.`);
  playSfx('quest',{volume:.45});(game.hostGame||game).save?.(false);return true;
}
export function travelAvailability(game,targetId) {
  const host=game.hostGame||game,w=host.world,p=host.player,m=worldMemory(p);
  if(host!==game&&game.player!==p)return {ok:false,reason:'Only the host can lead Nav Stone travel.'};
  if(w.mode!=='overworld'||host.loading||host.transitioning||host.dialogue?.active)return {ok:false,reason:'Nav Stones are unavailable here.'};
  if(Number.isFinite(m.lastDanger)&&m.elapsed-m.lastDanger<6)return {ok:false,reason:'Wait a moment for combat to end.'};
  const source=(w.navStones||[]).find(s=>m.stones[s.id]&&Math.hypot(s.x-p.x,s.y-p.y)<110);
  const target=(w.navStones||[]).find(s=>s.id===targetId&&m.stones[s.id]);
  if(!source||!target)return {ok:false,reason:'Stand beside a discovered Nav Stone and choose a discovered destination.'};
  if(source===target)return {ok:false,reason:'You are already at this stone.'};
  const party=[p,...(p.coop?.players||[]).filter(a=>a.active!==false&&a.joined!==false)];
  if(party.some(a=>a.dead||a.hp<=0||['downed','beingRevived'].includes(a.lifeState)||a.combatState?.attacking||a.combatState?.heavyChargeActive||Number(a.hitFlash)>0))return {ok:false,reason:'The party must be alive and out of combat.'};
  if(party.some(a=>Math.hypot(a.x-source.x,a.y-source.y)>220))return {ok:false,reason:'Gather the party at the Nav Stone.'};
  // Remote destination guards need to be inspected before rations are spent.
  // This bounded preview does not move the active world or the party.
  const preview=w.continentRuntime?.previewAt?.(target.x,target.y,p);
  const destinationEnemies=[...(w.enemies||[]),...(preview?.enemies||[])];
  if(destinationEnemies.some(e=>!e.dead&&!e.remove&&e.hp>0&&(Math.hypot(e.x-target.x,e.y-target.y)<600||party.some(a=>Math.hypot(e.x-a.x,e.y-a.y)<Math.max(600,e.aggroRange||0)))))return {ok:false,reason:'Danger disrupts the source or destination stone.'};
  if(countItem(p,'fieldRations')<1)return {ok:false,reason:'The journey needs one field ration for the party.'};
  const positions=party.map((a,i)=>({x:target.x+(i%2)*TILE,y:target.y+Math.floor(i/2)*TILE}));
  if(positions.some(q=>[[0,0],[-12,0],[12,0],[0,-12],[0,12]].some(([dx,dy])=>!openTile(w,(q.x+dx)/TILE,(q.y+dy)/TILE))))return {ok:false,reason:'The destination is obstructed.'};
  return {ok:true,source,target,party,positions};
}
export function travelByStone(game,targetId) {
  const status=travelAvailability(game,targetId);if(!status.ok){game.log?.(status.reason);return false;}
  const host=game.hostGame||game;removeItem(host.player,'fieldRations',1);
  status.party.forEach((a,i)=>{Object.assign(a,status.positions[i]);a.vx=0;a.vy=0;});
  host.world.continentRuntime?.refresh?.(host);
  revealSurvey(worldMemory(host.player),host.world,status.party);
  worldMemory(host.player).elapsed+=120;
  if(host.camera){host.camera.x=host.player.x-(host.canvas?.width||960)/2;host.camera.y=host.player.y-(host.canvas?.height||600)/2;}
  host.log?.(`Reached ${status.target.name}. One field ration used; two minutes passed.`);host.save?.(false);return true;
}
export function investigateSecret(game,o) {
  const m=worldMemory((game.hostGame||game).player);
  if(m.secrets[o.id]||m.secrets[worldEntityMemoryId(o)]){game.log?.('The offering recess is empty.');return;}
  if((o.requires||[]).some(id=>!m.inscriptions[id])){game.log?.('Three bells are carved into the sealed stone. Their notes must sound across the courtyard.');return;}
  const qty=o.rewardQty||2;m.secrets[o.id]=true;o.claimed=true;addItem(game.player,o.reward,qty);
  game.log?.(`${o.lore} Found ${ITEMS[o.reward]?.name||o.reward} ×${qty}.`);addQuestText(game.player,'Hidden offering recovered',{color:'#a9e1de',ttl:2});(game.hostGame||game).save?.(false);
}
export function soundWorldRelic(game,o){
  const m=worldMemory((game.hostGame||game).player);
  m.inscriptions[o.id]=true;game.log?.(`${o.name}: ${o.lore}`);
  game.world.effects.push({kind:'enemyPulse',x:o.x,y:o.y,color:'#cbd9b4',radius:150,age:0,ttl:1.5,layer:'front'});
  playEnvironmentCue('crypt');
  if(['bellwater-west','bellwater-east','bellwater-choir'].every(id=>m.inscriptions[id])){game.log?.('A stone seal opens beneath the choir arch.');addQuestText(game.player,'The choir answers',{color:'#c8e1ce',ttl:2});}
  (game.hostGame||game).save?.(false);
}
export function regionalHarvest(world,object,skill,rng=Math.random) {
  const eco=ECOLOGIES[ecologyAt(world,object.x,object.y)];
  const pool=skill==='mining'?eco.mineral:skill==='foraging'?eco.forage:skill==='woodcutting'?['amberResin',ecologyAt(world,object.x,object.y)==='burial'?'spiritwoodSplinter':'sturdyHardwood']:[];
  if(!pool.length||rng()>(skill==='mining'?.22:.16))return [];
  const id=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];return ITEMS[id]?[{id,qty:rng()<.12?2:1}]:[];
}
export function localizeHarvestBonuses(world,object,skill,bonuses) {
  const e=ECOLOGIES[ecologyAt(world,object.x,object.y)];
  const pool=skill==='mining'?e.mineral:skill==='foraging'?e.forage:null;
  if(!pool)return bonuses;
  return bonuses.map(b=>({...b,id:pool[Math.floor(Math.random()*pool.length)]})).filter(b=>ITEMS[b.id]);
}
export function rememberHarvest(game,o) {const m=worldMemory((game.hostGame||game).player);o.respawn=Math.max(300,o.respawn||0);m.harvests[`${worldEntityMemoryKey(game.world,o)}:${worldEntityMemoryId(o)}`]=m.elapsed+o.respawn;}

import {updateAuthoredPopulation,populationPositionSafe} from './encounterPopulation.js';
import {geographicEncounterProfile,configureEncounterEnemy} from './encounterData.js';
import {ecologyAt} from './worldAuthorship.js';
import {initializeSimulatedSubclassPlayer} from './simulatedSubclassPlayers.js';
// overworldEncounterSystem.js
// Lightweight Act I overworld activity spawner.
//
// Static content gives Echoryn Forest places to discover. This system adds
// small temporary encounters so roads and wild spaces keep feeling active.

import { TILE } from './data.js';
import { ACT1_LANDMARKS, makeEnemy, makeObject, scaleEnemyStats } from './overworldUtils.js';
import { isPassable } from './world.js';
import {continentRegionAt,continentRoadAt} from './continentDefinition.js';
import {captureContinentalState,continentalMemory} from './continentPersistence.js';

function seededRandom(key){let n=2166136261;for(const c of key)n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n+=0x6D2B79F5;let t=Math.imul(n^(n>>>15),n|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

const SAFE_OUTPOST_RADIUS_TILES = 28;
const MIN_SPAWN_DISTANCE = TILE * 16;
const MAX_SPAWN_DISTANCE = TILE * 76;
const CLEANUP_DISTANCE = TILE * 94;
const MAX_DYNAMIC_ENEMIES = 12;
const MAX_DYNAMIC_NPCS = 4;
const MAX_TOTAL_OVERWORLD_ENEMIES = 380;

const SPAWN_POINTS = [
  [62, 56, 'hollowRoad'],
  [88, 70, 'hollowRoad'],
  [118, 92, 'ashenOrchard'],
  [145, 96, 'caravanRoad'],
  [244, 102, 'pilgrimBridge'],
  [282, 122, 'pilgrimRoad'],
  [390, 158, 'hunterReach'],
  [510, 192, 'watcherRidge'],
  [96, 176, 'thornwood'],
  [112, 266, 'mirrorGrove'],
  [244, 326, 'lanternMarsh'],
  [292, 350, 'ironMire'],
  [390, 344, 'oldHollow'],
  [532, 352, 'redRoad'],
  [556, 386, 'redSeal']
];

export const HOSTILE_TEMPLATES = [
  {
    id: 'roadless-patrol',
    minTier: 1,
    weight: 7,
    members: [
      ['roadlessBandit', 'Roadless Drifter'],
      ['archer', 'Roadless Bowhand']
    ]
  },
  {
    id: 'wolf-pack',
    minTier: 2,
    weight: 6,
    members: [
      ['ashWolf', 'Hungry Ash Wolf'],
      ['stalkerWolf', 'Trail Stalker'],
      ['ashWolf', 'Hungry Ash Wolf']
    ]
  },
  {
    id: 'grave-road',
    minTier: 2,
    weight: 5,
    members: [
      ['gravebound', 'Road Risen'],
      ['gravebound', 'Road Risen'],
      ['gravePriest', 'Ash-Bone Caller']
    ]
  },
  {
    id: 'red-seal-scouts',
    minTier: 4,
    weight: 4,
    members: [
      ['demonCultist', 'Last Dawn Scout'],
      ['exploder', 'Last Dawn Bound Convert'],
      ['demonCultist', 'Last Dawn Scout']
    ]
  }
];

const TRAVELER_TEMPLATES = [
  ...['waverider','oathkeeper','gravecaller','thornbinder','lightbringer','fellhunter'].map(classId=>({id:`${classId}-adventurer`,classId,name:`Traveling ${classId[0].toUpperCase()+classId.slice(1)}`,shirt:'#7d8093',talk:'Traveling adventurer: "Every calling changes the way you fight. Choose yours with care."'})),
  {
    id: 'lost-miner',
    name: 'Lost Miner',
    shirt: '#8f6b45',
    talk: 'Lost Miner: "The old path moved. I am certain it was over there this morning."'
  },
  {
    id: 'road-pilgrim',
    name: 'Road Pilgrim',
    shirt: '#d8c38c',
    talk: 'Road Pilgrim: "If you see a lantern hung upside down, do not follow it."'
  },
  {
    id: 'scarred-hunter',
    name: 'Scarred Hunter',
    shirt: '#73d18a',
    talk: 'Scarred Hunter: "There are too many tracks for one beast. That is never good."'
  }
];

export function updateOverworldEncounters(game, dt, now = 0) {
  const world = game?.world;
  if (!world || world.mode !== 'overworld' || !world.tiles?.length) return;

  if(world.continentId){now=Number(game.player?.worldMemory?.elapsed)||0;if(world.enemies.some(e=>e.dynamicEncounter&&(e.dead||e.hp<=0)))captureContinentalState(game);world.continentalEncounterMemory=continentalMemory(game.player);world.continentalEncounterCycle=Math.floor(now/720);}

  if(world.continentId){updateAuthoredPopulation(game,dt,spawnHostilePatrol,spawnTraveler);cleanupTemporaryEncounters(world,getPartyActors(game),now);return;}
  cleanupTemporaryEncounters(world, getPartyActors(game), now);

  const state = getEncounterState(world);
  state.timer -= Math.max(0, Number(dt || 0));
  if (state.timer > 0) return;

  state.timer = nextEncounterDelay();
  maybeSpawnEncounter(world, getPartyActors(game), now, state);
}

function maybeSpawnEncounter(world, party, now, state) {
  if (!party.length) return;

  const activeDynamicEnemies = countDynamicEnemies(world);
  const activeEnemies = (world.enemies || []).filter(enemy => enemy && !enemy.dead && !enemy.remove && Number(enemy.hp || 0) > 0).length;
  if (activeDynamicEnemies >= MAX_DYNAMIC_ENEMIES || activeEnemies >= MAX_TOTAL_OVERWORLD_ENEMIES) return;

  const point = pickSpawnPoint(world, party);
  if (!point) return;

  const cycle=Math.floor(now/720),encounterId=world.continentId?`ow-${point.stableId}-${cycle}`:`ow-${Date.now()}-${state.spawnSerial++}`;
  const rng=world.continentId?seededRandom(encounterId):Math.random;
  const tier = point.area?.tier || getEncounterTier(point[2]);
  if(world.continentId)world.continentalEncounterMemory.events[point.stableId]={cycle,encounterId};

  const travelerChance=world.worldAtmosphere?.night ? .06 : world.worldAtmosphere?.weather==='rain' ? .1 : .22;
  if (rng() < travelerChance && countDynamicNpcs(world) < MAX_DYNAMIC_NPCS) {
    spawnTraveler(world, point, encounterId, now,rng);
    return;
  }

  spawnHostilePatrol(world, point, encounterId, tier, now,rng);
}

export function hostilePatrolPool(ecology,tier){
  const allowed=ecology==='redseal'?['red-seal-scouts']:['burial','marsh'].includes(ecology)?['grave-road']:ecology==='woodland'?['wolf-pack','roadless-patrol']:['roadless-patrol'];
  const eligible=HOSTILE_TEMPLATES.filter(entry=>tier>=entry.minTier&&allowed.includes(entry.id));
  return eligible.length?eligible:HOSTILE_TEMPLATES.filter(entry=>allowed.includes(entry.id));
}
function spawnHostilePatrol(world,point,encounterId,tier,now,rng=Math.random,party=[]) {
 const eco=ecologyAt(world,point[0]*TILE,point[1]*TILE),profile=point.profile||geographicEncounterProfile(point[0],point[1],point[2]);
 const template=point.area?.enemyKinds?.length?{id:point.area.id,members:point.area.enemyKinds.map(k=>[k,k.replace(/([A-Z])/g,' $1').replace(/^./,c=>c.toUpperCase())])}:chooseWeighted(hostilePatrolPool(eco,tier),rng);
 const count=Math.min(point.area?.maxActive||6,profile.count[0]+Math.floor(rng()*(profile.count[1]-profile.count[0]+1))),angle=rng()*Math.PI*2;
 const formation=template.id==='roadless-patrol'&&count>=3&&rng()<.55
  ?(rng()<.5?[['roadlessBandit','Roadless Flanker'],['roadlessBandit','Roadless Drifter'],['archer','Roadless Bowhand']]:[['shieldKnight','Roadless Shieldguard'],['roadlessBandit','Roadless Cutthroat'],['archer','Roadless Bowhand']]):template.members;
 for(let index=0;index<count;index++){
  const [kind,name]=formation[index%formation.length];let position=null;
  for(let attempt=0;attempt<18;attempt++){
   const a=angle+index*Math.PI*2/Math.max(1,count)+rng()*.5,radius=1.8+rng()*3;
   const x=point[0]+Math.cos(a)*radius,y=point[1]+Math.sin(a)*radius;
   if(populationPositionSafe(world,party,(x+.5)*TILE,(y+.5)*TILE,16)){position={x,y};break;}
  }
  if(!position)continue;
  const enemy=makeEnemy(kind,`${encounterId}-${kind}-${index}`,name,position.x,position.y,{
   ...scaleEnemyStats(kind,tier),tier,encounterAllegiance:template.id,
   controlledMinion:template.id==='red-seal-scouts'&&kind==='exploder',
   visualFactionId:template.id==='red-seal-scouts'?'lastDawn':template.id==='roadless-patrol'?'roadless':undefined,
   sourceRegionId:continentRegionAt(position.x,position.y).id,dynamicEncounter:true,dynamicEncounterId:encounterId,
   spawnedAt:now,despawnAfter:900,guardRole:'roamingPatrol'
  });
  configureEncounterEnemy(enemy,profile,`${encounterId}:${index}`);world.enemies.push(enemy);
 }
}

function spawnTraveler(world, point, encounterId, now,rng=Math.random) {
  const template = TRAVELER_TEMPLATES[Math.floor(rng() * TRAVELER_TEMPLATES.length) % TRAVELER_TEMPLATES.length];
  const npc = makeObject('npc', `${encounterId}-${template.id}`, template.name, point[0], point[1], {
    npcId: `${encounterId}-${template.id}`,
    classId: template.classId,
    simulatedPlayer: !!template.classId,
    disposition: 'friendly',
    role: 'traveler',
    factionId: 'outpost',
    ambientWander: true,
    wanderRadiusTiles: 3,
    wanderSpeed: 17,
    wanderPauseMin: 0.9,
    wanderPauseMax: 3.0,
    labelPriority: 2,
    shirt: template.shirt,
    pants: '#26344a',
    boots: '#2b1f1a',
    talk: template.talk,
    dynamicEncounter: true,
    dynamicEncounterId: encounterId,
    spawnedAt: now,
    despawnAfter: 180 + rng() * 80
  });

  world.objects = world.objects || [];
  if(npc.simulatedPlayer)initializeSimulatedSubclassPlayer(npc);
  world.objects.push(npc);
}

function cleanupTemporaryEncounters(world, party, now) {
  if (Array.isArray(world.enemies)) {
    world.enemies = world.enemies.filter(enemy => {
      if (!enemy?.dynamicEncounter) return true;
      if((enemy.dead||Number(enemy.hp||0)<=0)&&!enemy.deathHandled)return true;
      if (enemy.dead || enemy.remove || Number(enemy.hp || 0) <= 0) {enemy.remove=true;return false;}
      if (Number(now || 0) - Number(enemy.spawnedAt || 0) < Number(enemy.despawnAfter || 240)) return true;
      const keep=distanceToNearestActor(enemy, party) <= CLEANUP_DISTANCE;if(!keep)enemy.remove=true;return keep;
    });
  }

  if (Array.isArray(world.objects)) {
    world.objects = world.objects.filter(object => {
      if (!object?.dynamicEncounter) return true;
      if (object.depleted || object.remove) return false;
      if (Number(now || 0) - Number(object.spawnedAt || 0) < Number(object.despawnAfter || 210)) return true;
      const keep=distanceToNearestActor(object, party) <= CLEANUP_DISTANCE;if(!keep)object.remove=true;return keep;
    });
  }
}

function pickSpawnPoint(world, party) {
  if(world.continentId)return pickContinentalSpawnPoint(world,party);
  const authored=(world.landscapes||(world.objects||[]).filter(o=>o.authoredSite&&o.type)).map(s=>[s.x/TILE,s.y/TILE,s.type==='ritual'?'redSeal':s.type==='quarry'?'watcherRidge':s.type==='marsh'?'ironMire':'thornwood']);
  const points=world.width>300?[...SPAWN_POINTS,...authored]:(world.authoredLocations||[]).map(s=>[s.x/TILE,s.y/TILE,world.regionId==='ascensionWastes'?'redSeal':'watcherRidge']);
  const shuffled = points
    .map(point => point)
    .sort(() => Math.random() - 0.5);

  for (const point of shuffled) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const x = point[0] + (Math.random() - 0.5) * 8;
      const y = point[1] + (Math.random() - 0.5) * 8;
      const worldX = x * TILE + TILE / 2;
      const worldY = y * TILE + TILE / 2;
      const outpostDistance = Math.hypot(x - ACT1_LANDMARKS.outpost[0], y - ACT1_LANDMARKS.outpost[1]);

      if (outpostDistance < SAFE_OUTPOST_RADIUS_TILES) continue;
      if (!isPassable(world, worldX, worldY)) continue;

      const nearest = distanceToNearestActor({ x: worldX, y: worldY }, party);
      if (nearest < MIN_SPAWN_DISTANCE || nearest > MAX_SPAWN_DISTANCE) continue;

      return [x, y, point[2]];
    }
  }

  return null;
}

function getPartyActors(game) {
  const host = game?.player;
  return [
    host,
    ...(host?.coop?.players || [])
  ].filter(actor => actor && actor.active !== false && actor.joined !== false && actor.dead !== true);
}

function getEncounterState(world) {
  world.overworldEncounterState = world.overworldEncounterState && typeof world.overworldEncounterState === 'object'
    ? world.overworldEncounterState
    : {};

  if (!Number.isFinite(Number(world.overworldEncounterState.timer))) {
    world.overworldEncounterState.timer = 18 + Math.random() * 12;
  }

  if (!Number.isFinite(Number(world.overworldEncounterState.spawnSerial))) {
    world.overworldEncounterState.spawnSerial = 1;
  }

  return world.overworldEncounterState;
}

function getEncounterTier(regionId) {
  if (regionId === 'redSeal') return 5;
  if (regionId === 'redRoad' || regionId === 'watcherRidge' || regionId === 'oldHollow' || regionId === 'ironMire') return 4;
  if (regionId === 'hunterReach' || regionId === 'pilgrimRoad' || regionId === 'pilgrimBridge') return 3;
  if (regionId === 'ashenOrchard' || regionId === 'thornwood' || regionId === 'mirrorGrove') return 2;
  return 1;
}

function countDynamicEnemies(world) {
  return (world.enemies || []).filter(enemy => {
    return enemy?.dynamicEncounter && !enemy.dead && !enemy.remove && Number(enemy.hp || 0) > 0;
  }).length;
}

function countDynamicNpcs(world) {
  return (world.objects || []).filter(object => object?.dynamicEncounter && object.kind === 'npc' && !object.depleted).length;
}

function distanceToNearestActor(entity, actors) {
  if (!actors.length) return Infinity;
  return Math.min(...actors.map(actor => Math.hypot(Number(entity.x || 0) - Number(actor.x || 0), Number(entity.y || 0) - Number(actor.y || 0))));
}

function chooseWeighted(entries,rng=Math.random) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight || 1)), 0);
  let roll = rng() * Math.max(1, total);

  for (const entry of entries) {
    roll -= Math.max(0, Number(entry.weight || 1));
    if (roll <= 0) return entry;
  }

  return entries[0] || null;
}

function nextEncounterDelay() {
  return 85 + Math.random() * 95;
}

function continentalEncounterLevel(point,rng){const r=continentRegionAt(point[0],point[1]);return r.levels[0]+Math.floor(rng()*(r.levels[1]-r.levels[0]+1));}
function pickContinentalSpawnPoint(world,party){
 const cycle=Math.floor((Number(world.continentalEncounterMemory?.elapsed)||Number(world.continentalEncounterClock)||0)/720);
 const points=[...SPAWN_POINTS.map(([x,y,type],i)=>({id:`echoryn-activity-${i}`,x,y,rx:4,ry:4,type})),...(world.encounterAreas||[])];
 for(const area of points){
  const actualCycle=world.continentalEncounterCycle||cycle;
  if(world.continentalEncounterMemory?.events?.[area.id]?.cycle===actualCycle)continue;
  const rng=seededRandom(`${area.id}-${actualCycle}`);
  for(let attempt=0;attempt<8;attempt++){
   const x=area.x+(rng()-.5)*area.rx*1.4,y=area.y+(rng()-.5)*area.ry*1.4,px=(x+.5)*TILE,py=(y+.5)*TILE;
   if(Math.hypot(x-ACT1_LANDMARKS.outpost[0],y-ACT1_LANDMARKS.outpost[1])<SAFE_OUTPOST_RADIUS_TILES||!isPassable(world,px,py))continue;
   if(area.quietRoad&&continentRoadAt(x,y,area.roadBuffer||7))continue;
   const distance=distanceToNearestActor({x:px,y:py},party);if(distance<MIN_SPAWN_DISTANCE||distance>MAX_SPAWN_DISTANCE)continue;
   const point=[x,y,area.type||area.regionId];point.stableId=area.id;point.area=area.type?null:area;return point;
  }
 }
 return null;
}

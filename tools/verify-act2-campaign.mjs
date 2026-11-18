import assert from 'node:assert/strict';
import {ACT2_FLAGS as F,SERAPH_DOMAINS,ZARYNTH_CAPITAL,ACT2_FINALE,LEGACY_ACT2,domainFlag} from '../src/act2CampaignData.js';
import {SERAPH_TRIALS} from '../src/seraphTrialData.js';
import {ACT2_ROOT_HEARTS} from '../src/act2World.js';
import {createContinentalWorld} from '../src/continentWorld.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {createPlayer,countItem,addItem,removeItem} from '../src/player.js';
import {isTilePassable,isActorPositionPassable} from '../src/world.js';
import {applyStoryFlags,getStoryFlag,setStoryFlag} from '../src/storyProgress.js';
import {updateAct2Campaign,handleAct2Station,checkAct2Entrance} from '../src/act2CampaignRuntime.js';
import {createDialogueState,openDialogue,chooseDialogueOption,startQuest} from '../src/dialogueSystem.js';
import {enterDungeon,exitDungeon,transitionDungeonFloor,resetDungeonSession,createDungeonWorld,sanitizeDungeonSaveState,restoreDungeonFromSaveState} from '../src/dungeonSystem.js';
import {updateDungeonArena} from '../src/dungeonArenaSystem.js';
import {updateEnemies} from '../src/combat.js';
import {applyBossStoryProgress} from '../src/storyRuntime.js';
import {answerPartyEntry} from '../src/partyEntrySystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {updateBossFramework} from '../src/bossSystem.js';
import {act2ZoneHits,buildAct2BossTell} from '../src/act2BossPatterns.js';

const domainIds=Object.keys(SERAPH_DOMAINS);
const continent=createContinentalWorld();
const entrances=Object.fromEntries(continent.continentRuntime.allObjects.filter(o=>[...domainIds,ZARYNTH_CAPITAL].includes(o.dungeonId)).map(o=>[o.dungeonId,o]));
const flag=(g,id)=>getStoryFlag(g.player,id);
const mock=()=>({player:createPlayer('Act II test'),world:continent,dialogue:createDialogueState(),camera:{x:0,y:0},canvas:{width:1280,height:800},logLines:[],log(){}});
const arrived=(g,id)=>!!g.player.quests.completed[id];

function choose(g,npc,key,actor=g.player){
  g.dialogue=createDialogueState();
  assert(openDialogue(g.dialogue,npc,actor,g.world),npc.name);
  const i=g.dialogue.options.findIndex(o=>o.id===key&&!o.disabled);
  assert(i>=0,`${npc.name}: ${key}; options: ${g.dialogue.options.map(o=>o.id)}`);
  assert(chooseDialogueOption(g.dialogue,actor,g.world,i));
  g.act2Clock=0;
  updateAct2Campaign(g);
}
const talk=(g,id,key)=>choose(g,g.world.objects.find(o=>o.npcId===`act2-${id}`),key);
const use=(g,id)=>assert(handleAct2Station(g,g.world.objects.find(o=>o.act2Station===id)));
function kill(g,predicate){
  const enemies=g.world.enemies.filter(predicate);
  assert(enemies.length,'Expected enemies to defeat');
  for(const e of enemies){e.hp=0;e.dead=true;e.arenaDormant=false;}
  updateEnemies(.02,g.player,g.world,g.log,12);
  g.act2Clock=0;updateAct2Campaign(g);
}
function leave(g){assert(exitDungeon(g,g.world.objects.find(o=>o.act2SurfaceExit)));}
function enter(g,id){assert(enterDungeon(g,entrances[id]),id);}
function stairs(g,direction){return g.world.objects.find(o=>o.kind==='dungeonStairs'&&o.direction===direction);}
function prepared(){
  const g=mock();
  applyStoryFlags(g.player,['story.act1Complete']);
  g.world=createCapitalHubWorld();updateAct2Campaign(g);
  assert(g.player.quests.active.act2AshesAfterDawn);
  choose(g,g.world.objects.find(o=>o.npcId==='wardenMael'),'commission');
  assert(arrived(g,'act2AshesAfterDawn'));
  g.world=continent;
  choose(g,continent.continentRuntime.allObjects.find(o=>o.npcId==='act2-examiner'),'witnesses');
  assert(arrived(g,'act2ThreeWitnesses'));
  return g;
}

for(const d of Object.values(SERAPH_DOMAINS)){
  assert(entrances[d.id],d.id);
  assert(isActorPositionPassable(continent,entrances[d.id].x,entrances[d.id].y,12),d.id);
}
for(const [id,floor] of [...domainIds.map(id=>[id,1]),[ZARYNTH_CAPITAL,1],[ZARYNTH_CAPITAL,2]]){
  const w=createDungeonWorld({dungeonId:id,floor});
  const tile=o=>[Math.floor(o.x/32),Math.floor(o.y/32)];
  const [sx,sy]=tile(w.spawn),visited=new Set(),queue=[[sx,sy]];
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i],key=`${x},${y}`;
    if(visited.has(key)||!isTilePassable(w,x,y))continue;
    visited.add(key);queue.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  for(const o of [...w.objects.filter(o=>!o.decorative),...w.enemies]){
    assert(visited.has(tile(o).join(',')),`${id} / ${floor}: unreachable ${o.name} ${tile(o)}`);
    assert(isActorPositionPassable(w,o.x,o.y,12),`${id} / ${floor}: inaccessible ${o.name}`);
  }
}
console.log('PASS physical entrances and reachable objectives in all five floors');

{
  const g=mock();
  assert(!enterDungeon(g,entrances[ZARYNTH_CAPITAL]));
  assert(!enterDungeon(g,entrances[domainIds[0]]));
  assert(!startQuest(g.player,LEGACY_ACT2));
  const prior={id:LEGACY_ACT2,completedAt:10};
  g.player.quests.completed[LEGACY_ACT2]=prior;
  g.player.quests.active[LEGACY_ACT2]={id:LEGACY_ACT2};
  updateAct2Campaign(g);
  assert.equal(g.player.quests.completed[LEGACY_ACT2],prior);
  assert(!g.player.quests.active[LEGACY_ACT2]);
  assert(!!checkAct2Entrance(g.player,ZARYNTH_CAPITAL));
  const boss={isBoss:true,isDungeonMainBoss:true,bossId:'seraphel'};
  assert(!applyBossStoryProgress(boss,g.player,{dungeonId:'shatteredChoir'}));
  assert(!applyBossStoryProgress({...boss,bossId:'zephyrLight'},g.player,{dungeonId:'ascensionSpire'}));
}
console.log('PASS Act I dependency, historical records, and obsolete boss gates');

const g=prepared();
assert(!enterDungeon(g,entrances[ZARYNTH_CAPITAL]));
enter(g,'unfinishedHour');
assert(g.player.quests.active.act2LifeUnlived);
let keeper=g.world.objects.find(o=>o.npcId==='act2-keeper');
g.dialogue=createDialogueState();openDialogue(g.dialogue,keeper,g.player,g.world);
assert(!g.dialogue.options.some(o=>o.id==='accept'&&!o.disabled));
for(const id of ['caravan','orrakai','covenant']){kill(g,e=>e.act2Group===id);use(g,id);}
talk(g,'keeper','accept');assert(arrived(g,'act2LifeUnlived'));leave(g);

enter(g,'lastStandBastion');
use(g,'water');assert(!flag(g,domainFlag('lastStandBastion','water')));
talk(g,'keeper','duel');
const duel=g.world.enemies.find(e=>e.act2Boss);
assert(duel.arenaDormant);
Object.assign(g.player,g.world.bossRoomCenter);updateDungeonArena(g.world,g.player,g);
assert.equal(g.world.bossArena.phase,'active');
assert(!exitDungeon(g,g.world.objects.find(o=>o.act2SurfaceExit)));
kill(g,e=>e===duel);
assert(flag(g,domainFlag('lastStandBastion','force')));
assert(arrived(g,'act2FortressDivided'));leave(g);

enter(g,'forgottenOssuary');
for(const [id,group] of [['crypt','flood'],['archive','archive'],['memorial','memorial']]){
  kill(g,e=>e.act2Group===group);use(g,id);
}
talk(g,'keeper','seal');assert(arrived(g,'act2DeadRemember'));
assert(arrived(g,'act2ThreeSeraphs'));
leave(g);
for(const id of domainIds)assert.equal(countItem(g.player,`concordantRelic_${id}`),1);
console.log('PASS out-of-order mixed routes, guarded evidence, duel, retreat and relics');

{
  const ally=createPlayer('Co-op companion');ally.questOwner=g.player;
  g.player.coop={players:[ally]};
  assert(!enterDungeon(g,entrances[ZARYNTH_CAPITAL]));
  assert(!flag(g,F.admitted));
  assert(!answerPartyEntry(g,g.player,true));
  assert(answerPartyEntry(g,ally,true));
  assert(flag(g,F.admitted));
  assert(!getStoryFlag(ally,F.admitted));
  g.player.coop=null;
}
assert.equal(g.world.dungeonId,ZARYNTH_CAPITAL);
assert(arrived(g,'act2ConcordantGate'));
for(const id of domainIds)assert.equal(countItem(g.player,`concordantRelic_${id}`),0);
assert(stairs(g,'down').locked);
talk(g,'zephyr','miracle');talk(g,'seraphel','audience');talk(g,'cassian','commission');
assert(!stairs(g,'down').locked);
assert(transitionDungeonFloor(g,stairs(g,'down')));
talk(g,'tavia','divert');
assert(!flag(g,F.response));
for(const side of ['west','east']){kill(g,e=>e.act2Group===side);use(g,`${side}Valve`);}
assert.equal(flag(g,'act2.outbreakOutcome'),'divert');
assert(!g.world.enemies.some(e=>e.act2Boss));
for(const id of ACT2_ROOT_HEARTS)kill(g,e=>e.act2Heart===id);
const boss=g.world.enemies.find(e=>e.act2Boss);
assert(boss&&boss.arenaDormant);
const dungeonSave=JSON.parse(JSON.stringify(sanitizeDungeonSaveState(g.world)));
assert(restoreDungeonFromSaveState(dungeonSave).enemies.some(e=>e.act2Boss===boss.act2Boss&&e.arenaDormant));
Object.assign(g.player,g.world.bossRoomCenter);updateDungeonArena(g.world,g.player,g);
kill(g,e=>e===boss);
assert(arrived(g,'act2RootCrowned'));
assert(!flag(g,'story.act2Complete'));
talk(g,'aftercare','intervention');
assert(transitionDungeonFloor(g,stairs(g,'up')));
talk(g,'maelReports','reports');
assert(arrived(g,ACT2_FINALE));
assert(flag(g,'story.act2Complete'));
assert(flag(g,'travel.severedCauseway.unlocked'));
const rewards=g.player.gold;
updateAct2Campaign(g,1);assert.equal(g.player.gold,rewards);

const profile=JSON.parse(JSON.stringify(createSaveState(g)));
const loaded=mock();
applySaveToGame(loaded,profile);
updateAct2Campaign(loaded);
assert(flag(loaded,F.admitted)&&arrived(loaded,ACT2_FINALE));
assert.equal(flag(loaded,'act2.outbreakOutcome'),'divert');
assert.equal(loaded.world.dungeonId,ZARYNTH_CAPITAL);
assert(loaded.world.safeZone);
assert.equal(loaded.player.gold,rewards);
leave(g);enter(g,ZARYNTH_CAPITAL);
assert.equal(g.world.floor,1);
assert(resetDungeonSession(g));
assert(g.player.worldMemory.dungeonRuns[ZARYNTH_CAPITAL]);
enter(g,ZARYNTH_CAPITAL);
assert(transitionDungeonFloor(g,stairs(g,'down')));
assert(!g.world.enemies.some(e=>e.act2Boss||e.act2Heart));
console.log('PASS unanimous party admission, three-heart lock, full finale and profile round-trip');

{
  const alternate=prepared();
  setStoryFlag(alternate.player,'order.founded');
  enter(alternate,'lastStandBastion');
  kill(alternate,e=>e.act2Group==='road');
  talk(alternate,'iria','greyhaven');talk(alternate,'iria','watch');
  talk(alternate,'keeper','escort');
  assert.equal(flag(alternate,domainFlag('lastStandBastion','resolution')),'screenedEscort');
  leave(alternate);
  for(const id of ['forgottenOssuary','unfinishedHour']){
    enter(alternate,id);talk(alternate,'keeper','duel');
    Object.assign(alternate.player,alternate.world.bossRoomCenter);updateDungeonArena(alternate.world,alternate.player,alternate);
    kill(alternate,e=>e.act2Boss===id);
    assert.equal(flag(alternate,domainFlag(id,'resolution')),'honoredDuel');
    leave(alternate);
  }
  const missing='concordantRelic_forgottenOssuary';
  const entry=alternate.player.inventory.find(o=>o.id===missing);
  alternate.player.inventory=alternate.player.inventory.filter(o=>o!==entry);
  assert(!enterDungeon(alternate,entrances[ZARYNTH_CAPITAL]),'testimony without the relic should fail');
  alternate.player.inventory.push(entry);
  enter(alternate,ZARYNTH_CAPITAL);
  talk(alternate,'zephyr','miracle');talk(alternate,'seraphel','audience');talk(alternate,'cassian','commission');
  assert(transitionDungeonFloor(alternate,stairs(alternate,'down')));
  for(const option of ['seal','evacuate']){
    const fork={...alternate,player:structuredClone(alternate.player),world:createDungeonWorld({dungeonId:ZARYNTH_CAPITAL,floor:2}),dialogue:createDialogueState()};
    talk(fork,'tavia',option);
    assert.equal(flag(fork,'act2.outbreakOutcome'),option);
    assert(flag(fork,F.response));
    assert.equal(fork.player.factionReputation.zarynth,option==='seal'?8:-4);
  }
}
console.log('PASS all three duel identities, negotiated Bastion with Greyhaven, relic possession, and both additional outbreak outcomes');

for(const id of [...domainIds,'rootCrownedBehemoth']){
  const enemy={act2Boss:id,x:100,y:100,boss:{phase:3}};
  const p={x:230,y:182,hp:100};
  const tells=[0,1,2].map(()=>buildAct2BossTell(enemy,p));
  assert(tells.every(t=>t.zones.length&&t.color&&t.label));
  assert(new Set(tells.map(t=>t.label)).size>=2);
  assert(tells.some(t=>t.zones.some(z=>act2ZoneHits(z,p))));
  assert(!tells.some(t=>t.zones.some(z=>act2ZoneHits(z,{x:-2000,y:-2000}))));
}
console.log('PASS telegraphed, distinct boss attack geometry');

{
  const world=createDungeonWorld({dungeonId:'lastStandBastion'});
  world.bossArena={phase:'active',x:26*32,y:7*32,w:27*32,h:23*32};
  const {x,y}=world.bossRoomCenter;
  const boss={id:'tell-probe',act2Boss:'lastStandBastion',isBoss:true,x,y,hp:500,maxHp:500,damage:24,radius:20,
    boss:{phase:1,act2Turn:0,introShown:true,specialTimer:0}};
  const inside=createPlayer('In charge lane'),outside=createPlayer('Out of charge lane');
  Object.assign(inside,{x:x+100,y,attackCooldown:0});
  Object.assign(outside,{x:x+100,y:y+130});
  inside.coop={players:[outside]};
  const before=inside.hp,safeBefore=outside.hp;
  updateBossFramework(boss,world,inside,.05,1);
  assert(boss.boss.pendingSpecial?.zones?.length);
  assert.equal(inside.hp,before);
  updateBossFramework(boss,world,inside,2,3);
  assert(inside.hp<before&&outside.hp===safeBefore);
  assert(!boss.boss.pendingSpecial);
}
console.log('PASS live boss windup, party hit and safe lane');

const alternateOrder = {
  lastStandBastion:['freightConvoy',null],
  forgottenOssuary:['keeperOfRites','blankNames'],
  unfinishedHour:['anchorReality','telescope']
};
{
  const pilgrim=prepared();
  for(const id of domainIds){
    enter(pilgrim,id);
    const trial=SERAPH_TRIALS[id], [resolution,extra]=alternateOrder[id];
    const keys=trial.stages.map(([key])=>key);
    use(pilgrim,keys[2]);assert(!flag(pilgrim,domainFlag(id,trial.result)));
    use(pilgrim,keys[0]);use(pilgrim,keys[2]);
    assert(!flag(pilgrim,domainFlag(id,trial.result)));
    use(pilgrim,keys[0]);
    leave(pilgrim);enter(pilgrim,id);
    assert(pilgrim.world.objects.find(o=>o.act2Station===keys[0]).seraphLit);
    for(const key of keys.slice(1))use(pilgrim,key);
    assert(flag(pilgrim,domainFlag(id,trial.result)));
    assert(!pilgrim.world.enemies.some(e=>e.act2Boss));
    assert(pilgrim.world.enemies.every(e=>e.seraphSprite));
    assert(new Set(pilgrim.world.enemies.map(e=>e.seraphSprite)).size>=2);
    if(extra)use(pilgrim,extra);
    if(id==='lastStandBastion'){
      const rations=countItem(pilgrim.player,'fieldRations');
      if(rations)removeItem(pilgrim.player,'fieldRations',rations);
      talk(pilgrim,'quartermaster','pledge');
      assert(!flag(pilgrim,domainFlag(id,'reliefPledge')));
      addItem(pilgrim.player,'fieldRations',12);talk(pilgrim,'quartermaster','pledge');
      assert.equal(countItem(pilgrim.player,'fieldRations'),4);
    }
    talk(pilgrim,'keeper',resolution);
    assert.equal(flag(pilgrim,domainFlag(id,'resolution')),resolution);
    const cache=pilgrim.world.objects.find(o=>o.kind==='dungeonChest');
    cache.claimed=cache.depleted=true;
    const saved=JSON.parse(JSON.stringify(sanitizeDungeonSaveState(pilgrim.world)));
    const absent=saved.enemies.pop().id;
    saved.objects=saved.objects.filter(o=>!o.seraphTrial);
    for(const row of saved.tiles)for(const cell of row)delete cell.seraphSurface;
    const restored=restoreDungeonFromSaveState(saved);
    assert.equal(restored.objects.filter(o=>o.seraphTrial).length,3);
    assert(restored.objects.find(o=>o.id===cache.id).claimed);
    assert(!restored.enemies.some(e=>e.id===absent));
    leave(pilgrim);
  }
  assert(arrived(pilgrim,'act2ThreeSeraphs'));
}
console.log('PASS new non-duel resolutions, failed sequence correction, supplies cost, return persistence and old instance repair');

{
  const world=createDungeonWorld({dungeonId:'forgottenOssuary'});
  const {x,y}=world.bossRoomCenter;
  const enemy={id:'volley-probe',act2Boss:'forgottenOssuary',isBoss:true,x,y,hp:250,maxHp:500,damage:24,radius:20,
    boss:{phase:2,act2Turn:0,introShown:true,specialTimer:0}};
  const player=createPlayer('Between the Bells');
  Object.assign(player,{x:x+98,y});
  const start=player.hp;
  updateBossFramework(enemy,world,player,.05,1);
  updateBossFramework(enemy,world,player,1.9,3);
  assert.equal(player.hp,start);
  assert.equal(enemy.boss.pendingSpecial.label,'Returning Toll');
  assert(enemy.boss.pendingSpecial.followup);
  updateBossFramework(enemy,world,player,1.1,5);
  assert(player.hp<start);
  assert.equal(enemy.boss.pendingSpecial,null);
}
console.log('PASS named second volleys warn separately and hit only their declared zone');

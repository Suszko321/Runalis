import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld,isActorPositionPassable,moveActorWithCollision} from '../src/world.js';
import {createPlayer,chooseClass,countItem} from '../src/player.js';
import {enterDungeon,transitionDungeonFloor,exitDungeon} from '../src/dungeonSystem.js';
import {createDialogueState,openDialogue,chooseDialogueOption,closeDialogue} from '../src/dialogueSystem.js';
import {interact} from '../src/gameInteraction.js';
import {updateEnemies} from '../src/combat.js';
import {updateOrchardDungeon} from '../src/ashenOrchardDungeon.js';
import {beginOrchardMove,updateOrchardCombat,ORCHARD_MOVES} from '../src/ashenOrchardCombat.js';
import {updateDungeonArena,resetFailedDungeonArena} from '../src/dungeonArenaSystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {rollLegendaryBossDrop} from '../src/legendarySystem.js';
import {createEnemyLootDrops} from '../src/lootSystem.js';
import {applyBossDefeatRewards} from '../src/bossSystem.js';
const checks=[],check=(name,fn)=>{fn();checks.push(name);console.log('PASS',name);},w=createWorld(),p=createPlayer('Orchard verifier');chooseClass(p,'oathkeeper');
const g={world:w,player:p,dialogue:createDialogueState(),canvas:{width:1440,height:1000},camera:{x:0,y:0},log(){},logLines:[],shake(){}};
function choose(npcId,id){closeDialogue(g.dialogue,{immediate:true});const npc=(g.world.continentRuntime?.allObjects||g.world.objects).find(o=>o.npcId===npcId);assert(npc,npcId);assert(openDialogue(g.dialogue,npc,g.player,g.world));const i=g.dialogue.options.findIndex(o=>o.id===id&&!o.disabled);assert(i>=0,id);assert(chooseDialogueOption(g.dialogue,g.player,g.world,i));closeDialogue(g.dialogue,{immediate:true});updateOrchardDungeon(g);}
function save(){const stage=g.player.quests.active.orchardBelowTheBurn?.currentStageId;assert(applySaveToGame(g,JSON.parse(JSON.stringify(createSaveState(g)))));assert.equal(g.player.quests.active.orchardBelowTheBurn?.currentStageId,stage);updateOrchardDungeon(g);}
function reachable(w){const q=[[Math.floor(g.player.x/32),Math.floor(g.player.y/32)]],seen=new Set([q[0].join(',')]);for(let i=0;i<q.length;i++){const[x,y]=q[i];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=`${a},${b}`;if(seen.has(k)||!isActorPositionPassable(w,(a+.5)*32,(b+.5)*32,12))continue;seen.add(k);q.push([a,b]);}}return seen;}
check('existing camp engineer starts the new quest; a missing attendant waits below',()=>{
 choose('orchardReliefEngineer','helpCellar');assert(g.player.quests.active.orchardBelowTheBurn);const entrance=w.continentRuntime.allObjects.find(o=>o.id==='ashenOrchardCellarEntrance');assert(entrance);Object.assign(g.player,{x:entrance.x,y:entrance.y});assert(enterDungeon(g,entrance));assert(g.world.dungeonState.orchard);assert.equal(g.world.totalFloors,2);assert(g.dialogue.active);choose('orchardTamsin','plan');assert.equal(g.player.quests.active.orchardBelowTheBurn.currentStageId,'returns');save();
});
check('both authored workrooms are reachable; returns require guards and survive reloads',()=>{
 const seen=reachable(g.world);for(const o of g.world.objects.filter(o=>o.orchardValve!=null))assert(seen.has(`${Math.floor(o.x/32)},${Math.floor(o.y/32)}`));const stair=g.world.objects.find(o=>o.direction==='down');assert(stair.locked);assert(!transitionDungeonFloor(g,stair));
 for(let i=0;i<2;i++){const v=g.world.objects.find(o=>o.orchardValve===i);Object.assign(g.player,{x:v.x,y:v.y});interact(g);assert(!g.player.story.flags.orchard?.[`return${i}`]);for(const e of g.world.enemies.filter(e=>e.orchardValveGuard===i))e.hp=0;updateEnemies(0,g.player,g.world,g.log,1,g);interact(g);updateOrchardDungeon(g);assert(g.player.story.flags.orchard[`return${i}`]);save();}
 assert.equal(g.player.quests.active.orchardBelowTheBurn.currentStageId,'custodian');assert(!g.world.objects.find(o=>o.direction==='down').locked);
});
check('Founders’ Cistern has a dedicated boss and seals movement, stairs and exits',()=>{
 assert(transitionDungeonFloor(g,g.world.objects.find(o=>o.direction==='down')));assert.equal(g.world.floor,2);const seen=reachable(g.world);assert(seen.has('32,19'));const e=g.world.enemies.find(e=>e.orchardCustodian);assert(e&&e.isDungeonMainBoss);assert.equal(g.world.enemies.length,1);Object.assign(g.player,{x:32.5*32,y:29*32});updateDungeonArena(g.world,g.player);assert.equal(g.world.bossArena.phase,'active');assert.equal(g.world.arenaBarriers.length,4);assert(!transitionDungeonFloor(g,g.world.objects.find(o=>o.direction==='up')));assert(!exitDungeon(g));const a=g.world.bossArena;Object.assign(g.player,{x:a.x+50,y:a.y+100});moveActorWithCollision(g.player,g.world,-200,0,12);assert(g.player.x>a.x);save();assert.equal(g.world.bossArena.phase,'active');
});
check('pressure patterns warn before damaging, escalate and reset cleanly on defeat',()=>{
 const e=g.world.enemies.find(e=>e.orchardCustodian);e.orchardRecovery=2;updateEnemies(0,g.player,g.world,g.log,1,g);e.orchardRecovery=0;
 for(const key of Object.keys(ORCHARD_MOVES)){
  g.player.hp=g.player.maxHp;g.player.invulnerableUntil=0;Object.assign(g.player,{x:e.x+110,y:e.y+60});e.orchardRecovery=0;const a=beginOrchardMove(e,g.world,g.player,key),before=g.player.hp;updateOrchardCombat(e,g.world,g.player,a.tell-.01,2);assert.equal(g.player.hp,before);assert(!a.released);g.camera={x:e.x-700,y:e.y-450};
  const s=a.shapes[0];if(key==='press')Object.assign(g.player,{x:e.x+80,y:e.y+44});if(key==='reversal')Object.assign(g.player,{x:s.x,y:s.y+180});if(key==='levy')Object.assign(g.player,{x:e.x+240,y:e.y});if(key==='spokes')Object.assign(g.player,{x:e.x+90,y:e.y+49});
  updateEnemies(.02,g.player,g.world,g.log,3,g);assert(a.released);assert(g.player.hp<before,key);e.orchardAttack=null;
 }
 e.hp=e.maxHp*.6;updateOrchardCombat(e,g.world,g.player,.1,4);assert.equal(e.orchardPhase,2);e.hp=e.maxHp*.2;updateOrchardCombat(e,g.world,g.player,.1,4);assert.equal(e.orchardPhase,3);resetFailedDungeonArena(g.world);assert.equal(e.hp,e.maxHp);assert.equal(e.orchardPhase,1);assert(!e.orchardAttack);assert.equal(g.world.arenaBarriers.length,0);
});
check('boss death clears the original main-quest dungeon ID and the camp report concludes once',()=>{
 const e=g.world.enemies.find(e=>e.orchardCustodian);Object.assign(g.player,{x:e.x,y:e.y+100,hp:g.player.maxHp});updateDungeonArena(g.world,g.player);e.hp=0;updateEnemies(0,g.player,g.world,g.log,5,g);updateDungeonArena(g.world,g.player);updateOrchardDungeon(g);assert(g.player.completedDungeons.ashenOrchard);assert(g.world.dungeonState.cleared);assert.equal(g.world.arenaBarriers.length,0);assert.equal(g.player.quests.active.orchardBelowTheBurn.currentStageId,'report');save();assert(exitDungeon(g,g.world.objects.find(o=>o.returnPortal)));const tonics=countItem(g.player,'shrineTonic');choose('orchardReliefEngineer','report');assert(g.player.quests.completed.orchardBelowTheBurn);assert.equal(countItem(g.player,'shrineTonic'),tonics+2);save();assert.equal(countItem(g.player,'shrineTonic'),tonics+2);
});
check('Founder’s Signet is a dedicated 2% roll, including early-level bosses, with no duplicate rolls',()=>{
 const boss=()=>({id:'orchardCustodian',isBoss:true,orchardCustodian:true,encounterStatsVersion:'geographic-density-1',combatLevel:5});
 assert.equal(rollLegendaryBossDrop(boss(),()=>.019999)?.item,'orrakaiFoundersSignet');assert.equal(rollLegendaryBossDrop(boss(),()=>.02),null);assert.equal(rollLegendaryBossDrop(boss(),()=>.99),null);const e=boss();assert(rollLegendaryBossDrop(e,()=>0));assert.equal(rollLegendaryBossDrop(e,()=>0),null);
 let hits=0;for(let i=0;i<10000;i++)if(rollLegendaryBossDrop(boss(),()=>i/10000))hits++;assert.equal(hits,200);
 const e2={...boss(),x:g.player.x,y:g.player.y,rewardSeed:'signet-duplicate'};const drops=createEnemyLootDrops(e2,g.player,g.world);assert(drops.filter(d=>d.itemId==='orrakaiFoundersSignet').length<=1);assert.equal(createEnemyLootDrops(e2,g.player,g.world).length,0);
 const testPlayer=createPlayer('No hidden first-kill roll'),originalRandom=Math.random;try{Math.random=()=>0;applyBossDefeatRewards(boss(),testPlayer,{dungeonId:'ashenOrchard'},()=>{});}finally{Math.random=originalRandom;}assert.equal(countItem(testPlayer,'orrakaiFoundersSignet'),0,'Generic first-kill rewards must not add an 18% Signet roll');
});
fs.mkdirSync('docs/ashen-orchard-pass',{recursive:true});fs.writeFileSync('docs/ashen-orchard-pass/verification.json',JSON.stringify({checks},null,2));

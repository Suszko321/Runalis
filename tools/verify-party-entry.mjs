import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {applyDungeonPartyTether} from '../src/coopSharedScreen.js';
import {createDialogueState} from '../src/dialogueSystem.js';
import {requestPartyEntry,answerPartyEntry,updatePartyEntry,partyEntrySnapshot,receivePartyEntry,cancelPartyEntry,handlePartyEntryInput} from '../src/partyEntrySystem.js';
import {enterDungeon,createDungeonWorld} from '../src/dungeonSystem.js';
import {enterSideZone,createProceduralSideZoneWorld} from '../src/sideZoneSystem.js';
import {enterTower} from '../src/towerSystem.js';
import {updateDungeonArena} from '../src/dungeonArenaSystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
let now=1000;
const original=Object.getOwnPropertyDescriptor(performance,'now');
Object.defineProperty(performance,'now',{configurable:true,value:()=>now});
function game(n=4,world={mode:'overworld',enemies:[]}){
 const members=Array.from({length:n},(_,i)=>{const p=createPlayer(`Player ${i+1}`);chooseClass(p,'oathkeeper');return Object.assign(p,{slot:i+1,active:true,joined:true});});
 const p=members[0];p.coop={enabled:n>1,players:members.slice(1)};
 return {player:p,world,canvas:{width:1280,height:800},camera:{x:0,y:0},dialogue:createDialogueState(),logLines:[],log(){},shake(){}};
}
const party=g=>[g.player,...g.player.coop.players];
const check=(name,fn)=>{fn();console.log('PASS',name);};
try{
 for(let n=2;n<=4;n++)check(`${n} actors: explicit unanimous acceptance commits exactly once`,()=>{
  const g=game(n),members=party(g);let commits=0;
  assert.equal(requestPartyEntry(g,{key:'test',title:'Crypt',initiator:members.at(-1),commit:()=>commits++}),false);
  const id=g.partyEntryReady.id;assert.equal(g.partyEntryReady.deadline-now,10000);assert.equal(partyEntrySnapshot(g,members.at(-1)).initiator,n-1);
  assert(!g.partyEntryReady.answers.size);for(const p of members.slice(0,-1)){answerPartyEntry(g,p,true);assert.equal(commits,0);}
  answerPartyEntry(g,members.at(-1),true);answerPartyEntry(g,members.at(-1),true,id);assert.equal(commits,1);assert.equal(g.partyEntryReady,null);
 });
 check('decline, timeout, stale votes, party changes and incapacitation cannot commit',()=>{
  const g=game();let commits=0;const request=()=>requestPartyEntry(g,{key:'test',title:'Crypt',commit:()=>commits++});
  request();const old=g.partyEntryReady.id;answerPartyEntry(g,g.player,true);answerPartyEntry(g,party(g)[2],false);assert.equal(g.partyEntryReady,null);
  request();answerPartyEntry(g,g.player,true,old);assert.equal(g.partyEntryReady.answers.size,0);now+=10000;answerPartyEntry(g,g.player,true);assert.equal(g.partyEntryReady,null);
  request();party(g)[1].active=false;updatePartyEntry(g);assert.equal(g.partyEntryReady,null);party(g)[1].active=true;
  request();g.player.coop.players.push({...createPlayer('New join'),active:true});g.player.coop.players[0].active=false;updatePartyEntry(g);assert.equal(g.partyEntryReady,null);
  g.player.coop.players=[];g.player.hp=0;assert.equal(requestPartyEntry(g,{force:true,title:'Boss',commit:()=>commits++}),false);assert.equal(g.partyEntryReady,null);
  assert.equal(commits,0);
 });
 check('controller votes belong to their actor, and the initiating interaction is consumed',()=>{
  const g=game(2),p2=party(g)[1];g.getAllControllerInputsForUi=()=>[{confirmPressed:true}];g.getActorForControllerInput=()=>p2;
  requestPartyEntry(g,{title:'Crypt',commit(){}});handlePartyEntryInput(g);assert.equal(g.partyEntryReady.answers.size,0);
  now+=251;handlePartyEntryInput(g);assert(g.partyEntryReady.answers.has(p2));assert(!g.partyEntryReady.answers.has(g.player));cancelPartyEntry(g);
 });
 check('online snapshots contain display data and an individual self identity, never callbacks or actor objects',()=>{
  const g=game(3);requestPartyEntry(g,{title:'Crypt',commit(){}});answerPartyEntry(g,g.player,true);
  const snapshot=partyEntrySnapshot(g,party(g)[2]);assert.equal(snapshot.self,2);assert(snapshot.members[0].ready);assert(!('commit'in snapshot));assert(!('world'in snapshot));
  const guest=game(1);receivePartyEntry(guest,JSON.parse(JSON.stringify(snapshot)));assert.equal(guest.partyEntryRemote.deadline-now,10000);receivePartyEntry(guest,null);assert.equal(guest.partyEntryRemote,null);cancelPartyEntry(g);
 });
 for(const type of ['dungeon','grove','tower'])check(`${type} entry by P2 defers world mutation, then gathers the full party`,()=>{
  const g=game(4,createWorld()),originalWorld=g.world,entrance={id:'party-entry-'+type,dungeonId:'ashenOrchard',name:'Party entry review',sideZoneType:'hollowGrove',sourceRegionId:'hearthmereFrontier',x:g.player.x,y:g.player.y};
  const view={hostGame:g,player:party(g)[1]};
  const result=type==='dungeon'?enterDungeon(view,entrance):type==='grove'?enterSideZone(view,entrance):enterTower(view,1,entrance);
  assert.equal(result,false);assert.equal(g.world,originalWorld);assert.equal(g.overworldState,undefined);assert.equal(g.partyEntryReady.initiator,party(g)[1]);
  for(const p of party(g))answerPartyEntry(g,p,true);assert.notEqual(g.world,originalWorld);
  for(const p of party(g)){assert(Math.hypot(p.x-g.world.spawn.x,p.y-g.world.spawn.y)<150);assert(isActorPositionPassable(g.world,p.x,p.y,p.r||12));}
 });
 for(const type of ['mother','custodian','generic'])check(`${type} boss: consent before sealing, no repeat after rejection, everyone pulled on acceptance`,()=>{
  const world=type==='mother'?createProceduralSideZoneWorld({type:'hollowGrove',playerCount:4}):createDungeonWorld(type==='custodian'?{dungeonId:'ashenOrchard',floor:2,playerCount:4}:{dungeonId:'party-test-crypt',floor:2,playerCount:4});
  const g=game(4,world),a=world.bossArena;assert(a);const members=party(g);
  for(const p of members){p.x=world.spawn.x;p.y=world.spawn.y;}Object.assign(members[2],{x:a.x+a.w/2,y:a.y+a.h/2});
  updateDungeonArena(world,g.player,g);assert(g.partyEntryReady);assert.equal(a.phase,'dormant');assert.equal(world.arenaBarriers.length,0);assert(world.enemies.filter(e=>a.bossIds.includes(e.id)).every(e=>e.arenaDormant));
  answerPartyEntry(g,members[1],false);updateDungeonArena(world,g.player,g);assert.equal(g.partyEntryReady,null);assert.equal(a.phase,'dormant');
  for(const p of members){p.x=a.x-100;p.y=a.y-100;}updateDungeonArena(world,g.player,g);
  Object.assign(members[2],{x:a.x+a.w/2,y:a.y+a.h/2});updateDungeonArena(world,g.player,g);assert(g.partyEntryReady);
  for(const p of members)answerPartyEntry(g,p,true);assert.equal(a.phase,'active');assert(world.arenaBarriers.length);
  for(const p of members)assert(p.x>a.x&&p.x<a.x+a.w&&p.y>a.y&&p.y<a.y+a.h);
 });
 check('pending votes are transient and loading a save cannot commit them',()=>{
  const g=game(2,createWorld());let commits=0;requestPartyEntry(g,{title:'Crypt',commit:()=>commits++});
  const state=JSON.parse(JSON.stringify(createSaveState(g)));assert(!JSON.stringify(state).includes('partyEntryReady'));applySaveToGame(g,state);assert.equal(g.partyEntryReady,null);assert.equal(commits,0);
 });
 check('solo travel stays immediate',()=>{const g=game(1);assert(requestPartyEntry(g,{title:'Crypt',commit(){}}));assert.equal(g.partyEntryReady,undefined);});
 check('overworld movement stays independent of distant party members',()=>{const g=game(4);const result=applyDungeonPartyTether(g,g.player,10000,20000);assert.deepEqual(result,{x:10000,y:20000,limited:false});assert.equal(g.partyEntryReady,undefined);});
}finally{if(original)Object.defineProperty(performance,'now',original);else delete performance.now;}

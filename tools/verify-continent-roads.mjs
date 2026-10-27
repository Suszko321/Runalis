import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,addItem,countItem} from '../src/player.js';
import {startTravelRoute,completeTravelRoute,returnAlongRoute,startStoryExpedition,updateContinentalTravelArrival} from '../src/travelSystem.js';
import {setStoryFlag} from '../src/storyProgress.js';
const report={checks:[]};
function check(name,fn){fn();report.checks.push(name);console.log('PASS '+name);}
function fixture(regionId='hearthmereFrontier'){
 const player=createPlayer('Road verification');Object.assign(player,{x:2000,y:3000,gold:20});
 const ally={x:2040,y:3000,active:true};player.coop={players:[ally]};
 const world={continentId:'runalis',mode:'overworld',regionId,objects:[],enemies:[]},logLines=[];
 return {player,world,logLines,log(line){logLines.push(line);},save(){this.saved=(this.saved||0)+1;},camera:{x:9,y:11}};
}
check('every continental route gate is directions-only for an unprepared beginner',()=>{
 for(const route of ['pilgrimRoad','severedCauseway'])for(const fn of [startTravelRoute,completeTravelRoute,returnAlongRoute]){
  const game=fixture(),world=game.world,state=JSON.stringify({x:game.player.x,y:game.player.y,gold:game.player.gold,inventory:game.player.inventory,ally:game.player.coop.players,camera:game.camera});
  assert.ok(fn(game,route));assert.equal(game.world,world);assert.equal(JSON.stringify({x:game.player.x,y:game.player.y,gold:game.player.gold,inventory:game.player.inventory,ally:game.player.coop.players,camera:game.camera}),state);
  assert.match(game.logLines.at(-1),/walk this road at any level without a permit or travel fee/);assert.equal(game.player.story.act,'act1');
 }
});
check('Orrakai north gate gives an open-road exit direction without charging or rebuilding',()=>{
 const game=fixture();game.world={mode:'capital',name:'Orrakai'};const world=game.world;
 startTravelRoute(game,'pilgrimRoad');assert.equal(game.world,world);assert.equal(game.player.gold,20);assert.match(game.logLines.at(-1),/South Town Gate/);
});
check('early physical exploration cannot start either later act or its main quest',()=>{
 const game=fixture('aureateMarches');assert.equal(updateContinentalTravelArrival(game),false);assert.equal(game.player.story.act,'act1');assert.ok(!game.player.quests.active.act2AureateReckoning);
 game.world.regionId='ascensionWastes';assert.equal(updateContinentalTravelArrival(game),false);assert.equal(game.player.story.act,'act1');assert.ok(!game.player.quests.active.act3Severance);
});
check('physical story arrival requires both the previous quest and its completion flag, then advances once',()=>{
 const game=fixture('aureateMarches');game.player.quests.completed.act1HearthmereAshes={id:'act1HearthmereAshes'};
 assert.equal(updateContinentalTravelArrival(game),false);setStoryFlag(game.player,'act1Complete');assert.ok(updateContinentalTravelArrival(game));
 assert.equal(game.player.story.act,'act2');assert.ok(game.player.quests.active.act2AureateReckoning);assert.ok(game.player.travel.routes.pilgrimRoad.arrivedOnFoot);assert.equal(game.saved,1);assert.equal(updateContinentalTravelArrival(game),false);
 game.world.regionId='ascensionWastes';setStoryFlag(game.player,'act2Complete');assert.equal(updateContinentalTravelArrival(game),false);
 game.player.quests.completed.act2AureateReckoning={id:'act2AureateReckoning'};assert.ok(updateContinentalTravelArrival(game));assert.equal(game.player.story.act,'act3');assert.ok(game.player.quests.active.act3Severance);assert.equal(game.saved,2);
});
check('explicit escorted expedition retains story and supply requirements without gating walking',()=>{
 const game=fixture(),world=game.world;
 startStoryExpedition(game,'pilgrimRoad');assert.equal(game.player.travel.activeRoute,null);assert.equal(game.player.gold,20);assert.equal(game.world,world);
 assert.match(game.logLines.at(-1),/escorted expedition needs/);
 game.player.quests.completed.act1HearthmereAshes={id:'act1HearthmereAshes'};setStoryFlag(game.player,'act1Complete');game.player.gold=1000;addItem(game.player,'fieldRations',400);addItem(game.player,'pilgrimRoadPermit',1);
 const initial=countItem(game.player,'fieldRations');startStoryExpedition(game,'pilgrimRoad');assert.equal(game.world,world);assert.equal(game.player.x,2000);assert.equal(game.player.gold,250);assert.equal(countItem(game.player,'fieldRations'),initial-320);assert.equal(game.player.travel.activeRoute.id,'pilgrimRoad');
 startStoryExpedition(game,'pilgrimRoad');assert.equal(game.player.gold,250);assert.equal(countItem(game.player,'fieldRations'),initial-320,'Preparing twice charged twice');
 game.world.regionId='aureateMarches';assert.ok(updateContinentalTravelArrival(game));assert.equal(game.player.travel.activeRoute,null);
});
fs.mkdirSync('docs/world-rebuild',{recursive:true});fs.writeFileSync('docs/world-rebuild/road-verification.json',JSON.stringify({...report,pass:true},null,2));
console.log(`Verified ${report.checks.length} continuous road and story arrival contracts.`);

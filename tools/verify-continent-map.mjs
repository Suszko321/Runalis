import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SURVEY_CELL,surveyKey,getSurvey,renderSurveyArt,revealSurvey,migrateContinentalSurvey} from '../src/mapSurvey.js';
import {worldEntityMemoryKey,worldEntityMemoryId,rememberHarvest,travelAvailability,travelByStone} from '../src/worldExploration.js';
import {migrateContinentalPosition} from '../src/continentDefinition.js';
import {TILE} from '../src/data.js';
const report={checks:[]};
const test=(name,fn)=>{const detail=fn();report.checks.push({name,detail});console.log('PASS '+name);};
const continent={continentId:'runalis',geographyVersion:1,mode:'overworld',regionId:'aureateMarches',width:2880,height:960,name:'Runalis'};
test('continental survey rendering never reads the lazy tile grid',()=>{
 const world={...continent,get tiles(){throw Error('Full terrain grid accessed while rendering map');}};
 const memory={surveys:{}};const survey=getSurvey(memory,world);survey.cells['2,3']=true;
 const art=renderSurveyArt(world,survey);
 assert.match(art,/data-survey-macro="continent"/);assert.match(art,/viewBox="0 0 2880 960"/);assert.match(art,/<mask/);assert.match(art,/Unexplored|unexplored/);assert.ok(art.length<100000,'Macro survey unexpectedly huge');
 return {svgBytes:art.length};
});
test('known regional and route survey footprints migrate once without uncovering distant regions',()=>{
 const memory={surveys:{'overworld:hearthmereFrontier':{cells:{'4,5':true},biomes:{woodland:{x:36,y:44,name:'Echoryn Woodland'}}},'overworld:aureateMarches':{cells:{'2,3':true},biomes:{aureate:{x:20,y:28,name:'Aureate Marches'}}},'travelRoute:pilgrimRoad:1':{cells:{'5,3':true},biomes:{}}}};
 const target=migrateContinentalSurvey(memory,continent);
 assert.equal(target.cells['4,5'],true);
 const a=migrateContinentalPosition('aureateMarches',16*TILE,24*TILE),b=migrateContinentalPosition('aureateMarches',24*TILE,32*TILE);
 for(let y=Math.floor(a.y/TILE/SURVEY_CELL);y<Math.ceil(b.y/TILE/SURVEY_CELL);y++)for(let x=Math.floor(a.x/TILE/SURVEY_CELL);x<Math.ceil(b.x/TILE/SURVEY_CELL);x++)assert.ok(target.cells[`${x},${y}`]);
 const before=JSON.stringify(target);migrateContinentalSurvey(memory,continent);assert.equal(JSON.stringify(target),before);
 assert.ok(!target.cells['340,50'],'Zarynth revealed by unrelated legacy visit');assert.equal(target.biomes.aureateMarches.x,980);
 return {migratedCells:Object.keys(target.cells).length};
});
test('a regional boundary does not change survey, site or harvest identities',()=>{
 assert.equal(surveyKey(continent),'overworld:runalis');assert.equal(surveyKey({...continent,regionId:'zarynth'}),'overworld:runalis');
 const herb={id:'wild-emberleaf-7-36',kind:'herb',sourceRegionId:'hearthmereFrontier',respawn:420};
 const player={worldMemory:{elapsed:20}},game={player,world:continent};rememberHarvest(game,herb);
 assert.equal(player.worldMemory.harvests['overworld:hearthmereFrontier:'+herb.id],440);
 game.world={...continent,regionId:'zarynth'};assert.equal(worldEntityMemoryKey(game.world,herb),'overworld:hearthmereFrontier');
 const ore={id:'route-ore',sourceRegionId:'pilgrimRoadRoute',sourceWorldMode:'travelRoute',sourceRouteId:'pilgrimRoad'};rememberHarvest(game,ore);
 assert.equal(player.worldMemory.harvests['travelRoute:pilgrimRoad:1:route-ore'],320);
 const migrated={id:'aureateMarches:auth-wayyard-resource',sourceEntityId:'auth-wayyard-resource',sourceRegionId:'aureateMarches'};rememberHarvest(game,migrated);assert.equal(worldEntityMemoryId(migrated),'auth-wayyard-resource');assert.equal(player.worldMemory.harvests['overworld:aureateMarches:auth-wayyard-resource'],320);
 return {keys:Object.keys(player.worldMemory.harvests)};
});
function travelGame(){
 const source={id:'source',kind:'navStone',name:'West',x:100,y:100,sourceRegionId:'hearthmereFrontier'},target={id:'target',kind:'navStone',name:'Far East',x:88000,y:18000,sourceRegionId:'zarynth'};
 const player={x:source.x,y:source.y,hp:100,inventory:[{id:'fieldRations',qty:2}],worldMemory:{stones:{source:{},target:{}},elapsed:10}};
 const calls=[],world={...continent,objects:[],enemies:[],effects:[],navStones:[source,target],tiles:new Proxy([],{get(_rows,y){if(!/^\d+$/.test(String(y)))return undefined;return new Proxy([],{get(_row,x){if(/^\d+$/.test(String(x)))return {biome:'grass',passable:true};}});}})};
 world.continentRuntime={previewAt(x,y,p){calls.push({kind:'preview',x,y});return {objects:[],enemies:[]};},refresh(game){calls.push({kind:'refresh',x:game.player.x,y:game.player.y});game.world.regionId='zarynth';}};
 return {player,world,camera:{x:0,y:0},canvas:{width:1000,height:600},calls,log(){},save(){}};
}
test('remote destination enemies block travel before any cost or party mutation',()=>{
 const game=travelGame(),target=game.world.navStones[1],active=game.world.enemies;
 game.world.continentRuntime.previewAt=()=>({objects:[],enemies:[{id:'remote-guard',x:target.x+20,y:target.y,hp:100}]});
 const result=travelAvailability(game,'target');assert.equal(result.ok,false);assert.match(result.reason,/Danger/);
 assert.equal(travelByStone(game,'target'),false);assert.equal(game.player.inventory[0].qty,2);assert.equal(game.player.x,100);assert.equal(game.world.enemies,active);
});
test('successful global Nav travel consumes one ration and activates destination before camera placement',()=>{
 const game=travelGame();assert.ok(travelByStone(game,'target'));assert.equal(game.player.x,88000);assert.equal(game.player.y,18000);assert.equal(game.player.inventory[0].qty,1);assert.equal(game.player.worldMemory.elapsed,130);
 assert.ok(game.calls.some(c=>c.kind==='preview'));assert.deepEqual(game.calls.find(c=>c.kind==='refresh'),{kind:'refresh',x:88000,y:18000});assert.equal(game.world.regionId,'zarynth');assert.equal(game.camera.x,87500);
 assert.ok(Object.keys(game.player.worldMemory.surveys['overworld:runalis'].cells).length>0);
});
test('depleted resources preserve their original key outside their source region',()=>{
 const game=travelGame();const object={id:'persistent-node',kind:'ore',sourceRegionId:'hearthmereFrontier',respawn:300};
 rememberHarvest(game,object);game.world.regionId='ascensionWastes';rememberHarvest(game,object);
 assert.deepEqual(Object.keys(game.player.worldMemory.harvests),['overworld:hearthmereFrontier:persistent-node']);
});
fs.mkdirSync('docs/world-rebuild',{recursive:true});fs.writeFileSync('docs/world-rebuild/map-node-verification.json',JSON.stringify({...report,pass:true},null,2));
console.log(`Verified ${report.checks.length} continent map/survey/travel contracts.`);

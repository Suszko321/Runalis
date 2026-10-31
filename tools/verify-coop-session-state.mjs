import assert from 'node:assert/strict';
import {createControllerManager,updateControllerManager,getControllerInput} from '../src/inputController.js';
import {createPlayer} from '../src/player.js';
import {makeEnemy} from '../src/world.js';
import {scaleEnemyStats} from '../src/overworldUtils.js';
import {updateEnemies} from '../src/combat.js';
import {captureContinentalState,continentalGeneratedEntities} from '../src/continentPersistence.js';
let pads=[];Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>pads}});
const pad=(id,index,axis=0,buttons=[])=>({id,index,connected:true,axes:[axis,0,0,0],buttons:Array.from({length:16},(_,i)=>({pressed:buttons.includes(i),value:buttons.includes(i)?1:0}))});
const manager=createControllerManager();pads=[pad('P1 device',0),pad('P2 device',1)];updateControllerManager(manager);
pads=[pad('P2 device',0,-1),pad('P1 device',1,1)];updateControllerManager(manager);
assert.equal(getControllerInput(manager,0).id,'P1 device');assert.equal(getControllerInput(manager,0).moveX,1);assert.equal(getControllerInput(manager,1).moveX,-1);
pads=[pad('P2 device',0)];updateControllerManager(manager);assert(!getControllerInput(manager,0).connected);assert(getControllerInput(manager,1).connected);
pads=[pad('P1 device',0),pad('P2 device',1)];updateControllerManager(manager);
for(const first of [8,9]){pads[1]=pad('P2 device',1,0,[first]);updateControllerManager(manager);pads[1]=pad('P2 device',1,0,[8,9]);updateControllerManager(manager);assert(getControllerInput(manager,1).dropOutPressed);pads[1]=pad('P2 device',1);updateControllerManager(manager);}
console.log('PASS logical device ownership across hardware-index swaps, disconnect/reconnect, and either drop-out chord order');
const same=createControllerManager(),a=pad('Same model',0,1),b=pad('Same model',1,-1);pads=[a,b];updateControllerManager(same);pads=[b,a];updateControllerManager(same);assert.equal(getControllerInput(same,0).moveX,1);assert.equal(getControllerInput(same,1).moveX,-1);pads=[b];updateControllerManager(same);assert(!getControllerInput(same,0).connected);assert(getControllerInput(same,1).connected);
console.log('PASS same-model controllers keep live object ownership when device indices reorder');
const p=createPlayer('Tempo save regression');Object.assign(p,{x:500,y:500});p.worldMemory={elapsed:100};
const w={mode:'overworld',continentId:'runalis',continentRuntime:{chunks:new Map()},width:64,height:64,tileSize:32,tiles:Array.from({length:64},()=>Array.from({length:64},()=>({biome:'grass',passable:true}))),objects:[],enemies:[],effects:[],drops:[]};
let e=makeEnemy('roadlessBandit','tempo-patrol','Patrol',16,16,{...scaleEnemyStats('roadlessBandit',2),tier:2,dynamicEncounter:true,dynamicEncounterId:'tempo',spawnedAt:100,despawnAfter:900,homeX:500,homeY:500});w.enemies=[e];updateEnemies(0,p,w,()=>{},10);
const speed=e.speed,rate=e.attackRate,hp=e.hp;
for(let i=0;i<25;i++){
 captureContinentalState({player:p,world:w});p.worldMemory=JSON.parse(JSON.stringify(p.worldMemory));e=continentalGeneratedEntities(p)[0];assert(e);w.enemies=[e];updateEnemies(0,p,w,()=>{},10);
 assert.equal(e.speed,speed,`speed drift after save ${i}`);assert.equal(e.attackRate,rate,`attack acceleration after save ${i}`);
}
console.log(`PASS 25 generated-patrol save/reload cycles preserve ${speed} speed and ${rate} attack period exactly`);
captureContinentalState({player:p,world:w});const old=p.worldMemory.continent.generated[e.id];delete old.fastCombatVersion;old.speed=speed*8;old.attackRate=.35;
e=continentalGeneratedEntities(p)[0];assert.equal(e.speed,speed);assert.equal(e.attackRate,rate);assert.equal(e.hp,hp);w.enemies=[e];updateEnemies(0,p,w,()=>{},10);assert.equal(e.speed,speed);
console.log('PASS legacy accelerated patrol is restored to authored tempo without healing or resetting rewards');

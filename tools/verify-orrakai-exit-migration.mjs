import assert from 'node:assert/strict';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {createCapitalHubWorld,enterCapitalHub,useHubService} from '../src/hubSystem.js';
import {createPlayer} from '../src/player.js';
import {ORRAKAI_SURFACE_GATE} from '../src/orrakaiExterior.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
for(const scenario of ['stale-cache','missing-gate','legacy-return','town-reload']){
 const p=createPlayer('PC exit'),surface=createWorld(),g={player:p,world:surface,camera:{x:0,y:0},canvas:{width:1280,height:800},log(){},logLines:[]};
 const gate=surface.continentRuntime.findObject('capital-gate-prototype');Object.assign(p,gate);
 const enemy=surface.continentRuntime.allEnemies[0];enemy.hp-=7;const hp=enemy.hp,id=enemy.id;
 assert(enterCapitalHub(g,gate));
 if(scenario==='stale-cache')Object.assign(gate,{x:35.5*32,y:88.5*32});
 if(scenario==='missing-gate')g.capitalReturnWorld={continentId:'runalis',objects:[],spawn:{x:1000,y:1000}};
 if(scenario==='legacy-return'){g.capitalReturnWorld=null;g.overworldState={mode:'capital',tiles:[],returnPoint:{x:35.5*32,y:88.5*32}};}
 if(scenario==='town-reload')assert(applySaveToGame(g,JSON.parse(JSON.stringify(createSaveState(g)))));
 p.moveTarget={x:1200,y:1500};g.player.moveTarget={x:1200,y:1500};
 const exit=g.world.objects.find(o=>o.kind==='capitalExit');assert(useHubService(g,exit));
 assert.equal(g.world.continentId,'runalis');assert.equal(g.world.mode,'overworld');
 const current=g.world.continentRuntime.findObject('capital-gate-prototype');assert.equal(current.x,ORRAKAI_SURFACE_GATE.x);assert.equal(current.y,ORRAKAI_SURFACE_GATE.y);
 assert(Math.hypot(g.player.x-current.x,g.player.y-(current.y+32*1.35))<1,'Arrival stays at the northwest approach');
 assert(isActorPositionPassable(g.world,g.player.x,g.player.y,12));assert.equal(g.player.moveTarget,null);assert.equal(g.player.dirY,1);
 assert.equal(g.world.continentRuntime.allEnemies.find(e=>e.id===id).hp,hp,'Enemy wounds survive rebuilding');
 console.log('PASS '+scenario+': PC service exit uses northwest gate, clears movement and retains surface progress');
}

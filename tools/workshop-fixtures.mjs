import {beginWorkshopSession} from '../src/workshopAccess.js';

// A real, nearby provider in a passable world, for progression-only tests.
// Session creation still goes through the production proximity and party checks.
export function workshopFixture(player,kind='blacksmith'){
 const npc={id:'test-'+kind,kind:'npc',workshopService:kind,x:player.x+24,y:player.y,r:14};
 const world={width:80,height:64,tiles:Array.from({length:64},()=>Array.from({length:80},()=>({passable:true,biome:'grass'}))),objects:[npc],enemies:[],effects:[]};
 const game={player,world,log(){},input:{},uiState:{}};
 if(!beginWorkshopSession(game,npc,kind))throw Error('Test provider must be reachable');
 return game;
}

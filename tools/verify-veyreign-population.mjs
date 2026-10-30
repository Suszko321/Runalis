import assert from 'node:assert/strict';
import {createDungeonWorld} from '../src/dungeonSystem.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {createDialogueState} from '../src/dialogueSystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {getEliteHazards,updateEliteEncounters} from '../src/eliteEncounterSystem.js';
import {applyTargetDamage} from '../src/enemyBehaviors.js';
import {applyCoopEnemyCountScalingToWorld} from '../src/coopEnemyScaling.js';
import {initializeVeyreignPopulation} from '../src/veyreignPopulation.js';
import {isActorPositionPassable} from '../src/world.js';
import {wireClone,parseWire} from '../src/onlineProtocol.js';
import {eliteEncounterPresentation,hostPresentationRefs,hydratePresentation} from '../src/onlinePresentation.js';
import {getEliteActors,getEliteStatePresentation} from '../src/eliteEncounterSystem.js';
const seen=new Set();
function game(w){const p=createPlayer('Veyreign elites');chooseClass(p,'oathkeeper');Object.assign(p,w.spawn);p.hp=p.maxHp=100000;return {player:p,world:w,dialogue:createDialogueState(),camera:{x:0,y:0},canvas:{width:1280,height:800},log(){},shake(){}};}
for(let floor=1;floor<=4;floor++){
 const w=createDungeonWorld({dungeonId:'castleVeyr',floor,seed:'elite-review'});assert.equal(w.enemies.length,60);const elites=w.enemies.filter(e=>e.elite),fodder=w.enemies.filter(e=>e.veyreignPopulationRole==='fodder'),ordinary=w.enemies.filter(e=>e.veyreignPopulationRole==='ordinary');
 assert.equal(elites.length,7);assert.equal(fodder.length,28);assert.equal(ordinary.length,25);assert(elites.every(e=>e.vampire&&!e.batBeast&&e.eliteModifiers.length===1));for(const e of elites)seen.add(e.eliteModifier);
 assert(fodder.every(e=>e.maxHp<ordinary[0].maxHp&&e.damage<ordinary[0].damage&&!e.eliteModifiers.length));assert(w.enemies.every(e=>e.vampire||e.batBeast));assert(w.enemies.every(e=>isActorPositionPassable(w,e.x,e.y,e.r||12)));
 initializeVeyreignPopulation(w);assert.equal(w.enemies.length,60);const keys=w.enemies.map(e=>e.id);assert.equal(new Set(keys).size,60);
 const g=game(w),elite=elites[0];elite.hp=Math.floor(elite.maxHp*.4);elite.eliteHealRemaining=17;fodder[0].hp=0;fodder[0].dead=fodder[0].deathHandled=true;
 const snapshot=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,snapshot));assert.equal(g.world.enemies.length,60);assert.equal(g.world.enemies.find(e=>e.id===elite.id).hp,elite.hp);assert.equal(g.world.enemies.find(e=>e.id===elite.id).eliteHealRemaining,17);assert(g.world.enemies.find(e=>e.id===fodder[0].id).dead);
 console.log(`PASS floor ${floor}: 60 mobs, seven framework elites, 28 weaker reinforcements, walkable positions, stable roles/wounds/healing reserve/deaths after save`);
}
assert.deepEqual([...seen].sort(),['artillery','bulwark','freezer','molten','regenerator','shocker','vortex','waller'].sort());
for(const modifier of ['freezer','waller','regenerator']){
 const w=createDungeonWorld({dungeonId:'castleVeyr',floor:1}),e=w.enemies.find(e=>e.eliteModifier===modifier),g=game(w),r=w.rooms.find(r=>e.x>=r.x*32&&e.x<(r.x+r.w)*32&&e.y>=r.y*32&&e.y<(r.y+r.h)*32);
 // Isolate the authored elite to observe its actual shared modifier coordinator.
 w.enemies=[e];e.x=r.cx*32-160;e.y=r.cy*32;e.homeX=e.x;e.homeY=e.y;e.isInCombat=true;g.player.x=r.cx*32;g.player.y=r.cy*32;e.hp=Math.round(e.maxHp*.5);const before=e.hp;let warning=false,active=false,healing=false;
 for(let i=0;i<1200;i++){const now=10+i/60;updateEliteEncounters(w,g.player,1/60,now,applyTargetDamage,g.log);for(const h of getEliteHazards(w)){if(h.kind===modifier){warning=true;if(h.age>=h.warning)active=true;}}healing||=!!e.eliteHealing;if(modifier==='regenerator'?e.hp>before:active)break;}
 if(modifier==='regenerator'){assert(healing);assert(e.hp>before);assert(e.eliteHealRemaining<e.maxHp*.3);}else{assert(warning);assert(active);if(modifier==='waller')assert(w.encounterBarriers.length);}
 console.log('PASS authored '+modifier+' Vampire Spawn really casts through shared elite coordinator');
 const guest={player:wireClone(g.player),world:{networkGuest:true,enemies:[wireClone(e)],effects:[],combatEffects:[]}};
 guest.world.networkPresentation={eliteEncounters:parseWire(JSON.stringify(eliteEncounterPresentation(w,hostPresentationRefs(g))))};
 hydratePresentation(guest,'host',new Map());
 assert.equal(getEliteActors(guest.world)[0],guest.player);
 assert.deepEqual(getEliteStatePresentation(guest.world.enemies[0]),getEliteStatePresentation(e));
 for(const h of getEliteHazards(guest.world)){assert.equal(h.owner,guest.world.enemies[0]);assert.equal(h.kind,modifier);}
 assert.equal(getEliteHazards(guest.world).length,getEliteHazards(w).length);
 assert(!('networkPresentation' in wireClone(guest.world)));
 assert(!('networkPresentation' in wireClone(guest.world.enemies[0])));
 guest.world.networkPresentation.eliteEncounters={hazards:[],actors:[],states:[]};assert.equal(getEliteHazards(guest.world).length,0);
 console.log('PASS '+modifier+' guest visuals hydrate live caster/party and match host geometry/state without leaking into saves');
}
{
 const w=createDungeonWorld({dungeonId:'castleVeyr',floor:1}),g=game(w);g.player.coop={players:Array.from({length:3},(_,i)=>({...createPlayer('Ally '+i),active:true,joined:true}))};const elites=w.enemies.filter(e=>e.elite).length;applyCoopEnemyCountScalingToWorld(w,g.player);assert.equal(w.enemies.filter(e=>e.elite).length,elites);assert(w.enemies.filter(e=>e.coopScaledClone).every(e=>!e.elite));console.log('PASS co-op density scales ordinary/weaker mobs without duplicating modifier captains');
}
{
 const w=createDungeonWorld({dungeonId:'castleVeyr',floor:1});w.enemies=w.enemies.filter(e=>!e.veyreignFodder);delete w.dungeonState.veyreign.populationFloors;
 for(const e of w.enemies){delete e.veyreignPopulationVersion;delete e.veyreignPopulationRole;if(e.veyreignGuard==='1-0'){e.hp=0;e.dead=e.deathHandled=true;}}
 w.dungeonState.veyreign.seals['1-0']=true;initializeVeyreignPopulation(w);assert(!w.enemies.some(e=>e.veyreignFodder&&e.veyreignGuard==='1-0'));assert(w.enemies.filter(e=>e.veyreignGuard==='1-0').every(e=>e.hp===0));console.log('PASS upgrading a saved cleared seal room adds no enemies and revives no guards');
 const boss=createDungeonWorld({dungeonId:'castleVeyr',floor:5});assert.equal(boss.enemies.length,1);assert(!boss.enemies[0].eliteModifiers?.length);assert.equal(boss.enemies[0].maxHp,14000);console.log('PASS bespoke two-form boss roster and balance stay intact');
}

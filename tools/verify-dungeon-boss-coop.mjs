import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {createProceduralSideZoneWorld} from '../src/sideZoneSystem.js';
import {createDungeonWorld} from '../src/dungeonSystem.js';
import {updateDungeonArena,resetFailedDungeonArena} from '../src/dungeonArenaSystem.js';
import {tuneDungeonBoss,DUNGEON_BOSS_PARTY_HP,DUNGEON_BOSS_DIFFICULTY} from '../src/dungeonBossDifficulty.js';
import {applyCoopBossHealthScaling} from '../src/coopEnemyScaling.js';
import {beginGroveMove,updateGroveCombat} from '../src/blightedGroveCombat.js';
import {beginOrchardMove,updateOrchardCombat} from '../src/ashenOrchardCombat.js';
import {setEnemyCombatViews} from '../src/enemyVisibility.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {createDialogueState} from '../src/dialogueSystem.js';
function party(n){return Array.from({length:n},(_,i)=>{const p=createPlayer('Party '+(i+1));chooseClass(p,['oathkeeper','fellhunter','lightbringer','thornbinder'][i]);p.active=true;p.joined=true;p.slot=i+1;p.hp=p.maxHp=10000;return p;});}
for(const type of ['mother','custodian'])for(let n=1;n<=4;n++){
 const w=type==='mother'?createProceduralSideZoneWorld({type:'hollowGrove',playerCount:n}):createDungeonWorld({dungeonId:'ashenOrchard',floor:2,playerCount:n}),e=w.enemies.find(e=>type==='mother'?e.groveMother:e.orchardCustodian),members=party(n),p=members[0];p.coop={players:members.slice(1)};
 members.forEach((a,i)=>{const angle=i*Math.PI/2;a.x=e.x+Math.cos(angle)*180;a.y=e.y+Math.sin(angle)*180;});updateDungeonArena(w,p);
 const expected=Math.round(DUNGEON_BOSS_DIFFICULTY[type].hp*DUNGEON_BOSS_PARTY_HP[n-1]);assert.equal(e.maxHp,expected);assert.equal(e.dungeonBossPartySize,n);
 e.hp=Math.round(e.maxHp*.6);const fraction=e.hp/e.maxHp;for(let i=0;i<20;i++)applyCoopBossHealthScaling(e,n);assert.equal(e.maxHp,expected);assert(Math.abs(e.hp/e.maxHp-fraction)<.001);tuneDungeonBoss(e,1);assert.equal(e.maxHp,expected,'No health reduction when allies fall');
 // Keep all four players targetable even in separate views with the boss
 // outside their cameras. Sealed arena shapes, not view edges, own damage.
 setEnemyCombatViews(w,{player:p,canvas:{width:240,height:180},camera:{x:99999,y:99999}});e.hp=e.maxHp;e.groveRecovery=e.orchardRecovery=0;
 const a=type==='mother'?beginGroveMove(e,w,p,'seeds'):beginOrchardMove(e,w,p,'spokes');
 if(type==='mother')assert.equal(a.shapes.length,n);
 const update=type==='mother'?updateGroveCombat:updateOrchardCombat,before=members.map(p=>p.hp);update(e,w,p,a.tell-.001,1);assert.deepEqual(members.map(p=>p.hp),before);update(e,w,p,.002,2);
 for(const [i,member]of members.entries())assert(member.hp<before[i],`${type}: P${i+1} escaped a marked attack through camera immunity`);
 const g={world:w,player:p,dialogue:createDialogueState(),canvas:{width:1440,height:1000},camera:{x:0,y:0},log(){},logLines:[]};const hp=e.hp;assert(applySaveToGame(g,JSON.parse(JSON.stringify(createSaveState(g)))));const loaded=g.world.enemies.find(x=>x.id===e.id);assert.equal(loaded.maxHp,expected);assert.equal(loaded.hp,hp);assert.equal(g.world.bossArena.phase,'active');
 resetFailedDungeonArena(g.world);assert.equal(loaded.hp,loaded.maxHp);assert.equal(g.world.arenaBarriers.length,0);assert(!loaded.dungeonBossPartyLocked);
 console.log(`PASS ${type}, ${n} players: ${expected} HP, all-party damage, no early hit/camera exploit, stable scaling and reload/wipe`);
}

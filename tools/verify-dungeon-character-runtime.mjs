import assert from 'node:assert/strict';
import {sampleDungeonCharacter,DUNGEON_CHARACTER_SPRITES} from '../src/dungeonCharacterSprites.js';
import {createProceduralSideZoneWorld} from '../src/sideZoneSystem.js';
import {createDungeonWorld} from '../src/dungeonSystem.js';
import {beginGroveMove,updateGroveCombat} from '../src/blightedGroveCombat.js';
import {beginOrchardMove,updateOrchardCombat} from '../src/ashenOrchardCombat.js';
import {sampleEnemyAttackPresentation} from '../src/enemyAttackPresentation.js';
import {createPlayer} from '../src/player.js';
assert.equal(DUNGEON_CHARACTER_SPRITES.width,60);assert.equal(DUNGEON_CHARACTER_SPRITES.height,80);
for(const kind of ['mother','custodian']){
 const w=kind==='mother'?createProceduralSideZoneWorld({type:'hollowGrove'}):createDungeonWorld({dungeonId:'ashenOrchard',floor:2}),e=w.enemies.find(e=>kind==='mother'?e.groveMother:e.orchardCustodian),p=createPlayer('Animation clock');p.x=e.x+150;p.y=e.y+90;w.bossArena.phase='active';e.arenaDormant=false;
 const a=kind==='mother'?beginGroveMove(e,w,p,'rake'):beginOrchardMove(e,w,p,'press'),update=kind==='mother'?updateGroveCombat:updateOrchardCombat;
 const columns=new Set();for(let i=0;i<16;i++){a.elapsed=i/16*a.tell;const pose=sampleDungeonCharacter(e,10+i*.01);assert.equal(pose.state,'anticipation');columns.add(pose.col);}assert.equal(columns.size,16);
 assert(sampleEnemyAttackPresentation(e));a.elapsed=a.tell-.01;update(e,w,p,.02,10);assert(a.released);assert.equal(sampleDungeonCharacter(e,10).state,'execution');
 if(kind==='custodian'){const distance=Math.hypot(e.x-a.origin.x,e.y-a.origin.y);assert(distance>0&&distance<Math.hypot(a.destination.x-a.origin.x,a.destination.y-a.origin.y),'Charge should travel smoothly rather than teleport');}
 a.elapsed=a.tell+.31;update(e,w,p,.05,10.05);assert.equal(sampleDungeonCharacter(e,10.05).state,'recovery');e.hitFlash=.1;assert.equal(sampleDungeonCharacter(e,10.1).state,'hit');e.hitFlash=0;e.hp=0;e.dead=true;assert.equal(sampleDungeonCharacter(e,10.4).state,'death');assert.equal(sampleDungeonCharacter(e,11.3).col,15);console.log(`PASS ${kind}: 16 timed windup frames, shared attack presentation, release, recovery, hit and death`);
}

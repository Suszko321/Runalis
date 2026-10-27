import {beginMalakarArrival,skipMalakarRitual,chooseMalakarIntroduction,updateMalakarEncounter} from '../src/malakarEncounter.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDungeonWorld,sanitizeDungeonSaveState,restoreDungeonFromSaveState} from '../src/dungeonSystem.js';
import {createPlayer,chooseClass} from '../src/player.js';
import {isActorPositionPassable} from '../src/world.js';
import {updateEnemies,updateCombat,attack} from '../src/combat.js';
import {getStoryFlag} from '../src/storyProgress.js';
const report={floors:[],combat:[]};
for(const seed of ['act1-review','act1-second','act1-third'])for(let floor=1;floor<=4;floor++){
 const w=createDungeonWorld({dungeonId:'demonCultLair',theme:'demon',tier:5,depth:3,seed,floor});
 assert.equal(w.totalFloors,4);
 const seen=new Set(),queue=[[Math.floor(w.spawn.x/32),Math.floor(w.spawn.y/32)]];
 seen.add(queue[0].join(','));
 for(let n=0;n<queue.length;n++){const [x,y]=queue[n];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=`${a},${b}`;if(a<0||b<0||a>=w.width||b>=w.height||seen.has(k)||!isActorPositionPassable(w,(a+.5)*32,(b+.5)*32,10))continue;seen.add(k);queue.push([a,b]);}}
 const targets=w.objects.filter(o=>o.kind==='dungeonStairs'||o.id.startsWith('act1-floor-')||o.id==='malakarRelic');
 if(floor===4)targets.push(w.enemies.find(e=>e.isDungeonMainBoss));
 for(const o of targets){assert(o);let found=false;for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)if(seen.has(`${Math.floor(o.x/32)+x},${Math.floor(o.y/32)+y}`))found=true;assert(found,`${seed} floor ${floor}: ${o.id} disconnected`);}
 const restored=restoreDungeonFromSaveState(JSON.parse(JSON.stringify(sanitizeDungeonSaveState(w))));
 assert.equal(restored.floor,floor);assert(restored.objects.some(o=>o.id===(floor===4?'malakarRelic':`act1-floor-account-${floor}`)));
 report.floors.push({seed,floor,reachableCells:seen.size,targets:targets.length});
}
for(const cls of ['oathkeeper','fellhunter','gravecaller','lightbringer','thornbinder','waverider']){
 const p=createPlayer('Combat smoke');assert(chooseClass(p,cls));
 const w=createDungeonWorld({dungeonId:'demonCultLair',theme:'demon',tier:5,depth:3,seed:'class-combat',floor:4});
 const boss=w.enemies.find(e=>e.isDungeonMainBoss);assert(boss);w.enemies=[boss];
 Object.assign(p,{x:boss.x-35,y:boss.y,dirX:1,dirY:0});boss.arenaDormant=false;
 const game={player:p,world:w,log(){},shake(){}};beginMalakarArrival(game);skipMalakarRitual(game);chooseMalakarIntroduction(game,'defy');updateMalakarEncounter(game,3.1);Object.assign(p,{x:boss.x-35,y:boss.y,dirX:1,dirY:0});
 const before=boss.hp,input={attackHeld:true,attackPressed:false,attackReleased:false,moveX:0,moveY:0,aimX:1,aimY:0};
 // Real weapon update against a stationary boss: verifies damage compatibility,
 // not encounter balance or the player's ability to dodge the complete fight.
 for(let i=0;i<600&&boss.hp===before;i++){const now=100+i/60;attack(p,w,()=>{},now,input);updateCombat(p,w,input,1/60,now,()=>{});}
 assert(boss.hp<before,`${cls} basic attacks cannot damage Malakar`);
 const damage=before-boss.hp;
 // Drive the real boss AI at each health band; protected HP isolates runtime
 // errors from survival/balance, which this smoke test does not establish.
 for(const ratio of [1,.6,.25]){boss.hp=Math.max(1,boss.maxHp*ratio);for(let i=0;i<180;i++){p.hp=p.maxHp;updateEnemies(1/60,p,w,()=>{},120+i/60,game);assert(Number.isFinite(boss.hp));}}
 boss.hp=0;updateEnemies(1/60,p,w,()=>{},130,game);updateMalakarEncounter(game,4.1);updateEnemies(1/60,p,w,()=>{},135,game);
 assert(getStoryFlag(p,'story.malakarDefeated'));assert(!getStoryFlag(p,'story.act1Complete'));
 report.combat.push({classId:cls,weaponDamage:damage,bossAiHealthBands:3,deathTrigger:true});
}
fs.writeFileSync('docs/act1-campaign/descent-verification.json',JSON.stringify(report,null,2));
console.log('PASS 12 authored Keep floors reachable and saved; six classes damage Malakar; boss AI and death trigger smoke checks');

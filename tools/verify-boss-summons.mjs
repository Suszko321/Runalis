import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {getBossCombatTargets,selectBossAttackTarget} from '../src/bossCombatTargets.js';
import {damageNearbyParty} from '../src/bossSystem.js';
import {getEnemyTargetThreatMultiplier} from '../src/coopEnemyScaling.js';
import {beginGroveMove,updateGroveCombat} from '../src/blightedGroveCombat.js';
import {beginOrchardMove,updateOrchardCombat} from '../src/ashenOrchardCombat.js';
import {beginVeyreignMove,updateVeyreignCombat} from '../src/veyreignCombat.js';
import {beginFeralVeyreignMove,updateFeralVeyreign} from '../src/veyreignFeralCombat.js';
import {startMalakarMove,updateMalakarCombat} from '../src/malakarCombat.js';
import {setEnemyCombatViews} from '../src/enemyVisibility.js';

const summon=(id,x=150,y=100)=>({id,kindTag:'summon',kind:'wolf',displayName:'Wolf',alive:true,x,y,r:12,hp:500,maxHp:500,armour:0});
function fixture(){
 const p=createPlayer('Summoner'),ally=createPlayer('Ally');Object.assign(p,{x:250,y:100,hp:10000,maxHp:10000});Object.assign(ally,{x:250,y:100,hp:10000,maxHp:10000,active:true,joined:true});
 p.coop={players:[ally]};p.summons=[summon('host')];ally.summons=[summon('guest')];
 const w={width:100,height:100,tiles:Array.from({length:100},()=>Array.from({length:100},()=>({solid:false}))),objects:[],enemies:[],effects:[],bossArena:{phase:'active'},mode:'dungeon'};
 const e={id:'boss',isBoss:true,x:100,y:100,r:20,hp:10000,maxHp:10000,damage:100};w.enemies=[e];return {p,ally,w,e};
}
{
 const {p,ally,e,w}=fixture(),dead=summon('dead'),safe=summon('safe',800,800);dead.alive=false;p.summons.push(dead,safe);
 assert.equal(getBossCombatTargets(p).length,5); // two players, three live summons
 let playerTargets=0;for(let i=0;i<40;i++)if([p,ally].includes(selectBossAttackTarget(e,p,i)))playerTargets++;
 assert.equal(playerTargets,30);assert(getEnemyTargetThreatMultiplier(e,p.summons[0],'summon')>getEnemyTargetThreatMultiplier(e,p,'player'));
 setEnemyCombatViews(w,{player:p,canvas:{width:240,height:180},camera:{x:99999,y:99999}});
 damageNearbyParty(e,p,w,300,100,t=>t.x<400,'Test wave',10);
 assert(p.hp<10000&&ally.hp<10000);assert(p.summons[0].hp<500&&ally.summons[0].hp<500);assert.equal(dead.hp,500);assert.equal(safe.hp,500);
 const hp=p.summons[0].hp;damageNearbyParty(e,p,w,300,100,()=>false);assert.equal(p.summons[0].hp,hp);
 damageNearbyParty(e,p,w,300,10000);assert.equal(p.summons[0].hp,0);assert(p.summons[0].dead&&!p.summons[0].alive);assert(!getBossCombatTargets(p).includes(p.summons[0]));
 console.log('PASS party summons take arena AoE damage, die, respect safe geometry and are targeted on one of four turns');
}
{
 const {p,e}=fixture();p.coop.players.push(...[3,4].map(i=>({...createPlayer('Player '+i),x:250,y:100,hp:10000,active:true,joined:true})));
 const counts=new Map();for(let i=0;i<16;i++){const t=selectBossAttackTarget(e,p,i);counts.set(t,(counts.get(t)||0)+1);}
 for(const member of [p,...p.coop.players])assert.equal(counts.get(member),3,'All four players receive equal targeting turns');
}
{
 const {p,ally,e,w}=fixture();p.summons[0].armour=40;
 damageNearbyParty(e,p,w,300,100);
 assert(p.summons[0].hp>ally.summons[0].hp,'Summon armour reduces incoming damage');
 const hp=p.summons[0].hp;w.tiles[3][4]={biome:'wall'};
 damageNearbyParty(e,p,w,300,100);assert.equal(p.summons[0].hp,hp,'Solid walls stop boss damage');
 ally.lifeState='downed';assert(getBossCombatTargets(p).includes(ally.summons[0]),'Surviving summons remain vulnerable while their owner is downed');
}
for(const [flag,turn,begin,update,key]of [
 ['groveMother','groveTurn',beginGroveMove,updateGroveCombat,'rake'],
 ['orchardCustodian','orchardTurn',beginOrchardMove,updateOrchardCombat,'press'],
 ['veyreignLord','veyreignTurn',beginVeyreignMove,updateVeyreignCombat,'cleave'],
 ['veyreignFeral','veyreignTurn',beginFeralVeyreignMove,updateFeralVeyreign,'talons'],
 ['malakarSolo','unused',startMalakarMove,updateMalakarCombat,'cleave']
]){
 const {p,ally,e,w}=fixture();e[flag]=true;e[turn]=3;
 // Player stands behind the boss. The summon is the fourth turn's aim.
 p.x=ally.x=0;p.y=ally.y=100;
 if(flag==='malakarSolo')w.dungeonState={malakar:{mode:'active',phase:1,turn:3,queue:[],recovery:0,grace:0}};
 const attack=begin(e,w,p,key,0),before=p.summons[0].hp;
 update(e,w,p,attack.tell-.001,1);assert.equal(p.summons[0].hp,before,'No damage before tell');
 update(e,w,p,.002,2);assert(p.summons[0].hp<before,flag+' hits the targeted summon');
 console.log('PASS '+flag+': summon-targeted attack deals damage only on release');
}

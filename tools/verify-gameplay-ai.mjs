import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {createEnemyArchetype} from '../src/enemyBehaviors.js';
import {updateEnemies} from '../src/combat.js';
import {prepareEnemyTactics,updateEnemyTacticalMovement,enemyTacticsSnapshot,enemyTacticsStats,mayEnemyKite,waitForAlliedMajorAttack} from '../src/enemyTactics.js';
import {visualHash} from '../src/enemyVisualProfiles.js';
import {isActorPositionPassable} from '../src/world.js';
let now=10;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const world=()=>({mode:'overworld',width:80,height:60,tiles:Array.from({length:60},()=>Array.from({length:80},()=>({biome:'grass',passable:true}))),enemies:[],objects:[],effects:[],drops:[]});
const player=()=>Object.assign(createPlayer('Tactical test'),{x:640,y:640,hp:100000,maxHp:100000});
const foe=(kind,id,x=480,y=640)=>createEnemyArchetype(kind,kind==='shieldKnight'?'Roadless Shieldguard':'Roadless '+kind,x/32,y/32,{id,dynamicEncounterId:'test-pack',awakened:true,aggro:3,attackCooldown:99,specialCooldown:99,chargeCooldown:99});
const tick=(w,p,seconds)=>{for(let t=0;t<seconds;t+=1/60){now+=1/60;updateEnemies(1/60,p,w,()=>{},now);}};
const flankId=side=>Array.from({length:100},(_,i)=>'flank-'+i).find(id=>visualHash(id)%3!==0&&(visualHash(id)%2?1:-1)===side);
{
 const w=world(),p=player(),a=foe('roadlessBandit',flankId(1)),b=foe('roadlessBandit',flankId(-1));w.enemies=[a,b];tick(w,p,.2);
 assert.equal(enemyTacticsSnapshot(a).choice,'flank');assert.equal(enemyTacticsSnapshot(b).choice,'flank');assert((a.y-640)*(b.y-640)<0,'flankers chose the same approach');
 a.attackCooldown=b.attackCooldown=0;const hp=p.hp;tick(w,p,5);assert(p.hp<hp,'flankers orbited indefinitely instead of committing to melee');
 console.log('PASS production melee group approaches from opposing flanks');
}
{
 const w=world(),p=player(),a=foe('shieldKnight','guard',500),b=foe('cultist','caster',400);b.telegraph={kind:'summonMinion',time:.8,maxTime:.8,x:640,y:640,radius:70};w.enemies=[a,b];tick(w,p,.1);
 assert.equal(enemyTacticsSnapshot(a).choice,'screenCaster');assert(a.x>500);console.log('PASS shieldguard screens a preparing allied caster');
}
{
 const w=world(),p=player(),a=foe('archer','bow',580),b=foe('roadlessBandit','cover',540,680);w.enemies=[a,b];
 prepareEnemyTactics(w,now);assert(updateEnemyTacticalMovement(a,p,w,.1,now));assert.equal(enemyTacticsSnapshot(a).choice,'withdrawToAllies');assert(a.x<580&&a.y>640,'withdrawal did not move toward its actual ally');
 for(let i=0;i<18;i++){now+=.1;prepareEnemyTactics(w,now);updateEnemyTacticalMovement(a,p,w,.1,now);a.x=580;a.y=640;}
 assert(!mayEnemyKite(a,now),'ranged retreat never yielded an attack window');console.log('PASS ranged retreat has a bounded commitment window');
}
{
 const w=world(),p=player(),a=foe('archer','blocked-lane',450),b=foe('roadlessBandit','frontline',540);w.enemies=[a,b];
 prepareEnemyTactics(w,now);assert(updateEnemyTacticalMovement(a,p,w,.1,now));assert.equal(enemyTacticsSnapshot(a).choice,'firingLane');assert(a.y!==640,'bowman did not clear its ally’s firing lane');
 console.log('PASS bowman physically repositions to clear an occupied firing lane');
}
{
 const w=world(),p=player(),a=foe('cultist','first',480,610),b=foe('cultist','second',480,680);w.enemies=[a,b];prepareEnemyTactics(w,now);
 a.telegraph={kind:'cursedGround',time:.7};assert(waitForAlliedMajorAttack(b,w,now));now+=.4;assert(!waitForAlliedMajorAttack(b,w,now));
 b.dynamicEncounterId='other-pack';now+=1;prepareEnemyTactics(w,now);assert.deepEqual(enemyTacticsSnapshot(b).allies,[]);console.log('PASS major cast spacing is bounded and unrelated groups remain independent');
}
{
 const w=world(),p=player(),a=foe('roadlessBandit',flankId(1)),b=foe('archer','ally',440,700);w.enemies=[a,b];p.combatState={heavyChargeActive:true};
 prepareEnemyTactics(w,now);updateEnemyTacticalMovement(a,p,w,.01,now);assert.notEqual(enemyTacticsSnapshot(a).choice,'evadeCharge');
 now+=1;prepareEnemyTactics(w,now);updateEnemyTacticalMovement(a,p,w,.01,now);assert.equal(enemyTacticsSnapshot(a).choice,'evadeCharge');
 const other=player();other.x=650;other.combatState={heavyChargeActive:true};now+=3;prepareEnemyTactics(w,now);updateEnemyTacticalMovement(a,other,w,.01,now);assert.notEqual(enemyTacticsSnapshot(a).choice,'evadeCharge','new target inherited another player’s observed charge time');
 const corpse=foe('hollowling','mindless');w.enemies.push(corpse);now+=1;prepareEnemyTactics(w,now);assert(!updateEnemyTacticalMovement(corpse,p,w,.1,now));
 console.log('PASS visible charge reactions wait for observation; mindless undead keep advancing');
}
{
 const w=world(),p=player(),a=foe('roadlessBandit',flankId(1)),b=foe('archer','ally');w.enemies=[a,b];a.hp=a.maxHp*.15;
 prepareEnemyTactics(w,now);updateEnemyTacticalMovement(a,p,w,.1,now);assert.notEqual(enemyTacticsSnapshot(a).choice,'regroup');
 a.x=550;now+=1;prepareEnemyTactics(w,now);updateEnemyTacticalMovement(a,p,w,.1,now);assert.equal(enemyTacticsSnapshot(a).choice,'regroup');
 a.isBoss=true;const x=a.x;assert(!updateEnemyTacticalMovement(a,p,w,.1,now));assert.equal(a.x,x);
 console.log('PASS injured human regroup is contextual; scripted bosses are excluded');
}
{
 const w=world(),p=player(),a=foe('archer','blocked',480),b=foe('roadlessBandit','front',560);w.enemies=[a,b];w.tiles[20][17].passable=false;tick(w,p,.4);
 assert(!a.telegraph,'archer shot through a wall');assert(isActorPositionPassable(w,a.x,a.y,a.radius));
 const samples=enemyTacticsStats(w).samples;for(let i=0;i<10;i++)prepareEnemyTactics(w,now+.01);assert.equal(enemyTacticsStats(w).samples,samples);
 console.log('PASS terrain-safe repositioning, blocked shots and sampled awareness cadence');
}

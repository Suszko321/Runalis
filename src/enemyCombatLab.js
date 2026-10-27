import {createPlayer,chooseClass,migratePlayer} from './player.js';
import {updateEnemies,updateCombat,getPlayerMovementMultiplier,getPlayerDashVelocity} from './combat.js';
import {requestHeavyAttack} from './combatMoves.js';
import {createEnemyArchetype} from './enemyBehaviors.js';
import {ENEMY_KINDS} from './enemyVisualProfiles.js';
import {REVIEW_ENEMIES} from './enemyCombatRoster.js';
import {ELITE_MODIFIERS,configureEncounterEnemy} from './encounterData.js';
import {getEliteHazards,clearEliteEncounters} from './eliteEncounterSystem.js';
import {moveActorWithCollision} from './world.js';
import {draw} from './render.js';
import {sampleEnemyAttackPresentation,getEnemyCharge} from './enemyAttackPresentation.js';
import {spriteArtStatus} from './spriteArt.js';
import {updateFloatingTexts} from './floatingText.js';

const canvas=document.querySelector('#stage'),ctx=canvas.getContext('2d'),select=document.querySelector('#scenario'),keys=new Set();
const realNow=performance.now.bind(performance);
let time=10,last=realNow(),paused=true,protectedPlayer=true,player,world,input={},camera={x:0,y:0};
// A controllable clock lets recorded frame sequences sample the same production poses as simulation.
Object.defineProperty(performance,'now',{value:()=>time*1000,configurable:true});
for(const kind of ENEMY_KINDS)select.add(new Option(kind.replace(/([a-z])([A-Z])/g,'$1 $2'),kind));
for(const [kind,name,type] of REVIEW_ENEMIES)select.add(new Option(name,'identity:'+name));
for(const [id,m] of Object.entries(ELITE_MODIFIERS))select.add(new Option('Elite · '+m.name,'elite:'+id));
for(const [id,m] of Object.entries(ELITE_MODIFIERS))select.add(new Option('Advanced champion · '+m.name,'elite:'+id+'@champion'));
for(const mods of ['freezer+artillery','waller+artillery','waller+freezer','waller+freezer+artillery'])select.add(new Option('Advanced · '+mods.replaceAll('+',' + '),'elite:'+mods+'@champion'));
select.add(new Option('Mixed combat pack','pack'));
function makeEnemy(kind,name,x,y,extra={}){
 const e=createEnemyArchetype(kind,name,x/32,y/32,{id:'combat-practice-'+name});
 Object.assign(e,{x,y,attackCooldown:0,specialCooldown:0,chargeCooldown:0,aggro:3,awakened:true,hp:1000,maxHp:1000,...extra});return e;
}
function reset(scenario=select.value){
 if(world)clearEliteEncounters(world);select.value=scenario;time=10;input={};
 player=createPlayer('Combat practice');chooseClass(player,'oathkeeper');Object.assign(player,{id:'review-player',x:560,y:430,dirX:1,dirY:0,act1OpeningPending:false});
 world={mode:'dungeon',name:'Combat practice',width:40,height:26,tiles:Array.from({length:26},(_,y)=>Array.from({length:40},(_,x)=>({biome:'grass',passable:x>0&&x<39&&y>0&&y<25,variant:(x+y)%3}))),objects:[],enemies:[],effects:[],combatEffects:[],drops:[]};
 if(scenario==='pack'){
  for(let i=0;i<15;i++){const a=i*2.4;world.enemies.push(makeEnemy(ENEMY_KINDS[i],ENEMY_KINDS[i],player.x+Math.cos(a)*150,player.y+Math.sin(a)*130));}
 }else if(scenario.startsWith('elite:')){
  const [identity,rank]=scenario.slice(6).split('@'),mods=identity.split('+'),id=mods[0],e=makeEnemy(id==='artillery'?'archer':'brute',id==='artillery'?'Gravefield Bowhand':'Gravefield Sentinel',760,430,{elite:true,isElite:true,eliteModifiers:mods,eliteModifier:id,encounterStatsVersion:1});
  if(rank){delete e.encounterStatsVersion;configureEncounterEnemy(e,{id:'practice',levels:[40,40]},e.id,{rank});e.eliteModifiers=mods;e.eliteModifier=id;player.skillState.combat.level=40;for(const s of Object.values(player.skillState.skills))s.level=14;migratePlayer(player);player.hp=player.maxHp;player.stamina=player.maxStamina;}
  if(id==='regenerator')e.hp=400;world.enemies=[e];
 }else if(scenario.startsWith('identity:')){
  const name=scenario.slice(9),entry=REVIEW_ENEMIES.find(e=>e[1]===name),[kind,,bossType]=entry;
  const e=makeEnemy(kind,name,650,430,{isBoss:!!bossType,bossType});
  if(bossType)e.boss={type:bossType,phase:1,introShown:true,specialTimer:0};world.enemies=[e];
 }else{
  const ranged=['archer','cultist','gravePriest'].includes(scenario);world.enemies=[makeEnemy(scenario,scenario,ranged?750:580,430)];
 }
 render();return world.enemies[0];
}
function step(dt){
 time+=dt;if(protectedPlayer)player.invulnerableUntil=time+1;
 updateFloatingTexts(player,dt);
 const dx=input.practiceMoveX??(Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))),dy=input.practiceMoveY??(Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))),length=Math.hypot(dx,dy)||1;
 input.moveX=dx;input.moveY=dy;input.mouseAimActive=true;input.mouseWorldX??=player.x+100;input.mouseWorldY??=player.y;
 updateCombat(player,world,input,dt,time,()=>{});
 const move=getPlayerMovementMultiplier(player),dash=getPlayerDashVelocity(player);moveActorWithCollision(player,world,(dx/length*205*move+dash.x)*dt,(dy/length*205*move+dash.y)*dt);player.isMoving=!!(dx||dy);player.walkTime=time;
 updateEnemies(dt,player,world,()=>{},time);
 for(const fx of world.effects)fx.age=(fx.age||0)+dt;world.effects=world.effects.filter(f=>f.age<f.ttl);
 for(const k of Object.keys(input))if(k.endsWith('Pressed')||k.endsWith('Released'))input[k]=false;
}
function render(){
 draw(ctx,world,player,camera);
 const lighting=document.querySelector('#lighting').value;if(lighting!=='day'){ctx.fillStyle=lighting==='night'?'rgba(13,18,33,.22)':'rgba(23,17,12,.16)';ctx.fillRect(0,0,canvas.width,canvas.height);}
 const e=world.enemies[0],pose=e&&sampleEnemyAttackPresentation(e,time);
 document.querySelector('#status').textContent=`${e?.name||'Encounter complete'} · ${pose?.phase||e?.enemyState||'idle'} · Your health ${Math.ceil(player.hp)} / ${player.maxHp} · ${world.enemies.length} enemies · ${world.effects.length} effects`;
}
function strike(heavy=false){input.mouseWorldX=world.enemies[0]?.x??player.x+100;input.mouseWorldY=world.enemies[0]?.y??player.y;if(heavy)requestHeavyAttack(player,world,input,()=>{},time);else input.attackPressed=true;}
function spawnPack(count=80){
 reset('pack');world.enemies=[];
 for(let i=0;i<count;i++)world.enemies.push(makeEnemy(ENEMY_KINDS[i%ENEMY_KINDS.length],'Pack '+i,player.x+(i%10-4.5)*44,player.y+(Math.floor(i/10)-3.5)*40));
 render();
}
canvas.onpointermove=e=>{const r=canvas.getBoundingClientRect();input.mouseWorldX=(e.clientX-r.left)/r.width*canvas.width+camera.x;input.mouseWorldY=(e.clientY-r.top)/r.height*canvas.height+camera.y;};
addEventListener('keydown',e=>{if(e.target.tagName==='SELECT')return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k)){e.preventDefault();keys.add(k);if(k===' '){input.attackPressed=!input.attackHeld;input.attackHeld=true;}if(k==='shift')input.dashPressed=true;}});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(k===' '){input.attackHeld=false;input.attackReleased=true;}});addEventListener('blur',()=>{keys.clear();input={};});
select.onchange=()=>reset();document.querySelector('#reset').onclick=()=>reset();document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'Resume':'Pause';};
document.querySelector('#light').onclick=()=>strike();document.querySelector('#heavy').onclick=()=>strike(true);document.querySelector('#protect').onclick=()=>{protectedPlayer=!protectedPlayer;player.invulnerableUntil=0;document.querySelector('#protect').textContent='Protection: '+(protectedPlayer?'on':'off');document.querySelector('#protect').setAttribute('aria-pressed',String(protectedPlayer));};
window.enemyCombatLab={reset,spawnPack,step,render,strike,setInput(v){Object.assign(input,v);},advance(seconds){for(let t=0;t<seconds-1e-8;t+=1/60)step(Math.min(1/60,seconds-t));render();},setPaused(v){paused=v;},setProtected(v){protectedPlayer=v;player.invulnerableUntil=0;},get time(){return time;},get player(){return player;},get world(){return world;},get poses(){return world.enemies.map(e=>sampleEnemyAttackPresentation(e,time));},get charges(){return world.enemies.map(getEnemyCharge);},get hazards(){return getEliteHazards(world);},spriteArtStatus,benchmark(frames=120){const samples=[];for(let n=0;n<frames;n++){const start=realNow();step(1/60);render();samples.push(realNow()-start);}samples.sort((a,b)=>a-b);return {actors:world.enemies.length,medianMs:samples[Math.floor(frames*.5)],p95Ms:samples[Math.floor(frames*.95)],effects:world.effects.length};}};
reset();function frame(){const n=realNow(),dt=Math.min(.05,(n-last)/1000);last=n;if(!paused)step(dt);render();requestAnimationFrame(frame);}frame();

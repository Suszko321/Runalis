import {drawEnemy} from './render.js';
import {drawHumanActor} from './humanRenderer.js';
import {drawSummonAsset} from './codeAssets.js';
import {spriteArtStatus} from './spriteArt.js';
import {recordEnemyHitReaction,recordEnemyDeathVisual} from './combatFeedbackProfiles.js';
export const REVIEW_ENEMIES=[
 ['roadlessBandit','Roadless Drifter'],['archer','Roadless Bowhand'],['shieldKnight','Last Dawn Sentinel'],['demonCultist','Last Dawn Invoker'],
 ['shieldKnight','Covenant Guard'],['archer','Covenant Archer'],['cultist','Covenant Celebrant'],['demonCultist','Ember Veil Cultist'],
 ['cultist','Grave Cult Acolyte'],['cultist','Watcher Ritualist'],['hollowling','Blighted Corpse'],['hollowling','Blighted Soldier'],
 ['gravebound','Gravebound Knight'],['gravePriest','Ash-Bone Caller'],['ashWolf','Hungry Ash Wolf'],['stalkerWolf','Blighted Wolf'],
 ['brute','Grave Brute'],['brute','Blighted Brute'],['exploder','Volatile Convert'],['basicBeast','Root-Tusk Beast'],['wraith','Veyr Wraith'],
 ['brute','Veyr Warden','veyrWarden'],['basicBeast','Blighted Elk','hollowElk'],['brute','Malakar','demonLord'],['cultist','Seraphel','seraphel'],['cultist','Zephyr Light','zephyrLight'],
 ['brute','Last Dawn Executioner','redSealExecutioner'],['basicBeast','Grave-Maw Bear','graveMawBear'],['brute','Briar Titan','briarTitan'],['gravebound','Road Risen'],['hollowling','Blighted Laborer'],['hollowling','Blighted Traveler'],['hollowling','Blighted Last Dawn Soldier'],['hollowling','Blighted Covenant Guard']
];
const canvas=document.querySelector('#review'),ctx=canvas.getContext('2d'),controls=Object.fromEntries(['pose','facing','lighting','distance','variant','phase','labels'].map(id=>[id,document.getElementById(id)]));
let enemies=[];
const companions=['skeletonServant','wolf','miniDemon'].map(kind=>({kind,x:0,y:0,attackCooldown:0}));
companions.push({kind:'skeletonServant',displayName:'Forge-equipped marksman',skeletonRole:'marksman',coterieEquipment:{armour:'graveboundChest',weapon:'hunterBow'},x:0,y:0,attackCooldown:0});
function rebuild(){enemies=REVIEW_ENEMIES.map(([kind,name,bossType],i)=>({kind,name,bossType,isBoss:!!bossType,id:`review-${i}-${controls.variant.value}`,visualVictim:name==='Blighted Corpse'?'villager':undefined,x:0,y:0,hp:100,maxHp:100,level:5,attackCooldown:0,boss:bossType?{phase:1}:undefined}));}
rebuild();controls.variant.onchange=rebuild;
function draw(actorLimit=Infinity){
 const now=performance.now()/1000;
 const lighting=controls.lighting.value,pose=controls.pose.value,dir=controls.facing.value,zoom=Number(controls.distance.value),names=controls.labels.checked;
 const cols=zoom>1?5:7,rowHeight=zoom>1?380:252;
 const neededHeight=Math.ceil((enemies.length+1+companions.length)/cols)*rowHeight;if(canvas.height!==neededHeight)canvas.height=neededHeight;
 ctx.fillStyle=lighting==='dungeon'?'#33322e':lighting==='night'?'#242f33':'#686d52';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.save();ctx.scale(zoom,zoom);
 const w=1440/cols/zoom,h=rowHeight/zoom;
 for(let i=0;i<Math.min(actorLimit,enemies.length+1+companions.length);i++){
  const x=w*(i%cols+.5),y=h*(Math.floor(i/cols)+.78);
  ctx.fillStyle=lighting==='dungeon'?'#3c3b34':lighting==='night'?'#344040':'#757158';ctx.fillRect(x-w*.44,y-28,w*.88,70);
  const facing=dir==='up'?{dirX:0,dirY:-1}:dir==='down'?{dirX:0,dirY:1}:{dirX:Number(dir),dirY:0};
  if(i===0){drawHumanActor(ctx,{x,y,...facing,skin:'#cda47f',hair:'#514234',bodyType:'male',equipment:{},walkTime:now,isMoving:['walk','run'].includes(pose)}, {x:0,y:0});if(names)label('Human reference',x,y+47);continue;}
  if(i<=enemies.length){const e=enemies[i-1];e.dirX=facing.dirX;e.dirY=facing.dirY;e.x=x+(pose==='walk'||pose==='run'?Math.sin(now*4)*2:0);e.y=y;e.reviewAnimation=pose;
   if(e.boss)e.boss.phase=Number(controls.phase.value);
   e.telegraph=pose==='attack'?{x:e.x+facing.dirX*100,y:e.y+facing.dirY*100,time:.2,maxTime:.6,type:e.kind==='archer'?'arrow':'melee'}:null;e.hitFlash=pose==='hurt'?.1:0;e.dead=pose==='death';e.hp=e.dead?0:100;
   e.actionState={blocking:pose==='block',sprinting:pose==='run'};
   if(e.dead)recordEnemyDeathVisual(e);else delete e.visualDeath;
   if(pose==='hurt'){recordEnemyHitReaction(e,{dirX:1});e.visualReaction.startedAt=now-.08;}else delete e.visualReaction;
   e.hideEnemyNameplate=!names;drawEnemy(ctx,e,{x:0,y:0});if(names)label(e.name,x,y+47);
  }else{const s=companions[i-enemies.length-1];if(!s)continue;Object.assign(s,{x:x+(['walk','run'].includes(pose)?Math.sin(now*4)*2:0),y,...facing,walkTime:now,moving:['walk','run'].includes(pose),reviewAnimation:pose,attackAnimationUntil:pose==='attack'?now+.2:0});s.attackCooldown=pose==='attack'?(Math.floor(now*4)%2):0;drawSummonAsset(ctx,s,{classId:'gravecaller'},x,y);if(names)label(s.displayName||s.kind,x,y+47);}
 }
 ctx.restore();
 if(lighting!=='day'){ctx.fillStyle=lighting==='night'?'rgba(16,27,43,.22)':'rgba(34,23,12,.12)';ctx.fillRect(0,0,canvas.width,canvas.height);}
}
function label(t,x,y){ctx.fillStyle='#ede3c9';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(t,x,y);}
window.enemyArtReview={draw,rebuild,get enemies(){return enemies;},get actorCount(){return enemies.length+1+companions.length;},spriteArtStatus,controls,benchmark(count=120,actorLimit=30){const values=[];for(let n=0;n<count;n++){const t=performance.now();draw(actorLimit);values.push(performance.now()-t);}values.sort((a,b)=>a-b);return {actors:Math.min(actorLimit,enemies.length+1+companions.length),frames:count,medianMs:values[Math.floor(count*.5)],p95Ms:values[Math.floor(count*.95)],loadedAtlases:spriteArtStatus().filter(a=>a.ready).length};}};
function frame(){draw();requestAnimationFrame(frame);}frame();

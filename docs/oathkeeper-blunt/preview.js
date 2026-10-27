import {ABILITIES} from '../../src/data.js';
import {createPlayer,chooseClass,migratePlayer} from '../../src/player.js';
import {requestBasicAttack,requestHeavyAttack,updateWeaponCombat} from '../../src/combatMoves.js';
import {drawHumanActor} from '../../src/humanRenderer.js';
import {drawAttackVisual,drawWorldEffects} from '../../src/combatVisualsRenderer.js';
import {createAudioSystem} from '../../src/audioSystem.js';
const labels={base:'Original',holyknight:'Holyknight',sinner:'Sinner'};
const skills=ABILITIES.filter(a=>a.classId==='oathkeeper'),grid=document.querySelector('#grid');
function show(family){
 grid.replaceChildren();
 for(const a of skills)for(const f of family==='all'?Object.keys(labels):[family]){
  const card=document.createElement('article');card.className='card';
  card.innerHTML=`<div class="picture"><img loading="lazy" src="${a.id}-${f}.png" alt="${a.name} · ${labels[f]}"></div><h3>${a.name}</h3><div class="meta"><span>${labels[f]}</span></div><a href="../../combat-overhaul-lab.html?skill=${a.id}&morph=${f}">Try this form</a>`;
  card.querySelector('.picture').onclick=()=>{document.querySelector('#zoom img').src=`${a.id}-${f}.png`;document.querySelector('#zoom').showModal();};grid.append(card);
 }
}
show('base');document.querySelector('#families').onclick=e=>{const f=e.target.dataset.family;if(!f)return;for(const b of document.querySelectorAll('[data-family]'))b.classList.toggle('active',b===e.target);show(f);};
document.querySelector('#close').onclick=()=>document.querySelector('#zoom').close();
for(const [id,name] of [['mace-swing','Mace swing'],['mace-impact','Mace impact'],['mace-crush','Crushing blow'],['holyknight-impact','Sacred impact'],['sinner-impact','Broken vow']]){
 const div=document.createElement('div');div.innerHTML=`<small>${name}</small><audio controls preload="none" src="${id}.wav"></audio>`;document.querySelector('#sounds').append(div);
}
const mixer=createAudioSystem(),play=mixer.play.bind(mixer);mixer.play=(...args)=>{if(document.querySelector('#sound').checked)play(...args);};
const canvas=document.querySelector('#drill'),ctx=canvas.getContext('2d');let p,w,nextAt=0,paused=false,last=performance.now()/1000;
function reset(){
 p=createPlayer('Mace drills');chooseClass(p,'oathkeeper');p.equipment.weapon='oathkeepersMace';migratePlayer(p);
 Object.assign(p,{x:400,y:400,dirX:1,dirY:0,maxStamina:10000,stamina:10000,isMoving:false});
 w={mode:'dungeon',width:40,height:40,tiles:Array.from({length:40},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),objects:[],drops:[],effects:[],enemies:[{id:'practice',kind:'rat',x:432,y:400,radius:12,hp:1000000,maxHp:1000000,trainingDummy:true}]};nextAt=0;
}
reset();for(const id of ['direction','attack'])document.querySelector('#'+id).onchange=reset;
document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'Resume':'Pause';last=performance.now()/1000;};
function frame(ms){
 const now=ms/1000,dt=Math.min(.033,Math.max(0,now-last));last=now;
 const [dx,dy]={east:[1,0],west:[-1,0],south:[0,1],north:[0,-1]}[document.querySelector('#direction').value],input={combatAimX:dx,combatAimY:dy,hasAim:true};
 if(!paused){
  if(!p.combatState?.attacking&&now>=nextAt){
   const e=w.enemies[0];e.x=p.x+dx*31;e.y=p.y+dy*31;p.stamina=10000;
   const heavy=document.querySelector('#attack').value==='heavy',ok=(heavy?requestHeavyAttack:requestBasicAttack)(p,w,input,()=>{},now);
   if(ok){const move=p.combatState.attackMove;document.querySelector('#strike').textContent=move.name;nextAt=now+move.duration+(heavy?.65:move.finisher?move.comboRestartDelay+.25:.05);}
  }
  updateWeaponCombat(p,w,input,dt,now,()=>{});for(const fx of w.effects)fx.age+=dt;w.effects=w.effects.filter(fx=>fx.age<fx.ttl);
 }
 const camera={x:p.x-165,y:p.y-140};ctx.fillStyle='#242b26';ctx.fillRect(0,0,1000,520);ctx.save();ctx.scale(2,2);ctx.imageSmoothingEnabled=false;
 for(let y=Math.floor(camera.y/32)*32;y<camera.y+260;y+=32)for(let x=Math.floor(camera.x/32)*32;x<camera.x+500;x+=32){ctx.fillStyle=(x/32+y/32)%2?'#272e29':'#242c26';ctx.fillRect(x-camera.x,y-camera.y,31,31);}
 drawWorldEffects(ctx,w,camera,'behind');const e=w.enemies[0],x=e.x-camera.x,y=e.y-camera.y;
 ctx.fillStyle='#191b18';ctx.fillRect(x-12,y-9,25,14);ctx.fillStyle='#63523a';ctx.fillRect(x-8,y-35,16,33);ctx.fillStyle=e.hitFlash?'#c6b693':'#8b7350';ctx.fillRect(x-6,y-34,12,21);ctx.fillStyle='#352e24';ctx.fillRect(x-6,y-25,12,2);
 drawHumanActor(ctx,p,camera,{isPlayer:true,animationTime:now});drawAttackVisual(ctx,p,camera);drawWorldEffects(ctx,w,camera,'front');ctx.restore();requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

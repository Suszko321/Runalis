import {createPlayer,chooseClass,migratePlayer} from '../../src/player.js';
import {unlockActiveAbility} from '../../src/abilityLoadoutSystem.js';
import {getAbilityMastery} from '../../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../../src/abilityMorphSystem.js';
import {useAbility,updateCombat} from '../../src/combat.js';
import {requestBasicAttack,updateWeaponCombat} from '../../src/combatMoves.js';
import {getCombatTechniqueState} from '../../src/combatExpansion.js';
import {drawHumanActor} from '../../src/humanRenderer.js';
import {drawAttackVisual,drawWorldEffects,drawCombatProjectiles} from '../../src/combatVisualsRenderer.js';
import {createAudioSystem} from '../../src/audioSystem.js';
import {OATH_BLADE_ID as id,OATH_BLADE_PROFILES} from '../../src/oathbladeProfiles.js';
const canvas=document.querySelector('#arena'),c=canvas.getContext('2d'),camera={x:140,y:195},input={combatAimX:1,combatAimY:0,hasAim:true};
const mixer=createAudioSystem(),play=mixer.play.bind(mixer);mixer.play=(...args)=>{if(document.querySelector('#sound').checked)play(...args);};
let family='base',p,w,paused=false,simNow=performance.now()/1000,last=simNow,nextCast=0,nextMace=0;
function reset(){
 p=createPlayer('Vow arsenal');chooseClass(p,'oathkeeper');p.equipment.weapon='oathkeepersMace';p.skillState.combat.level=33;for(const s of Object.values(p.skillState.skills))s.level=33;migratePlayer(p);
 Object.assign(p,{x:350,y:400,dirX:1,dirY:0});w={mode:'dungeon',width:50,height:50,tiles:Array.from({length:50},()=>Array.from({length:50},()=>({passable:true,biome:'grass'}))),objects:[],drops:[],effects:[],enemies:[{id:'near',x:381,y:400},{id:'far',x:490,y:372},{id:'side',x:510,y:401}].map(e=>({...e,kind:'rat',radius:12,hp:1000000,maxHp:1000000,trainingDummy:true}))};
 updateCombat(p,w,{},0,simNow,()=>{});p.spirit=p.maxSpirit=p.stamina=p.maxStamina=10000;p.hp=p.maxHp*(family==='sinner'?.5:1);
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots=[id,null,null,null,'block'];selectAbilityMorph(p,id,family,simNow);nextCast=0;nextMace=simNow+1.25;
 const profile=OATH_BLADE_PROFILES[family];document.querySelector('#name').textContent=profile.name;document.querySelector('#description').textContent=profile.desc;document.querySelector('#stats').textContent=`${profile.count} swords · 8 seconds · ${profile.cost} Spirit before mastery discounts · ${profile.cd}s cooldown`;
}
reset();document.querySelector('#families').onclick=e=>{if(!e.target.dataset.family)return;family=e.target.dataset.family;for(const b of document.querySelectorAll('[data-family]'))b.classList.toggle('active',b===e.target);reset();};
document.querySelector('#cast').onclick=()=>{reset();};document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'Resume':'Pause';};
for(const f of Object.keys(OATH_BLADE_PROFILES)){const div=document.createElement('div');div.innerHTML=`<small>${OATH_BLADE_PROFILES[f].name}</small><audio controls preload="none" src="${f}-cast.wav"></audio>`;document.querySelector('#sounds').append(div);}
function frame(ms){
 const real=ms/1000,dt=Math.min(.033,Math.max(0,real-last));last=real;
 if(!paused){simNow+=dt;if(simNow>=nextCast){p.spirit=10000;p.cooldowns={};p.abilityChargeState={};useAbility(0,p,w,()=>{},simNow,input);nextCast=simNow+9;}
  if(document.querySelector('#mace').checked&&!p.combatState?.attacking&&simNow>=nextMace){p.stamina=10000;const ok=requestBasicAttack(p,w,input,()=>{},simNow);if(ok){const move=p.combatState.attackMove;nextMace=simNow+move.duration+(move.finisher?move.comboRestartDelay+.6:.15);}}
  updateCombat(p,w,{},dt,simNow,()=>{});updateWeaponCombat(p,w,input,dt,simNow,()=>{});for(const fx of w.effects)fx.age+=dt;w.effects=w.effects.filter(f=>f.age<f.ttl);
 }
 c.fillStyle='#22261f';c.fillRect(0,0,1080,580);c.save();c.scale(2,2);c.imageSmoothingEnabled=false;
 for(let y=192;y<500;y+=32)for(let x=128;x<720;x+=32){c.fillStyle=(x/32+y/32)%2?'#282b24':'#23271f';c.fillRect(x-camera.x,y-camera.y,31,31);}
 drawWorldEffects(c,w,camera,'behind');
 for(const e of w.enemies){const x=e.x-camera.x,y=e.y-camera.y;c.fillStyle='#171912';c.fillRect(x-14,y-6,28,9);c.fillStyle='#574635';c.fillRect(x-7,y-37,14,36);c.fillStyle=e.hitFlash?'#cbb087':'#927148';c.fillRect(x-9,y-38,18,25);c.fillStyle='#28251f';c.fillRect(x-6,y-30,12,2);}
 drawHumanActor(c,p,camera,{isPlayer:true,animationTime:simNow});drawAttackVisual(c,p,camera);drawCombatProjectiles(c,p,camera,simNow);drawWorldEffects(c,w,camera,'front');c.restore();
 const formation=getCombatTechniqueState(p)?.statuses.oathBlades;document.querySelector('#phase').textContent=formation?`${formation.blades.map(b=>b.phase).join(' · ')} · ${Math.max(0,formation.until-simNow).toFixed(1)}s`:'Formation returning to the vow';requestAnimationFrame(frame);
}
window.oathbladePreview={get player(){return p;},get world(){return w;},get now(){return simNow;},get family(){return family;},reset};requestAnimationFrame(frame);

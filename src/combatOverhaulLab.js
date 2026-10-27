import { createPlayer,chooseClass,addItem,migratePlayer } from './player.js';
import {getAbilityMorphOptions,selectAbilityMorph,getSelectedAbilityMorph} from './abilityMorphSystem.js';
import {resolveSubclassAbility} from './subclassVariants.js';
import {getSubclassResourceLabel} from './subclassCombat.js';
import {installSubclassStyles} from './abilityMorphUi.js';
import { purchaseSkillScroll,readSkillScroll } from './skillScrollSystem.js';
import { getCombatLevelProgress } from './skills.js';
import { drawSummonAsset } from './codeAssets.js';
import {getSelectableClassDefinitions,isClassAvailable} from './classData.js';
import { ABILITIES,ITEMS,getAbilityById } from './data.js';
import { COMBAT_EXPANSION_ABILITIES } from './combatExpansionData.js';
import { createCombatDeveloperTools } from './combatDeveloperTools.js';
import { getKeyboardAbilitySlot,getAbilityBindingLabel } from './abilityBindings.js';
import { useAbility,updateAbilityInput,updateCombat,updateEnemies,updateSummons,getPlayerMovementMultiplier } from './combat.js';
import { stopAbilityChannel } from './abilityChannelSystem.js';
import { moveActorWithCollision } from './world.js';
import { drawCombatProjectiles,drawWorldEffects,drawAttackVisual,drawActionStateVisuals } from './combatVisualsRenderer.js';
import { drawHumanActor } from './humanRenderer.js';
import { getMasteryProgress,applyAbilityMastery } from './abilityMasterySystem.js';
import { hudArtIcon } from './artIcons.js';
import { createControllerManager,updateControllerManager,getControllerInput } from './inputController.js';
const q=s=>document.querySelector(s),canvas=q('#arena'),ctx=canvas.getContext('2d');
installSubclassStyles();
const game={player:null,world:null,canvas,camera:{x:0,y:0},input:{mouseAimActive:true,mouseWorldX:470,mouseWorldY:320},paused:true};
const lines=[];game.log=message=>{lines.unshift(message);lines.length=Math.min(lines.length,15);q('#log').textContent=lines.slice(0,5).join('\n');};
const controller=createControllerManager(),keys=new Set();let last=performance.now(),hudAt=0;
for(const c of getSelectableClassDefinitions({includeHidden:true}))q('#class').add(new Option(c.name+(c.hidden?' (hidden path)':''),c.id));
const weaponSelect=document.createElement('select');weaponSelect.id='weapon';weaponSelect.setAttribute('aria-label','Practice weapon');q('#class').after(weaponSelect);
weaponSelect.add(new Option('Unarmed',''));
for(const id of ['noviceBlade','enemyRoadlessDagger','oathkeepersMace','rootStaff','graveScythe','hunterBow','pilgrimsFocus','eldritchConduit'])weaponSelect.add(new Option(ITEMS[id].name,id));
function selectReviewWeapon(id){if(id&&(!ITEMS[id]||ITEMS[id].slot!=='weapon'))return;stopAbilityChannel(game.player);if(id)addItem(game.player,id,1);game.player.equipment.weapon=id||null;if(game.player.combatState){game.player.combatState.attacking=false;game.player.combatState.heavyChargeActive=false;}if(id&&![...weaponSelect.options].some(o=>o.value===id))weaponSelect.add(new Option(ITEMS[id].name,id));weaponSelect.value=id;migratePlayer(game.player);game.dev.refill();renderHud();}
weaponSelect.onchange=()=>selectReviewWeapon(weaponSelect.value);
function reset(classId=q('#class').value) {
  if(!isClassAvailable(classId))classId='gravecaller';
  lines.length=0;
  game.paused=true;q('#pause').textContent='Resume';q('#level').value=1;
  game.player=createPlayer('Combat reviewer');chooseClass(game.player,classId,game.log);
  Object.assign(game.player,{id:'combat-reviewer',x:250,y:320,dirX:1,dirY:0,spiritAwakened:true,maxSpirit:100,spirit:100,act1OpeningPending:false});
  game.world={mode:'dungeon',name:'Combat proving ground',width:32,height:19,tiles:Array.from({length:19},(_,y)=>Array.from({length:32},(_,x)=>({biome:'grass',passable:x>0&&x<31&&y>0&&y<18&&!(x===20&&y>4&&y<15)}))),objects:[],enemies:[],effects:[],drops:[]};
  game.dev=createCombatDeveloperTools(game);game.dev.unlockAll({includeScrolls:false});game.dev.refill();game.player.gold=40;
  const weaponId=game.player.equipment.weapon;if(![...weaponSelect.options].some(o=>o.value===weaponId)&&ITEMS[weaponId])weaponSelect.add(new Option(ITEMS[weaponId].name,weaponId));weaponSelect.value=weaponId||'';
  const additions=COMBAT_EXPANSION_ABILITIES.filter(a=>a.classId===classId);game.dev.equip(additions.slice(0,4).map(a=>a.id));game.dev.spawn('melee',410,320);game.dev.spawn('ranged',530,360);
  renderCatalogue();
  renderHud();
}
q('#class').onchange=()=>reset();q('#spawn').onclick=()=>game.dev.spawn(q('#enemy').value,450,320);q('#pack').onclick=()=>{for(let i=0;i<12;i++)game.dev.spawn(i%3===0?'fast':'melee',390+i%4*48,225+Math.floor(i/4)*48);};
q('#morph').onchange=()=>{const id=game.player.loadout.abilitySlots[Number(q('#slot').value)],result=selectAbilityMorph(game.player,id,q('#morph').value);game.log(result.reason);renderCatalogue();renderHud();};
q('#slot').onchange=()=>renderHud();
q('#refill').onclick=()=>{game.dev.refill();game.dev.clearCooldowns();};q('#mastery').onclick=()=>{for(const id of game.player.loadout.abilitySlots)game.dev.setMastery(id,30);renderHud();};q('#reset').onclick=()=>reset();q('#pause').onclick=()=>{game.paused=!game.paused;q('#pause').textContent=game.paused?'Resume':'Pause';};
q('#wolf').onclick=()=>{const result=purchaseSkillScroll(game.player,'summonWolfScroll');if(!result.ok){game.log(result.reason);return;}game.log(readSkillScroll(game.player,game.player.inventory.findIndex(i=>i.id==='summonWolfScroll')).reason);equipReviewSkill('summonWolf',Number(q('#slot').value));};
q('#demon').onclick=()=>{addItem(game.player,'demonseedScythe');const result=readSkillScroll(game.player,game.player.inventory.findIndex(i=>i.id==='summonDemonScroll'));game.log(result.reason);equipReviewSkill('summonDemon',Number(q('#slot').value));};
q('#level').onchange=()=>{const level=Math.max(1,Math.floor(Number(q('#level').value)||1));game.player.skillState.combat.level=level;game.player.skillState.combat.xp=0;migratePlayer(game.player);game.dev.refill();renderHud();};
canvas.onpointermove=e=>{const rect=canvas.getBoundingClientRect();game.input.mouseWorldX=(e.clientX-rect.left)/rect.width*canvas.width;game.input.mouseWorldY=(e.clientY-rect.top)/rect.height*canvas.height;};
window.addEventListener('keydown',e=>{if(['SELECT','INPUT'].includes(e.target.tagName))return;const key=e.key.toLowerCase(),slot=getKeyboardAbilitySlot(key,game.player);keys.add(key);if(slot>=0){e.preventDefault();if(!game.input[`ability${slot}Held`])game.input[`ability${slot}Pressed`]=true;game.input[`ability${slot}Held`]=true;}if(key===' '){e.preventDefault();game.input.attackPressed=!game.input.attackHeld;game.input.attackHeld=true;}if(key==='shift')game.input.dashPressed=true;});
window.addEventListener('keyup',e=>{const key=e.key.toLowerCase(),slot=getKeyboardAbilitySlot(key,game.player);keys.delete(key);if(slot>=0){game.input[`ability${slot}Held`]=false;game.input[`ability${slot}Released`]=true;}if(key===' '){game.input.attackHeld=false;game.input.attackReleased=true;}});
window.addEventListener('blur',()=>{keys.clear();game.input={mouseAimActive:true};stopAbilityChannel(game.player);});
function renderHud() {
 const p=game.player,now=performance.now()/1000;
 q('#slots').innerHTML=p.loadout.abilitySlots.map((id,i)=>{const a=applyAbilityMastery(p,resolveSubclassAbility(p,id));if(!a)return `<div class="slot">${getAbilityBindingLabel(p,i)}<small>Empty</small></div>`;const mastery=getMasteryProgress(p,id),channel=p.activeChannel?.abilityId===id,cd=Math.max(0,a.cd-(now-(p.cooldowns[id]??-Infinity))),charging=p.abilityCharge?.abilityId===id;
 return `<div class="slot ${channel?'channel':''} ${p[a.costType]<a.cost?'failed':''}">${hudArtIcon(id,'',p)}<b>${a.name}</b><small>${getAbilityBindingLabel(p,i)} · M${mastery.level} · ${channel?'CHANNEL':charging?'CHARGING':cd>0?cd.toFixed(1)+'s':'READY'}</small><div class="meter"><i style="width:${channel?100:charging?p.abilityCharge.progress*100:mastery.progress*100}%"></i></div></div>`;}).join('');
 const combat=getCombatLevelProgress(p);q('#vitals').textContent=`Combat ${combat.level} · ${Math.floor(combat.xp)}/${Math.floor(combat.next)} XP · Health ${Math.ceil(p.hp)}/${p.maxHp} · Spirit ${Math.floor(p.spirit)}/${p.maxSpirit} · Stamina ${Math.floor(p.stamina)} · Gold ${p.gold} · Enemies ${game.world.enemies.filter(e=>e.hp>0).length}`;
 const id=p.loadout.abilitySlots[Number(q('#slot').value)],options=getAbilityMorphOptions(p,id);
 const markup=options.map(o=>`<option value="${o.id}" ${o.unlocked?'':'disabled'}>${o.name}${o.id==='base'?'':` · Mastery ${o.requiredMastery}`}</option>`).join('');
 if(q('#morph').innerHTML!==markup)q('#morph').innerHTML=markup;
 q('#morph').value=getSelectedAbilityMorph(p,id)||'base';
 q('#calling').textContent=[`${getAbilityById(id)?.name||'Empty slot'} · Select its form above. Use Mastery 30 to unlock variants in this review arena.`,getSubclassResourceLabel(p)].filter(Boolean).join(' · ');
 q('#reward').textContent=p.lastCombatReward?`Last encounter: ${p.lastCombatReward.combatXP} Combat XP · ${p.lastCombatReward.awards.map(a=>a.skillId+' '+a.amount.toFixed(2)).join(' · ')}`:'Defeat a real opponent to review the XP allocation. Dummies grant no XP.';
}
function draw(animationTime=performance.now()/1000) {
 const p=game.player,w=game.world;ctx.clearRect(0,0,1000,600);ctx.fillStyle='#222b28';ctx.fillRect(0,0,1000,600);
 for(let y=0;y<19;y++)for(let x=0;x<32;x++){ctx.fillStyle=w.tiles[y][x].passable?(x+y)%2?'#28312d':'#262e2b':'#494744';ctx.fillRect(x*32,y*32,31,31);}
 ctx.fillStyle='#af9d7e';ctx.font='12px Georgia';ctx.fillText('OPEN GROUND',45,68);ctx.fillText('WALL / NARROW PASSAGE',670,90);
 drawWorldEffects(ctx,w,game.camera,'behind');
 for(const e of w.enemies){ctx.fillStyle=e.isBoss?'#774941':e.ranged?'#657383':'#68574c';ctx.beginPath();ctx.ellipse(e.x,e.y,e.radius,e.radius*.55,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=e.hitFlash?'#ded1b1':'#9d7961';ctx.fillRect(e.x-e.radius*.6,e.y-e.radius*1.7,e.radius*1.2,e.radius*1.7);ctx.fillStyle='#21191c';ctx.fillRect(e.x-19,e.y-e.radius*2-8,38,4);ctx.fillStyle='#bc6d57';ctx.fillRect(e.x-19,e.y-e.radius*2-8,38*e.hp/e.maxHp,4);}
 for(const s of p.summons||[])if(s.alive!==false)drawSummonAsset(ctx,s,p,s.x,s.y);
 drawHumanActor(ctx,p,game.camera,{isPlayer:true,animationTime});drawAttackVisual(ctx,p,game.camera);drawActionStateVisuals(ctx,p,game.camera);drawCombatProjectiles(ctx,p,game.camera);drawWorldEffects(ctx,w,game.camera,'front');
}
function frame(ms) {
 const dt=Math.min(.05,(ms-last)/1000),now=ms/1000;last=ms;
 if(!game.paused&&game.player.hp>0){
  updateControllerManager(controller);const pad=getControllerInput(controller);const input=pad.connected?{...pad,combatAimX:pad.aimX,combatAimY:pad.aimY}:game.input;
  input.moveX=pad.connected?pad.moveX:Number(keys.has('d'))-Number(keys.has('a'));input.moveY=pad.connected?pad.moveY:Number(keys.has('s'))-Number(keys.has('w'));input.blockHeld=false;
  updateAbilityInput(game.player,game.world,input,dt,now,game.log);updateCombat(game.player,game.world,input,dt,now,game.log);updateEnemies(dt,game.player,game.world,game.log,now);updateSummons(dt,game.player,game.world,game.log,now);
  const speed=205*getPlayerMovementMultiplier(game.player);moveActorWithCollision(game.player,game.world,input.moveX*speed*dt,input.moveY*speed*dt);
  for(const fx of game.world.effects)fx.age=(fx.age||0)+dt;game.world.effects=game.world.effects.filter(fx=>fx.age<fx.ttl);
 }
 for(const key of Object.keys(game.input))if(key.endsWith('Pressed')||key.endsWith('Released'))game.input[key]=false;
 draw();if(ms>hudAt){hudAt=ms+100;renderHud();}requestAnimationFrame(frame);
}
function equipReviewSkill(id,slot=3){
 const a=getAbilityById(id);if(!a)return;
 stopAbilityChannel(game.player);
 if(a.bloodline)game.player.bloodline={id:a.bloodline};
 game.dev.equip(game.player.loadout.abilitySlots.map((old,i)=>i===slot?a.id:old));renderHud();
}
const requestedAbility=getAbilityById(new URLSearchParams(location.search).get('skill'));
const requested=requestedAbility&&(!requestedAbility.classId||isClassAvailable(requestedAbility.classId))?requestedAbility:null;
function renderCatalogue(){
 q('#catalogue').innerHTML=ABILITIES.filter(a=>a.classId===game.player.classId||!a.classId).map(base=>{const a=resolveSubclassAbility(game.player,base);return `<button data-ability="${a.id}" title="${a.desc||a.name}">${hudArtIcon(a.id,'',game.player)}<span>${a.name}<small>${a.subclassName||'Original'} · ${a.subclassMode||a.role||'Technique'} · ${a.cost} ${a.costType} · ${a.cd}s</small></span></button>`;}).join('');
 for(const button of q('#catalogue').querySelectorAll('button'))button.onclick=()=>equipReviewSkill(button.dataset.ability,Number(q('#slot').value));
}
const requestedMorph=new URLSearchParams(location.search).get('morph')||new URLSearchParams(location.search).get('subclass');
if(requested){q('#class').value=requested.classId||'gravecaller';reset(q('#class').value);equipReviewSkill(requested.id);if(requestedMorph){game.dev.setMastery(requested.id,20);selectAbilityMorph(game.player,requested.id,requestedMorph);renderCatalogue();renderHud();}}else reset(q('#class').value);
const requestedWeapon=new URLSearchParams(location.search).get('weapon');if(requestedWeapon)selectReviewWeapon(requestedWeapon);
window.combatReview={game,reset,draw,renderHud};requestAnimationFrame(frame);

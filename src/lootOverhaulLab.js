import {createPlayer,chooseClass,addItem} from './player.js';
import {ITEMS} from './data.js';
import {MYTHICAL_SETS} from './mythicalEquipmentData.js';
import {equipGearEntry,getEquipmentTier,normalizeEquipmentProgression} from './equipmentProgressionSystem.js';
import {unlockActiveAbility,assignAbilityToSlot} from './abilityLoadoutSystem.js';
import {useAbility,updateCombat,updateSummons} from './combat.js';
import {ensureCombatState,requestHeavyAttack,updateWeaponCombat} from './combatMoves.js';
import {drawHumanActor} from './humanRenderer.js';
import {drawEnemy} from './render.js';
import {drawSummonAsset} from './codeAssets.js';
import {drawWorldEffects} from './combatVisualsRenderer.js';
import {spriteArtStatus} from './spriteArt.js';
import {renderInventory,bindInventoryButtons} from './panelInventory.js';
import {readSkillScroll} from './skillScrollSystem.js';
import {injectRunalisUiStyles} from './uiStyles.js';
injectRunalisUiStyles();

const select=document.querySelector('#set'),tier=document.querySelector('#tier'),pose=document.querySelector('#pose'),canvas=document.querySelector('#review'),ctx=canvas.getContext('2d');
select.innerHTML=Object.values(MYTHICAL_SETS).map(set=>`<option value="${set.id}">${set.name}</option>`).join('')+'<option value="mixed">Drowned 3 + Ashen 2</option><option value="demonseed">Demonseed Scythe</option>';
const materialIds=['ironScrap','arcaneDust','sturdyHardwood','amberResin','fieldstone','blackironOre','thornsilkFiber','graveSilver','spiritwoodSplinter','lumenQuartz','tideglassCrystal','oathsteelShard','towerFragment'];
const actor=(classId='classless')=>{const p=createPlayer('Gear review');chooseClass(p,classId,()=>{});Object.assign(p,{id:'lab-'+classId,x:80,y:170,dirX:1,dirY:0,spiritAwakened:true,hp:1000,maxHp:1000,spirit:1000,maxSpirit:1000,stamina:1000,maxStamina:1000,gold:100000});return p;};
const equip=(p,id)=>{addItem(p,id);equipGearEntry(p,p.inventory.findLastIndex(e=>e.id===id));};
const dress=(p,id)=>MYTHICAL_SETS[id].pieces.forEach(item=>equip(p,item));
const gallery=Object.keys(MYTHICAL_SETS).map(id=>{const p=actor();dress(p,id);return p;});
const ground=()=>({mode:'dungeon',name:'Gear review',width:40,height:24,tiles:Array.from({length:24},()=>Array.from({length:40},()=>({biome:'grass',passable:true}))),enemies:[{id:'front',kind:'rat',name:'Training target',x:190,y:170,hp:1e7,maxHp:1e7,r:10,radius:10,aggro:3},{id:'side',kind:'rat',name:'Training target',x:205,y:218,hp:1e7,maxHp:1e7,r:10,radius:10,aggro:3}],objects:[],effects:[],drops:[]});
const game={uiState:{inventorySubtab:'equipment',selectedEquipmentSlot:'weapon'},log(message){document.querySelector('#messages').textContent=message;}};
let player,scenes=[],resetAt=0,previous=performance.now()/1000;
function renderPanel(){renderInventory(player,game);bindInventoryButtons(player,game,renderPanel);}
function reset(){
 const id=select.value;player=actor(id==='blightedStar'?'eldritch':id==='drownedConvergence'||id==='mixed'?'waverider':'classless');
 if(id==='mixed'){dress(player,'drownedConvergence');equip(player,'ashenExecutionerWeapon');equip(player,'ashenExecutionerLegs');}
 else if(id==='demonseed'){equip(player,'demonseedScythe');readSkillScroll(player,player.inventory.findIndex(e=>e.id==='summonDemonScroll'));assignAbilityToSlot(player,0,'summonDemon');}
 else dress(player,id);
 for(const entry of Object.values(player.equippedGear))entry.upgradeTier=Number(tier.value);normalizeEquipmentProgression(player);
 addItem(player,'oldKnife');addItem(player,'demonseedScythe');for(const id of materialIds)addItem(player,id,500);
 game.player=player;game.uiState.pendingGearUpgrade=null;game.uiState.equipmentFocusRegion='slots';game.uiState.selectedEquipmentSlot=player.equipment.weapon?'weapon':'chest';game.log('Select an equipped piece to inspect its tier, set bonuses, and next upgrade.');renderPanel();
}
function resetScenes(now){
 scenes=[['drownedConvergence','waverider','hydromancerWaterTorrent','Sweeping Torrent'],['blightedStar','eldritch','eldritchCrimsonConduit','Branching Conduit'],['beastSovereign','classless','summonWolf','Dire Wolf'],['ashenExecutioner','classless',null,'Light–Light–Heavy']].map(([setId,classId,abilityId,name])=>{
 const p=actor(classId),w=ground();dress(p,setId);p.stamina=1000;p.spirit=1000;
 if(abilityId){unlockActiveAbility(p,abilityId);assignAbilityToSlot(p,0,abilityId);useAbility(0,p,w,()=>{},now,{combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true});}
 else{ensureCombatState(p);p.combatState.comboSequence='LL';p.combatState.comboTimer=1;requestHeavyAttack(p,w,{combatAimX:1,combatAimY:0,hasAim:true},()=>{},now);}
 return {p,w,name,abilityId};});resetAt=now;
}
function label(text,x,y){ctx.fillStyle='#ede3c9';ctx.font='15px system-ui';ctx.textAlign='center';ctx.fillText(text,x,y);}
function draw(now=performance.now()/1000){
 const dt=Math.min(.04,Math.max(0,now-previous));previous=now;ctx.fillStyle='#3a4238';ctx.fillRect(0,0,1440,900);ctx.imageSmoothingEnabled=false;
 const sets=Object.keys(MYTHICAL_SETS);
 for(let column=0;column<5;column++){const p=gallery[column];for(let row=0;row<4;row++){const x=(column+.5)*288,y=120+row*105;const directions=[[0,1],[1,0],[0,-1],[-1,0]],d=directions[row];Object.assign(p,{x,y,dirX:d[0],dirY:d[1],bodyType:row%2?'female':'male',skin:'#cda47f',hair:'#514234',isMoving:pose.value==='walk',walkTime:now*5});drawHumanActor(ctx,p,{x:0,y:0});}label(MYTHICAL_SETS[sets[column]].name,(column+.5)*288,35);}
 const pets=[{kind:'wolf',displayName:'Allied Wolf'},{kind:'wolf',artVariant:'sovereignWolf',direWolf:true,displayName:'Dire Wolf'},{kind:'miniDemon',displayName:'Demonseed Ravager'}];
 for(let i=0;i<pets.length;i++){const s=pets[i],x=520+i*210,y=570;s.moving=pose.value==='walk';s.walkTime=now*5;s.dirX=1;drawSummonAsset(ctx,s,player,x,y);label(s.displayName,x,y+35);}
 if(!scenes.length||now-resetAt>2.8)resetScenes(now);
 for(const [index,scene] of scenes.entries()){
 const {p,w,name}=scene;p.spirit=1000;p.stamina=1000;updateCombat(p,w,{combatAimX:1,combatAimY:0,hasAim:true,ability0Held:true},dt,now,()=>{});updateSummons(dt,p,w,()=>{},now);for(const effect of w.effects)effect.age=(effect.age||0)+dt;w.effects=w.effects.filter(e=>e.age<e.ttl);
 ctx.save();ctx.translate(index*360,660);ctx.fillStyle='#59634a';ctx.fillRect(6,15,348,214);label(name,180,4);ctx.beginPath();ctx.rect(6,15,348,214);ctx.clip();drawWorldEffects(ctx,w,{x:0,y:0},'behind');drawHumanActor(ctx,p,{x:0,y:0});for(const enemy of w.enemies)drawEnemy(ctx,enemy,{x:0,y:0},p);for(const summon of p.summons)drawSummonAsset(ctx,summon,p,summon.x,summon.y);drawWorldEffects(ctx,w,{x:0,y:0},'front');ctx.restore();}
}
select.onchange=reset;tier.onchange=reset;document.querySelector('#reset').onclick=reset;reset();
window.lootReview={get player(){return player;},get scenes(){return scenes;},game,select,tier,pose,reset,draw,spriteArtStatus,getEquipmentTier,renderPanel};
function frame(){draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);

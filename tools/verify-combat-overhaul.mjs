import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPlayer,chooseClass,migratePlayer } from '../src/player.js';
import { ABILITIES,ITEMS,getAbilityById } from '../src/data.js';
import { PRIMARY_WEAPON_SPIRIT_ON_HIT,requestBasicAttack,requestHeavyAttack,updateWeaponCombat } from '../src/combatMoves.js';
import { RUNALIS_CLASSES,normalizeAbilitySlots } from '../src/classData.js';
import { COMBAT_EXPANSION_ABILITIES } from '../src/combatExpansionData.js';
import { HOTBAR_SLOT_COUNT,normalizeAbilityManagementState,unlockActiveAbility,assignAbilityToSlot,clearAbilitySlot,getAbilityAvailability } from '../src/abilityLoadoutSystem.js';
import { getAbilityMastery,applyAbilityMastery,grantAbilityMasteryXp,getMasteryBonuses,rewardMobilityMastery,normalizeAbilityMastery,registerAbilitySupport,rewardAbilitySupport } from '../src/abilityMasterySystem.js';
import { startAbilityChannel,updateAbilityChannel,stopAbilityChannel } from '../src/abilityChannelSystem.js';
import { recordEnemyCombatContribution,grantSharedCombatKillXp } from '../src/combatProgression.js';
import { useAbility,updateCombat,updateAbilityInput,updateSummons,updateEnemies,getPlayerMovementMultiplier } from '../src/combat.js';
import { getCombatTechniqueState,mitigateTechniqueDamage } from '../src/combatExpansion.js';
import { getAbilityUseChargeState,spendAbilityUseCharge } from '../src/abilityChargeSystem.js';
import { beginAbilityCharge,updateAbilityCharge,releaseAbilityCharge,applyAbilityCharge } from '../src/chargeSystem.js';
import { SKILL_TREE_NODES,spendSkillTreeNode } from '../src/skillTreeSystem.js';
import { sanitizeForSave } from '../src/gameSave.js';
import { normalizeProfileSave } from '../src/saveProfiles.js';
import { getAbilityBindingLabel, getKeyboardAbilitySlot } from '../src/abilityBindings.js';
import { createControllerManager,getControllerInput } from '../src/inputController.js';
import { getSignatureAbilityProfile } from '../src/animationProfiles.js';

const report={checks:[],abilities:[]};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const world=()=>({mode:'dungeon',width:30,height:22,tiles:Array.from({length:22},()=>Array.from({length:30},()=>({biome:'grass',passable:true}))),enemies:[],objects:[],effects:[],drops:[]});
const actor=(id)=>{const p=createPlayer(id);chooseClass(p,id,()=>{});Object.assign(p,{id,x:260,y:320,dirX:1,dirY:0,spiritAwakened:true,spirit:100,maxSpirit:100,stamina:200,maxStamina:200});return p;};
const foe=(p,x=390,y=320,extra={})=>({id:'foe-'+Math.random(),name:'Combat target',kind:'rat',x,y,hp:250,maxHp:250,xp:80,level:1,r:14,radius:14,aggro:3,combatTargetKind:'player',combatTargetId:p.id,...extra});
const now=()=>performance.now()/1000+20;
const aim={rightStickActive:true,rightStickAimX:1,rightStickAimY:0,combatAimX:1,combatAimY:0,aimSource:'rightStick',hasAim:true};

test('five-slot migration and ownership preserve all valid legacy assignments',()=>{
 assert.equal(HOTBAR_SLOT_COUNT,5);assert.equal(normalizeAbilitySlots([]).length,5);
 const p=actor('gravecaller');p.loadout.abilitySlots=['graveSpark','summonLich','bloodLance','soulSiphon'];p.knownAbilities=[];p.unlockedAbilities=[];p.abilityLayoutVersion=3;migratePlayer(p);
 assert.deepEqual(p.loadout.abilitySlots,['graveSpark','summonLich','bloodLance','soulSiphon','block']);
 assert.ok(p.knownAbilities.includes('soulSiphon'));
 p.loadout.abilitySlots=['graveSpark','summonLich','bloodLance'];p.abilityLayoutVersion=3;migratePlayer(p);assert.deepEqual(p.loadout.abilitySlots,['graveSpark','summonLich','bloodLance',null,'block']);
});
test('unlock fills empty slot, never overwrites, and rejects class/unknown abilities',()=>{
 const p=actor('gravecaller');p.loadout.abilitySlots=['graveSpark','summonLich',null,null];
 unlockActiveAbility(p,'gravecallerGhostwalk');assert.equal(p.loadout.abilitySlots[2],'gravecallerGhostwalk');
 unlockActiveAbility(p,'gravecallerDeathEcho');unlockActiveAbility(p,'gravecallerFuneralUrn');assert.equal(p.loadout.abilitySlots[3],'gravecallerDeathEcho');
 assert.equal(unlockActiveAbility(p,'nonsense'),false);unlockActiveAbility(p,'lightbringerDawnstep');assert.equal(assignAbilityToSlot(p,3,'lightbringerDawnstep').ok,false);
});

test('cleared starter slots remain empty through refresh and save migration',()=>{
 const p=actor('gravecaller');clearAbilitySlot(p,0);clearAbilitySlot(p,1);migratePlayer(p);
 assert.deepEqual(p.loadout.abilitySlots,[null,null,null,null,'block']);assert.ok(p.knownAbilities.includes('graveSpark'));assert.ok(p.knownAbilities.includes('summonLich'));
 const loaded=normalizeProfileSave(sanitizeForSave(p));assert.deepEqual(loaded.loadout.abilitySlots,[null,null,null,null,'block']);
});
test('keyboard rebinding and LB controller press/hold/release use fourth abstraction',()=>{
 assert.equal(getKeyboardAbilitySlot('4'),3);assert.equal(getKeyboardAbilitySlot('z',{inputBindings:{abilityKeys:['q','r','x','z']}}),3);
 const manager=createControllerManager(),slot=manager.slots[0];slot.connected=true;slot.buttons=Array(16).fill(false);slot.prevButtons=Array(16).fill(false);slot.buttons[4]=true;
 let i=getControllerInput(manager);assert.equal(i.ability3Pressed,true);assert.equal(i.ability3Held,true);assert.equal(i.blockHeld,false);
 slot.prevButtons=slot.buttons;slot.buttons=Array(16).fill(false);i=getControllerInput(manager);assert.equal(i.ability3Released,true);
});
test('all four controllers use RB tap/hold/release for weapons and RT tap/hold/release for slot zero',()=>{
 for(let index=0;index<4;index++){
  const manager=createControllerManager(),slot=manager.slots[index];slot.connected=true;
  const sample=button=>{slot.prevButtons=slot.buttons;slot.buttons=Array(16).fill(false);if(button!==null)slot.buttons[button]=true;return {...getControllerInput(manager,index),...aim};};
  const p=actor('gravecaller'),w=world(),t=now();unlockActiveAbility(p,'gravecallerMurmuringHost');p.loadout.abilitySlots[0]='gravecallerMurmuringHost';
  let input=sample(7);assert(input.ability0Pressed&&input.ability0Held&&!input.attackPressed&&!input.attackHeld&&input.pageRightPressed);
  updateAbilityInput(p,w,input,.01,t,()=>{});updateCombat(p,w,input,.01,t,()=>{});assert.equal(p.activeChannel?.abilityId,'gravecallerMurmuringHost');assert(!p.combatState.attacking);
  input=sample(7);assert(input.ability0Held&&!input.ability0Pressed);updateCombat(p,w,input,.05,t+.05,()=>{});assert(p.activeChannel);
  input=sample(null);assert(input.ability0Released&&!input.attackReleased);updateCombat(p,w,input,.05,t+.1,()=>{});assert.equal(p.activeChannel,null);
  const melee=actor('gravecaller'),mw=world();input=sample(5);assert(input.attackPressed&&input.attackHeld&&!input.ability0Pressed&&!input.ability0Held&&input.tabRightPressed);
  updateCombat(melee,mw,input,.01,t+.2,()=>{});assert(melee.combatState.heavyChargeActive);assert(!melee.activeChannel);
  input=sample(null);assert(input.attackReleased&&!input.ability0Released);updateCombat(melee,mw,input,.01,t+.21,()=>{});assert.equal(melee.combatState.attackMove.comboType,'light');
  const heavy=actor('gravecaller'),hw=world();let time=t+.3;
  for(let frame=0;frame<180&&!heavy.combatState?.attacking;frame++){input=sample(5);time+=1/120;updateCombat(heavy,hw,input,1/120,time,()=>{});}
  assert.equal(heavy.combatState.attackMove.comboType,'heavy');assert.equal(getAbilityBindingLabel(p,0),'Q / RT');
 }
});

test('hotbar mastery follows earned XP while combat statistics and disciplines retain attribution',()=>{
 const p=actor('gravecaller'),e=foe(p);p.knownAbilities.push('bloodLance');
 recordEnemyCombatContribution(e,p,'spirit',200,{sourceAbilityId:'graveSpark'});
 recordEnemyCombatContribution(e,p,'spirit',40,{sourceAbilityId:'bloodLance'});
 recordEnemyCombatContribution(e,p,'blade',10,{source:'weapon'});
 grantSharedCombatKillXp(p,e,80,()=>{});
 assert.ok(getAbilityMastery(p,'graveSpark').level>1);assert.equal(getAbilityMastery(p,'bloodLance').xp,0);
 assert.equal(getAbilityMastery(p,'graveSpark').lifetimeContributingKills,1);assert.equal(getAbilityMastery(p,'graveSpark').lifetimeKills,0);
 const before=JSON.stringify(p.abilityMastery);grantSharedCombatKillXp(p,e,80,()=>{});assert.equal(JSON.stringify(p.abilityMastery),before);
 assert.ok(p.skillState.skills.spirit.xp>0);
});
test('mobility usage records participation without creating mastery before victory XP',()=>{
 const p=actor('gravecaller'),w=world(),id='gravecallerGhostwalk';
 rewardMobilityMastery(p,w,id,160,10);assert.equal(getAbilityMastery(p,id).xp,0);
 w.enemies=[foe(p)];rewardMobilityMastery(p,w,id,2,10);assert.equal(getAbilityMastery(p,id).xp,0);
 for(let i=0;i<150;i++)rewardMobilityMastery(p,w,id,160,11+i);
 const xp=getAbilityMastery(p,id).xp;assert.equal(xp,0);rewardMobilityMastery(p,w,id,160,300);assert.equal(getAbilityMastery(p,id).xp,xp);
 w.enemies[0].hp=0;w.enemies.push(foe(p));rewardMobilityMastery(p,w,id,160,301);assert.equal(getAbilityMastery(p,id).xp,0);
 unlockActiveAbility(p,id);p.loadout.abilitySlots[3]=id;grantSharedCombatKillXp(p,w.enemies[1],20);assert.equal(getAbilityMastery(p,id).xp,20);
});
test('primary weapon melee and projectile hits restore spirit once per hit, including heavy attacks',()=>{
 const weapons=new Map();for(const [id,item] of Object.entries(ITEMS))if(item.slot==='weapon'&&item.weaponType&&!weapons.has(item.weaponType))weapons.set(item.weaponType,id);
 assert.ok(weapons.size>=6);
 for(const [type,id] of weapons)for(const heavy of [false,true]){
  const p=actor('gravecaller'),w=world(),t=now();p.equipment.weapon=id;p.spirit=0;
  const e=foe(p,284,320,{hp:100000,maxHp:100000});w.enemies=[e];
  assert.ok((heavy?requestHeavyAttack:requestBasicAttack)(p,w,aim,()=>{},t),type);
  for(let i=1;i<=120;i++)updateWeaponCombat(p,w,aim,1/60,t+i/60,()=>{});
  assert.ok(e.hp<e.maxHp,type+' '+heavy+' missed');assert.equal(p.spirit,PRIMARY_WEAPON_SPIRIT_ON_HIT,type+' '+heavy+' reward');
 }
 const weapon=weapons.get('sword')||weapons.values().next().value;
 for(const scenario of ['miss','cap','dormant','kill']){
  const p=actor('gravecaller'),w=world(),t=now();p.equipment.weapon=weapon;p.spirit=scenario==='cap'?p.maxSpirit-2:0;
  p.classId='classless'; // Isolate the hit reward from Gravecaller's kill reward.
  if(scenario==='dormant')p.spiritAwakened=false;
  if(scenario!=='miss')w.enemies=[foe(p,284,320,{hp:scenario==='kill'?1:100000,maxHp:100000})];
  assert.ok(requestBasicAttack(p,w,aim,()=>{},t));for(let i=1;i<=90;i++)updateWeaponCombat(p,w,aim,1/60,t+i/60,()=>{});
  assert.equal(p.spirit,scenario==='cap'?p.maxSpirit:scenario==='kill'||scenario==='dormant'?PRIMARY_WEAPON_SPIRIT_ON_HIT:0,scenario);
 }
 const p=actor('gravecaller'),w=world(),t=now();p.equipment.weapon=weapon;p.spirit=0;
 w.enemies=[foe(p,284,320),foe(p,288,322)];
 assert.ok(requestBasicAttack(p,w,aim,()=>{},t));for(let i=1;i<=60;i++)updateWeaponCombat(p,w,aim,1/60,t+i/60,()=>{});
 assert.equal(p.spirit,PRIMARY_WEAPON_SPIRIT_ON_HIT*2,'each target should reward one hit');
 const caster=actor('gravecaller'),spellWorld=world();caster.spirit=50;spellWorld.enemies=[foe(caster,300,320)];
 assert.ok(useAbility(0,caster,spellWorld,()=>{},t,aim));const paid=caster.spirit;
 for(let i=1;i<=60;i++)updateCombat(caster,spellWorld,aim,1/60,t+i/60,()=>{});
 assert.ok(spellWorld.enemies[0].hp<250,'spell must actually hit');assert.equal(caster.spirit,paid,'ability damage must not restore spirit');
});

test('channel lifecycle: hold release, costs, death, stun, dash, duration, steering and movement',()=>{
 const p=actor('gravecaller'),a=getAbilityById('gravecallerMurmuringHost');let ticks=0;
 startAbilityChannel(p,a,3,1,{x:1,y:0});assert.equal(getPlayerMovementMultiplier(p),.18);
 updateAbilityChannel(p,{...aim,ability3Held:true},.3,1.3,{onTick:()=>ticks++});assert.ok(ticks>0);assert.ok(p.spirit<100);
 updateAbilityChannel(p,{ability3Released:true},.1,1.4);assert.equal(p.activeChannel,null);
 for(const input of [{dashPressed:true,ability3Held:true},{controlLocked:true,ability3Held:true}]){startAbilityChannel(p,a,3,2,{x:1,y:0});updateAbilityChannel(p,input,.1,2.1);assert.equal(p.activeChannel,null);}
 startAbilityChannel(p,a,3,3,{x:1,y:0});p.spirit=0;updateAbilityChannel(p,{ability3Held:true},.3,3.3);assert.equal(p.activeChannel,null);
 p.spirit=100;startAbilityChannel(p,a,3,4,{x:1,y:0});p.stunTimer=1;updateAbilityChannel(p,{ability3Held:true},.1,4.1);assert.equal(p.activeChannel,null);delete p.stunTimer;
 startAbilityChannel(p,a,3,5,{x:1,y:0});p.hp=0;updateAbilityChannel(p,{ability3Held:true},.1,5.1);assert.equal(p.activeChannel,null);
 p.hp=100;p.spirit=100;startAbilityChannel(p,{...a,channelProfile:{mode:'fixed',duration:1,movementMode:'free',turnRate:3}},3,6,{x:1,y:0});
 assert.equal(getPlayerMovementMultiplier(p),1);updateAbilityChannel(p,{rightStickActive:true,rightStickAimX:0,rightStickAimY:1},.1,6.1);assert.ok(p.activeChannel.dirY>0&&p.activeChannel.dirY<.31);
 updateAbilityChannel(p,{},.1,7.1);assert.equal(p.activeChannel,null);
});

test('every channel ignores legacy cooldowns, drains spirit, restarts immediately and becomes cheaper with mastery',()=>{
 const channels=ABILITIES.filter(a=>a.channelProfile);assert.equal(channels.length,6);
 for(const a of channels){
  const p=actor(a.classId),w=world(),t=now();unlockActiveAbility(p,a.id);p.loadout.abilitySlots[3]=a.id;
  p.cooldowns[a.id]=t+100;p.abilityUseCharges={[a.id]:{rechargeQueue:[t+100,t+200,t+300]}};
  assert.equal(a.cd,0,a.id);assert.equal(a.costType,'spirit',a.id);assert.ok(a.channelProfile.costPerSecond>=18,a.id);
  assert.equal(getAbilityUseChargeState(p,a,t).maxCharges,1,a.id);
  p.stamina=50;const novice=applyAbilityMastery(p,a),stamina=p.stamina;
  assert.ok(useAbility(3,p,w,()=>{},t,aim),a.id+' failed to start');
  assert.equal(p.cooldowns[a.id],undefined,a.id);assert.equal(p.activeChannel.costPerSecond,novice.channelProfile.costPerSecond,a.id);
  const spirit=p.spirit;updateAbilityChannel(p,{...aim,ability3Held:true},.5,t+.5);
  assert.ok(Math.abs(p.spirit-(spirit-novice.channelProfile.costPerSecond*.5))<1e-8,a.id);assert.ok(p.stamina>=stamina,a.id+' spent stamina');
  stopAbilityChannel(p);assert.ok(useAbility(3,p,w,()=>{},t+.51,aim),a.id+' could not restart');stopAbilityChannel(p);
  let last=novice.channelProfile.costPerSecond;
  for(const level of [2,10,30,50,100]){getAbilityMastery(p,a.id,true).level=level;const refined=applyAbilityMastery(p,a);assert.ok(refined.channelProfile.costPerSecond<last,a.id);assert.ok(refined.cost<=novice.cost,a.id);assert.ok(refined.channelProfile.costPerSecond>=a.channelProfile.costPerSecond*.6,a.id);last=refined.channelProfile.costPerSecond;}
  assert.ok(last<novice.channelProfile.costPerSecond*.7,a.id);
  p.spirit=0;assert.equal(useAbility(3,p,w,()=>{},t+.6,aim),false,a.id+' started empty');
  p.spirit=20;assert.ok(useAbility(3,p,w,()=>{},t+.7,aim),a.id);p.spirit=0;
  updateAbilityChannel(p,{...aim,ability3Held:true},.3,t+1);assert.equal(p.activeChannel,null,a.id+' did not stop on depletion');
 }
});

test('all active techniques have intentional motion profiles and held channels suppress new weapon attacks',()=>{
 for(const a of ABILITIES)assert.ok(getSignatureAbilityProfile(a.id),a.id);
 const p=actor('oathkeeper'),w=world(),t=now(),id='oathkeeperLitanyOfIron';unlockActiveAbility(p,id);p.loadout.abilitySlots[3]=id;
 assert.ok(useAbility(3,p,w,()=>{},t,aim));assert.equal(p.visualAction.startedAt,t);
 updateCombat(p,w,{...aim,ability3Held:true,attackPressed:true,attackHeld:true},.1,t+.1,()=>{});assert.equal(p.combatState.attacking,false);
});
test('hold charge and independently recovering use charges remain separate',()=>{
 const p=actor('waverider'),a=getAbilityById('waveriderPressureSpear');
 assert.ok(beginAbilityCharge(p,3,a,1));updateAbilityCharge(p,1.4);const c=releaseAbilityCharge(p);assert.equal(c.level,2);assert.ok(applyAbilityCharge(a,c).damageMultiplier>a.damageMultiplier);
 const charged={id:'fellhunterBombToss',cd:5,maxCharges:2,maxChargeCap:2};
 assert.equal(getAbilityUseChargeState(p,charged,20).charges,2);spendAbilityUseCharge(p,charged,20);assert.equal(getAbilityUseChargeState(p,charged,21).charges,1);assert.equal(getAbilityUseChargeState(p,charged,26).charges,2);assert.equal(p.activeChannel,undefined);
});
test('mastery save roundtrip, aliases, corrupted fields, bounded power and runtime stripping',()=>{
 const p=actor('gravecaller');grantAbilityMasteryXp(p,'graveSpark',10000,5);
 const w=world();w.enemies=[foe(p)];recordEnemyCombatContribution(w.enemies[0],p,'spirit',5,{sourceAbilityId:'graveSpark'});
 p.activeChannel={abilityId:'gravecallerMurmuringHost'};
 const saved=sanitizeForSave({player:p,enemies:w.enemies}),loaded=normalizeProfileSave(saved.player);assert.equal(loaded.activeChannel,undefined);
 assert.equal(loaded.abilityMastery.graveSpark.level,p.abilityMastery.graveSpark.level);assert.equal(saved.enemies[0].combatContributors,undefined);
 loaded.abilityMastery.graveSpark.level=2000;const b=getMasteryBonuses(loaded,'graveSpark');assert.ok(b.damage<=1.18&&b.range<=1.12&&b.efficiency>=.9);
});
test('every canonical live class has four new techniques, mobility and acquisition nodes',()=>{
 for(const c of Object.values(RUNALIS_CLASSES).filter(c=>!c.aliasFor&&c.id!=='classless')) {
   const additions=COMBAT_EXPANSION_ABILITIES.filter(a=>a.classId===c.id);assert.ok(additions.length>=4,c.id);
   assert.ok(ABILITIES.some(a=>a.classId===c.id&&(a.mobilityProfile||/DivineLeap|GrapplingHook|RiptideStep|voidstepBurst/.test(a.id))),c.id+' mobility');
   for(const a of additions)assert.ok(SKILL_TREE_NODES['technique_'+a.id]?.unlocksAbility===a.id);
 }
});

test('malformed mastery and alias collisions normalize without duplicated experience',()=>{
 const p=actor('oathkeeper');delete p.abilityMasteryVersion;
 p.abilityMastery={heavyCut:{level:5,xp:20},oathkeeperOathStrike:{level:4,xp:30},missing:{level:100},oathkeeperMandate:{level:-3,xp:NaN,lifetimeDamage:Infinity}};
 normalizeAbilityMastery(p);assert.equal(p.abilityMastery.oathkeeperOathStrike.level,5);assert.equal(p.abilityMastery.heavyCut,undefined);assert.equal(p.abilityMastery.missing,undefined);
 assert.equal(p.abilityMastery.oathkeeperMandate.level,1);assert.equal(p.abilityMastery.oathkeeperMandate.xp,0);assert.equal(p.abilityMastery.oathkeeperMandate.lifetimeDamage,0);
});

test('class changes preserve learned mastery and deactivate incompatible assignments',()=>{
 const p=actor('gravecaller');grantAbilityMasteryXp(p,'graveSpark',500,1);const mastery=JSON.stringify(p.abilityMastery);
 p.classId='fellhunter';p.className=RUNALIS_CLASSES.fellhunter.name;p.classSkill='archery';migratePlayer(p);assert.equal(JSON.stringify(p.abilityMastery),mastery);
 assert.equal(getAbilityAvailability(p,getAbilityById('graveSpark')).usable,false);
});

test('tree purchase respects prerequisites and unlocks a technique without replacing slots',()=>{
 const p=actor('gravecaller');p.skillTree.bloodlineBonusPoints=100;
 assert.equal(spendSkillTreeNode(p,'technique_gravecallerGhostwalk').ok,false);
 assert.ok(spendSkillTreeNode(p,'spirit_root').ok);
 const slots=[...p.loadout.abilitySlots];assert.ok(spendSkillTreeNode(p,'technique_gravecallerMurmuringHost').ok);
 assert.ok(p.knownAbilities.includes('gravecallerMurmuringHost'));
 for(let i=0;i<HOTBAR_SLOT_COUNT;i++)if(slots[i])assert.equal(p.loadout.abilitySlots[i],slots[i]);
 assert.ok(spendSkillTreeNode(p,'technique_gravecallerGhostwalk').ok);
});

test('effective shielding qualifies its caster for shared XP without awarding direct mastery',()=>{
 const p=actor('lightbringer'),w=world(),buff={};registerAbilitySupport(buff,p,'lightbringerHaloAegis');
 rewardAbilitySupport(buff,w,30,1);assert.equal(getAbilityMastery(p,'lightbringerHaloAegis').xp,0);
 w.enemies=[foe(p)];rewardAbilitySupport(buff,w,0,2);assert.equal(getAbilityMastery(p,'lightbringerHaloAegis').xp,0);
 rewardAbilitySupport(buff,w,30,3);assert.equal(getAbilityMastery(p,'lightbringerHaloAegis').xp,0);
 unlockActiveAbility(p,'lightbringerHaloAegis');p.loadout.abilitySlots[3]='lightbringerHaloAegis';grantSharedCombatKillXp(p,w.enemies[0],20);assert.equal(getAbilityMastery(p,'lightbringerHaloAegis').xp,20);
});

test('Mandate triggers once after three attributed blade hits without recursive procs',()=>{
 const p=actor('oathkeeper'),w=world(),t=now(),id='oathkeeperMandate';w.enemies=[foe(p,360)];unlockActiveAbility(p,id);p.loadout.abilitySlots[3]=id;
 assert.ok(useAbility(3,p,w,()=>{},t,aim));const e=w.enemies[0];
 for(let i=0;i<3;i++)recordEnemyCombatContribution(e,p,'blade',5,{source:'weapon',weaponType:'sword'});
 assert.equal(getCombatTechniqueState(p).events.length,1);
 updateCombat(p,w,aim,.01,t+.01,()=>{});assert.ok(Object.values(e.combatContributors).find(c=>c.actor===p).abilities[id]>0);
 for(let i=0;i<3;i++)recordEnemyCombatContribution(e,p,'blade',5,{source:'weapon',weaponType:'sword'});
 assert.equal(getCombatTechniqueState(p).events.length,0);
});

test('Death Echo and Corpsebloom trigger on a teammates kill and preserve mark ownership',()=>{
 for(const [classId,id,kind] of [['gravecaller','gravecallerDeathEcho','echo'],['thornbinder','thornbinderCorpsebloom','bloom']]) {
  const p=actor(classId),ally=actor('oathkeeper'),w=world(),t=now();ally.id='ally';w.enemies=[foe(p,360)];unlockActiveAbility(p,id);p.loadout.abilitySlots[3]=id;
  assert.ok(useAbility(3,p,w,()=>{},t,aim));const e=w.enemies[0];recordEnemyCombatContribution(e,ally,'blade',e.hp,{source:'weapon',weaponType:'sword'});e.hp=0;
  grantSharedCombatKillXp(ally,e,80,()=>{});assert.ok(getAbilityMastery(p,id).xp>0);assert.ok(getCombatTechniqueState(p).events.some(event=>event.kind===kind));
  updateCombat(p,w,aim,.01,t+.01,()=>{});
  if(kind==='echo'){assert.ok(p.summons.some(s=>s.sourceAbilityId===id));assert.equal(sanitizeForSave(p).summons.filter(s=>s.techniqueTemporary).length,0);}
  else assert.ok(getCombatTechniqueState(p).effects.some(f=>f.abilityId===id));
 }
});

test('Litany retaliates only under frontal pressure and Debt releases stored damage',()=>{
 const p=actor('oathkeeper'),w=world(),t=now();w.enemies=[foe(p,340)];const e=w.enemies[0];
 unlockActiveAbility(p,'oathkeeperLitanyOfIron');p.loadout.abilitySlots[3]='oathkeeperLitanyOfIron';assert.ok(useAbility(3,p,w,()=>{},t,aim));
 updateCombat(p,w,{...aim,ability3Held:true},.1,t+.1,()=>{});assert.equal(e.hp,e.maxHp);
 assert.ok(mitigateTechniqueDamage(p,e,20,t+.11,w)<20);updateCombat(p,w,{...aim,ability3Held:true},.3,t+.4,()=>{});assert.ok(e.hp<e.maxHp);
 stopAbilityChannel(p);unlockActiveAbility(p,'oathkeeperDebtOfBlood');p.loadout.abilitySlots[3]='oathkeeperDebtOfBlood';assert.ok(useAbility(3,p,w,()=>{},t+.5,aim));
 mitigateTechniqueDamage(p,e,20,t+.6,w);assert.equal(getCombatTechniqueState(p).statuses.debt.stored,9);
 const hp=e.hp;updateCombat(p,w,aim,.1,t+5.6,()=>{});assert.ok(e.hp<hp);assert.equal(getCombatTechniqueState(p).statuses.debt,undefined);
});

test('world transitions clear channel and bounded encounter fields',()=>{
 const p=actor('gravecaller'),w=world(),t=now(),id='gravecallerMurmuringHost';w.enemies=[foe(p)];unlockActiveAbility(p,id);p.loadout.abilitySlots[3]=id;assert.ok(useAbility(3,p,w,()=>{},t,aim));
 updateCombat(p,world(),{...aim,ability3Held:true},.1,t+.1,()=>{});assert.equal(p.activeChannel,null);assert.equal(getCombatTechniqueState(p).projectiles.length,0);
});

test('persistent Lich attacks and kills retain summoning ability combat statistics',()=>{
 const p=actor('gravecaller'),w=world(),t=now();p.skillState.skills.spirit.level=100;p.spirit=1000;p.maxSpirit=1000;
 unlockActiveAbility(p,'summonLich');p.loadout.abilitySlots[3]='summonLich';w.enemies=[foe(p,300,320,{hp:12,maxHp:12})];
 assert.ok(useAbility(3,p,w,()=>{},t,aim));
 for(let i=1;i<=240;i++){updateSummons(1/60,p,w,()=>{},t+i/60);updateCombat(p,w,aim,1/60,t+i/60,()=>{});updateEnemies(1/60,p,w,()=>{},t+i/60);}
 assert.ok(getAbilityMastery(p,'summonLich').lifetimeDamage>0);assert.equal(getAbilityMastery(p,'summonLich').lifetimeContributingKills,1);
});

test('Bramble Patch and its delayed wounds retain the originating technique',()=>{
 const p=actor('thornbinder'),w=world(),t=now(),id='thornbinderBramblePatch';p.skillState.skills.warding.level=100;p.spirit=1000;p.maxSpirit=1000;
 unlockActiveAbility(p,id);p.loadout.abilitySlots[3]=id;w.enemies=[foe(p,385)];assert.ok(useAbility(3,p,w,()=>{},t,aim));
 for(let i=1;i<=180;i++)updateCombat(p,w,aim,1/60,t+i/60,()=>{});
 assert.ok(getAbilityMastery(p,id).lifetimeDamage>0);assert.equal(w.enemies[0].verdantWound?.sourceAbilityId,id);
});

test('co-op wound ticks share source damage without doubling damage or stealing ownership',()=>{
 const p=actor('thornbinder'),ally=actor('thornbinder'),w=world(),t=now(),id='thornbinderThornLash';ally.id='thorn-ally';w.enemies=[foe(p,350,320,{hp:2000,maxHp:2000})];
 for(const caster of [p,ally]){unlockActiveAbility(caster,id);caster.loadout.abilitySlots[3]=id;assert.ok(useAbility(3,caster,w,()=>{},t,aim));}
 const e=w.enemies[0],before=p.abilityMastery[id].lifetimeDamage,allyBefore=ally.abilityMastery[id].lifetimeDamage;
 updateCombat(p,w,aim,.1,t+1,()=>{});const hp=e.hp;updateCombat(ally,w,aim,.1,t+1,()=>{});assert.equal(e.hp,hp);
 assert.ok(p.abilityMastery[id].lifetimeDamage>before);assert.ok(ally.abilityMastery[id].lifetimeDamage>allyBefore);assert.equal(e.verdantWound.sources.length,2);
});

test('raw right-stick aim initializes channels toward the stick before steering',()=>{
 const p=actor('eldritch'),w=world(),t=now(),id='eldritchCrimsonConduit';unlockActiveAbility(p,id);p.loadout.abilitySlots[3]=id;
 assert.ok(useAbility(3,p,w,()=>{},t,{rightStickActive:true,rightStickAimX:1,rightStickAimY:0}));
 assert.ok(Math.abs(p.activeChannel.dirX-1)<.001);assert.ok(Math.abs(p.activeChannel.dirY)<.001);
});

test('actual healing restores health and qualifies for victory XP without direct mastery',()=>{
 const p=actor('waverider'),w=world(),t=now(),id='hydromancerMendingCurrent';p.skillState.skills.warding.level=100;p.spirit=1000;p.maxSpirit=1000;
 unlockActiveAbility(p,id);p.loadout.abilitySlots[3]=id;w.enemies=[foe(p)];assert.ok(useAbility(3,p,w,()=>{},t,aim));assert.equal(getAbilityMastery(p,id).xp,0);
 p.hp-=25;p.spirit=1000;p.cooldowns={};assert.ok(useAbility(3,p,w,()=>{},t+1,aim));assert.equal(getAbilityMastery(p,id).xp,0);assert.equal(p.hp,p.maxHp);
 grantSharedCombatKillXp(p,w.enemies[0],20);assert.equal(getAbilityMastery(p,id).xp,20);
});

test('repeated vessel casts keep effects, projectiles and swarms within hard limits',()=>{
 const p=actor('gravecaller'),w=world(),t=now(),id='gravecallerFuneralUrn';unlockActiveAbility(p,id);p.loadout.abilitySlots[3]=id;
 for(let i=0;i<150;i++){p.spirit=100;p.cooldowns={};assert.ok(useAbility(3,p,w,()=>{},t+i*.01,aim));}
 assert.ok(getCombatTechniqueState(p).effects.length<=2);assert.ok(w.effects.length<=180);
 for(let i=1;i<=90;i++)updateCombat(p,w,aim,1/60,t+1.5+i/60,()=>{});
 assert.ok(getCombatTechniqueState(p).swarm.length<=24);assert.ok(getCombatTechniqueState(p).projectiles.length<=48);
});

// Each technique executes via the production coordinator, not a mock handler.
for(const a of COMBAT_EXPANSION_ABILITIES) {
 test(`live execution + cleanup: ${a.name}`,()=>{
   const p=actor(a.classId),w=world(),t=now();unlockActiveAbility(p,a.id,{autoAssignEmpty:false});p.loadout.abilitySlots[3]=a.id;
   w.enemies=[foe(p,360),foe(p,400,340),foe(p,410,300)];
   assert.ok(useAbility(3,p,w,()=>{},t,aim),a.id);
   assert.equal(getAbilityMastery(p,a.id).lifetimeSuccessfulUses,1);
   for(let frame=1;frame<=180;frame++){
     updateCombat(p,w,{...aim,ability3Held:frame<80},1/60,t+frame/60,()=>{});
     updateSummons(1/60,p,w,()=>{},t+frame/60);
   }
   const contributions=w.enemies.reduce((n,e)=>n+Object.values(e.combatContributors||{}).reduce((sum,c)=>sum+(c.abilities?.[a.id]||0),0),0);
   if(['damage','channel','swarm','area'].includes(a.role)&&a.effectProfile!=='litany')assert.ok(contributions>0,a.id+' had no attributed damage');
   report.abilities.push({id:a.id,damage:contributions,mastery:getAbilityMastery(p,a.id).level});
   p.hp=0;updateCombat(p,w,aim,.1,t+4,()=>{});assert.ok(p.activeChannel==null);
   assert.equal(getCombatTechniqueState(p).effects.length,0);
 });
}
test('terrain collision prevents mobility and beam damage through walls',()=>{
 const p=actor('gravecaller'),w=world(),t=now(),a=getAbilityById('gravecallerGhostwalk');w.tiles.forEach(row=>row[10].passable=false);
 unlockActiveAbility(p,a.id,{autoAssignEmpty:false});p.loadout.abilitySlots[3]=a.id;assert.ok(useAbility(3,p,w,()=>{},t,aim));assert.ok(p.x<320-10);
 const l=actor('lightbringer');l.lightbringer.lumens=3;unlockActiveAbility(l,'lightbringerDawncarver',{autoAssignEmpty:false});l.loadout.abilitySlots[3]='lightbringerDawncarver';const e=foe(l,420);w.enemies=[e];
 assert.ok(useAbility(3,l,w,()=>{},t,aim));assert.equal(l.activeChannel,l.lightbringer.dawncarverChannel);
 updateCombat(l,w,aim,.2,t+.2,()=>{});assert.equal(e.hp,e.maxHp);assert.ok(l.activeChannel.visualRange<100);
});
fs.mkdirSync('docs/combat-overhaul',{recursive:true});fs.writeFileSync('docs/combat-overhaul/regression-results.json',JSON.stringify(report,null,2));
console.log(`Passed ${report.checks.length} combat overhaul regression checks.`);

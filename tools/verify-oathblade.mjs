import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ABILITIES,getAbilityById} from '../src/data.js';
import {createPlayer,chooseClass,migratePlayer} from '../src/player.js';
import {SKILL_TREE_NODES,spendSkillTreeNode,getSkillTreeLayout} from '../src/skillTreeSystem.js';
import {unlockActiveAbility} from '../src/abilityLoadoutSystem.js';
import {getAbilityMastery,applyAbilityMastery} from '../src/abilityMasterySystem.js';
import {selectAbilityMorph} from '../src/abilityMorphSystem.js';
import {resolveAbilityMorph} from '../src/subclassVariants.js';
import {getAbilityEffectiveness,expertiseNodeId} from '../src/skillExpertiseSystem.js';
import {useAbility,updateCombat,calculateAbilityDamage} from '../src/combat.js';
import {getCombatTechniqueState,clearCombatTechniqueState} from '../src/combatExpansion.js';
import {OATH_BLADE_ID as id,OATH_BLADE_PROFILES,getOathVisualFamily} from '../src/oathbladeProfiles.js';
import {OATH_BLADE_SHAPES} from '../src/oathbladeArt.js';
import {SUBCLASSES} from '../src/subclassData.js';
let now=100;Object.defineProperty(globalThis,'performance',{value:{now:()=>now*1000},configurable:true});
const aim={combatAimX:1,combatAimY:0,hasAim:true},report={checks:[],forms:[],scaling:[]};
const test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
function setup(family='base',level=33){
 now=100;const p=createPlayer('Oathblade review');chooseClass(p,'oathkeeper');p.equipment.weapon='oathkeepersMace';p.skillState.combat.level=level;for(const skill of Object.values(p.skillState.skills))skill.level=level;migratePlayer(p);
 Object.assign(p,{x:400,y:400,dirX:1,dirY:0});const w={mode:'dungeon',width:50,height:50,tiles:Array.from({length:50},()=>Array.from({length:50},()=>({passable:true,biome:'grass'}))),objects:[],enemies:[],effects:[],drops:[]};
 updateCombat(p,w,{},0,now,()=>{});p.maxSpirit=p.spirit=p.maxStamina=p.stamina=10000;p.hp=p.maxHp;
 unlockActiveAbility(p,id,{autoAssignEmpty:false});getAbilityMastery(p,id,true).level=20;p.loadout.abilitySlots=[id,null,null,null,'block'];assert(selectAbilityMorph(p,id,family,now).ok);
 const c={p,w,cast(){return useAbility(0,p,w,()=>{},now,aim);},tick(dt=.01){now+=dt;updateCombat(p,w,{},dt,now,()=>{});},run(duration){for(let i=0;i<Math.ceil(duration/.01);i++)this.tick();},formation(){return getCombatTechniqueState(p)?.statuses.oathBlades;},foe(x=560,y=400){const e={id:'e'+w.enemies.length,kind:'rat',x,y,radius:12,hp:100000,maxHp:100000,xp:10};w.enemies.push(e);return e;}};return c;
}
test('existing abilities and other class trees stay exact; Oathkeeper identity tree is covered by verify-oathkeeper-identity',()=>{
 const old=JSON.parse(fs.readFileSync('backups/oathkeeper-paladin-2026-10-13/protected.json','utf8'));
 for(const a of old.abilities)assert.deepEqual(JSON.parse(JSON.stringify(getAbilityById(a.id))),['bloodLance','summonLich'].includes(a.id)?{...a,desc:getAbilityById(a.id).desc}:a);
 const revisedHunterNodes=['archery_root','archery_mobility','archery_volley','archery_trick_arrows','archery_rapid_reload','archery_broadside','archery_contract_mark',
  // The Waverider identity pass opens both active routes and replaces the
  // redundant fourth dash charge with recharge. Its own snapshot protects
  // all other nodes and all original active definitions.
  'hydromancy_pressure_channel','hydromancy_mending_tide','hydromancy_riptide_duelist','hydromancy_wellspring_keeper'];
 for(const [key,node] of Object.entries(old.nodes)){if(node.tree==='blade'||revisedHunterNodes.includes(key)||node.expertise&&node.expertise.family!=='base'&&!SUBCLASSES[node.expertise.family])continue;assert.deepEqual(JSON.parse(JSON.stringify(SKILL_TREE_NODES[key])),['spirit_minions','spirit_lich_ascension','spirit_bone_coterie'].includes(key)?{...node,desc:SKILL_TREE_NODES[key].desc}:node);}
 assert.equal(ABILITIES.length,old.abilities.length+1);const node=SKILL_TREE_NODES['technique_'+id];assert.equal(node.cost,2);assert.equal(node.requirementMode,'any');
 for(const parent of node.requires){const c={p:createPlayer('Tree review')};chooseClass(c.p,'oathkeeper');c.p.skillTree.bloodlineBonusPoints=1000;const buy=key=>{if(c.p.skillTree.spent[key])return;const n=SKILL_TREE_NODES[key];for(const r of n.requirementMode==='any'?(n.requires||[]).slice(0,1):n.requires||[])buy(r);assert(spendSkillTreeNode(c.p,key).ok,key);};buy(parent);assert(spendSkillTreeNode(c.p,node.id).ok);}
 const layout=getSkillTreeLayout('blade');assert(layout.nodes.filter(n=>n.expertise).every(n=>n.position.row===layout.rowCount-1));
});
test('three distinct pixel silhouettes, three or four swords, finite paid casts, windup then flight and return',()=>{
 assert.equal(new Set(Object.values(OATH_BLADE_SHAPES).map(rows=>rows.join('\n').replace(/[234]/g,'1'))).size,3);
 for(const family of Object.keys(OATH_BLADE_PROFILES)){
  const c=setup(family),e=c.foe(),config=OATH_BLADE_PROFILES[family],before=c.p.spirit,hp=c.p.hp,mastery=JSON.stringify([c.p.abilityMastery[id].level,c.p.abilityMastery[id].xp]);assert(c.cast());assert.equal(before-c.p.spirit,config.cost);assert.equal(c.formation().blades.length,config.count);
  if(family==='sinner')assert.equal(c.p.hp,hp-Math.max(1,Math.floor(hp*config.healthCost)));else assert.equal(c.p.hp,hp);
  assert(!c.cast(),'Cooldown blocks stacking');c.run(.3);assert(c.formation().blades.some(b=>b.phase==='windup'));assert.equal(e.hp,e.maxHp);c.run(.18);assert(c.formation().blades.some(b=>b.phase==='flight'));assert.equal(e.hp,e.maxHp);
  c.run(.4);assert(e.hp<e.maxHp);assert(c.formation().blades.some(b=>b.phase==='return'||b.readyAt>now));assert.equal(JSON.stringify([c.p.abilityMastery[id].level,c.p.abilityMastery[id].xp]),mastery);report.forms.push({family,count:config.count,firstHit:e.maxHp-e.hp,cost:config.cost});
 }
});
test('committed swords can miss moving targets and never deal return damage',()=>{
 const c=setup(),e=c.foe();assert(c.cast());c.run(.48);e.y+=150;c.run(.3);assert.equal(e.hp,e.maxHp);e.hp=0;c.run(.5);assert(c.formation().blades.every(b=>b.phase==='orbit'||b.phase==='return'));
});
test('terrain and thin Waller barriers stop acquisition and shots already in flight',()=>{
 for(const late of [false,true]){const c=setup(),e=c.foe();if(!late)c.w.encounterBarriers=[{x:490,y:260,w:5,h:230}];assert(c.cast());if(late){c.run(.48);assert(c.formation().blades.some(b=>b.phase==='flight'));c.w.encounterBarriers=[{x:490,y:260,w:5,h:230}];}c.run(3);assert.equal(e.hp,e.maxHp);}
 const c=setup(),e=c.foe();c.w.tiles[12][15].passable=false;assert(c.cast());c.run(3);assert.equal(e.hp,e.maxHp);
});
test('Holyknight shockwave catches at most two extra foes',()=>{
 const c=setup('holyknight');c.foe();c.foe(570,420);c.foe(578,410);const fourth=c.foe(590,420),outside=c.foe(620,420);assert(c.cast());c.run(.8);assert(c.w.enemies.slice(0,3).every(e=>e.hp<e.maxHp));assert.equal(fourth.hp,fourth.maxHp);assert.equal(outside.hp,outside.maxHp);
});
test('Sinner self-cost cannot kill and wounds do not multiply focused sword damage',()=>{
 const c=setup('sinner');c.p.hp=1;assert(c.cast());assert.equal(c.p.hp,1);
 const hit=hp=>{const x=setup('sinner'),e=x.foe();x.p.hp=x.p.maxHp*hp;assert(x.cast());x.run(.8);return e.maxHp-e.hp;};assert.equal(hit(.2),hit(1));
});
test('Level, mastery and Expertise scale once; mace palette follows mixed loadout or final calling',()=>{
 for(const level of [1,15,33,60]){const c=setup('base',level),e=c.foe();assert(c.cast());c.run(.8);report.scaling.push({level,damage:e.maxHp-e.hp});}for(let i=1;i<report.scaling.length;i++)assert(report.scaling[i].damage>report.scaling[i-1].damage);
 const c=setup('holyknight'),a=resolveAbilityMorph(c.p,id,'holyknight'),neutral=calculateAbilityDamage(c.p,a);c.p.skillTree.spent[expertiseNodeId('oathkeeper','holyknight')]=1;assert.equal(getAbilityEffectiveness(c.p,a),1.15);assert(Math.abs(calculateAbilityDamage(c.p,a)-neutral*1.15)<=1);
 assert.equal(getOathVisualFamily(c.p),'holyknight');delete c.p.skillTree.spent[expertiseNodeId('oathkeeper','holyknight')];assert.equal(getOathVisualFamily(c.p),'holyknight');assert.equal(getOathVisualFamily({classId:'gravecaller'}),'base');
 c.p.abilityMorphs[id]='base';const mastered=calculateAbilityDamage(c.p,applyAbilityMastery(c.p,getAbilityById(id)));getAbilityMastery(c.p,id,true).level=1;assert(calculateAbilityDamage(c.p,applyAbilityMastery(c.p,getAbilityById(id)))<mastered);
});
test('expiry, morph swap, forgetting, inactivity, death, world changes and state clear remove formations',()=>{
 for(const reason of ['expire','morph','forget','inactive','death','world','clear']){const c=setup();assert(c.cast());if(reason==='expire')c.run(8.1);else{if(reason==='morph')c.p.abilityMorphs[id]='sinner';if(reason==='forget')c.p.knownAbilities=c.p.knownAbilities.filter(v=>v!==id);if(reason==='inactive')c.p.active=false;if(reason==='death')c.p.hp=0;if(reason==='world')updateCombat(c.p,{...c.w},aim,.01,now,()=>{});if(reason==='clear')clearCombatTechniqueState(c.p);if(!['world','clear'].includes(reason))c.tick();}assert(!c.formation(),reason);}
 const c=setup();assert(c.cast());const old=c.formation();c.p.cooldowns={};c.p.abilityChargeState={};now+=20;assert(c.cast());assert.notEqual(c.formation(),old);assert.equal(c.formation().blades.length,3);
});
test('actual sword hits receive Expertise once and dense encounters keep a bounded private formation',()=>{
 const hit=family=>{const c=setup('holyknight'),e=c.foe();if(family)c.p.skillTree.spent[expertiseNodeId('oathkeeper',family)]=1;assert(c.cast());c.run(.8);return e.maxHp-e.hp;};const neutral=hit(null);assert(Math.abs(hit('holyknight')-neutral*1.15)<=2);assert(Math.abs(hit('sinner')-neutral*.9)<=2);
 const c=setup();for(let i=0;i<120;i++)c.foe(520+(i%10)*12,340+Math.floor(i/10)*10);assert(c.cast());const before=process.hrtime.bigint();c.run(8.1);report.dense={enemies:120,frames:810,elapsedMs:Number(process.hrtime.bigint()-before)/1e6,scope:'Isolated combat update; not full-game performance'};assert(!c.formation());
 const a=setup(),b=setup('holyknight');assert(a.cast());assert(b.cast());assert.notEqual(a.formation(),b.formation());assert.equal(a.formation().blades.length,3);assert.equal(b.formation().blades.length,4);
});
fs.mkdirSync('docs/oathkeeper-paladin',{recursive:true});fs.writeFileSync('docs/oathkeeper-paladin/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));

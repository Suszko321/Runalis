import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {weaponSpiritRecoveryAmount} from '../src/weaponSpiritRecovery.js';
import {createPlayer,chooseClass,addItem,getWeaponSkill,migratePlayer} from '../src/player.js';
import {equipGearEntry} from '../src/equipmentProgressionSystem.js';
import {requestBasicAttack,requestHeavyAttack,updateWeaponCombat,calculateWeaponDamage} from '../src/combatMoves.js';
import {grantSharedCombatKillXp} from '../src/combatProgression.js';
import {SKILL_TREE_NODES,getAvailableWeaponSkillTrees,spendSkillTreeNode,canSpendSkillTreeNode,getSkillTreeBonuses} from '../src/skillTreeSystem.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {sanitizeForSave} from '../src/gameSave.js';
const books=Object.values(ITEMS).filter(i=>i.weaponType==='grimoire'),foci=Object.values(ITEMS).filter(i=>i.weaponType==='spiritFocus');assert.equal(books.length,9);assert.equal(foci.length,12);assert(books.every(i=>i.skill==='grimoire'&&i.spiritCost>0&&!i.staminaCost));
const now=performance.now()/1000+20,aim={combatAimX:1,combatAimY:0,hasAim:true};
function actor(id,slot=1){const p=createPlayer('Book P'+slot);chooseClass(p,'classless');p.skillState.combat.level=100;p.combatLevel=100;addItem(p,id);assert(equipGearEntry(p,p.inventory.findIndex(e=>e.id===id)));Object.assign(p,{slot,id:'book-'+slot,x:260,y:320,dirX:1,dirY:0,spirit:500,maxSpirit:1000,stamina:500,maxStamina:1000});return p;}
const world=()=>({mode:'dungeon',width:40,height:30,tiles:Array.from({length:30},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[]});
function fire(p,heavy=false,hit=true){const w=world(),e={id:'target',kind:'rat',hp:100000,maxHp:100000,x:300,y:311,r:14,radius:14,combatLevel:10,xp:50};if(hit)w.enemies.push(e);const s=p.stamina,m=p.spirit;assert((heavy?requestHeavyAttack:requestBasicAttack)(p,w,aim,()=>{},now));const move=p.combatState.attackMove,cost=move.spiritCost||move.staminaCost;for(let n=1;n<120;n++)updateWeaponCombat(p,w,aim,1/60,now+n/60);if(hit)assert(e.hp<100000);return {e,w,cost,s,m,move};}
for(let slot=1;slot<=4;slot++)for(const item of [...books,...foci])for(const heavy of [false,true]){
 const p=actor(item.id,slot),book=item.weaponType==='grimoire';p.stamina=book?0:500;p.spirit=book?500:0;const r=fire(p,heavy);
 assert.equal(p.stamina,book?0:r.s-r.cost);assert.equal(p.spirit,Math.min(p.maxSpirit,(book?r.m-r.cost:0)+weaponSpiritRecoveryAmount(p,item.weaponType)));assert.equal(getWeaponSkill(p),book?'grimoire':'spirit');if(book)assert.equal(r.move.staminaCost,0);
 const loaded=normalizeProfileSave(JSON.parse(JSON.stringify(sanitizeForSave(p))));assert.equal(loaded.equipment.weapon,item.id);assert.equal(getWeaponSkill(loaded),book?'grimoire':'spirit');assert.equal(loaded.equippedGear.weapon.instanceId,p.equippedGear.weapon.instanceId);
}
console.log('PASS 168 real light/heavy hits across nine Grimoires and twelve Foci × four owners: correct resource, percentage Spirit recovery, distinct proficiency and save identity');
for(const id of ['threadbarePrimer','smokeglassFocus'])for(const heavy of [false,true]){
 const p=actor(id),book=ITEMS[id].weaponType==='grimoire';const r=fire(p,heavy,false);assert.equal(p.spirit,book?r.m-r.cost:r.m);assert.equal(p.stamina,book?r.s:r.s-r.cost);
 const q=actor(id);q.spirit=0;q.stamina=0;const before=JSON.stringify(q);assert(!(heavy?requestHeavyAttack:requestBasicAttack)(q,world(),aim,()=>{},now));assert.equal(q.spirit,0);assert.equal(q.stamina,0);
 const capped=actor(id);capped.spirit=1000;fire(capped,heavy);assert(capped.spirit<=1000);
}
console.log('PASS misses do not refund either resource, unaffordable casts cannot borrow from the other bar, heavy costs apply and hit restoration respects the mana cap');
const p=actor('threadbarePrimer');assert(getAvailableWeaponSkillTrees(p).includes('grimoire'));assert(!getAvailableWeaponSkillTrees(p).includes('spiritFocus'));addItem(p,'smokeglassFocus');assert(getAvailableWeaponSkillTrees(p).includes('spiritFocus'));assert(spendSkillTreeNode(p,'grimoire_root').ok);assert(spendSkillTreeNode(p,'grimoire_branch_b').ok);
const baseline=actor('threadbarePrimer'),focused=actor('threadbarePrimer');addItem(focused,'smokeglassFocus');assert(spendSkillTreeNode(focused,'spiritFocus_root').ok);assert(spendSkillTreeNode(focused,'spiritFocus_branch_b').ok);
const a=fire(baseline,true,false),b=fire(p,true,false),c=fire(focused,true,false);assert(b.cost<a.cost);assert.equal(c.cost,a.cost);assert(b.move.damageMultiplier>a.move.damageMultiplier);assert.equal(c.move.damageMultiplier,a.move.damageMultiplier);
const f=actor('smokeglassFocus');addItem(f,'threadbarePrimer');assert(spendSkillTreeNode(f,'grimoire_root').ok);const normal=fire(actor('smokeglassFocus'),false,false),cross=fire(f,false,false);assert.equal(cross.move.damageMultiplier,normal.move.damageMultiplier);
const saved=normalizeProfileSave(sanitizeForSave(p));assert(saved.skillTree.spent.grimoire_root);assert(saved.skillTree.spent.grimoire_branch_b);assert(getSkillTreeBonuses(saved).grimoireBoltDamagePct>0);
const nodes=Object.values(SKILL_TREE_NODES).filter(n=>n.tree==='grimoire');assert.equal(nodes.length,12);const n=actor('threadbarePrimer');let progress=true;while(progress){progress=false;for(const node of nodes)if(!n.skillTree.spent[node.id]&&canSpendSkillTreeNode(n,node.id).ok){assert(spendSkillTreeNode(n,node.id).ok);progress=true;}}assert.equal(nodes.filter(node=>n.skillTree.spent[node.id]).length,10);
console.log('PASS independent twelve-node Grimoire tree, ownership discovery, real prerequisites/purchases, mana-cost/damage bonuses, no Focus-tree shot leakage and persistent purchases');
for(const id of ['threadbarePrimer','smokeglassFocus']){const p=actor(id),r=fire(p);r.e.hp=0;r.e.dead=true;grantSharedCombatKillXp(p,r.e,100,()=>{});const expected=ITEMS[id].weaponType==='grimoire'?'grimoire':'spirit';assert(p.lastCombatReward.awards.some(a=>a.skillId===expected&&a.amount>0));if(expected==='grimoire')assert(p.skillState.skills.grimoire.xp>0||p.skillState.skills.grimoire.level>1);}
console.log('PASS actual enemy weapon contribution/kill XP trains the correct line, with Grimoires scaling from their own proficiency');
for(const id of ['threadbarePrimer','smokeglassFocus']){
 const p=actor(id);delete p.skillState.grimoireProgressionVersion;p.skillState.skills.spirit={level:40,xp:123,used:true};p.skillState.skills.grimoire={level:1,xp:0,used:false};const spirit={...p.skillState.skills.spirit};migratePlayer(p);assert.deepEqual(p.skillState.skills.spirit,spirit);assert.equal(p.skillState.skills.grimoire.level,id==='threadbarePrimer'?40:1);p.skillState.skills.spirit.level=50;migratePlayer(p);assert.equal(p.skillState.skills.grimoire.level,id==='threadbarePrimer'?40:1);
}
console.log('PASS legacy book owners retain their old Spirit proficiency in the new line exactly once; Spirit and focus owners are preserved, with no repeat XP copying');

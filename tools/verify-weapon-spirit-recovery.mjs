import assert from 'node:assert/strict';
import {ITEMS} from '../src/data.js';
import {createPlayer,chooseClass,addItem} from '../src/player.js';
import {equipGearEntry} from '../src/equipmentProgressionSystem.js';
import {requestBasicAttack,requestHeavyAttack,updateWeaponCombat,getProjectiles} from '../src/combatMoves.js';
import {weaponSpiritRecoveryRate,weaponSpiritRecoveryAmount,weaponSpiritRecoveryLabel} from '../src/weaponSpiritRecovery.js';
import {equipmentPurpose} from '../src/uiInformation.js';
import {itemStatBlock} from '../src/panelInventory.js';
const aim={combatAimX:1,combatAimY:0,hasAim:true},now=performance.now()/1000+30;
const world=()=>({mode:'dungeon',width:40,height:30,tiles:Array.from({length:30},()=>Array.from({length:40},()=>({passable:true,biome:'grass'}))),enemies:[],objects:[],effects:[]});
function actor(id,maxSpirit,slot){const p=createPlayer('Recovery P'+slot);chooseClass(p,'classless');p.skillState.combat.level=100;p.combatLevel=100;if(id){addItem(p,id);assert(equipGearEntry(p,p.inventory.findLastIndex(e=>e.id===id)));}else {p.equipment.weapon=null;delete p.equippedGear.weapon;}Object.assign(p,{id:'recovery-'+slot,slot,x:260,y:320,dirX:1,dirY:0,maxSpirit,spirit:ITEMS[id]?.weaponType==='grimoire'?maxSpirit:0,maxStamina:1000,stamina:1000});return p;}
const target=(id='enemy',hp=100000)=>({id,kind:'rat',hp,maxHp:100000,x:300,y:311,r:14,radius:14,combatLevel:10,xp:1});
function attack(p,w,heavy){const before=p.spirit;assert((heavy?requestHeavyAttack:requestBasicAttack)(p,w,aim,()=>{},now));const paid=p.combatState.attackMove.spiritCost||0;return {before,paid};}
function tick(p,w,start=1,end=150){for(let i=start;i<=end;i++)updateWeaponCombat(p,w,aim,1/60,now+i/60,()=>{});}
const families=new Map();for(const item of Object.values(ITEMS))if(item.type==='weapon'&&item.weaponType&&!families.has(item.weaponType))families.set(item.weaponType,item.id);families.set('grimoire','threadbarePrimer');families.set('unarmed',null);
let cases=0;
for(let slot=1;slot<=4;slot++)for(const [type,id]of families)for(const maximum of [25,100,400])for(const heavy of [false,true]){
 const p=actor(id,maximum,slot),w=world(),e=target();w.enemies=[e];const {before,paid}=attack(p,w,heavy);tick(p,w);assert(e.hp<e.maxHp,type+' missed');const rate=type==='grimoire'?.4:type==='spiritFocus'?.3:.25;
 assert.equal(p.spirit,Math.min(maximum,before-paid+maximum*rate),type+' Spirit');assert(maximum*rate>6,'Every primary improves over6 at starting or larger pools');assert.equal(weaponSpiritRecoveryRate(type),rate);
 const once=p.spirit;tick(p,w,151,250);assert.equal(p.spirit,once,'Repeated updates must not award the same target twice');cases++;
 if(id){assert(equipmentPurpose(ITEMS[id]).includes(Math.round(rate*100)+'% of maximum Spirit'));assert(itemStatBlock(p,ITEMS[id],p.equippedGear.weapon).includes(Math.round(rate*100)+'% of maximum Spirit'));}
}
assert(weaponSpiritRecoveryRate('grimoire')>weaponSpiritRecoveryRate('spiritFocus'));assert(weaponSpiritRecoveryRate('spiritFocus')>weaponSpiritRecoveryRate('sword'));
console.log('PASS '+cases+' real light/heavy hits: every primary family and unarmed × four owners ×25/100/400 maximum Spirit;40%/30%/25%, real cap, no duplicate hits, matching inventory/help text');
for(const [type,id]of [['grimoire','threadbarePrimer'],['spiritFocus','smokeglassFocus'],['sword','blackIronSword']]){
 const p=actor(id,100,1),w=world(),{before,paid}=attack(p,w,false);tick(p,w);assert.equal(p.spirit,before-paid,'Miss refund');
 const q=actor(id,100,2);q.spirit=99;const qw=world();qw.enemies=[target()];attack(q,qw,false);tick(q,qw);assert.equal(q.spirit,100,'Near-full resource cap');
 const r=actor(id,100,3),rw=world();rw.enemies=[target('dead',0)];const charge=attack(r,rw,false);tick(r,rw);assert.equal(r.spirit,charge.before-charge.paid,'Dead target refund');
}
const p=actor('blackIronSword',100,1),w=world();w.enemies=[target('a'),target('b')];attack(p,w,false);tick(p,w);assert.equal(p.spirit,50,'Two targets restore two25% shares');
// An arrow remains an ordinary weapon hit after its owner equips a Grimoire.
const archer=actor('hunterBow',100,4),aw=world();const e=target();e.x=440;aw.enemies=[e];attack(archer,aw,false);let i=1;for(;i<50&&!getProjectiles(archer).length;i++)updateWeaponCombat(archer,aw,aim,1/60,now+i/60,()=>{});assert(getProjectiles(archer).length);addItem(archer,'threadbarePrimer');equipGearEntry(archer,archer.inventory.findIndex(e=>e.id==='threadbarePrimer'));archer.maxSpirit=100;archer.spirit=0;tick(archer,aw,i);assert(e.hp<e.maxHp);assert.equal(archer.spirit,25,'Equipping a book cannot turn an arrow into40% recovery');
assert.equal(weaponSpiritRecoveryAmount({maxSpirit:0},'grimoire'),0);assert.equal(weaponSpiritRecoveryAmount({maxSpirit:33.3},'grimoire'),33.3*.4);assert.equal(weaponSpiritRecoveryLabel('spiritFocus'),'30% of maximum Spirit');
console.log('PASS misses/dead targets restore nothing, near-full recovery caps, per-target cleaves, fractional pools and committed projectile-family recovery across equipment swaps');

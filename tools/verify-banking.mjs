import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {createGearEntry} from '../src/equipmentProgressionSystem.js';
import {planBankTransfer,bankDepositReason} from '../src/bankSystem.js';
import {decodeDeviceBank,decodeProfileCollection,encodeProfileCollection,DEVICE_BANK_KEY} from '../src/profileStorage.js';
import {readProfiles,writeProfiles,PROFILE_KEY,emergencySlimProfileCollection} from '../src/gameSave.js';
import {saveCouchCoopProfile} from '../src/couchCoop.js';
let checks=0;
const test=(name,run)=>{run();checks++;console.log('PASS '+name);};
function fixture(){const actor=createPlayer('Banker');chooseClass(actor,'oathkeeper');actor.gold=1000;actor.inventory=[];const entry=createGearEntry(actor,'oldKnife',{gearRarity:'rare',upgradeTier:5,itemLevel:12});entry.customBankMetadata={roll:33};entry.locked=true;actor.inventory.push(entry);return {actor,bank:{version:1,gold:0,items:[],revision:0},entry};}
test('gold projection conserves funds, is non-mutating and rejects invalid amounts/overflow',()=>{
 const {actor,bank}=fixture(),original=structuredClone(actor);
 const result=planBankTransfer(actor,bank,{type:'gold',amount:750});assert.equal(result.player.gold,250);assert.equal(result.bank.gold,750);assert.deepEqual(actor,original);assert.equal(bank.gold,0);
 const reverse=planBankTransfer({...actor,...result.player},result.bank,{type:'gold',withdraw:true,amount:300});assert.equal(reverse.player.gold,550);assert.equal(reverse.bank.gold,450);
 for(const amount of [0,-1,.5,NaN,Infinity,'1',1001])assert.throws(()=>planBankTransfer(actor,bank,{type:'gold',amount}));
 assert.throws(()=>planBankTransfer(actor,{...bank,gold:Number.MAX_SAFE_INTEGER},{type:'gold',amount:1}));
});
test('exact gear instance, arbitrary metadata and locks survive cross-character storage',()=>{
 const {actor,bank,entry}=fixture(),deposit=planBankTransfer(actor,bank,{type:'item',index:0,identity:JSON.stringify(entry)});
 assert.equal(deposit.player.inventory.length,0);assert.deepEqual(deposit.bank.items[0],entry);
 const other=createPlayer('Other');chooseClass(other,'oathkeeper');other.inventory=[];other.gold=0;
 const withdrawal=planBankTransfer(other,deposit.bank,{type:'item',index:0,identity:JSON.stringify(entry),withdraw:true});assert.deepEqual(withdrawal.player.inventory[0],entry);assert.equal(withdrawal.bank.items.length,0);
});
test('equipped/bound/non-gear entries and stale selections cannot be deposited',()=>{
 const {actor,bank,entry}=fixture();actor.equippedGear={weapon:entry};assert.match(bankDepositReason(actor,entry),/Unequip/);actor.equippedGear={};
 for(const change of [{bound:true},{soulbound:true},{qty:0}])assert(bankDepositReason(actor,{...entry,...change}));
 assert(bankDepositReason(actor,{id:'ironOre',qty:1}));assert(bankDepositReason(actor,{id:'__proto__',qty:1}));
 assert.throws(()=>planBankTransfer(actor,bank,{type:'item',index:0,identity:'stale'}));
});
test('withdrawals enforce capacity, rarity/level rules and duplicate identity',()=>{
 const {actor,bank,entry}=fixture();bank.items=[entry];actor.inventory=Array.from({length:20},(_,i)=>({...entry,instanceId:'bag-'+i}));
 assert.throws(()=>planBankTransfer(actor,bank,{type:'item',index:0,identity:JSON.stringify(entry),withdraw:true}),/full/);
 actor.inventory=[entry];assert.throws(()=>planBankTransfer(actor,bank,{type:'item',index:0,identity:JSON.stringify(entry),withdraw:true}),/identity/);
 actor.inventory=[];bank.items=[{...entry,gearRarity:'mythical'}];assert.throws(()=>planBankTransfer(actor,bank,{type:'item',index:0,identity:JSON.stringify(bank.items[0]),withdraw:true}),/50/);
});
test('shared metadata is hidden from profile lists and retained by host, co-op, slimming and deletion writes',()=>{
 const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};globalThis.window={localStorage};
 const {actor,bank,entry}=fixture();actor.profileId='one';actor.slot=1;bank.gold=450;bank.items=[entry];
 assert(writeProfiles({one:{id:'one',name:'One',state:{player:actor,worldMode:'capital'}}},bank));assert.deepEqual(Object.keys(readProfiles()),['one']);assert.deepEqual(decodeDeviceBank(data.get(PROFILE_KEY)),bank);
 assert(writeProfiles(emergencySlimProfileCollection(readProfiles())));assert.deepEqual(decodeDeviceBank(data.get(PROFILE_KEY)),bank);
 const ally=createPlayer('Two');chooseClass(ally,'oathkeeper');ally.slot=2;ally.profileId='two';
 assert(saveCouchCoopProfile({player:actor,world:{mode:'capital'}},ally));assert.deepEqual(Object.keys(readProfiles()).sort(),['one','two']);assert.deepEqual(decodeDeviceBank(data.get(PROFILE_KEY)),bank);
 assert(writeProfiles({}));assert.deepEqual(readProfiles(),{});assert.deepEqual(decodeDeviceBank(data.get(PROFILE_KEY)),bank);
 assert(Object.hasOwn(JSON.parse(data.get(PROFILE_KEY)),DEVICE_BANK_KEY));
});
test('quota/corruption failures preserve durable vault and character bytes',()=>{
 const {actor,bank}=fixture(),before=encodeProfileCollection({one:{id:'one',state:{player:actor}}},null,bank);let raw=before;
 globalThis.localStorage={getItem:()=>raw,setItem:()=>{throw Error('quota');},removeItem:()=>{}};globalThis.window={localStorage};
 const original=console.error;console.error=()=>{};try{assert.equal(writeProfiles({one:{}},{...bank,gold:50}),false);assert.equal(raw,before);raw='{bad';assert.equal(writeProfiles({one:{}}),false);assert.equal(raw,'{bad');}finally{console.error=original;}
 assert.throws(()=>decodeProfileCollection('{bad'));assert.throws(()=>decodeDeviceBank(JSON.stringify({[DEVICE_BANK_KEY]:{...bank,gold:-1}})));
});
console.log(`${checks}/${checks} banking contracts passed`);

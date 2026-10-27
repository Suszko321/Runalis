import assert from 'node:assert/strict';
import {wireClone,parseWire,passwordRoom,roomProof,checkRoomProof,sanitizeOnlineInput,mergeOnlineInput,clearOnlineEdges,rebaseCharacterClock,MAX_PACKET_BYTES} from '../src/onlineProtocol.js';
const checks=[];
const test=async(name,run)=>{await run();checks.push(name);console.log('PASS '+name);};
await test('matching passwords find the same room; different passwords cannot authenticate',async()=>{
 const a=await passwordRoom('Private Runalis world!'),b=await passwordRoom('Private Runalis world!'),wrong=await passwordRoom('Different Runalis world!');
 assert.equal(a.id,b.id);assert.notEqual(a.id,wrong.id);
 const proof=await roomProof(b.key,'fresh challenge');assert(await checkRoomProof(a.key,'fresh challenge',proof));assert(!await checkRoomProof(wrong.key,'fresh challenge',proof));assert(!await checkRoomProof(a.key,'another challenge',proof));assert(!await checkRoomProof(a.key,'fresh challenge','bad'));
});
await test('password policy rejects blank, short and oversized room passwords',async()=>{for(const p of ['short','        ','x'.repeat(129)])await assert.rejects(()=>passwordRoom(p));});
await test('wire snapshots handle Maps, Sets, cycles and function-backed runtime state',()=>{
 const p={name:'Guest',x:100,coop:{players:[]},afflictions:new Map([['enemy',{stacks:3}]]),hits:new Set(['enemy']),world:{tiles:[]},callback(){}};p.self=p;
 const value=parseWire(JSON.stringify(wireClone(p)));assert.equal(value.name,'Guest');assert.equal(value.afflictions.get('enemy').stacks,3);assert(value.hits.has('enemy'));assert(!value.world&&!value.coop&&!value.self&&!value.callback);
});
await test('incoming packets cannot add prototype properties or exceed bounds',()=>{
 const value=parseWire('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"x":1}');assert.equal(value.x,1);assert.equal({}.polluted,undefined);assert.throws(()=>parseWire('x'.repeat(MAX_PACKET_BYTES+1)));
});
await test('network controls reject position, damage and malformed movement; touch aim survives normalization',()=>{
 const input=sanitizeOnlineInput({moveX:1000,moveY:NaN,combatAimX:-1,combatAimY:0,x:99999,damage:Infinity,attackPressed:'yes',ability4Held:true});assert.equal(input.moveX,1);assert.equal(input.moveY,0);assert(!('x'in input));assert(!('damage'in input));assert(!input.attackPressed);assert(input.ability4Held);assert(input.rightStickActive);assert.equal(input.rightStickAimX,-1);
});
await test('short press/release edges survive transport batching and are consumed only once',()=>{
 const input=mergeOnlineInput(sanitizeOnlineInput({ability0Pressed:true,ability0Held:true}),sanitizeOnlineInput({ability0Released:true}));assert(input.ability0Pressed&&input.ability0Released&&!input.ability0Held);clearOnlineEdges(input);assert(!input.ability0Pressed&&!input.ability0Released);
});
await test('character cooldowns and recharge queues preserve remaining time across browser clock origins',()=>{
 const player={cooldownClockSeconds:100,cooldowns:{spell:98},summonCooldowns:{pet:99},abilityUseCharges:{dash:{rechargeQueue:[104,110]}},flags:{wardUntil:106,guardUntil:0},worldMemory:{elapsed:44}};
 rebaseCharacterClock(player,20);assert.equal(player.cooldowns.spell,18);assert.deepEqual(player.abilityUseCharges.dash.rechargeQueue,[24,30]);assert.equal(player.flags.wardUntil,26);assert.equal(player.flags.guardUntil,0);assert.equal(player.worldMemory.elapsed,44);
});
console.log(JSON.stringify({checks:checks.length}));

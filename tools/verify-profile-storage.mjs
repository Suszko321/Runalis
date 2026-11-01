// Exercises real storage boundaries with an isolated in-memory Storage object.
// Never accesses a browser profile or player storage.
import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {PROFILE_KEY, readProfiles, writeProfiles, emergencySlimProfileCollection} from '../src/gameSave.js';
import {saveCouchCoopProfile} from '../src/couchCoop.js';

const oldKey = 'runalis-profiles-v6';
const coopKey = 'runalis.couchCoop.player2Profiles.v1';
function storage(initial = {}, rejectWrites = () => false) {
  const data = new Map(Object.entries(initial)), events = [];
  let writes = 0;
  const mock = {
    getItem:key => data.get(key) ?? null,
    setItem(key, value) {
      events.push(['set', key]);
      if (rejectWrites(++writes, key, value)) throw new Error('Simulated storage quota failure');
      data.set(key, String(value));
    },
    removeItem(key) {events.push(['remove', key]); data.delete(key);}
  };
  globalThis.localStorage = mock;
  globalThis.window = {localStorage:mock};
  return {data, events};
}
function profile(id) {
  const player = createPlayer(id);
  player.profileId = id;
  player.gold = 37;
  player.skillState.skills.blade.xp = 123;
  player.inventory = [{id:'ironOre',qty:9}];
  player.story.flags.engineeringStorageFixture = true;
  return {id, name:id, updated:1, state:{player, worldMode:'capital', worldName:'Orrakai'}};
}
const checks = [];
function check(name, run) {
  const original = {error:console.error, warn:console.warn, info:console.info};
  // Expected storage failures are asserted below, rather than printed as errors.
  console.error = console.warn = console.info = () => {};
  try {run(); checks.push({name, pass:true});}
  catch (error) {checks.push({name, pass:false, error:error.message});}
  finally {Object.assign(console,original);}
}

check('failed writes retain existing current and legacy collections byte-for-byte', () => {
  const initial = {[PROFILE_KEY]:JSON.stringify({existing:profile('existing')}), [oldKey]:'legacy recovery copy'};
  const {data} = storage(initial, () => true);
  assert.equal(writeProfiles({new:profile('new')}), false);
  for (const [key,value] of Object.entries(initial)) assert.equal(data.get(key), value);
});
check('legacy host migration removes its source only after a successful write', () => {
  const raw = JSON.stringify({host:profile('host')});
  const {data,events} = storage({[oldKey]:raw});
  assert.equal(readProfiles().host.state.player.gold,37);
  assert(data.has(PROFILE_KEY)); assert(!data.has(oldKey));
  assert(events.findIndex(e=>e[0]==='set'&&e[1]===PROFILE_KEY) < events.findIndex(e=>e[0]==='remove'&&e[1]===oldKey));
});
check('failed host migration retains the legacy host save', () => {
  const raw = JSON.stringify({host:profile('host')});
  const {data} = storage({[oldKey]:raw}, () => true);
  assert.equal(readProfiles().host.state.player.gold,37);
  assert.equal(data.get(oldKey),raw); assert(!data.has(PROFILE_KEY));
});
for (const existing of [false,true]) check(`failed title-menu co-op migration retains source (existing collection: ${existing})`, () => {
  const ally = {...createPlayer('Legacy ally'), profileId:'legacy-ally', slot:2};
  const raw = JSON.stringify([ally]);
  const {data} = storage({[coopKey]:raw, ...(existing?{[PROFILE_KEY]:JSON.stringify({host:profile('host')})}:{})}, () => true);
  assert(readProfiles()['legacy-ally']);
  assert.equal(data.get(coopKey),raw);
});
check('failed migration while loading an old host collection retains both sources', () => {
  const raw = JSON.stringify([{...createPlayer('Legacy ally'),profileId:'legacy-ally'}]);
  const host = JSON.stringify({host:profile('host')});
  const {data} = storage({[oldKey]:host,[coopKey]:raw}, () => true);
  const loaded = readProfiles(); assert(loaded.host); assert(loaded['legacy-ally']);
  assert.equal(data.get(oldKey),host); assert.equal(data.get(coopKey),raw);
});
check('malformed legacy co-op JSON remains available for recovery', () => {
  const raw = '[broken player data';
  const {data} = storage({[coopKey]:raw});
  readProfiles(); assert.equal(data.get(coopKey),raw);
});
check('emergency slimming retains every profile and progression', () => {
  const profiles = Object.fromEntries(Array.from({length:8},(_,i)=>[`p${i}`,profile(`p${i}`)]));
  const result = emergencySlimProfileCollection(profiles);
  assert.deepEqual(Object.keys(result).sort(),Object.keys(profiles).sort());
  for (const item of Object.values(result)) assert.equal(item.state.player.gold,37);
  for (const item of Object.values(result)) {
    assert.equal(item.state.player.skillState.skills.blade.xp,123);
    assert.equal(item.state.player.inventory.find(item=>item.id==='ironOre').qty,9);
    assert.equal(item.state.player.story.flags.engineeringStorageFixture,true);
  }
});
check('quota fallback persists every profile through a real write/read round trip', () => {
  const profiles = Object.fromEntries(Array.from({length:8},(_,i)=>[`p${i}`,profile(`p${i}`)]));
  storage({}, attempt => attempt < 3);
  assert.equal(writeProfiles(profiles),true);
  const loaded = readProfiles();
  assert.deepEqual(Object.keys(loaded).sort(),Object.keys(profiles).sort());
  for (const item of Object.values(loaded)) assert.equal(item.state.player.gold,37);
});
check('local co-op migration retains legacy data when its write fails', () => {
  const raw = JSON.stringify([{...createPlayer('Legacy ally'),profileId:'legacy-ally'}]);
  const {data} = storage({[coopKey]:raw}, () => true);
  const ally = {...createPlayer('Active ally'),profileId:'active-ally',slot:2};
  assert.equal(saveCouchCoopProfile({log(){}},ally),false);
  assert.equal(data.get(coopKey),raw);
});
check('successful local co-op migration retains both character records', () => {
  const raw = JSON.stringify([{...createPlayer('Legacy ally'),profileId:'legacy-ally'}]);
  const {data} = storage({[coopKey]:raw});
  const ally = {...createPlayer('Active ally'),profileId:'active-ally',slot:2};
  assert.equal(saveCouchCoopProfile({log(){}},ally),true);
  const saved = JSON.parse(data.get(PROFILE_KEY));
  assert(saved['legacy-ally']); assert(saved['active-ally']); assert(!data.has(coopKey));
});
check('malformed co-op data also survives local co-op save attempts', () => {
  const raw = '[broken player data';
  const {data} = storage({[coopKey]:raw});
  const ally = {...createPlayer('Active ally'),profileId:'active-ally',slot:2};
  assert.equal(saveCouchCoopProfile({log(){}},ally),true);
  assert.equal(data.get(coopKey),raw);
});
for (const result of checks) console.log(`${result.pass?'PASS':'FAIL'} ${result.name}${result.error?': '+result.error.slice(0,240):''}`);
console.log(`${checks.filter(item=>item.pass).length}/${checks.length} profile storage checks passed`);
if (checks.some(item=>!item.pass)) process.exitCode=1;

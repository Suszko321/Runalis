import assert from 'node:assert/strict';
import {createPlayer} from '../src/player.js';
import {showPoiArrival,playPoiThresholdEffect} from '../src/poiPresentationSystem.js';
import {sanitizeForSave} from '../src/gameSave.js';
import {normalizeProfileSave,normalizeGameState} from '../src/saveProfiles.js';

let clock=120000;
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
for(let slot=1;slot<=4;slot++){
 const actor=createPlayer('Banner P'+slot);
 Object.assign(actor,{slot,playerNumber:slot});
 actor.discoveredLocations={brokenChapel:{name:'Broken Chapel',discovered:true}};
 actor.discoveredPois={...actor.discoveredLocations};
 showPoiArrival(actor,{id:'brokenChapel',name:'Broken Chapel'});
 playPoiThresholdEffect({player:actor,world:{effects:[]}},{name:'Chapel Depths',x:100,y:100});
 assert.equal(actor.poiArrival.shownAt,clock);
 assert.equal(actor.poiTransitionText.shownAt,clock);
 const before=JSON.stringify({arrival:actor.poiArrival,transition:actor.poiTransitionText});
 const saved=sanitizeForSave(actor);
 assert.equal(saved.poiArrival,undefined);
 assert.equal(saved.poiTransitionText,undefined);
 // Both host profile snapshots and the independent co-op writer normalize.
 for(const input of [actor,saved]){
  const loaded=normalizeProfileSave(input,{slot,playerNumber:slot});
  assert.equal(loaded.poiArrival,undefined);
  assert.equal(loaded.poiTransitionText,undefined);
  assert.deepEqual(loaded.discoveredLocations,actor.discoveredLocations);
  clock=0;
  const restored=normalizeGameState({player:input});
  assert.equal(restored.player.poiArrival,undefined);
  assert.equal(restored.player.poiTransitionText,undefined);
  clock=120500;
  assert.equal(loaded.poiArrival,undefined,'old card cannot replay when session clock catches up');
  showPoiArrival(loaded,{id:'gothicCastle',name:'Castle Veyreign'});
  assert.equal(loaded.poiArrival.name,'Castle Veyreign');
  assert.equal(loaded.poiArrival.shownAt,clock,'fresh arrivals use the current session clock');
 }
 assert.equal(JSON.stringify({arrival:actor.poiArrival,transition:actor.poiTransitionText}),before,'saving and loading preserve live banners');
 clock=120000;
}
console.log('PASS legacy banner removal, host and co-op save paths, session clock restart, discovery persistence and fresh arrivals.');

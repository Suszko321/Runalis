import assert from 'node:assert/strict';
import {createPlayer,chooseClass} from '../src/player.js';
import {normalizeProfileSave} from '../src/saveProfiles.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {createDialogueState} from '../src/dialogueSystem.js';
for(const slot of [1,2])for(const until of [1,36000])for(const morph of ['base','sunken']){
 const p=createPlayer('Saved Waverider');chooseClass(p,'waverider');p.slot=slot;
 p.buffs={bubbleWard:{until,flatAbsorb:20,duration:8},defense:{timer:2,reduction:.2}};
 p.visuals={bubbleWardUntil:until,bubbleWardFlatAbsorb:20,bubbleWardMorph:morph,otherVisual:true};
 const before=JSON.stringify(p),loaded=normalizeProfileSave(p);
 assert.equal(loaded.buffs.bubbleWard,undefined);assert.equal(loaded.visuals.bubbleWardUntil,undefined);assert.equal(loaded.visuals.bubbleWardFlatAbsorb,undefined);assert.equal(loaded.visuals.bubbleWardMorph,undefined);
 assert.equal(loaded.visuals.otherVisual,true);assert.equal(loaded.buffs.defense.timer,2);
 assert.equal(JSON.stringify(p),before,'Normalization must not strip the live ward while autosaving');
 console.log(`PASS P${slot} ${morph} old expiry ${until}: legacy ward cleared without mutating live actor`);
}
const p=createPlayer('Active Ward');chooseClass(p,'waverider');const until=performance.now()/1000+8;
 p.buffs={bubbleWard:{until,flatAbsorb:20,duration:8}};p.visuals={bubbleWardUntil:until,bubbleWardFlatAbsorb:20};
const g={player:p,world:createCapitalHubWorld(),dialogue:createDialogueState(),logLines:[],log(){},camera:{x:0,y:0},canvas:{width:960,height:600}};
const save=JSON.parse(JSON.stringify(createSaveState(g)));
assert(p.buffs.bubbleWard);assert.equal(p.visuals.bubbleWardUntil,until);
assert.equal(save.player.buffs.bubbleWard,undefined);assert.equal(save.player.visuals.bubbleWardUntil,undefined);
assert(applySaveToGame(g,save));assert.equal(g.player.buffs.bubbleWard,undefined);assert.equal(g.player.visuals.bubbleWardUntil,undefined);
console.log('PASS actual save/load round trip excludes protection and visual; autosave leaves live ward intact');

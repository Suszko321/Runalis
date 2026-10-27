import assert from 'node:assert/strict';
import {dialogueBodyText,createDialogueRuntimeState,beginDialogueRuntimeNode} from '../src/dialogueRuntime.js';
for(const [name,label] of [['Covenant Relief Scout','Relief Scout'],['Covenant Road Physician','Road Physician'],['Wounded Covenant Courier','Courier'],['Warden Mael','Mael'],['Covenant Teacher','Covenant Teacher']]){
 const text=`${label}: "The road is open."`;
 assert.equal(dialogueBodyText(text,name),'The road is open.');
 const state=createDialogueRuntimeState();beginDialogueRuntimeNode(state,{speakerName:name,text});
 assert.equal(state.speakerName,name);assert.equal(state.fullText,'The road is open.');
 assert.equal(state.tokens.map(t=>t.char||t.text||'').join('').includes(label),false);
}
assert.equal(dialogueBodyText('Warning: the road is closed.','Covenant Relief Scout'),'Warning: the road is closed.');
assert.equal(dialogueBodyText('Scout: “He said "wait".”','Covenant Relief Scout'),'He said "wait".');
assert.equal(dialogueBodyText('Mael is waiting.','Warden Mael'),'Mael is waiting.');
assert.equal(dialogueBodyText('Mara: Come inside.','Warden Mael'),'Mara: Come inside.');
console.log('PASS: full and shortened speaker labels removed before typing; banner name and ordinary colons/inner quotes preserved.');

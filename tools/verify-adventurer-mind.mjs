import assert from 'node:assert/strict';
import {rollAdventurerName,ensureAdventurerMind,prepareAdventurerExchange,commitAdventurerExchange,
  localAdventurerReply,rememberAdventurer,adventurerNerve,adventurerModelAvailable,modelAdventurerReply} from '../src/adventurerMind.js';

const used=[];
for(let i=0;i<64;i++)used.push({name:rollAdventurerName(used,()=>0)});
assert.equal(new Set(used.map(x=>x.name)).size,64);
const record={id:'guild-hire-1',name:used[0].name};
const mind=ensureAdventurerMind(record,()=>.45);
const personality=structuredClone(mind.personality);
assert.notDeepEqual(ensureAdventurerMind({id:'next'},()=>.45,[record]).personality,personality);
const context={name:record.name,place:'Orrakai',hp:100,maxHp:100};
const exchange=text=>{
  const prepared=prepareAdventurerExchange(mind,text);
  const reply=localAdventurerReply(mind,prepared,context);
  commitAdventurerExchange(mind,prepared,reply);
  return reply;
};
exchange('Remember that my favourite flower is the blue iris.');
assert.match(exchange('What is my favourite flower?'),/blue iris/i);
exchange('I prefer travelling at dawn.');
assert.match(exchange('When do I prefer travelling?'),/at dawn/i);
assert.match(exchange('Please fight more cautiously.'),/pull back sooner/);
assert.equal(adventurerNerve(mind),0);
assert.deepEqual(mind.personality,personality);
for(let i=0;i<30;i++)rememberAdventurer(mind,'event','Travelled to region '+i);
for(let i=0;i<20;i++)exchange('What do you think about the roads today? '+i);
assert.equal(mind.turns.length,6);
assert(mind.notes.length<=24);
assert.equal(mind.notes.filter(n=>n.kind==='event').length,9);
const saved=JSON.parse(JSON.stringify(record));
assert.equal(ensureAdventurerMind(saved,()=>.9),saved.mind);
assert.deepEqual(saved.mind.personality,personality);
assert.equal(adventurerNerve(saved.mind),0);
assert.match(localAdventurerReply(saved.mind,'Do you remember my favourite flower?',context),/blue iris/i);
assert.deepEqual(ensureAdventurerMind({...record,mind:null}),ensureAdventurerMind({...record,mind:null}));

let disposed=false;
const mock={availability:async()=>'available',create:async()=>({
  async prompt(value){assert.match(value,/blue iris/i);assert.match(value,/personality/);return 'I remember the iris.';},
  destroy(){disposed=true;}
})};
assert(await adventurerModelAvailable(mock));
assert(!await adventurerModelAvailable({availability:async()=>'downloadable'}));
assert.equal(await modelAdventurerReply(mind,'Remember my favourite flower?',context,new AbortController().signal,mock),'I remember the iris.');
assert(disposed);
assert.equal(await modelAdventurerReply(mind,'Hello',context,AbortSignal.abort(),mock),null);
console.log('PASS randomized unique names, persistent personality and memory, learned tactics, bounded history and on-device model adapter.');

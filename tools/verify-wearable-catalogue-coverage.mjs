// Portable registration contract: new wearable IDs cannot silently fall back to old fitting.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEMS} from '../src/data.js';
import {fittedWearable} from '../src/playerWearableArt.js';
const items=Object.values(ITEMS).filter(i=>['helm','chest','legs','trinket'].includes(i.slot));
for(const item of items){
 const fit=fittedWearable(item.id);assert(fit,'Author and register wearable art for '+item.id);
 assert.equal(fit.part,{helm:0,chest:1,legs:2,trinket:3}[item.slot],item.id+' wrong fitting part');
 const prefix='assets/art/sprites/'+fit.sheet;
 for(const suffix of ['.png','.json','-icons.png','-icons.json'])assert(fs.existsSync(prefix+suffix),item.id+' missing '+suffix);
 const meta=JSON.parse(fs.readFileSync(prefix+'.json')),icons=JSON.parse(fs.readFileSync(prefix+'-icons.json'));
 assert.equal(meta.frames,4);assert.equal(meta.states.length,(fit.rows||3)*(fit.bodies??(fit.part===3?1:2)));
 assert(fit.row>=0&&fit.row<(fit.rows||3));assert.equal(icons.frames,fit.iconColumns);assert.equal(icons.states.length,1);
 if(item.slot==='trinket')assert(['ring','charm','lantern','shield','cloak'].includes(fit.kind));
}
console.log(`PASS all ${items.length} non-weapon equipment IDs have authored directional art, native fitting and inventory icon contracts`);

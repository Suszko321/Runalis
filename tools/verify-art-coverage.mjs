import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ITEMS,ABILITIES} from '../src/data.js';
import {getGearVisualProfile} from '../src/gearVisualStyle.js';
import {equipmentIconMarkup,itemArtIconIndex,hudArtIcon} from '../src/artIcons.js';
import {weaponArtIndex} from '../src/equipmentArt.js';
import {armorMotionFamily} from '../src/armorMotionArt.js';
let weapons=0;
let animatedArmor=0;
for(const [id,item] of Object.entries(ITEMS)){
 const profile=getGearVisualProfile(id,item);
 if(item.type==='scroll'&&item.learnsAbility)assert(fs.existsSync(new URL(`../assets/combat-icons/${item.learnsAbility}.svg`,import.meta.url)),`Missing scroll icon file: ${id}`);
 else assert.ok(equipmentIconMarkup({...item,id},profile)||itemArtIconIndex(item,profile)!==null,`No generated icon: ${id}`);
 if(item.slot==='weapon'||item.type==='weapon'){weapons++;assert.notEqual(weaponArtIndex(id,profile),null,`No generated held art: ${id}`);}
 if(['chest','legs'].includes(item.slot)){
  const family=armorMotionFamily(profile,item.slot);
  const sheet=JSON.parse(fs.readFileSync(new URL(`../assets/art/sprites/armor-motion-${family}.json`,import.meta.url),'utf8'));
  assert.equal(sheet.rows,4,`Missing armor directions: ${id}`);
  assert.equal(sheet.columns,6,`Missing armor motion frames: ${id}`);
  assert.equal(sheet.cellWidth,64);assert.equal(sheet.cellHeight,64);
  animatedArmor++;
 }
}
for(const ability of ABILITIES)assert.notEqual(hudArtIcon(ability.id,'MISSING'),'MISSING',`No generated skill icon: ${ability.id}`);
const report={date:new Date().toISOString(),items:Object.keys(ITEMS).length,weapons,animatedArmor,skillIcons:ABILITIES.length,coverage:'all item icons, weapon art and skill icons have generated family artwork; all chest and leg items resolve to four-direction, six-frame armor sheets',limitation:'Shared family images; not a unique illustration for every item. Equipment fit and full progression remain visual QA tasks.'};
fs.writeFileSync(new URL('../docs/visual-production/item-coverage-checks.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);

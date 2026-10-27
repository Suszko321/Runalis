import fs from 'node:fs';
import { ABILITIES } from '../src/data.js';
import { getAbilityIconPath,getAbilityIconPalette } from '../src/combatTechniqueIcons.js';
import { SKILL_TREE_NODES } from '../src/skillTreeSystem.js';
import { getPassiveIconArt } from '../src/skillTreeIconArt.js';
fs.mkdirSync('assets/combat-icons',{recursive:true});
const svg=(path,[color,light,dark],detail='')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="metal" x2=".35" y2="1"><stop stop-color="${color}"/><stop offset=".45" stop-color="${dark}"/><stop offset="1" stop-color="#111a20"/></linearGradient></defs><rect x="1" y="1" width="46" height="46" rx="5" fill="url(#metal)" stroke="${color}"/><path d="M6 15L6 6L16 6M32 42L42 42L42 32" fill="none" stroke="${light}" stroke-opacity=".32"/><path d="${path}" fill="none" stroke="#11171c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${light}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>${detail}</svg>`;
const unique=new Set();
const classes=new Set(process.argv.slice(2).filter(a=>a.startsWith('--class=')).map(a=>a.slice(8)));
const trees=new Set(process.argv.slice(2).filter(a=>a.startsWith('--tree=')).map(a=>a.slice(7)));
const restricted=classes.size||trees.size;let active=0;
for(const a of ABILITIES) {
  const path=getAbilityIconPath(a);if(!path)throw new Error(`Missing icon: ${a.id}`);
  if(unique.has(path))throw new Error(`Duplicate silhouette: ${a.id}`);unique.add(path);
  if(restricted&&!classes.has(a.classId))continue;
  fs.writeFileSync(`assets/combat-icons/${a.id}.svg`,svg(path,getAbilityIconPalette(a)));
  active++;
}
fs.mkdirSync('assets/skill-tree-icons',{recursive:true});
let passives=0;
for(const node of Object.values(SKILL_TREE_NODES).filter(n=>!n.unlocksAbility)) {
  if(restricted&&!trees.has(node.tree))continue;
  const art=getPassiveIconArt(node);fs.writeFileSync(`assets/skill-tree-icons/${node.id}.svg`,svg(art.path,art.palette,art.detail));passives++;
}
console.log(`Built ${active} distinct active silhouettes and ${passives} individual passive/weapon-tree emblems.`);

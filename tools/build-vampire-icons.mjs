import fs from 'node:fs';
import {VAMPIRE_ICON_PATHS,VAMPIRE_NODES} from '../src/vampireData.js';
import {getPassiveIconArt} from '../src/skillTreeIconArt.js';
for(const [id,d]of Object.entries(VAMPIRE_ICON_PATHS))fs.writeFileSync('assets/combat-icons/'+id+'.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="1" y="1" width="46" height="46" fill="#32182c" stroke="#c74c6b"/><path d="${d}" fill="none" stroke="#f6c1c7" stroke-width="2.5" stroke-linejoin="round"/></svg>`);
for(const node of Object.values(VAMPIRE_NODES).filter(n=>!n.unlocksAbility)){
 const art=getPassiveIconArt(node);
 fs.writeFileSync('assets/skill-tree-icons/'+node.id+'.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect x="1" y="1" width="46" height="46" fill="${art.palette[2]}" stroke="${art.palette[0]}"/>${art.detail}</svg>`);
}

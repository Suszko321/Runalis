import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const atlases=fs.readdirSync(path.join(root,'assets/art/sprites')).filter(f=>f.endsWith('.png')&&!f.includes('-preview'));
const category=name=>/terrain|ground/.test(name)?'Terrain / ground effects':/architecture|landmarks|buildings/.test(name)?'Architecture / landmarks':/props|town-details|dungeon-interactables/.test(name)?'Environment / furniture / interaction':/effects|arcane/.test(name)?'VFX':/enemies|bosses|summons/.test(name)?'Creatures':/human|head|face|hair|creator|armor|accessories|weapons/.test(name)?'Characters / equipment':'UI';
const lines=['# Installed art inventory','','All installed sprite atlases in `assets/art/sprites`, excluding preview contact sheets. Original source images and packing metadata remain in place. No external asset pack was assumed to exist.','','| Atlas | Category |','| --- | --- |',...atlases.map(name=>`| ${name} | ${category(name)} |`)];
fs.mkdirSync(path.join(root,'docs/world-overhaul'),{recursive:true});fs.writeFileSync(path.join(root,'docs/world-overhaul/ASSET-INVENTORY.md'),lines.join('\n')+'\n');
console.log(`${atlases.length} installed atlases inventoried.`);

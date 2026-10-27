import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const baseline=process.argv.includes('--baseline'),root=path.resolve(baseline?'tmp/enemy-overhaul-baseline':'');
const load=name=>import(pathToFileURL(path.join(root,'src',name)).href);
const [{createWorld},{createRegionWorld,createTravelRouteWorld},{createDungeonWorld},{createTowerFloorWorld},{createProceduralSideZoneWorld},{createPlayer},legacy]=await Promise.all(['world.js','regionWorlds.js','dungeonSystem.js','towerSystem.js','sideZoneSystem.js','player.js','dungeon.js'].map(load));
const {getEnemyVisualProfile}=await import('../src/enemyVisualProfiles.js');
const {getEnemyCollectiblePool}=await import('../src/enemyEquipmentLoot.js');
let seed=1;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);Date.now=()=>1791374400000;
const records=[],worlds=[];const p=createPlayer('Roster audit');
function inspect(id,make){seed=13579;const w=make();worlds.push({id,name:w.name,enemies:w.enemies.length,theme:w.theme});for(const e of w.enemies){const profile=getEnemyVisualProfile(e);records.push({world:id,zone:w.name||w.regionId||id,id:e.id,name:e.name,kind:e.kind,bossType:e.bossType||null,isBoss:!!e.isBoss,majorPoiId:e.majorPoiId||null,threatProfile:e.dungeonThreatProfile||null,
  stats:Object.fromEntries(['x','y','r','radius','hp','maxHp','damage','dmg','xp','speed','aggroRange','attackRange','attackRate','combatLevel','resistances'].filter(k=>e[k]!==undefined).map(k=>[k,e[k]])),
  bodyModel:e.bodyModel||null,equipment:e.equipment||{},profile,
  collectible:baseline?[]:getEnemyCollectiblePool(e),status:profile.family==='unsupported'?'missing':'integrated'});}}
inspect('hearthmereFrontier',()=>createWorld({skipPublishedOverride:true}));
for(const region of ['aureateMarches','ascensionWastes'])inspect(region,()=>createRegionWorld(region,{skipPublishedOverride:true}));
for(const route of ['pilgrimRoad','severedCauseway'])inspect(route,()=>createTravelRouteWorld(route,{skipPublishedOverride:true}));
for(const theme of ['grave','mine','thorn','ruin','demon','holy','cosmic','castle','root']){
 const options={theme,dungeonId:theme==='castle'?'castleVeyr':'audit-'+theme,name:'Audit '+theme,seed:'enemy-art-'+theme,tier:3,depth:2};
 seed=13579;const first=createDungeonWorld(options);for(let floor=1;floor<=first.totalFloors;floor++)inspect('dungeon:'+theme+':'+floor,()=>createDungeonWorld({...options,floor}));
}
inspect('legacy:hollowRootCellar',()=>legacy.createDungeonWorld('hollowRootCellar'));
for(const region of ['hearthmereFrontier','aureateMarches','ascensionWastes'])for(let floor=1;floor<=30;floor++)inspect('tower:'+region+':'+floor,()=>createTowerFloorWorld(floor,p,region));
for(const type of ['hollowGrove','abandonedMine','ashenFarmstead','graveyardCellar','failedPurificationSite','confessionVault','choirReliquary','lightstormScar','namelessVault'])inspect('side:'+type,()=>createProceduralSideZoneWorld({type,seed:'audit-'+type}));
const filename=baseline?'roster-before.json':'roster-after.json';fs.writeFileSync('docs/enemy-visual-overhaul/'+filename,JSON.stringify({worlds,records},null,2));
console.log(JSON.stringify({file:filename,worlds:worlds.length,enemies:records.length,kinds:[...new Set(records.map(r=>r.kind))],identities:[...new Set(records.map(r=>r.name))].length,unsupported:records.filter(r=>r.status==='missing').map(r=>({world:r.world,name:r.name,kind:r.kind}))},null,2));

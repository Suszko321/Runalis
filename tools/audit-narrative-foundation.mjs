// Read-only game assessment. Writes review artifacts, never player profiles.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getAllQuests,NPCS,WORLD_POIS,FACTIONS} from '../src/worldContent.js';
import {ITEMS,TILE} from '../src/data.js';
import {createWorld} from '../src/world.js';
import {createCapitalHubWorld} from '../src/hubSystem.js';
import {createMaraHouseWorld,createCaravanOpeningWorld} from '../src/act1OpeningSystem.js';
import {installCampaignWorld} from '../src/act1CampaignRuntime.js';
import {updateOldWellQuest} from '../src/oldWellSystem.js';
import {createDungeonWorld} from '../src/dungeonSystem.js';
import {createProceduralSideZoneWorld} from '../src/sideZoneSystem.js';
import {createBlightedGrove} from '../src/blightedGrove.js';
import {createPlayer} from '../src/player.js';
import {updateEnemies} from '../src/combat.js';
import {CONTINENT_REGIONS,CONTINENT_ROADS} from '../src/continentDefinition.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const destination='docs/narrative-audit';
fs.mkdirSync(destination,{recursive:true});
const write=(name,value)=>fs.writeFileSync(`${destination}/${name}`,typeof value==='string'?value+'\n':JSON.stringify(value,null,2)+'\n');
const world=createWorld({skipPublishedOverride:true});
installCampaignWorld(world);
const reviewPlayer=createPlayer('Narrative inventory');
const wellStage=getAllQuests().find(q=>q.id==='mercy_in_orrakai').stages.find(s=>s.id==='investigateOldWell');
reviewPlayer.quests.active.mercy_in_orrakai={currentStageId:wellStage.id,objectives:wellStage.objectives.map(o=>({...o,current:0}))};
updateOldWellQuest({world,player:reviewPlayer});
const unique=list=>[...new Map(list.map(o=>[o.id,o])).values()];
const surface=unique([...world.continentRuntime.allObjects,...world.objects]);
const enemies=unique([...world.continentRuntime.allEnemies,...world.enemies]);
const spaces=[{label:'continent',world,objects:surface},
  ...[createCapitalHubWorld({skipPublishedOverride:true}),createMaraHouseWorld(),createCaravanOpeningWorld()]
    .map(w=>({label:w.mode,world:w,objects:w.objects||[]}))];
const grove=createBlightedGrove({seed:'narrative-audit'});
spaces.push({label:'sideZone:hollowGrove',world:grove,objects:grove.objects||[]});
const entrances=surface.filter(o=>o.kind==='dungeonEntrance');
// These are freshly generated review instances, including conditionally visible actors.
for(const entrance of entrances){
  if(entrances.find(o=>(o.dungeonId||o.poiId)===(entrance.dungeonId||entrance.poiId))!==entrance)continue;
  const id=entrance.dungeonId||entrance.poiId;
  const first=createDungeonWorld({...entrance,dungeonId:id,seed:'narrative-audit',floor:1});
  spaces.push({label:`dungeon:${id}:1`,world:first,objects:first.objects||[]});
  for(let floor=2;floor<=first.totalFloors;floor++){
    const w=createDungeonWorld({...entrance,dungeonId:id,seed:'narrative-audit',floor});
    spaces.push({label:`dungeon:${id}:${floor}`,world:w,objects:w.objects||[]});
  }
}
const shape=(o,space)=>({id:o.id,name:o.name,kind:o.kind,npcId:o.npcId,poiId:o.poiId,
  dungeonId:o.dungeonId,space,sourceRegionId:o.sourceRegionId,sourceEntityId:o.sourceEntityId,
  tile:[Number((o.x/TILE).toFixed(2)),Number((o.y/TILE).toFixed(2))],
  condition:o.poiStateCondition,interactable:o.interactable,disposition:o.disposition});
const physical=spaces.flatMap(s=>s.objects.map(o=>shape(o,s.label)));
const quests=getAllQuests();
const objectiveCounts={};
const references=[];
for(const q of quests){
  const checkNpc=id=>physical.some(o=>o.npcId===id||o.id===id||NPCS[id]?.objectId===o.id);
  if(q.giverNpcId&&!checkNpc(q.giverNpcId))references.push({quest:q.id,kind:'giver',id:q.giverNpcId});
  for(const stage of q.stages||[])for(const o of stage.objectives||[]){
    objectiveCounts[o.type]=(objectiveCounts[o.type]||0)+1;
    let found=true,id;
    if(o.npcId){id=o.npcId;found=checkNpc(id);}
    if(o.itemId){id=o.itemId;found=!!ITEMS[id];}
    if(o.poiId){id=o.poiId;found=physical.some(p=>p.poiId===id);}
    if(o.dungeonId||o.entranceId){id=o.dungeonId||o.entranceId;found=entrances.some(e=>(e.dungeonId||e.poiId||e.id)===id);}
    if(o.enemyId){id=o.enemyId;found=enemies.some(e=>e.id===id)||spaces.some(s=>s.world.enemies?.some(e=>e.id===id));}
    if(!found)references.push({quest:q.id,stage:stage.id,kind:o.type,id});
  }
}
const questInventory=quests.map(q=>({...q,giverOccurrences:physical.filter(o=>o.npcId===q.giverNpcId||o.id===q.giverNpcId||NPCS[q.giverNpcId]?.objectId===o.id)}));
const npcIds=[...new Set(physical.map(o=>o.npcId).filter(Boolean))].sort();
const counts={quests:quests.length,stages:quests.reduce((n,q)=>n+(q.stages?.length||0),0),
  objectives:Object.values(objectiveCounts).reduce((a,b)=>a+b,0),objectiveTypes:objectiveCounts,
  npcDefinitions:Object.keys(NPCS).length,physicalNpcIdentities:npcIds.length,
  poiDefinitions:Object.keys(WORLD_POIS).length,factions:Object.keys(FACTIONS).length,
  surfaceObjects:surface.length,surfaceEnemies:enemies.length,dungeonEntrances:entrances.length,
  distinctDungeons:new Set(entrances.map(o=>o.dungeonId||o.poiId)).size,
  navStones:surface.filter(o=>o.kind==='navStone').length,
  surfaceAuthoredLocations:world.authoredLocations?.length||0,
  constructedDungeonFloors:spaces.filter(s=>s.label.startsWith('dungeon:')).length,
  unmatchedReferences:references.length};
// Trace actual startup imports. This is a static dependency graph, not execution coverage.
const graph={};
function visit(relative){
  relative=relative.replaceAll('\\','/');if(graph[relative]||!fs.existsSync(relative))return;
  const source=fs.readFileSync(relative,'utf8');graph[relative]=[];
  const re=/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["'](\.[^"']+)["']/g;
  for(const match of source.matchAll(re)){
    const child=path.posix.normalize(path.posix.join(path.posix.dirname(relative),match[1]));
    graph[relative].push(child);visit(child);
  }
}
visit('src/main.js');
const graphStatus=Object.fromEntries(['src/questSystem.js','src/dialogueSystem.js','src/storyData.js','src/storyContentIndex.js','src/dungeonData.js','src/companionData.js','src/storyRuntime.js'].map(p=>[p,!!graph[p]]));
const probes=[];
for(const config of [
  {dungeonId:'shatteredChoir',theme:'holy',tier:4,depth:3,floor:999},
  {dungeonId:'ascensionSpire',theme:'cosmic',tier:8,depth:4,floor:999},
  {dungeonId:'narrativeAuditOptionalHoly',theme:'holy',tier:4,depth:3,floor:999},
  {type:'failedPurificationSite',regionId:'aureateMarches'}
]){
  const w=config.type?createProceduralSideZoneWorld({...config,seed:'narrative-audit'}):createDungeonWorld({...config,seed:'narrative-audit'});
  const boss=w.enemies.find(e=>e.isBoss&&!e.miniBoss);
  if(!boss){probes.push({config,observation:'No non-miniboss on this floor'});continue;}
  const p=createPlayer('Controlled boss death');boss.hp=0;
  const game={player:p,world:w,log(){},shake(){},camera:{x:0,y:0},canvas:{width:1280,height:800}};
  updateEnemies(0,p,w,game.log,1,game);
  probes.push({config,floor:w.floor,totalFloors:w.totalFloors,boss:{id:boss.id,bossId:boss.bossId,bossType:boss.bossType,isDungeonMainBoss:boss.isDungeonMainBoss},
    storyFlags:p.story.flags,completedQuests:Object.keys(p.quests.completed||{}),
    completedDungeons:Object.keys(p.completedDungeons||{}),worldCleared:!!w.dungeonState?.cleared,deathHandled:!!boss.deathHandled});
}
const walk=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(`${directory}/${e.name}`):[`${directory}/${e.name}`]);
const documents=walk('docs').filter(p=>p.endsWith('.md')).map(p=>{
  const content=fs.readFileSync(p,'utf8');return {path:p,title:content.match(/^#\s+(.+)$/m)?.[1]||p,
    narrativeRelated:/story|lore|quest|narrative|world|orrakai|echoryn|malakar|chapel|orchard|grove|veyreign|root-retort|campaign|dungeon|party-entry|coop|multiplayer|boss-return|south-gate/.test(p),
    headings:content.split(/\r?\n/).filter(l=>/^#{1,3}\s/.test(l))};
});
write('inventory.json',{scope:'Fresh source worlds, published editor overrides disabled; runtime campaign and Old Well layers installed; conditional actors listed without claiming eligibility or reachability.',counts,quests:questInventory,
  factions:FACTIONS,regions:CONTINENT_REGIONS,roads:CONTINENT_ROADS,
  npcs:npcIds.map(id=>({id,definition:NPCS[id]||null,occurrences:physical.filter(o=>o.npcId===id)})),
  pois:WORLD_POIS,entrances:entrances.map(o=>shape(o,'continent')),
  authoredLocations:world.authoredLocations,
  serviceEntrances:physical.filter(o=>/Entrance$|Gate$/.test(o.kind||'')),
  referenceReview:references,importGraphStatus:graphStatus,sequenceBreakProbes:probes});
write('documents.json',documents);
const cell=v=>String(v??'—').replaceAll('|','\\|').replaceAll('\n',' ');
const table=(heads,rows)=>['| '+heads.join(' | ')+' |','| '+heads.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.map(cell).join(' | ')+' |')].join('\n');
write('INVENTORY.md',`# Current narrative and world inventory\n\nGenerated by \`node tools/audit-narrative-foundation.mjs\`. Fresh construction, not a completion certificate. Coordinates are authoring tiles (32 pixels); x east, y south. Conditional actors are included even when hidden. Full stages, rewards, occurrences and conditions are in [inventory.json](inventory.json).\n\n${table(['Measure','Count'],Object.entries(counts).filter(([,v])=>typeof v==='number'))}\n\n## All quests and chains\n\n${table(['Stable ID','Title','Type','Giver','Stages','Objectives'],quests.map(q=>[q.id,q.title,q.type,q.giverNpcId,q.stages?.length,(q.stages||[]).reduce((n,s)=>n+(s.objectives?.length||0),0)]))}\n\nStage order inside each quest is sequential. Relationships between quests require runtime/flag review; registry membership does not establish an unlock.\n\n## Physical NPC occurrences\n\n${table(['Identity','Name','Space','Tile','Condition'],physical.filter(o=>o.npcId).map(o=>[o.npcId,o.name,o.space,o.tile.join(', '),JSON.stringify(o.condition)||'—']))}\n\n## Dungeon entrances\n\n${table(['Object ID','Dungeon identity','Name','Tile'],entrances.map(o=>[o.id,o.dungeonId||o.poiId,o.name,[o.x/TILE,o.y/TILE].join(', ')]))}\n\n## Authored surface locations\n\n${table(['ID','Name','Tile'],(world.authoredLocations||[]).map(o=>[o.id,o.name,[o.x/TILE,o.y/TILE].join(', ')]))}\n\n## References needing review\n\n${references.length?table(['Quest','Stage','Kind','Unmatched ID'],references.map(r=>[r.quest,r.stage,r.kind,r.id])):'All checked giver/NPC/POI/dungeon/item-definition/named-enemy references resolve in the constructed spaces.'}\n\nResolution here does not establish valid spawn conditions, acquisition, directions, reachable approaches, rewards, save/load or multiplayer correctness. Generic enemy-kind and story-flag producers require separate runtime tests.\n\n## Startup import status\n\n${table(['Module','Reachable from main.js'],Object.entries(graphStatus))}\n`);
write('DOCUMENTS.md',`# Repository document index\n\nAll ${documents.length} Markdown documents under docs are indexed in [documents.json](documents.json), with headings. The following paths are narrative/world/quest/persistence-related by filename; that filter is a discovery aid, not a declaration of canon or exhaustive semantic classification. Older audit claims must be checked against current code.\n\n${table(['Document','Title'],documents.filter(d=>d.narrativeRelated).map(d=>['['+d.path+'](../../'+d.path+')',d.title]))}\n`);
console.log(JSON.stringify({counts,referenceReview:references,importGraphStatus:graphStatus,sequenceBreakProbes:probes},null,2));

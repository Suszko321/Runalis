import {TILE} from './data.js';
import {ECOLOGIES,ecologyAt} from './worldAuthorship.js';
import {CONTINENT_REGIONS,CONTINENT_ROADS,CONTINENT_RIVERS,CONTINENT_LAKES,CONTINENT_ESCARPMENTS,continentRegionAt,migrateContinentalPosition} from './continentDefinition.js';
import {ECHORYN_REGIONS,ECHORYN_ESCARPMENTS,ECHORYN_FOREST_WALLS} from './echorynGeography.js';
export const SURVEY_CELL=8;
export function surveyKey(world){return world.continentId==='runalis'?'overworld:runalis':['overworld','capital'].includes(world.mode)?`${world.mode}:${world.regionId||world.name}`:`${world.mode}:${world.dungeonId||world.sideZoneType||world.routeId||world.infiniteDungeonId||world.theme||world.name}:${world.floor||1}`;}
export function migrateContinentalSurvey(memory,world){
 if(world.continentId!=='runalis')return;
 memory.surveys ||= {};
 const target=memory.surveys['overworld:runalis'] ||= {cells:{},biomes:{}};
 target.cells ||= {};target.biomes ||= {};
 if(target.continentalMigrationVersion===1)return target;
 const sources=[['overworld:hearthmereFrontier','hearthmereFrontier'],['overworld:aureateMarches','aureateMarches'],['overworld:ascensionWastes','ascensionWastes'],['travelRoute:pilgrimRoad:1','pilgrimRoadRoute'],['travelRoute:severedCauseway:1','severedCausewayRoute']];
 for(const [key,regionId] of sources){
  const old=memory.surveys[key];if(!old)continue;
  // Transform the whole surveyed footprint, not only its center. Later regions
  // occupy four times their former physical scale in the continent.
  for(const [cell,revealed] of Object.entries(old.cells||{})){
   if(!revealed)continue;const [cx,cy]=cell.split(',').map(Number);if(!Number.isInteger(cx)||!Number.isInteger(cy)||cx<0||cy<0)continue;
   const a=migrateContinentalPosition(regionId,cx*SURVEY_CELL*TILE,cy*SURVEY_CELL*TILE),b=migrateContinentalPosition(regionId,(cx+1)*SURVEY_CELL*TILE,(cy+1)*SURVEY_CELL*TILE);
   const minX=Math.max(0,Math.floor(a.x/TILE/SURVEY_CELL)),maxX=Math.min(Math.ceil(world.width/SURVEY_CELL)-1,Math.ceil(b.x/TILE/SURVEY_CELL)-1),minY=Math.max(0,Math.floor(a.y/TILE/SURVEY_CELL)),maxY=Math.min(Math.ceil(world.height/SURVEY_CELL)-1,Math.ceil(b.y/TILE/SURVEY_CELL)-1);
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const id=`${x},${y}`;if(!target.cells[id]){target.cells[id]=true;target.revision=(Number(target.revision)||0)+1;}}
  }
  for(const [eco,b] of Object.entries(old.biomes||{})){
   if(!Number.isFinite(b.x)||!Number.isFinite(b.y))continue;
   const p=migrateContinentalPosition(regionId,b.x*TILE,b.y*TILE);
   const id=regionId==='hearthmereFrontier'?eco:regionId;
   target.biomes[id] ||= {...b,x:p.x/TILE,y:p.y/TILE,name:regionId==='hearthmereFrontier'?b.name:CONTINENT_REGIONS.find(r=>r.id===regionId)?.name||b.name};
  }
 }
 target.continentalMigrationVersion=1;return target;
}
export function revealSurvey(memory,world,actors){
 memory.surveys ||= {};
 migrateContinentalSurvey(memory,world);
 const key=surveyKey(world),survey=memory.surveys[key] ||= {cells:{},biomes:{}};
 survey.cells ||= {};survey.biomes ||= {};
 for(const actor of actors){
  const tx=actor.x/TILE,ty=actor.y/TILE;
  for(let y=Math.max(0,Math.floor((ty-18)/SURVEY_CELL));y<=Math.min(Math.ceil(world.height/SURVEY_CELL)-1,Math.floor((ty+18)/SURVEY_CELL));y++)for(let x=Math.max(0,Math.floor((tx-18)/SURVEY_CELL));x<=Math.min(Math.ceil(world.width/SURVEY_CELL)-1,Math.floor((tx+18)/SURVEY_CELL));x++){
   const cx=(x+.5)*SURVEY_CELL,cy=(y+.5)*SURVEY_CELL;
   if(Math.hypot(cx-tx,cy-ty)>18)continue;
   const cell=`${x},${y}`;
   if(survey.cells[cell])continue;
   survey.cells[cell]=true;
   survey.revision=(Number(survey.revision)||0)+1;
   const eco=ecologyAt(world,cx*TILE,cy*TILE),region=world.continentId==='runalis'?continentRegionAt(cx,cy):null;
   const labelId=region&&region.id!=='hearthmereFrontier'?region.id:eco;
   survey.biomes[labelId] ||= {x:cx,y:cy,name:region&&region.id!=='hearthmereFrontier'?region.name:ECOLOGIES[eco].name};
  }
 }
 return survey;
}
export function getSurvey(memory,world,known=[]){
 // Older saves retain a small reveal around places they have actually visited.
 const survey=revealSurvey(memory,world,[]);
 if(!survey.migrated){revealSurvey(memory,world,known.map(p=>({x:p.x*TILE,y:p.y*TILE})));survey.migrated=true;}
 return survey;
}
const terrainCache=new WeakMap();
let renderId=0;
const colors={woodland:'#75866a',orchard:'#a29b75',marsh:'#647e78',river:'#8ca38b',highland:'#99978a',burial:'#898477',redseal:'#99716b',aureate:'#aba77b',ascension:'#8b8598'};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function macroTerrain(){
 const path=points=>points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ');
 const land=CONTINENT_REGIONS.map(r=>`<ellipse cx="${r.x}" cy="${r.y}" rx="${r.rx}" ry="${r.ry}" fill="${colors[r.ecology]||r.color}"/>`).join('');
 const frontier=ECHORYN_REGIONS.map(r=>`<ellipse cx="${r.x}" cy="${r.y}" rx="${r.rx}" ry="${r.ry}" fill="${r.color}" opacity=".65"/>`).join('');
 const forests=ECHORYN_FOREST_WALLS.map(r=>`<ellipse cx="${r.x}" cy="${r.y}" rx="${r.rx}" ry="${r.ry}" fill="#3c5743" stroke="#344c3c" stroke-width=".8"/>`).join('');
 const lakes=CONTINENT_LAKES.map(l=>`<ellipse cx="${l.x}" cy="${l.y}" rx="${l.rx}" ry="${l.ry}" fill="#648e98" stroke="#476e77" stroke-width="1"/>`).join('');
 const rivers=CONTINENT_RIVERS.map(r=>`<path d="${path(r.points)}" fill="none" stroke="#648e98" stroke-width="${r.width}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
 const cliffs=[...ECHORYN_ESCARPMENTS,...CONTINENT_ESCARPMENTS].map(e=>{
  let cursor=0,d='';for(const [a,b]of [...(e.gaps||[])].sort((a,b)=>a[0]-b[0])){if(a>cursor)d+=`M${e.x+cursor} ${e.y}h${a-cursor}v${e.h}h-${a-cursor}z`;cursor=Math.max(cursor,b+1);}if(cursor<e.w)d+=`M${e.x+cursor} ${e.y}h${e.w-cursor}v${e.h}h-${e.w-cursor}z`;
  return `<path d="${d}" fill="#4c5146" stroke="#a7a58a" stroke-width=".6"/>`;
 }).join('');
 const roads=CONTINENT_ROADS.map(r=>`<path d="${path(r.points)}" fill="none" stroke="${r.roadClass==='imperial'?'#e4cca0':'#cbb885'}" stroke-width="${r.width}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
 return `<g data-survey-macro="continent"><g filter="url(#survey-soft)">${land}${frontier}</g>${forests}${rivers}${lakes}${cliffs}${roads}</g>`;
}
function terrain(world){
 if(terrainCache.has(world))return terrainCache.get(world);
 if(world.continentId==='runalis'){const out=macroTerrain();terrainCache.set(world,out);return out;}
 let land='',detail='',water='',roads='',cliffs='',forests='';
 const landPaths={};
 for(let y=0;y<world.height;y+=4)for(let x=0;x<world.width;x+=4){
  const eco=ecologyAt(world,(x+2)*TILE,(y+2)*TILE);
  landPaths[eco]=(landPaths[eco]||'')+`M${x} ${y}h4.2v4.2h-4.2z`;
  const seed=((x*73856093)^(y*19349663))>>>0;
  if(x%8===0&&y%8===0&&seed%5<3&&world.tiles?.[y]?.[x]?.biome!=='water'){
   if(['woodland','orchard','river'].includes(eco))detail+=`<path d="M${x} ${y+3}v-4m-2 2q2-5 4 0q-2 2-4 0" fill="#435b47" stroke="#344b3b" stroke-width=".35" opacity=".48"/>`;
   if(eco==='highland')detail+=`<path d="M${x-3} ${y+2}l3-5 3 5m-4-3 1 1 1-1" fill="none" stroke="#57594e" stroke-width=".5" opacity=".55"/>`;
   if(eco==='marsh')detail+=`<path d="M${x-2} ${y}h4m-3 2h2" stroke="#3f6461" stroke-width=".4" opacity=".5"/>`;
  }
 }
 // Trace actual tile geography, rather than an invented schematic route network.
 for(let y=0;y<world.height;y++){
  let start=0,last='';
  for(let x=0;x<=world.width;x++){
   const biome=world.tiles?.[y]?.[x]?.biome||'';
   const kind=x===world.width?'':/water|river|lake/i.test(biome)?'water':biome==='path'?'road':biome==='cliff'?'cliff':world.tiles[y][x].forestWall?'forest':'';
   if(kind!==last){if(last){const d=`M${start} ${y}h${x-start}v1h-${x-start}z`;if(last==='water')water+=d;else if(last==='cliff')cliffs+=d;else if(last==='forest')forests+=d;else roads+=d;}start=x;last=kind;}
  }
 }
 land=Object.entries(landPaths).map(([eco,d])=>`<path d="${d}" fill="${colors[eco]}"/>`).join('');
 const out=`<g filter="url(#survey-soft)">${land}</g>${detail}<path d="${forests}" fill="#3c5743" stroke="#344c3c" stroke-width=".18"/><path d="${water}" fill="#648e98" stroke="#476e77" stroke-width=".28"/><path d="${cliffs}" fill="#4c5146" stroke="#a7a58a" stroke-width=".32"/><path d="${roads}" fill="#d2bd89" stroke="#8d7959" stroke-width=".12"/>`;
 terrainCache.set(world,out);return out;
}
export function renderSurveyArt(world,survey){
 const prefix=`survey-${++renderId}-`;
 const w=world.width,h=world.height;
 const reveal=Object.keys(survey.cells).filter(k=>survey.cells[k]).map(k=>{const [x,y]=k.split(',').map(Number);return `<rect x="${x*SURVEY_CELL}" y="${y*SURVEY_CELL}" width="${SURVEY_CELL+.4}" height="${SURVEY_CELL+.4}" fill="black"/>`;}).join('');
 const labels=Object.entries(survey.biomes).map(([id,b])=>`<text x="${b.x}" y="${b.y+5}" fill="#e9e1c9" stroke="#34423b" stroke-width=".6" paint-order="stroke" font-family="Georgia,serif" font-size="5.5" letter-spacing=".4">${esc(b.name||ECOLOGIES[id]?.name||id)}</text>`).join('');
 return `<svg class="survey-art" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Surveyed terrain; unexplored land is covered by fog"><defs><filter id="survey-soft"><feGaussianBlur stdDeviation="1.3"/></filter><filter id="survey-feather"><feGaussianBlur stdDeviation="1.6"/></filter><mask id="survey-fog"><rect width="${w}" height="${h}" fill="white"/><g filter="url(#survey-feather)">${reveal}</g></mask><pattern id="survey-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8L8 0" stroke="#87958d" stroke-width=".15" opacity=".15"/></pattern></defs><rect width="${w}" height="${h}" fill="#75866a"/>${terrain(world)}<g mask="url(#survey-fog)"><rect width="${w}" height="${h}" fill="#263331"/><rect width="${w}" height="${h}" fill="url(#survey-hatch)"/></g>${labels}</svg>`.replace(/survey-(soft|feather|fog|hatch)/g,`${prefix}$1`);
}



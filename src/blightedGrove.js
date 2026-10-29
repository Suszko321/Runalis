import {TILE} from './data.js';
import {makeEnemy} from './overworldUtils.js';
import {startQuest,openDialogue,updateQuestStageCompletion} from './dialogueSystem.js';
import {getStoryFlag,setStoryFlag} from './storyProgress.js';
import {initializeDungeonArena} from './dungeonArenaSystem.js';
import {GROVE_QUEST} from './blightedGroveData.js';
import {configureEncounterEnemy,dungeonEncounterProfile} from './encounterData.js';
import {tuneDungeonBoss} from './dungeonBossDifficulty.js';
export const isBlightedGrove=w=>w?.sideZoneType==='hollowGrove'&&!!w.dungeonState?.grove;
const point=(x,y)=>({x:(x+.5)*TILE,y:(y+.5)*TILE});
export function createBlightedGrove(options={}){
 const w={mode:'sideZone',name:'Blighted Grove — The Bound Garden',theme:'thorn',sideZoneType:'hollowGrove',sideZoneSeed:options.seed||'bound-garden',seed:options.seed||'bound-garden',regionId:options.regionId||'hearthmereFrontier',dungeonId:`sideZone-${options.regionId||'hearthmereFrontier'}-hollowGrove`,width:64,height:80,tileSize:TILE,tier:1,depth:1,floor:1,totalFloors:1,cleared:false,objects:[],enemies:[],drops:[],effects:[],combatEffects:[],rooms:[],halls:[],dungeonState:{grove:{version:1,turn:0},arenas:{},activeEvents:{},currentFloor:1,totalFloors:1}};
 w.tiles=Array.from({length:80},()=>Array.from({length:64},()=>({biome:'wall',passable:false})));
 const carve=(x,y)=>{if(w.tiles[y]?.[x])w.tiles[y][x]={biome:'grass',passable:true,variant:(x*7+y*3)%4};};
 for(const [id,x,y,rw,rh]of [['entry',25,68,14,9],['cradle',5,50,19,13],['garden',39,43,19,13],['stones',7,25,19,13],['crown',26,3,30,22]]){
  w.rooms.push({id,role:id==='crown'?'boss':'combat',x,y,w:rw,h:rh,cx:x+Math.floor(rw/2),cy:y+Math.floor(rh/2)});
  for(let j=y;j<y+rh;j++)for(let i=x;i<x+rw;i++){const corner=Math.min(i-x,x+rw-1-i)+Math.min(j-y,y+rh-1-j);if(id==='crown'||corner>=2)carve(i,j);}
 }
 const path=points=>{for(let n=1;n<points.length;n++){const[a,b]=points[n-1],[c,d]=points[n],steps=Math.max(Math.abs(c-a),Math.abs(d-b));for(let i=0;i<=steps;i++){const x=Math.round(a+(c-a)*i/steps),y=Math.round(b+(d-b)*i/steps);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)carve(x+dx,y+dy);}}};
 path([[32,72],[32,65],[14,65],[14,56]]);path([[14,52],[14,46],[48,46],[48,49]]);path([[48,44],[48,40],[16,40],[16,31]]);path([[23,31],[29,31],[29,28],[41,28],[41,23]]);
 w.spawn=point(32,73);w.bossRoomCenter=point(41,12);
 w.objects.push({id:'sideZoneExit',kind:'sideZoneExit',name:'Return to Echoryn',...point(32,75),r:22,locked:false},
 {id:'groveRootkeeper',npcId:'groveRootkeeper',kind:'npc',name:'Edda’s Speaking Skull',groveSkull:true,dialogueId:'groveEdda',deferTalkObjective:true,...point(29,71),r:18,stationary:true,disposition:'friendly',forceLabel:true});
 const roots=[[14,55],[48,48],[16,30]];
 roots.forEach(([x,y],i)=>{
  for(const [j,propType]of [['childToy','harvestCart'],['rotIrrigation','deadLivestock'],['memorialStone','prayerRibbons']][i].entries())w.objects.push({id:`grove-scene-${i}-${j}`,kind:'townProp',propType,...point(x+(j?5:-5),y+2),scale:.9,decorative:true,interactable:false,hideLabel:true});
  w.objects.push({id:`groveBinding${i}`,kind:'poiInvestigation',name:['Mira’s Binding Root','Tovin’s Binding Root','Sen’s Binding Root'][i],poiId:'blightedGrove',clueId:`binding${i}`,groveBinding:i,questArt:'roots',questVisibility:[[GROVE_QUEST,'unbind']],storyFlags:[`grove.root${i}`],message:['A wooden horse drops from the root. “She said we would wake in spring.” Mira’s voice fades into birdsong.','Water drains from the hollow. “Tell Mira I kept her ribbon.” Tovin’s reflection disappears.','The carved name becomes an ordinary scratch. “I’m tired of being brave.” Sen finally rests.'][i],...point(x,y),r:20});
  [[-4,2],[4,2],[0,-3]].forEach(([dx,dy],j)=>w.enemies.push(makeEnemy(j===2?'ashWolf':'hollowling',`grove-guard-${i}-${j}`,['Cradlebound','Drowned Gardener','Mourning Husk'][i],x+dx,y+dy,{tier:1,hp:85,maxHp:85,damage:9,speed:42,groveGuard:i,noRespawn:true,homeGuard:true,homeX:(x+dx+.5)*TILE,homeY:(y+dy+.5)*TILE,homeRadius:130,leashRange:190})));
 });
 w.objects.push({id:'groveCrownWarning',kind:'signpost',name:'Crownward Threshold',...point(38,28),r:18,talk:'Three bindings hold this passage. Beyond it, the Mother closes the roots behind every living visitor. Prepare your medicine before entering.'});
 const boss=makeEnemy('basicBeast','groveMother','Mother of Briars',41,12,{hp:2100,maxHp:2100,damage:25,speed:0,r:34,radius:34,isBoss:true,isDungeonMainBoss:true,bossId:'motherOfBriars',groveMother:true,arenaDormant:true,xp:180,noRespawn:true,aggroRange:1400,attackRange:0});
 w.enemies.push(boss);for(const e of w.enemies)configureEncounterEnemy(e,dungeonEncounterProfile(w),`${w.seed}:${e.id}`,{dungeon:true,rank:e.groveMother?'boss':'ordinary'});tuneDungeonBoss(boss,options.playerCount||1);initializeDungeonArena(w);return w;
}
export function beginBlightedGrove(game){
 if(!isBlightedGrove(game.world))return;startQuest(game.player,GROVE_QUEST);
 openDialogue(game.dialogue,game.world.objects.find(o=>o.groveSkull),game.player,game.world);
 updateBlightedGrove(game);
}
export function updateBlightedGrove(game){
 const w=game.world,p=game.player;if(!isBlightedGrove(w))return;
 if(!p.quests?.active?.[GROVE_QUEST]&&!p.quests?.completed?.[GROVE_QUEST])startQuest(p,GROVE_QUEST);
 const state=w.dungeonState.grove,freed=[0,1,2].every(i=>getStoryFlag(p,`grove.root${i}`));
 for(const x of [40,41,42])w.tiles[25][x].passable=freed;
 const boss=w.enemies.find(e=>e.groveMother);
 if((boss&&(boss.dead||boss.hp<=0))||w.bossArena?.phase==='defeated'){setStoryFlag(p,'grove.motherDefeated');state.defeated=true;}
 for(const o of w.objects)if(o.groveBinding!=null)o.interactable=!getStoryFlag(p,`grove.root${o.groveBinding}`);
 const skull=w.objects.find(o=>o.groveSkull),stage=p.quests?.active?.[GROVE_QUEST]?.currentStageId;
 if(skull)skull.dialogueId=getStoryFlag(p,'grove.storyComplete')?'groveEddaSilent':stage==='rest'?'groveEddaRest':stage==='listen'?'groveEdda':'groveEddaWaiting';
 const quest=p.quests?.active?.[GROVE_QUEST];for(const o of quest?.objectives||[])if(o.type==='storyFlag'&&getStoryFlag(p,o.flag))o.current=o.required;
 updateQuestStageCompletion(p,GROVE_QUEST);
}
export function handleGroveInteraction(game,o){
 if(!isBlightedGrove(game.world)||o.groveBinding==null)return false;
 if(game.world.enemies.some(e=>e.groveGuard===o.groveBinding&&!e.dead&&e.hp>0)){game.log?.('The binding recoils. Defeat this garden’s guardians before releasing the memory.');return true;}
 return false;
}

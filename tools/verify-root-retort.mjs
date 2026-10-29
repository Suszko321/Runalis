import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TILE} from '../src/data.js';
import {createPlayer,addItem,countItem} from '../src/player.js';
import {createCapitalHubWorld,useMaraApothecary} from '../src/hubSystem.js';
import {createMaraHouseWorld,enterMaraHouse,leaveMaraHouse,updateAct1Opening} from '../src/act1OpeningSystem.js';
import {ROOT_RETORT,inBuilding,migrateOrrakaiPosition,ensureRootRetortAccess} from '../src/orrakaiLayout.js';
import {isActorPositionPassable,moveActorWithCollision} from '../src/world.js';
import {nearestObject} from '../src/gameInteraction.js';
import {createDialogueState,openDialogue,updateDialogue,chooseDialogueOption,closeDialogue,startQuest} from '../src/dialogueSystem.js';
import {createSaveState,applySaveToGame,migrateSaveState} from '../src/gameSave.js';
import {getDialogue,getQuest} from '../src/worldContent.js';
import {getCampaignConversation} from '../src/campaignConversations.js';
import {updateAct1Campaign,handleCampaignInteraction} from '../src/act1CampaignRuntime.js';
const checks=[],test=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
function fixture(){const g={player:createPlayer('Root & Retort review'),world:createMaraHouseWorld(),dialogue:createDialogueState(),canvas:{width:1000,height:600},camera:{x:0,y:0},logLines:[],log(text){this.logLines.push(text);}};Object.assign(g.player,g.world.spawn);return g;}
function route(w,from,to){
 const key=(x,y)=>`${x},${y}`,start=[Math.floor(from.x/TILE),Math.floor(from.y/TILE)],end=key(Math.floor(to.x/TILE),Math.floor(to.y/TILE)),queue=[start],parents=new Map([[key(...start),null]]);
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i],here=key(x,y);if(here===end){const out=[];for(let step=here;step;step=parents.get(step))out.push(step.split(',').map(Number));return out.reverse();}for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=key(a,b);if(parents.has(k)||!isActorPositionPassable(w,(a+.5)*TILE,(b+.5)*TILE,12))continue;parents.set(k,here);queue.push([a,b]);}}
 return null;
}
test('recovery uses the Root & Retort upstairs, with an interior staircase rather than a street door',()=>{
 const g=fixture(),w=g.world;assert.equal(w.mode,'maraHouse');assert.match(w.name,/Root & Retort.*Upstairs/);assert(w.safeZone);assert(isActorPositionPassable(w,g.player.x,g.player.y,12));const down=w.objects.find(o=>o.id==='maraHouseDoor');assert(down.townStairs&&down.direction==='down');assert.match(down.name,/Downstairs/);assert(w.tiles[11].every(t=>!t.passable));
});
test('descending lands in the shop and does not get displaced by the town-layout migration',()=>{
 const g=fixture();assert(leaveMaraHouse(g));assert.equal(g.world.mode,'capital');const shop=g.world.buildings.find(b=>b.id==='alchemist');assert(inBuilding(shop,g.player.x,g.player.y));assert.equal(g.player.x,(ROOT_RETORT.arrival.x+.5)*TILE);assert.equal(g.player.y,(ROOT_RETORT.arrival.y+.5)*TILE);assert(!migrateOrrakaiPosition(g.world,g.player));assert.equal(nearestObject(g).id,'maraHomeEntrance');
});
test('stairs exist before any campaign update and remain usable on repeated visits',()=>{
 const g=fixture();for(let i=0;i<4;i++){assert(leaveMaraHouse(g));const stairs=g.world.objects.find(o=>o.id==='maraHomeEntrance');assert(stairs);assert.equal(g.world.objects.filter(o=>o.id===stairs.id).length,1);assert(handleCampaignInteraction(g,stairs));assert.equal(g.world.mode,'maraHouse');assert.match(g.player.currentZone,/Root & Retort/);assert.equal(g.world.opening.maraAddressDelay,Infinity);}
});
test('radius-aware walking connects the shop staircase, its south door, the street and Warden Mael',()=>{
 const g=fixture();leaveMaraHouse(g);updateAct1Campaign(g,.3);const stairs=g.world.objects.find(o=>o.id==='maraHomeEntrance'),street={x:49.5*TILE,y:43.5*TILE},mael=g.world.objects.find(o=>o.npcId==='wardenMael');
 for(const [from,to]of [[g.player,street],[street,stairs],[street,mael]]){
  const path=route(g.world,from,to);assert(path,`No route to ${to.name||'street'}`);const actor={x:(path[0][0]+.5)*TILE,y:(path[0][1]+.5)*TILE,r:12};
  for(const [x,y]of path.slice(1)){moveActorWithCollision(actor,g.world,(x+.5)*TILE-actor.x,(y+.5)*TILE-actor.y,12);assert(Math.hypot(actor.x-(x+.5)*TILE,actor.y-(y+.5)*TILE)<1);}
 }
});
test('Oren works downstairs while Mara retains her trainer and companion identity upstairs',()=>{
 const w=createCapitalHubWorld();assert(!w.objects.some(o=>o.npcId==='maraVell'));const staff=w.objects.filter(o=>o.npcId==='orenFenwick');assert.equal(staff.length,1);const m=staff[0];assert.equal(m.name,'Oren Fenwick');assert.equal(m.dialogueId,'orenFenwickShop');assert(m.stationary&&m.apothecaryService);assert(inBuilding(w.buildings.find(b=>b.id==='alchemist'),m.x,m.y));assert(!m.companionId&&!m.instructorType);
 const upstairs=createMaraHouseWorld(),mara=upstairs.objects.filter(o=>o.npcId==='maraVell');assert.equal(mara.length,1);assert.equal(mara[0].instructorType,'class');assert.equal(mara[0].classId,'thornbinder');assert.equal(mara[0].companionId,'mara');assert(!mara[0].apothecaryService);assert.notEqual(m.bodyType,mara[0].bodyType);assert.notEqual(m.hair,mara[0].hair);assert.notEqual(m.shirt,mara[0].shirt);
 const old=w.objects.find(o=>o.id==='orrakaiAlchemist');assert(old.presentationRetired&&old.hideOnRadar&&old.interactable===false);assert(!w.objects.some(o=>o.name==='Alchemist'&&o.interactable!==false));assert.equal(w.buildings.find(b=>b.id==='home').name,'Corin’s Workshop');assert(w.objects.some(o=>o.id==='orrakaiCraftsman'));
});
test('Oren offers medicines and upstairs directions without inheriting Mara’s quests',()=>{
 const g=fixture();leaveMaraHouse(g);const alchemist=g.world.objects.find(o=>o.npcId==='orenFenwick');assert(openDialogue(g.dialogue,alchemist,g.player,g.world));updateDialogue(g.dialogue,100);const options=g.dialogue.options;assert(options.some(o=>o.id==='mara'));assert(!options.some(o=>o.id==='train'||o.id==='quest'));const service=options.findIndex(o=>o.id==='mara-restorative');assert(service>=0);assert(service<options.findIndex(o=>o.id==='leave'));assert(chooseDialogueOption(g.dialogue,g.player,g.world,service));assert.equal(g.dialogue.pendingAction.type,'maraApothecary');
});
test('Oren retains reagent brewing and the eight-gold purchase; remote or stale providers cannot trade',()=>{
 const g=fixture();leaveMaraHouse(g);const mara=g.world.objects.find(o=>o.npcId==='orenFenwick');Object.assign(g.player,{x:mara.x,y:mara.y+24});addItem(g.player,'gravecap',1);addItem(g.player,'paleEssence',1);const tonic=countItem(g.player,'shrineTonic');assert(useMaraApothecary(g,mara));assert.equal(countItem(g.player,'shrineTonic'),tonic+1);
 g.player.gold=8;const food=countItem(g.player,'fieldRations');assert(useMaraApothecary(g,mara));assert.equal(g.player.gold,0);assert.equal(countItem(g.player,'fieldRations'),food+1);assert(g.logLines.some(t=>t.startsWith('Oren Fenwick:')));assert(g.logLines.every(t=>!t.startsWith('Mara Vell:')));
 g.player.gold=8;g.player.x+=200;assert(!useMaraApothecary(g,mara));assert.equal(g.player.gold,8);g.player.x=mara.x;assert(!useMaraApothecary(g,{...mara}));
});
test('older published NPC/entrance placements are rebound without editing terrain or duplicating objects',()=>{
 const w=createCapitalHubWorld(),alchemist=w.objects.find(o=>o.npcId==='orenFenwick'),stairs=w.objects.find(o=>o.id==='maraHomeEntrance'),terrain=JSON.stringify(w.tiles),count=w.objects.length;alchemist.x=60*TILE;stairs.x=8*TILE;stairs.y=30*TILE;w.objects.push({id:'thornbinderTrainer',kind:'npc',npcId:'maraVell',name:'Mara Vell'});ensureRootRetortAccess(w);ensureRootRetortAccess(w);assert.equal(w.objects.length,count);assert(!w.objects.some(o=>o.npcId==='maraVell'));assert.equal(alchemist.x,(ROOT_RETORT.counter.x+.5)*TILE);assert.equal(stairs.x,(ROOT_RETORT.stairs.x+.5)*TILE);assert.equal(JSON.stringify(w.tiles),terrain);
});
test('both floors survive save/load, retaining story flags and permanent stairs',()=>{
 const g=fixture();g.player.story.flags.opening={introPlayed:true,maraConversationComplete:true};startQuest(g.player,'mercy_in_orrakai');for(const floor of ['maraHouse','capital']){
  if(floor==='capital')leaveMaraHouse(g);const flags=JSON.stringify(g.player.story.flags),quest=JSON.stringify(g.player.quests),save=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,save));assert.equal(g.world.mode,floor);assert.equal(JSON.stringify(g.player.story.flags),flags);assert.equal(JSON.stringify(g.player.quests),quest);assert(g.world.objects.some(o=>o.id===(floor==='capital'?'maraHomeEntrance':'maraHouseDoor')));assert(isActorPositionPassable(g.world,g.player.x,g.player.y,12));
 }
});
test('legacy house saves acquire the new name and move safely off the former exterior threshold',()=>{
 const g=fixture(),save=JSON.parse(JSON.stringify(createSaveState(g)));save.worldName="Mara Vell's House";save.player.x=7.5*TILE;save.player.y=11.5*TILE;const loaded=migrateSaveState(save);assert.equal(loaded.worldMode,'maraHouse');assert.match(loaded.worldName,/Root & Retort/);assert(isActorPositionPassable(loaded.worldRuntime,loaded.player.x,loaded.player.y,12));assert.match(loaded.player.currentZone,/Root & Retort/);
});
test('revisiting does not restart the ambush/recovery conversation and the evening story still uses upstairs',()=>{
 const g=fixture();g.player.story.flags.opening={introPlayed:true,maraConversationComplete:true};leaveMaraHouse(g);enterMaraHouse(g);updateAct1Opening(g,2);assert(!g.dialogue.active);assert.equal(g.world.objects.find(o=>o.npcId==='maraVell').dialogueId,'maraTrainerDialogue');
 const mara=g.world.objects.find(o=>o.npcId==='maraVell');assert(openDialogue(g.dialogue,mara,g.player,g.world));updateDialogue(g.dialogue,100);assert(g.dialogue.options.some(o=>o.id==='train'));assert(g.dialogue.options.some(o=>o.id==='quest'));assert(!g.dialogue.options.some(o=>o.action==='maraApothecary'));closeDialogue(g.dialogue,{immediate:true});
 g.player.quests.active.mercy_in_orrakai={currentStageId:'returnToMara'};assert.equal(getCampaignConversation(g.world.objects.find(o=>o.npcId==='maraVell'),g.player,g.world).id,'act1MaraEvening');
 const opening=getDialogue('maraMercyOpening');assert.match(opening.options.find(o=>o.id==='who').response,/apothecary’s daughter/);assert.match(opening.options.find(o=>o.id==='next').response,/stairs down.*Root & Retort/);assert.match(getQuest('mercy_in_orrakai').stages.find(s=>s.id==='returnToMara').description||getQuest('mercy_in_orrakai').stages.find(s=>s.id==='returnToMara').text,/Root & Retort/);
});
test('Mael’s evening visit keeps the staircase clear for leaving after the story conclusion',()=>{
 const g=fixture();startQuest(g.player,'mercy_in_orrakai');const definition=getQuest('mercy_in_orrakai'),index=definition.stages.findIndex(s=>s.id==='returnToMara'),stage=definition.stages[index];Object.assign(g.player.quests.active.mercy_in_orrakai,{stageIndex:index,currentStageId:stage.id,objectives:stage.objectives.map(o=>({...o,current:0}))});updateAct1Campaign(g,.3);
 assert(g.world.objects.some(o=>o.id==='maelEveningVisitor'));const down=g.world.objects.find(o=>o.id==='maraHouseDoor');Object.assign(g.player,{x:down.x,y:down.y-24});assert.equal(nearestObject(g).id,down.id);assert(leaveMaraHouse(g));assert.equal(g.world.mode,'capital');
});
fs.mkdirSync('docs/root-retort',{recursive:true});fs.writeFileSync('docs/root-retort/verification.json',JSON.stringify({checks},null,2));console.log(JSON.stringify({checks:checks.length}));

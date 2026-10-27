import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPlayer,addItem,countItem} from '../src/player.js';
import {ITEMS,getAllRecipes} from '../src/data.js';
import {createCapitalHubWorld,supplyBlacksmithMaterials} from '../src/hubSystem.js';
import {isActorPositionPassable} from '../src/world.js';
import {objectInInteractionRange} from '../src/interactionRange.js';
import {beginWorkshopSession,endWorkshopSession,workshopAccessStatus,CAMPFIRE_RECIPES} from '../src/workshopAccess.js';
import {workshopFixture} from './workshop-fixtures.mjs';
import {makeUpgradeQuote,makeOwnedGearUpgradeQuote,commitGearUpgrade,equipGearEntry,getEquipmentTier} from '../src/equipmentProgressionSystem.js';
import {craftRecipe,getRecipeCraftStatus,salvageInventoryItem} from '../src/craftingSystem.js';
import {performEquipmentSlotUpgradeAction,performInventoryUpgradeAction,performInventoryPrimaryAction} from '../src/panelInventory.js';
import {createDialogueState,openDialogue,updateDialogue,chooseDialogueOption} from '../src/dialogueSystem.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {workshopMapMarkers} from '../src/workshopArt.js';
import {classifyRadarMarker} from '../src/minimapRadar.js';

const report={checks:[]},test=(name,fn)=>{fn();report.checks.push(name);console.log('PASS '+name);};
const actor=()=>{const p=createPlayer('Workshop review');Object.assign(p,{x:320,y:320,hp:500,gold:100000,act1OpeningPending:false});for(const s of Object.values(p.skillState.skills))s.level=100;return p;};
const equip=(p,id)=>{addItem(p,id);assert(equipGearEntry(p,p.inventory.findLastIndex(e=>e.id===id)));};
const fund=p=>{const ids=new Set(getAllRecipes().flatMap(r=>r.materials.map(([id])=>id)));for(const id of ['ironScrap','blackironOre','arcaneDust','towerFragment','oathsteelShard'])ids.add(id);for(const id of ids)addItem(p,id,ITEMS[id]?.type==='tool'?2:100);};
const possessions=p=>JSON.stringify({inventory:p.inventory,gold:p.gold,crafting:p.crafting});

test('Orrakai has one named provider for each service, reachable with actor collision',()=>{
 const w=createCapitalHubWorld({skipPublishedOverride:true}),seen=new Set(),q=[w.spawn];seen.add(`${Math.floor(w.spawn.x/32)},${Math.floor(w.spawn.y/32)}`);
 for(let i=0;i<q.length;i++)for(const [dx,dy] of [[32,0],[-32,0],[0,32],[0,-32]]){const x=q[i].x+dx,y=q[i].y+dy,key=`${Math.floor(x/32)},${Math.floor(y/32)}`;if(seen.has(key)||!isActorPositionPassable(w,x,y,12))continue;seen.add(key);q.push({x,y});}
 for(const kind of ['blacksmith','craftsman']){const providers=w.objects.filter(o=>o.workshopService===kind);assert.equal(providers.length,1);const n=providers[0];assert(q.some(p=>objectInInteractionRange(p,n)));assert(seen.has(`${Math.floor(n.x/32)},${Math.floor(n.y/32)}`));}
 assert(w.objects.some(o=>o.propType==='workshopSign'&&o.service==='craftsman'));assert(w.objects.some(o=>o.propType==='workshopSign'&&o.service==='blacksmith'));
 report.navigation={reachableCells:q.length,providers:workshopMapMarkers(w)};
});
test('direct, inventory, stale recipe and hotkey operations cannot craft or upgrade remotely',()=>{
 const p=actor();equip(p,'oldKnife');fund(p);const g={player:p,log(){},uiState:{}},before=JSON.stringify(p),q=makeUpgradeQuote(p,'weapon');
 assert.equal(commitGearUpgrade(p,q).ok,false);assert.equal(performEquipmentSlotUpgradeAction(p,'weapon',g),false);assert.equal(performInventoryUpgradeAction(p,{},g),false);
 assert.equal(craftRecipe(p,'cookedSunfish',g),false);assert.equal(performInventoryPrimaryAction(p,{dataset:{inventoryRecipeId:'cookedSunfish'}},g),false);assert.equal(JSON.stringify(p),before);
});
test('service authority rejects other provider, fake provider, wall, distance, death, removal, world or owner change',()=>{
 const p=actor(),g=workshopFixture(p),npc=g.world.objects[0];assert.equal(beginWorkshopSession(g,{...npc},'blacksmith'),null);assert.equal(workshopAccessStatus(p,'craftsman').ok,false);
 const variants=[p=>p.x+=500,p=>p.dead=true,p=>p.alive=false,p=>p.hp=0,p=>p.lifeState='downed',(p,g,n)=>n.dead=true,(p,g,n)=>n.hp=0,(p,g,n)=>n.remove=true,(p,g)=>g.world.objects=[],(p,g)=>g.world={...g.world},(p,g)=>g.player=actor(),(p,g)=>g.destroyed=true];
 for(const mutate of variants){const a=actor(),h=workshopFixture(a);mutate(a,h,h.world.objects[0]);assert.equal(workshopAccessStatus(a,'blacksmith').ok,false,String(mutate));}
 p.x=320;g.world.tiles[10][10].passable=false;assert.equal(workshopAccessStatus(p,'blacksmith').ok,false);endWorkshopSession(p);
});
test('equipped and bag weapons, armour and trinkets upgrade the right individual copy at original costs',()=>{
 for(const id of ['oldKnife','leatherVest','paleRune']){
  const p=actor();equip(p,id);addItem(p,id);fund(p);workshopFixture(p);const slot=ITEMS[id].slot==='jewelry'?'trinket':ITEMS[id].slot;
  const bag=p.inventory.findLast(e=>e.id===id),identity=bag.instanceId,other=p.equippedGear[slot].instanceId,q=makeOwnedGearUpgradeQuote(p,identity),before=p.gold,material=countItem(p,'ironScrap');bag.affixes=[{id:'keen',amount:2}];
  assert(commitGearUpgrade(p,q).ok);assert.equal(p.gold,before-q.cost.gold);assert.equal(countItem(p,'ironScrap'),material-1);assert.equal(bag.instanceId,identity);assert.equal(bag.upgradeTier,2);assert.deepEqual(bag.affixes,[{id:'keen',amount:2}]);assert.equal(p.equippedGear[slot].instanceId,other);assert.equal(getEquipmentTier(p,slot),1);
  assert(commitGearUpgrade(p,makeUpgradeQuote(p,slot)).ok);assert.equal(getEquipmentTier(p,slot),2);
 }
});
test('co-op service sessions charge only their owner and expire when that actor leaves',()=>{
 const p=actor(),g=workshopFixture(p),ally=actor();endWorkshopSession(p);p.coop={players:[ally]};equip(ally,'oldKnife');fund(ally);
 const view=Object.create(g);view.hostGame=g;view.player=ally;assert(beginWorkshopSession(view,g.world.objects[0],'blacksmith'));assert(!workshopAccessStatus(p,'blacksmith').ok);const gold=p.gold,before=ally.gold;assert(commitGearUpgrade(ally,makeUpgradeQuote(ally,'weapon')).ok);assert.equal(p.gold,gold);assert.equal(ally.gold,before-20);p.coop.players=[];assert(!workshopAccessStatus(ally,'blacksmith').ok);
});
test('quotes reject moved items, duplicate confirmations, changed tiers and missing costs atomically',()=>{
 const p=actor();equip(p,'oldKnife');addItem(p,'oldKnife');fund(p);workshopFixture(p);let q=makeUpgradeQuote(p,'weapon');p.gold=0;let before=JSON.stringify(p);assert(!commitGearUpgrade(p,q).ok);assert.equal(JSON.stringify(p),before);
 p.gold=10000;p.inventory=p.inventory.filter(e=>e.id!=='ironScrap');before=JSON.stringify(p);assert(!commitGearUpgrade(p,q).ok);assert.equal(JSON.stringify(p),before);addItem(p,'ironScrap',100);
 const bag=p.inventory.find(e=>e.id==='oldKnife');q=makeOwnedGearUpgradeQuote(p,bag.instanceId);equipGearEntry(p,p.inventory.indexOf(bag));before=JSON.stringify(p);assert(!commitGearUpgrade(p,q).ok);assert.equal(JSON.stringify(p),before);
 q=makeUpgradeQuote(p,'weapon');assert(commitGearUpgrade(p,q).ok);before=JSON.stringify(p);assert(!commitGearUpgrade(p,q).ok);assert.equal(JSON.stringify(p),before);p.equippedGear.weapon.upgradeTier=20;assert.equal(makeUpgradeQuote(p,'weapon'),null);
});
test('all 63 original recipes consume their ingredients and preserve output and profession XP',()=>{
 assert.equal(getAllRecipes().length,63);
 for(const r of getAllRecipes()){
  const p=actor(),g=workshopFixture(p,'craftsman');fund(p);p.inventory=p.inventory.filter(e=>e.id!==r.output);for(const [id,n] of r.materials)if(countItem(p,id)<n)addItem(p,id,n);
  const before=new Map(r.materials.map(([id])=>[id,countItem(p,id)])),xp=p.skillState.skills[r.skill].xp,count=p.crafting?.craftCount||0;
  assert(getRecipeCraftStatus(p,r).ok,r.id);assert(craftRecipe(p,r.id,g),r.id);assert.equal(countItem(p,r.output),r.outputQty||1,r.id);for(const [id,n] of r.materials)assert.equal(countItem(p,id),before.get(id)-n,r.id+' '+id);assert.equal(p.crafting.craftCount,count+1);assert(p.skillState.skills[r.skill].xp>=xp,r.id);
 }
});
test('crafting rejects missing materials, profession locks and forged recipe costs',()=>{
 const p=actor(),g=workshopFixture(p,'craftsman'),r=getAllRecipes().find(r=>r.requiredLevel>1);p.skillState.skills[r.skill].level=1;fund(p);let before=possessions(p);assert(!craftRecipe(p,r.id,g));assert.equal(possessions(p),before);
 p.skillState.skills[r.skill].level=100;p.inventory=[];before=possessions(p);assert(!craftRecipe(p,{...r,materials:[],requiredLevel:1},g));assert.equal(possessions(p),before);
});
test('supported campfire preparation remains local and cannot impersonate a workshop',()=>{
 for(const id of CAMPFIRE_RECIPES){const p=actor(),g=workshopFixture(p,'craftsman');endWorkshopSession(p);fund(p);const station={id:'fire',kind:'campfire',x:p.x+24,y:p.y,r:12};g.world.objects.push(station);assert(craftRecipe(p,id,g,{source:'campfire',station}),id);assert(!craftRecipe(p,id,g,{source:'campfire',station:{...station}}));p.x+=200;assert(!craftRecipe(p,id,g,{source:'campfire',station}));}
 const p=actor(),g=workshopFixture(p);fund(p);const fire={kind:'campfire',x:p.x,y:p.y};g.world.objects.push(fire);assert(!craftRecipe(p,'ironScrapBundle',g,{source:'campfire',station:fire}));
});
test('smith material refinement and portable salvage retain original rewards',()=>{
 const p=actor(),g=workshopFixture(p);addItem(p,'ironOre',2);let n=countItem(p,'ironScrap');assert(supplyBlacksmithMaterials(g));assert.equal(countItem(p,'ironScrap'),n+3);endWorkshopSession(p);n=countItem(p,'ironScrap');assert(!supplyBlacksmithMaterials(g));assert.equal(countItem(p,'ironScrap'),n);addItem(p,'oldKnife');assert(salvageInventoryItem(p,p.inventory.findLastIndex(e=>e.id==='oldKnife'),g));
});
test('standard dialogue offers real services while retaining Mara quest options and Leave',()=>{
 const w=createCapitalHubWorld({skipPublishedOverride:true});
 for(const kind of ['blacksmith','craftsman']){const p=actor(),npc=w.objects.find(o=>o.workshopService===kind),d=createDialogueState();assert(openDialogue(d,npc,p,w));for(let i=0;i<120;i++)updateDialogue(d,.1);assert(d.options.some(o=>o.id==='leave'));const index=d.options.findIndex(o=>o.action===(kind==='blacksmith'?'workshopWeapons':'workshopCraft'));assert(index>=0,JSON.stringify(d.options));assert(chooseDialogueOption(d,p,w,index));assert.equal(d.pendingAction.type,kind==='blacksmith'?'workshopWeapons':'workshopCraft');}
});
test('save/load retains individual upgrades, crafted inventory, progression and actual map locations; authority expires',()=>{
 const p=actor(),w=createCapitalHubWorld({skipPublishedOverride:true}),npc=w.objects.find(o=>o.workshopService==='blacksmith'),g={player:p,world:w,log(){},profileId:'workshop-test',profileName:'Workshop review'};Object.assign(p,{x:npc.x,y:npc.y+32,orrakaiLayoutRevision:w.orrakaiRevision});fund(p);equip(p,'oldKnife');assert(beginWorkshopSession(g,npc,'blacksmith'));assert(commitGearUpgrade(p,makeUpgradeQuote(p,'weapon')).ok);const id=p.equippedGear.weapon.instanceId;
 const craft=w.objects.find(o=>o.workshopService==='craftsman');Object.assign(p,{x:craft.x,y:craft.y+32});assert(beginWorkshopSession(g,craft,'craftsman'));assert(craftRecipe(p,'cookedSunfish',g));const amount=countItem(p,'cookedSunfish'),xp=p.skillState.skills.cooking.xp,save=createSaveState(g);assert(!JSON.stringify(save).includes('workshopService'));
 assert(applySaveToGame(g,JSON.parse(JSON.stringify(save))));assert(!workshopAccessStatus(p,'craftsman').ok);assert(!workshopAccessStatus(g.player,'blacksmith').ok);assert.equal(g.player.equippedGear.weapon.instanceId,id);assert.equal(getEquipmentTier(g.player,'weapon'),2);assert.equal(countItem(g.player,'cookedSunfish'),amount);assert.equal(g.player.skillState.skills.cooking.xp,xp);assert.deepEqual(workshopMapMarkers(g.world),workshopMapMarkers(w));
});
test('markers use live NPC coordinates, distinct icons and exact service descriptions',()=>{
 const w=createCapitalHubWorld({skipPublishedOverride:true}),markers=workshopMapMarkers(w);assert.equal(markers.length,2);for(const m of markers){const n=w.objects.find(o=>o.id===m.npcId);assert.equal(m.x,n.x/32);assert.equal(m.y,n.y/32);const icon=classifyRadarMarker(n,'object');assert.equal(icon.tooltip,m.description);assert(['anvil','tools'].includes(icon.shape));}assert.notEqual(markers[0].service,markers[1].service);
});
fs.mkdirSync('docs/workshop-services',{recursive:true});fs.writeFileSync('docs/workshop-services/model-verification.json',JSON.stringify(report,null,2));console.log(`PASS ${report.checks.length} workshop model checks`);

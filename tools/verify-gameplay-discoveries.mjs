import assert from 'node:assert/strict';
import {createWorld,isActorPositionPassable} from '../src/world.js';
import {createPlayer,chooseClass,addItem} from '../src/player.js';
import {GAMEPLAY_DISCOVERIES,rollGameplayEnemyLoot,canDiscoverScroll,lootDiscoveryProfile} from '../src/gameplayDiscoveries.js';
import {claimWorldCache,harvest} from '../src/gameInteraction.js';
import {readSkillScroll} from '../src/skillScrollSystem.js';
import {ITEMS,getAbilityById} from '../src/data.js';
import {encounterRng} from '../src/encounterData.js';
import {captureContinentalState} from '../src/continentPersistence.js';
import {createSaveState,applySaveToGame} from '../src/gameSave.js';
import {objectInInteractionRange} from '../src/interactionRange.js';
import {regionalSetPool} from '../src/regionalLootSystem.js';
const p=createPlayer('Discovery regression');chooseClass(p,'gravecaller',()=>{});const w=createWorld();Object.assign(p,w.spawn);
const logs=[],g={world:w,player:p,canvas:{width:960,height:600},camera:{x:0,y:0},log:text=>logs.push(text),save(){},shake(){}};
const count=(id)=>p.inventory.filter(e=>e.id===id).reduce((n,e)=>n+e.qty,0);
const sites=w.continentRuntime.allObjects.filter(o=>o.id.startsWith('discovery-'));
assert.equal(sites.length,GAMEPLAY_DISCOVERIES.length);
assert(regionalSetPool(sites.find(s=>s.discoveryId==='ritual-surveyor-case'),w).every(id=>id.startsWith('ashenExecutioner')),'ritual cache lost its faction’s mythical identity');
for(const site of sites){
 p.x=site.x;p.y=site.y;w.continentRuntime.activate([p],p,true);
 assert(w.objects.includes(site));assert(isActorPositionPassable(w,site.x,site.y,12),site.name+' is unreachable');
 if(site.discoveryClueId)assert(w.continentRuntime.findObject(site.discoveryClueId),'clue points at nonexistent content');
 assert(!w.authoredLocations.some(o=>o.id===site.id),'discovery added an automatic waypoint');
}
console.log('PASS five real, streamed, reachable discoveries and valid unmarked clue destinations');
const cache=sites.find(o=>o.discoveryId==='roadless-supply-roll');p.x=cache.x;p.y=cache.y;w.continentRuntime.activate([p],p,true);
w.enemies=[{id:'guard',x:cache.x+50,y:cache.y,hp:30,maxHp:30}];const before=count('ironScrap');
assert.equal(claimWorldCache(g,cache),false);assert.equal(count('ironScrap'),before);w.enemies=[];
assert(claimWorldCache(g,cache));assert.equal(count('ironScrap'),before+3);assert(!claimWorldCache(g,cache));assert.equal(count('ironScrap'),before+3);
assert(p.worldMemory.discoveryClaims[cache.id]);assert(p.worldMemory.inscriptions[cache.id].text);
assert(objectInInteractionRange(p,cache),'recovered journal became unreachable through interaction');
console.log('PASS guarded cache grants its upgrade materials once and records readable knowledge');
const deposit=sites.find(o=>o.kind==='ore');p.x=deposit.x;p.y=deposit.y;w.continentRuntime.activate([p],p,true);
const ore=count('blackironOre');harvest(g,deposit,'blackironOre','mining',20);assert.equal(count('blackironOre'),ore);assert(!deposit.depleted);
p.skillState.skills.mining.level=10;harvest(g,deposit,'blackironOre','mining',20);assert(count('blackironOre')>ore);const after=count('blackironOre');
harvest(g,deposit,'blackironOre','mining',20);assert.equal(count('blackironOre'),after);assert(deposit.depleted&&deposit.respawn>=300);
console.log('PASS unusual deposit uses actual mining proficiency, yield and harvest respawn memory');
captureContinentalState(g);const save=JSON.parse(JSON.stringify(createSaveState(g)));assert(applySaveToGame(g,save));
g.world.continentRuntime.activate([g.player],g.player,true);const restored=g.world.continentRuntime.findObject(cache.id);
assert(restored.claimed);assert(g.player.worldMemory.discoveryClaims[cache.id]);assert(!claimWorldCache(g,restored));assert(g.player.worldMemory.inscriptions[cache.id].text);
Object.assign(g.player,{x:restored.x,y:restored.y});g.world.continentRuntime.activate([g.player],g.player,true);
assert(objectInInteractionRange(g.player,restored),'reloaded journal cannot be reread');
console.log('PASS real save/load retains claims, journal knowledge, inventory and claimed world objects');
{
 const fresh=createPlayer('Scroll recipient');assert(canDiscoverScroll(fresh,'guardScroll'));addItem(fresh,'guardScroll',1);assert(!canDiscoverScroll(fresh,'guardScroll'));fresh.inventory=[];fresh.bank={items:[{id:'guardScroll',qty:1}]};assert(!canDiscoverScroll(fresh,'guardScroll'));fresh.bank={items:[]};
 fresh.knownAbilities.push('guard');assert(!canDiscoverScroll(fresh,'guardScroll'));assert(!canDiscoverScroll(fresh,'summonDemonScroll'));
 const student=createPlayer('Student');addItem(student,'guardScroll',1);const ability=getAbilityById('guard'),original=ability.unlockLevel;
 try{ability.unlockLevel=8;assert(!readSkillScroll(student,0).ok);assert.equal(student.inventory[0].qty,1);student.skillState.skills[ability.skill].level=8;assert(readSkillScroll(student,0).ok);}finally{ability.unlockLevel=original;}
 ITEMS.testWrongClassScroll={id:'testWrongClassScroll',type:'scroll',learnsAbility:'gravecallerGhostwalk'};
 const wrong=createPlayer('Other class');chooseClass(wrong,'oathkeeper',()=>{});wrong.inventory.push({id:'testWrongClassScroll',qty:1});assert(!readSkillScroll(wrong,wrong.inventory.length-1).ok);delete ITEMS.testWrongClassScroll;
 console.log('PASS scroll discovery avoids learned/bag/bank duplicates and preserves weapon, class and proficiency restrictions');
}
{
 const owner=createPlayer('Loot sample'),out={ordinary:0,lowElite:0,elite:0,scrolls:0};
 for(let i=0;i<20000;i++)for(const category of ['ordinary','lowElite','elite']){
  const e={kind:'cultist',name:'Cultist',combatLevel:category==='lowElite'?4:25,elite:category!=='ordinary'};
  const drops=rollGameplayEnemyLoot(e,owner,w,encounterRng(category+i));out[category]+=drops.length;out.scrolls+=drops.filter(d=>ITEMS[d.item].type==='scroll').length;
  assert(drops.every(d=>ITEMS[d.item]&&d.item!=='summonDemonScroll'&&!['weapon','armour','trinket'].includes(ITEMS[d.item].type)));
 }
 assert.equal(out.ordinary,0);assert.equal(out.lowElite,0);assert(out.elite>0);assert(out.scrolls>500&&out.scrolls<2000);
 assert.equal(lootDiscoveryProfile('guardScroll').kind,'scroll');assert.equal(lootDiscoveryProfile('ironScrap'),null);assert.equal(lootDiscoveryProfile('ashenExecutionerChest').kind,'mythical');
 console.log('PASS 60,000 seeded reward samples keep extra discoveries scarce and danger-gated: '+JSON.stringify(out));
}

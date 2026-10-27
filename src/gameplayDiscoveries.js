import {ITEMS,getAbilityById} from './data.js';
import {encounterRng} from './encounterData.js';
import {isActorPositionPassable,hasLineOfSight} from './world.js';
import {MYTHICAL_SETS} from './mythicalEquipmentData.js';
import {addQuestText} from './floatingText.js';
import {playSfx} from './audioSystem.js';

const materials=new Set(['blackironOre','arcaneDust','graveSilver','thornsilkFiber','spiritwoodSplinter','lumenQuartz','tideglassCrystal','oathsteelShard','towerFragment']);
const mythical=new Map(Object.values(MYTHICAL_SETS).flatMap(set=>set.pieces.map(id=>[id,set.name])));
export function lootDiscoveryProfile(id){
 const item=ITEMS[id];if(!item)return null;
 return item.learnsAbility?{kind:'scroll',label:'Skill scroll',color:'#a9d6dc'}:mythical.has(id)?{kind:'mythical',label:mythical.get(id),color:'#dfbd79'}:materials.has(id)?{kind:'material',label:'Upgrade material',color:'#aabbb0'}:null;
}
export function announceLootDiscovery(player,id,world,log){
 const profile=lootDiscoveryProfile(id);if(!profile)return;
 player.worldMemory ||= {};const seen=player.worldMemory.lootDiscoveries ||= {};
 if(seen[id])return;seen[id]=true;
 addQuestText(player,`${profile.label}: ${ITEMS[id].name}`,{color:profile.color,ttl:1.65,size:14});
 log?.(`${profile.label} discovered: ${ITEMS[id].name}. ${profile.kind==='material'?'Used to improve equipment tiers.':profile.kind==='scroll'?'Read it from Inventory to learn its technique.':'One piece of a three-piece set.'}`);
 playSfx(profile.kind==='mythical'?'quest':'loot',{volume:.42,throttle:1.8});
 world.effects ||= [];if(world.effects.length<280)world.effects.push({kind:'enemyPulse',x:player.x,y:player.y,color:profile.color,radius:profile.kind==='mythical'?35:20,age:0,ttl:.4,layer:'behind'});
}
export function canDiscoverScroll(player,id,world=null){
 const item=ITEMS[id],ability=getAbilityById(item?.learnsAbility);
 if(!ability||item.legendaryUnlock||ability.classId&&ability.classId!==player?.classId)return false;
 const known=[...(player?.knownAbilities||[]),...(player?.unlockedAbilities||[])];
 const bag=[...(player?.inventory||[]),...(Array.isArray(player?.bank)?player.bank:player?.bank?.items||[])];
 return !known.includes(ability.id)&&!bag.some(entry=>(typeof entry==='string'?entry:entry?.id)===id&&(typeof entry==='string'||entry.qty>0))&&
  !(world?.drops||[]).some(drop=>!drop.collected&&(drop.itemId||drop.item)===id&&(drop.ownerSlot||1)===(player?.slot||player?.playerNumber||1));
}
export function rollGameplayEnemyLoot(enemy,owner,world,rng=Math.random){
 if(!enemy||enemy.rewardSuppressed||enemy.summonedBy||enemy.summonedByBoss)return [];
 const level=Number(enemy.combatLevel||enemy.level||1),elite=enemy.elite||enemy.isElite||enemy.eliteModifier||enemy.namedExteriorElite||enemy.isBoss||enemy.worldBoss;
 if(!elite||level<8)return [];
 const rewards=[],text=`${enemy.kind} ${enemy.name} ${enemy.encounterRegion||''}`;
 if(rng()<(enemy.isBoss||enemy.worldBoss ? .6 : .28)){
  const pool=level>=30?(/grave|wraith|bone|crypt/i.test(text)?['graveSilver','arcaneDust']: /cult|seal|demon/i.test(text)?['oathsteelShard','arcaneDust']:['blackironOre','thornsilkFiber']):level>=18?['blackironOre','arcaneDust']:['ironScrap','sturdyHardwood'];
  rewards.push({item:pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))],qty:1});
 }
 const scrolls=['guardScroll','summonWolfScroll'].filter(id=>canDiscoverScroll(owner,id,world));
 if(scrolls.length&&rng()<.065)rewards.push({item:scrolls[Math.min(scrolls.length-1,Math.floor(rng()*scrolls.length))],qty:1});
 return rewards;
}

export const GAMEPLAY_DISCOVERIES=Object.freeze([
 {id:'courier-satchel',anchor:'poi-abandoned-caravan',name:'Weathered Courier’s Satchel',rewards:[['fieldRations',1],['ironScrap',2]],scrollChance:.18,clue:'poi-bandit-road-camp',journal:'The courier followed Roadless tracks. The abandoned road camp is worth investigating; its bowmen depend on nearby shields.'},
 {id:'roadless-supply-roll',anchor:'poi-bandit-road-camp',name:'Oilcloth Supply Roll',rewards:[['ironScrap',3],['sturdyHardwood',2]],guardRadius:250,scrollChance:.12,journal:'Tool-quality hardwood and salvaged iron: useful for strengthening equipment without replacing it.'},
 {id:'grave-mason-recess',anchor:'poi-grave-mound',name:'Grave-Mason’s Recess',rewards:[['paleEssence',1],['gravecap',2]],guardRadius:180,clue:'poi-old-hollow-den',journal:'The mason recorded a path toward the old blighted den. Burial remnants bear the sign of the Veil of the Blighted Star: seek its weapon, helm and talisman together.'},
 {id:'mire-blackiron-seam',anchor:'poi-mire-watchpost',name:'Blue-veined Blackiron',kind:'ore',itemId:'blackironOre',requiredLevel:10,respawnTime:1200},
 {id:'ritual-surveyor-case',anchor:'poi-red-seal-ritual',name:'Ritual Surveyor’s Case',rewards:[['arcaneDust',2],['oathsteelShard',1]],guardRadius:280,rare:true,journal:'Last Dawn records sketch the Ashen Executioner’s weapon, cuirass and greaves. Each carries the same insignia; their greater power awakens when the three are assembled.'}
]);
export function composeGameplayDiscoveries(world){
 const objects=world.objects||[];
 for(const spec of GAMEPLAY_DISCOVERIES){
  const id=`discovery-${spec.id}`;if(objects.some(o=>o.id===id))continue;
  const anchor=objects.find(o=>o.id===spec.anchor);if(!anchor)continue;
  let point=null;
  for(const [dx,dy] of [[2,2],[-2,2],[3,-1],[-3,-1],[0,3],[1,1],[-1,0]]){
   const x=anchor.x+dx*32,y=anchor.y+dy*32;
   if(isActorPositionPassable(world,x,y,13)&&hasLineOfSight(world,anchor.x,anchor.y,x,y)&&!objects.some(o=>o.interactable!==false&&o.kind!=='poiMarker'&&Math.hypot(o.x-x,o.y-y)<30)){point={x,y};break;}
  }
  if(!point)continue;
  const clue=objects.find(o=>o.id===spec.clue);
  objects.push({id,discoveryId:spec.id,kind:spec.kind||'worldCache',name:spec.name,...point,r:16,sourceRegionId:anchor.sourceRegionId,sourceWorldMode:'overworld',poiLootProfile:spec.anchor,rewards:spec.rewards?.map(r=>[...r]),rare:!!spec.rare,itemId:spec.itemId,requiredLevel:spec.requiredLevel,respawnTime:spec.respawnTime,xp:0,discoveryGuardRadius:spec.guardRadius||0,discoveryScrollChance:spec.scrollChance||0,
   discoveryJournal:spec.journal,discoveryClueId:clue?.id,discoveryClue:clue?`${clue.name||clue.id} lies ${clue.y<anchor.y?'north':'south'}${Math.abs(clue.x-anchor.x)>64?(clue.x<anchor.x?'west':'east'):''} of this site.`:null});
 }
}
export function prepareDiscoveryClaim(game,cache){
 if(!cache?.discoveryId)return true;
 const owner=(game.hostGame||game).player;owner.worldMemory ||= {};const claims=owner.worldMemory.discoveryClaims ||= {};
 if(claims[cache.id]||cache.claimed){game.log?.(cache.discoveryJournal||'These supplies have already been recovered.');return false;}
 if(cache.discoveryGuardRadius&&(game.world.enemies||[]).some(e=>e.hp>0&&!e.dead&&!e.remove&&Math.hypot(e.x-cache.x,e.y-cache.y)<cache.discoveryGuardRadius)){
  game.log?.('Nearby hostiles still guard this discovery.');return false;
 }
 // Roll a missing universal scroll once from the stable site identity. Reloading
 // or changing class cannot turn a claimed site into another reward roll.
 if(!cache.discoveryPrepared){
  cache.discoveryPrepared=true;const rng=encounterRng(cache.id),pool=['guardScroll','summonWolfScroll'].filter(id=>canDiscoverScroll(game.player,id,game.world));
  if(pool.length&&rng()<cache.discoveryScrollChance)cache.rewards.push([pool[Math.floor(rng()*pool.length)],1]);
 }
 return true;
}
export function rememberDiscoveryClaim(game,cache){
 if(!cache.discoveryId)return;
 const owner=(game.hostGame||game).player;owner.worldMemory ||= {};owner.worldMemory.discoveryClaims ||= {};owner.worldMemory.inscriptions ||= {};
 owner.worldMemory.discoveryClaims[cache.id]=true;
 if(cache.discoveryJournal){const text=[cache.discoveryJournal,cache.discoveryClue].filter(Boolean).join(' ');owner.worldMemory.inscriptions[cache.id]={text,targetId:cache.discoveryClueId||null};game.log?.(text);}
 if(game.player.classId==='gravecaller'&&cache.discoveryId==='grave-mason-recess')game.log?.('The mason’s fading funeral rite brushes your spectral senses.');
}

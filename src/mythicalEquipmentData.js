// Three pieces per set, using only the existing five player slots.
export const MYTHICAL_SETS = {
 drownedConvergence:{id:'drownedConvergence',name:'Drowned Convergence',theme:'Waverider · Water channels',pieces:['drownedConvergenceHelm','drownedConvergenceChest','drownedConvergenceTrinket'],bonuses:{1:{spirit:.5},2:{spirit:.5},3:{}},effects:{1:'Water skills cost 5% less Spirit.',2:'Water Torrent reaches 10% farther and covers a 25% wider arc.',3:'Water Torrent becomes a sweeping held torrent: 2.4× width, 30% lower damage per tick, 25% greater channel upkeep. Water beam morphs gain the same sweep.'}},
 beastSovereign:{id:'beastSovereign',name:'Beast Sovereign',theme:'Universal · Summon Wolf',pieces:['beastSovereignHelm','beastSovereignLegs','beastSovereignTrinket'],bonuses:{1:{summonHealth:.04},2:{summonHealth:.04},3:{}},effects:{1:'Summon Wolf costs 5% less Spirit; the wolf responds 10% faster.',2:'The wolf gains pale-gold fur and a wider bite with brief stagger.',3:'Your wolf becomes a Dire Wolf: larger, 35% sturdier, every third bite cleaves and draws threat. 15% slower attacks and movement; summoning costs 25% more.'}},
 ashenExecutioner:{id:'ashenExecutioner',name:'Ashen Executioner',theme:'Universal · Melee Light–Light–Heavy',pieces:['ashenExecutionerWeapon','ashenExecutionerChest','ashenExecutionerLegs'],bonuses:{1:{strength:.5},2:{strength:.5},3:{}},effects:{1:'Melee attacks cost 5% less Stamina.',2:'Heavy finishers gain 15° cleave and 0.06 seconds stagger.',3:'Light–Light–Heavy releases an ember cleave with an aftershock dealing 25% of the hit. 20% lower direct damage, 25% greater Stamina cost and 18% longer recovery.'}},
 blightedStar:{id:'blightedStar',name:'Veil of the Blighted Star',theme:'Eldritch / beam morphs · Channels',pieces:['blightedStarWeapon','blightedStarHelm','blightedStarTrinket'],bonuses:{1:{spirit:.5},2:{spirit:.5},3:{}},effects:{1:'Beam channels turn 10% faster and cost 5% less Spirit.',2:'Beam channels reach 15% farther and turn 10% faster again.',3:'Sustained beams branch to two nearby foes at 28% damage. Direct damage falls 22% and channel upkeep rises 20%. Existing class and morph requirements remain.'}},
 pilgrimVigil:{id:'pilgrimVigil',name:"Pilgrim's Vigil",theme:'Universal · Guard / protection',pieces:['pilgrimVigilChest','pilgrimVigilLegs','pilgrimVigilTrinket'],bonuses:{1:{armour:.5},2:{blockEfficiency:.06},3:{dodgeCostReduction:.08}},effects:{1:'A modest increase in protection.',2:'Guard blocks more efficiently.',3:'Guard raises a wider protective ward and lasts 25% longer. Costs 20% more Stamina; Dodge costs 8% less Stamina.'}}
};
const recipes={
 drownedConvergence:[['Helm','helm','armour',2],['Chest','chest','armour',3],['Trinket','trinket','trinket',0]],
 beastSovereign:[['Helm','helm','armour',2],['Legs','legs','armour',2],['Trinket','trinket','trinket',0]],
 ashenExecutioner:[['Weapon','weapon','weapon',0],['Chest','chest','armour',3],['Legs','legs','armour',2]],
 blightedStar:[['Weapon','weapon','weapon',0],['Helm','helm','armour',2],['Trinket','trinket','trinket',0]],
 pilgrimVigil:[['Chest','chest','armour',3],['Legs','legs','armour',2],['Trinket','trinket','trinket',0]]
};
const palettes={drownedConvergence:['#245366','#69c9d5'],beastSovereign:['#70543a','#edcf87'],ashenExecutioner:['#593a35','#f49b58'],blightedStar:['#4b325e','#c395e5'],pilgrimVigil:['#606658','#dfd3a1']};
export const MYTHICAL_ITEMS=Object.fromEntries(Object.entries(recipes).flatMap(([setId,pieces])=>pieces.map(([suffix,slot,type,armour])=>{
 const set=MYTHICAL_SETS[setId],id=setId+suffix;
 const weaponType=setId==='ashenExecutioner'?'sword':'staff';
 return [id,{id,name:`${set.name} ${suffix==='Weapon'?(weaponType==='sword'?'Blade':'Staff'):suffix==='Trinket'?'Seal':suffix==='Legs'?'Greaves':suffix==='Chest'?'Vestment':'Crown'}`,type,slot,rarity:'mythic',stack:false,value:220,setId,armour,traits:['Mythical',set.name],visualPalette:{base:palettes[setId][0],accent:palettes[setId][1]},visualSilhouette:slot==='chest'?(setId==='pilgrimVigil'?'plate':setId==='ashenExecutioner'?'leather':'robe'):undefined,...(type==='weapon'?{weaponType,baseDamage:7,power:2,skill:weaponType==='sword'?'blade':'spirit',primarySkill:weaponType==='sword'?'blade':'spirit',primaryMultiplier:2,secondaryMultiplier:0}:type==='trinket'?{spirit:1}:{}),desc:`One of three pieces of ${set.name}. Tier 1 when acquired. ${set.theme}. Its bonuses modify existing skills; they do not teach another class's skills.`}];
})));
export function getMythicalVisualStyle(profile){
 if(!profile?.mythical)return null;
 return {...profile,cloth:profile.base,helm:'crest',mid:profile.accent,light:'#fff0dc',emblem:profile.itemId.startsWith('drowned')?'eye':profile.itemId.startsWith('beast')?'bone':profile.itemId.startsWith('ashen')?'flame':profile.itemId.startsWith('blighted')?'bars':'sun'};
}

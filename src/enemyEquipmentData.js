import {FACTION_STYLES} from './enemyVisualProfiles.js';
// All sets use the game's existing five equipment slots. Common, wearable gear,
// never the story/legendary items carried by the old enemy initializer.
export const ENEMY_EQUIPMENT_ITEMS={};
export const ENEMY_OUTFIT_SETS={};
for(const [faction,style] of Object.entries(FACTION_STYLES)){
 const prefix=`enemy${faction[0].toUpperCase()+faction.slice(1)}`;
 const set={};
 const definitions=[
  ['helm','Helm',{armour:1}],['chest',style.silhouette==='robe'?'Ritual Robe':style.silhouette==='plate'?'Tabard Armour':'Patched Leathers',{armour:3}],
  ['legs',style.silhouette==='plate'?'Steel Greaves':'Travel Legwraps',{armour:2}],['trinket','Cloak and Insignia',{armour:1}],
  ['weapon','Sword',{baseDamage:4,weaponType:'sword'}],['bow','Bow',{baseDamage:4,weaponType:'bow'}],['staff','Ritual Staff',{baseDamage:3,weaponType:'staff'}],['dagger','Knife',{baseDamage:3,weaponType:'dagger'}],
  ['guard','Sentinel Shield',{armour:2}],['robe','Ceremonial Robe',{armour:2}],['scoutHelm','Scout Hood',{armour:1}],['scoutChest','Scout Leathers',{armour:2}]
 ];
 for(const [part,label,stats] of definitions){
  const id=`${prefix}${part[0].toUpperCase()+part.slice(1)}`,slot=['bow','staff','dagger'].includes(part)?'weapon':part==='guard'?'trinket':part==='robe'||part==='scoutChest'?'chest':part==='scoutHelm'?'helm':part;
  const silhouette=part==='robe'?'robe':part==='scoutChest'?'leather':part==='scoutHelm'?'hood':slot==='chest'?style.silhouette:slot==='helm'?(['mask','hood','ritual'].includes(style.helm)?'hood':'helm'):slot==='legs'?(style.silhouette==='plate'?'plate':'leather'):undefined;
  ENEMY_EQUIPMENT_ITEMS[id]={id,name:`${style.name} ${label}`,slot,type:slot==='weapon'?'weapon':slot==='trinket'?'trinket':'armour',rarity:'uncommon',stack:false,value:slot==='weapon'?28:18,...stats,
   ...(slot==='weapon'?{skill:stats.weaponType==='bow'?'archery':stats.weaponType==='staff'?'spirit':'blade',primarySkill:stats.weaponType==='bow'?'archery':stats.weaponType==='staff'?'spirit':'blade',primaryMultiplier:1.2,power:1}:{}),
   desc:`Weathered ${style.name} equipment recovered from its wearer.`,enemyCollectible:true,visualFactionId:faction,visualPart:part,visualSilhouette:silhouette};
  set[part]=id;
 }
 ENEMY_OUTFIT_SETS[faction]=Object.freeze(set);
}
export function enemyOutfitFor(profile){
 const set=ENEMY_OUTFIT_SETS[profile.faction]||ENEMY_OUTFIT_SETS.roadless;
 const caster=profile.role==='caster';
 return {helm:profile.role==='archer'||(profile.role==='melee'&&profile.variant===1)?set.scoutHelm:set.helm,chest:caster?set.robe:profile.role==='archer'?set.scoutChest:set.chest,legs:set.legs,trinket:profile.role==='knight'?set.guard:set.trinket,
  weapon:profile.role==='archer'?set.bow:caster?set.staff:profile.faction==='roadless'?set.dagger:set.weapon};
}

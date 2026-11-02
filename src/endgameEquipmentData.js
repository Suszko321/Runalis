import {LEGENDARY_WEAPON_ITEMS} from './legendaryWeaponData.js';
// Endgame ensembles use the existing slots, rarity system and set-bonus owners.
const definitions=[
 ['starweaver','Starweaver','mage','legendary','#252b58','#c9b3ec','Midnight indigo silk, silver lunar filigree and lilac crystals; tall split arcane hood, layered star-embroidered cuirass vest, silver-bound fitted boots, broad crescent-edged indigo mantle.'],
 ['astralHierophant','Astral Hierophant','mage','mythic','#e2d8bd','#aa87da','Ivory and violet ceremonial silk with antique gold and amethyst; swept forked high-collar hood, geometric astral breast embroidery, ivory rune greaves, majestic split violet mantle with gold celestial wheel.'],
 ['firstFirmament','First Firmament','mage','primordial','#20222e','#64d3dc','Obsidian and platinum astral regalia, turquoise crystal facets and deep violet lining; imposing angular crystal hood-diadem, intricate platinum lattice cuirass, obsidian rune greaves, long layered black mantle with turquoise constellation inlay.'],
 ['sunwardRegent','Sunward Regent','knight','legendary','#334b77','#d6b775','Royal cobalt steel, silver and antique gold lion heraldry; wing-crested open-eye knight helm, deeply layered gilded breastplate, heavy fitted cobalt steel greaves, broad cobalt mantle with lion-sun heraldry and gold hem.'],
 ['eclipseImperator','Eclipse Imperator','knight','mythic','#292934','#c6ae74','Blackened silver steel, ivory, antique gold and small deep ruby gems; swept solar-blade helmet crest, ornate articulated eclipse breastplate, layered black steel greaves, royal ivory-lined charcoal mantle with a divided gold sun.'],
 ['worldAnvil','World-Anvil','knight','primordial','#302c31','#d18b53','Ancient basalt plate, dark bronze, restrained magma-red crystal seams; huge-looking but compact jagged anvil-crested helm, monumental engraved basalt cuirass, volcanic bronze greaves, heavy black-and-russet mantle with an ancient bronze anvil emblem.'],
 ['moonstagWarden','Moonstag Warden','archer','legendary','#31493e','#c4c1a0','Deep emerald leather, slate cloth, silver and pale antler fittings; sharply tailored antler-pinned hood, layered leaf-scale fitted leather cuirass, silver-bound forest greaves, sweeping forest mantle with stag and moon clasp.'],
 ['celestialHunt','Celestial Hunt','archer','mythic','#708b8c','#dbcd9c','Pale teal and silver leather with ivory feather scales, restrained gold; hawk-crested ivory scout hood, delicate overlapping feather-scale cuirass, fitted silver-teal greaves, magnificent pale teal feather-edged mantle with celestial hawk insignia.'],
 ['lastHorizon','Last Horizon','archer','primordial','#282a31','#dbad63','Midnight dragonhide, dark silver and luminous-looking flat amber crystal insets; wind-swept dragonfeather hood crest, elegant angular black scale cuirass, narrow dark dragonhide greaves, long dramatically split black mantle with amber horizon embroidery.'],
 ['runeboundMarshal','Runebound Marshal','battlemage','legendary','#573641','#bca075','Burgundy silk, gunmetal plate, copper edging and small blue rune gems; arcane-visored crested war hood, layered plated spellcoat torso, copper-banded dark greaves, broad burgundy military mantle with blue rune seal.'],
 ['aetherCrusader','Aether Crusader','battlemage','mythic','#b9c6c4','#6db9d2','Pearl steel, cobalt silk, antique gold and cyan gemstones; ornate swept arcane knight visor, gold-latticed pearl breastplate, fitted pearl-and-cobalt greaves, cobalt and ivory mantle with gold geometric spell circles.'],
 ['stormSovereign','Storm Sovereign','battlemage','primordial','#283740','#9bcbd8','Blackened silver, deep storm teal, platinum and small violet crystals; jagged thunder-crystal war helm, ornate dark silver spellplate cuirass, layered storm-steel greaves, immense-looking but fitted deep teal mantle with platinum lightning filigree.']
];
const tiers={legendary:{level:50,scale:1},mythic:{level:65,scale:1.3},primordial:{level:80,scale:1.6}};
const armour={mage:[3,7,5,1],knight:[6,13,9,3],archer:[4,9,6,2],battlemage:[5,10,7,2]};
const spirit={mage:[4,7,4,7],knight:[0,1,0,2],archer:[1,2,1,4],battlemage:[3,5,3,5]};
const pieceLabels={mage:['Diadem','Vestments','Runeboots','Mantle'],knight:['Greathelm','Cuirass','Greaves','Mantle'],archer:['Hood','Brigandine','Striders','Mantle'],battlemage:['Warhelm','Spellplate','Greaves','Mantle']};
export const ENDGAME_ENSEMBLES={};
export const ENDGAME_ITEMS={};
export const ENDGAME_WEARABLE_ART={};
for(const[id,name,role,rarity,base,accent,artDirection]of definitions){
 const {level,scale}=tiers[rarity],scaled=n=>Math.round(n*scale*100)/100;
 const bonuses=role==='mage'?{2:{spirit:scaled(4)},3:{bossDamage:scaled(.04)},4:{spirit:scaled(6)}}
  :role==='knight'?{2:{armour:scaled(4)},3:{blockEfficiency:scaled(.08)},4:{bossDamage:scaled(.05)}}
  :role==='archer'?{2:{dodgeCostReduction:scaled(.06)},3:{bossDamage:scaled(.05)},4:{armour:scaled(4)}}
  :{2:{spirit:scaled(3)},3:{blockEfficiency:scaled(.05)},4:{bossDamage:scaled(.06)}};
 const pieces=['Helm','Chest','Legs','Mantle'].map(s=>id+s),sheet='endgame-'+id.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
 ENDGAME_ENSEMBLES[id]={id,name,role,rarity,minCombatLevel:level,theme:`${role[0].toUpperCase()+role.slice(1)} · Endgame`,pieces,bonuses,artDirection,sheet};
 for(const[row,suffix]of ['Helm','Chest','Legs','Mantle'].entries()){
  const itemId=id+suffix,slot=['helm','chest','legs','trinket'][row];
  ENDGAME_ITEMS[itemId]={id:itemId,name:`${name} ${pieceLabels[role][row]}`,type:row===3?'trinket':'armour',slot,rarity,stack:false,value:Math.round((500+row*70)*scale),armour:scaled(armour[role][row]),spirit:scaled(spirit[role][row]),setId:id,
   endgameExclusive:true,allowedGearRarities:[rarity],minCombatLevel:level,dropMinEnemyLevel:level,noRandomDrop:true,visualPalette:{base,accent},visualSilhouette:row===0?'helm':row===1?(role==='mage'?'robe':role==='archer'?'leather':'plate'):undefined,
   traits:['Endgame',role[0].toUpperCase()+role.slice(1),'Elite / Boss Loot'],desc:`${name} ${pieceLabels[role][row].toLowerCase()}. Combat Level ${level}. Drops from level ${level}+ elites and bosses; exists only at ${rarity==='mythic'?'Mythical':rarity[0].toUpperCase()+rarity.slice(1)} quality. Four-piece ensemble; any class may equip it.`};
  ENDGAME_WEARABLE_ART[itemId]={sheet,row,rows:4,bodies:2,part:row,color:base,iconColumns:4,
   ...(row===0?{rects:[[17,4,30,28],[18,5,28,27]],headOffset:-5,...(['mage','archer'].includes(role)?{neckStyle:'cowl'}:{})}:{}),
   ...(row===3?{kind:'cloak',accessoryRect:[12,12,40,54],anchorY:-31}: {})};
 }
}
export const ENDGAME_LOOT_SHARE=.6;
export function isEndgameLootSource(enemy){
 return !!enemy&&!enemy.rewardSuppressed&&!enemy.summonedBy&&!enemy.summonedByBoss&&!!(enemy.isBoss||enemy.worldBoss||enemy.bossType||enemy.roomRole==='miniBoss'||enemy.elite||enemy.isElite||enemy.eliteModifier||enemy.namedExteriorElite||enemy.miniBoss||['rare','champion','elite'].includes(enemy.encounterTier));
}
export function endgameLootPool(rarity,level,enemy){
 const enemyLevel=Number(enemy?.combatLevel??enemy?.level??0);
 return isEndgameLootSource(enemy)?[...Object.values(ENDGAME_ITEMS),...Object.values(LEGENDARY_WEAPON_ITEMS)].filter(i=>i.rarity===rarity&&level>=i.minCombatLevel&&enemyLevel>=i.dropMinEnemyLevel):[];
}

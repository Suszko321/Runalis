// questMaterialSources.js
// Player-facing acquisition guidance for materials used by quest objectives.

export const QUEST_MATERIAL_SOURCES = Object.freeze({
  emberleaf: 'Forage Emberleaf patches around Orrakai Outpost, the Blighted Road, and Ashen Orchard.',
  ironOre: 'Mine iron ore veins around Orrakai, Chapel Road, and the Iron Mire.',
  gravecap: 'Forage Gravecap patches around gravefields, ruined roads, and the Broken Chapel.',
  riverReed: 'Forage reed patches along rivers, lakes, and Saltwell Camp.',
  silverfin: 'Catch Silverfin at fishing spots; a Fishing Rod and Tackle improve the rare-fish chance.',
  boneShard: 'Mine bone piles or defeat beasts, Gravebound, and other undead enemies.',
  paleEssence: 'Harvest runestones or defeat Blighted Corpses, cultists, Grave Priests, and wraiths.',
  ironScrap: 'Mine with a pickaxe, salvage equipment, defeat armored enemies, or buy it at the market.',
  fieldRations: 'Buy them at the market, craft them from fish and River Reed, or loot Roadless bandits and supply caches.',
  shrineTonic: 'Buy it at the market, craft it from Gravecap and Pale Essence, or defeat Grave Priests.',
  briarRoot: 'Forage with a Hand Scythe, defeat the Blighted Elk, or search Mirror Grove offerings.',
  redSealFragment: 'Defeat Last Dawn militants around Last Dawn Keep or search their war cache.',
  bossCore: 'Defeat bosses, powerful brutes, or clear high-risk caches and deep side zones.',
  graveAsh: 'Defeat Grave Priests, salvage grave-themed equipment, or clear graveyard side zones.',
  lightstormWard: 'Runecraft one from frontier materials or search the guarded Watcher Ridge Tower cache.',
  paleRune: 'Runecraft one from Pale Essence and Bone Shards or search the Watcher Ridge Tower cache.',
  lanternMoss: 'Forage glowing moss patches in marshes, ruins, and shadowed roads.',
  veyrSigil: 'Defeat wraiths and Veyr Wraiths around Castle Veyreign and Watcher Ridge.',
  hollowEye: 'Defeat Blighted Corpses along the Blighted Road and in corrupted frontier areas.',
  crackedRelic: 'Defeat Blighted Corpses or wraiths, search ruins and crypts, or earn one from frontier quests.'
});

export function getQuestMaterialSourceHint(itemId) {
  return QUEST_MATERIAL_SOURCES[itemId] ||
    'Explore gathering nodes, enemy drops, markets, caches, and crafting recipes in the current region.';
}

export function hasSpecificQuestMaterialSourceHint(itemId) {
  return Boolean(QUEST_MATERIAL_SOURCES[itemId]);
}

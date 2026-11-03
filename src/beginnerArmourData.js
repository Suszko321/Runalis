// Plain Common equipment sold as individual pieces in Orrakai.
export const BEGINNER_ARMOUR_ITEMS = {
  apprenticeRobe: {
    id:'apprenticeRobe', name:'Apprentice Robe', slot:'chest', armourWeight:'light',
    armour:1, spirit:1, value:8, visualSilhouette:'robe',
    desc:'A plain woven robe for an apprentice spellcaster.'
  },
  reinforcedLeatherCap: {
    id:'reinforcedLeatherCap', name:'Reinforced Leather Cap', slot:'helm', armourWeight:'medium',
    armour:1, value:6, visualSilhouette:'hood',
    desc:'Stiff leather with a second layer over the brow.'
  },
  reinforcedLeatherLeggings: {
    id:'reinforcedLeatherLeggings', name:'Reinforced Leather Leggings', slot:'legs', armourWeight:'medium',
    armour:2, value:8,
    desc:'Plain road leathers reinforced at the knees.'
  },
  rivetedIronCuirass: {
    id:'rivetedIronCuirass', name:'Riveted Iron Cuirass', slot:'chest', armourWeight:'heavy',
    armour:3, value:12, visualSilhouette:'plate',
    desc:'Unadorned iron plates riveted over a padded backing.'
  },
  rivetedIronGreaves: {
    id:'rivetedIronGreaves', name:'Riveted Iron Greaves', slot:'legs', armourWeight:'heavy',
    armour:2, value:8,
    desc:'Simple iron shin plates held on by leather straps.'
  }
};

for (const item of Object.values(BEGINNER_ARMOUR_ITEMS)) {
  Object.assign(item,{type:'armour',rarity:'common',stack:false,noRandomDrop:true});
}

export const ORRAKAI_BEGINNER_ARMOUR_STOCK = {
  alchemist: [['clothHood',4],['apprenticeRobe',8],['roughLegwraps',6]],
  blacksmith: [
    ['reinforcedLeatherCap',5],['patchedRoadLeathers',10],['reinforcedLeatherLeggings',7],
    ['scavengedIronHelm',6],['rivetedIronCuirass',12],['rivetedIronGreaves',8]
  ]
};

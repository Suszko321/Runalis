// Optional four-step passive branches. Existing purchases and prerequisite
// paths remain valid; every effect uses an existing gameplay bonus.
const disciplines = {
  blade: [
    ['Steadfast Heart', {maxHpPct:3}], ['Shield Conditioning', {blockCostReductionPct:4}],
    ['Tempered Plate', {armour:3}], ['Vanguard Resolve', {maxStamina:8, power:2}]
  ],
  archery: [
    ['Trail Endurance', {maxStamina:6}], ['Quiet Footwork', {moveSpeedPct:2}],
    ['Keen Observation', {critChancePct:2}], ['Prepared Ambush', {exposedDamagePct:6, trapDamagePct:4}]
  ],
  spirit: [
    ['Grave Reservoir', {maxSpirit:6}], ['Bone Reinforcement', {summonHealthPct:5}],
    ['Patient Harvest', {necroticDamagePct:4}], ['Deathless Retinue', {summonDamagePct:5, maxHpPct:3}]
  ],
  warding: [
    ['Deep Roots', {maxHpPct:3}], ['Barkskin', {armour:2}],
    ['Nurturing Sap', {healingPower:3}], ['Wild Communion', {natureDamagePct:4, summonHealthPct:5}]
  ],
  hydromancy: [
    ['Stillwater Reserve', {maxSpirit:6}], ['Supple Current', {dodgeCostReductionPct:4}],
    ['Restorative Flow', {healingPower:3}], ['Ocean Memory', {waterDamagePct:5, maxSpirit:4}]
  ],
  lightbringer: [
    ['Inner Lantern', {maxSpirit:6}], ['Patient Radiance', {lumenGenerationPct:4}],
    ['Prismatic Skin', {armour:3}], ['Dawnward Soul', {holyDamagePct:4, lightbringerShieldPct:4}]
  ],
  eldritch: [
    ['Blighted Vessel', {maxSpirit:6}], ['Unbroken Nerve', {maxHpPct:3}],
    ['Fractured Insight', {spiritDamagePct:4}], ['Beyond the Veil', {bossDamagePct:5, maxSpirit:4}]
  ],
  cambion: [
    ['Emberblood', {maxHpPct:3}], ['Ashen Hide', {armour:2}],
    ['Banked Fire', {fireDamagePct:4}], ['Unyielding Cinder', {maxStamina:8, woundedDamagePct:4}]
  ],
  nephilim: [
    ['Mortal Resolve', {maxHpPct:3}], ['Quiet Grace', {healingPower:2}],
    ['Dawn Mantle', {armour:3}], ['Unfading Light', {holyDamagePct:4, maxSpirit:4}]
  ],
  vampire: [
    ['Night Reserves', {maxStamina:6}], ['Silent Pursuit', {moveSpeedPct:2}],
    ['Sanguine Memory', {lifestealPct:1}], ['Ancient Appetite', {woundedDamagePct:5, maxHpPct:3}]
  ],
  blunt: [
    ['Forged Endurance', {maxStamina:6}], ['Weighted Grip', {power:2}],
    ['Unyielding Guard', {blockCostReductionPct:4}], ['Crushing Finish', {critDamagePct:5,woundedDamagePct:4}]
  ],
  sword: [
    ['Balanced Grip', {maxStamina:6}], ['Edge Alignment', {power:2}],
    ['Parrying Habit', {blockCostReductionPct:4}], ['Finishing Instinct', {critDamagePct:5, woundedDamagePct:4}]
  ],
  bow: [
    ['Steady Breathing', {maxStamina:6}], ['Light Draw', {attackSpeedPct:2}],
    ['Rangefinder', {critChancePct:2}], ['True Flight', {critDamagePct:5, power:2}]
  ],
  staff: [
    ['Seasoned Grain', {maxSpirit:6}], ['Grounded Stance', {armour:2}],
    ['Channel Discipline', {natureDamagePct:4}], ['Living Conductor', {healingPower:3, maxSpirit:4}]
  ],
  scythe: [
    ['Counterweight', {maxStamina:6}], ['Honed Crescent', {power:2}],
    ['Reaping Momentum', {staggerPowerPct:4}], ['Harvest Memory', {necroticDamagePct:4, lifestealPct:1}]
  ],
  spiritFocus: [
    ['Attuned Core', {maxSpirit:6}], ['Frugal Spark', {focusBoltCostReductionPct:4}],
    ['Clear Facets', {focusBoltSpeedPct:5}], ['Resonant Heart', {focusBoltDamagePct:5, focusStaggerPct:4}]
  ],
  eldritchWeapon: [
    ['Insulated Mind', {maxSpirit:6}], ['Red Tempering', {armour:2}],
    ['Patient Rupture', {spiritDamagePct:4}], ['Enduring Circuit', {eliteDamagePct:5, maxSpirit:4}]
  ]
};

export function createDisciplinePassives(describeBonuses) {
  const nodes = {};
  for (const [tree, entries] of Object.entries(disciplines)) {
    entries.forEach(([name, bonuses], index) => {
      const id = `${tree}_foundation_${index + 1}`;
      nodes[id] = {id, tree, name, bonuses, role:'Foundations', foundationTier:index + 1,
        cost:index < 2 ? 1 : 2, requires:[index ? `${tree}_foundation_${index}` : `${tree}_root`],
        desc:`${describeBonuses(bonuses).join('. ')}. A permanent passive benefit while this discipline is available.`};
    });
  }
  return nodes;
}

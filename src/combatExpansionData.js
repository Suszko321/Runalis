// Technique data only. Class identity remains in classData.js; execution lives
// in combatExpansion.js and presentation stays in combatVisualsRenderer.js.
const technique = (classId, skill, tree, id, name, role, cost, cd, damage, range, desc, extra = {}) => ({
  id, name, classId, skill, tree, role, cost, cd, damage, range, desc,
  costType: ['oathkeeper', 'fellhunter'].includes(classId) ? 'stamina' : 'spirit',
  unlockLevel: 1, noChargeUpgrade: true, damageMultiplier: damage ? 0.65 : 0,
  animationFamily: role === 'mobility' ? 'mobility' : role === 'channel' ? 'channel' : 'cast',
  ...extra,
  ...(extra.channelProfile ? {
    cd:0, costType:'spirit', cost:Math.ceil(extra.channelProfile.costPerSecond / 4), noUseCharges:true
  } : {})
});
const channel = (movementMode, costPerSecond, extra = {}) => ({
  mode: 'hold', movementMode, movementMultiplier: movementMode === 'slowed' ? 0.18 : 0,
  duration: 12, tickInterval: 0.3, turnRate: 3, costPerSecond:costPerSecond * 3, ...extra
});
export const COMBAT_EXPANSION_ABILITIES = [
  technique('oathkeeper','blunt','blade','oathkeeperVowchain','Vowchain','control',15,6,9,280,'Cast an oath-chain. Pull lesser foes inward; against a massive foe, advance to the anchor.',{effectProfile:'chain'}),
  technique('oathkeeper','blunt','blade','oathkeeperLitanyOfIron','Litany of Iron','channel',8,9,4,110,'Hold a planted stance. Frontal hits are reduced by 55%; pressure builds Conviction and retaliation.',{channelProfile:channel('locked',7),effectProfile:'litany'}),
  technique('oathkeeper','blunt','blade','oathkeeperDebtOfBlood','Debt of Blood','defence',14,11,10,125,'Store part of suffered damage for five seconds, then release a close Judgment shockwave.',{effectProfile:'debt'}),
  technique('oathkeeper','blunt','blade','oathkeeperMandate','Mandate','control',10,7,0,240,'Condemn a foe for eight seconds. Three melee blows trigger a judgment strike.',{effectProfile:'mandate'}),
  technique('oathkeeper','blunt','blade','oathkeeperHallowedBlades','Hallowed Blades','damage',24,18,14,240,'Conjure three floating oath-swords for eight seconds. They wind up, strike nearby visible enemies one at a time, then return. Walls block their attacks; casting again replaces the formation.',{effectProfile:'oathBlades',oathBlades:true,oathBladeFamily:'base',costType:'spirit',damageMultiplier:.56,duration:8,element:'holy',animationFamily:'ritual',noUseCharges:true,canCharge:false}),
  technique('fellhunter','archery','archery','fellhunterHuntersLine',"Hunter’s Line",'control',12,6,8,330,'Tether a foe for four seconds. Separation drags light foes or advances you toward heavy anchors and exposes the target.',{effectProfile:'tether'}),
  technique('fellhunter','archery','archery','fellhunterRicochetBlade','Ricochet Blade','damage',13,4,13,340,'A heavy steel blade rebounds between three nearby foes, punishing Exposed targets.',{effectProfile:'ricochet',animationFamily:'throw'}),
  technique('fellhunter','archery','archery','fellhunterDeadfall','Deadfall','area',19,10,25,250,'Arm a mechanical deadfall after a short delay. A nearby hostile triggers a crushing, staggering impact.',{effectProfile:'deadfall',animationFamily:'throw'}),
  technique('fellhunter','archery','archery','fellhunterExecutionWindow','Execution Window','support',12,12,0,0,'For six seconds, weapon kills against Exposed or wounded foes partially recharge your oldest gadget, up to three times.',{effectProfile:'execution'}),
  technique('fellhunter','archery','archery','fellhunterVaultingShot','Vaulting Shot','mobility',17,7,10,100,'Vault backward from your aim while firing a steel shot at the threat. Terrain stops the vault.',{effectProfile:'vault',mobilityProfile:{distance:105,backward:true}}),
  technique('gravecaller','spirit','spirit','gravecallerMurmuringHost','Murmuring Host','channel',5,5,6,340,'Hold to gather a spectral congregation. Bound spirits seek foes in your aimed region. Kills briefly swell the Host.',{channelProfile:channel('slowed',6),effectProfile:'host'}),
  technique('gravecaller','spirit','spirit','gravecallerFuneralUrn','Funeral Urn','swarm',17,7,8,275,'Throw a funerary vessel. After it shatters, four bound grave wisps seek nearby foes for three seconds.',{effectProfile:'urn',animationFamily:'throw'}),
  technique('gravecaller','spirit','spirit','gravecallerGhostwalk','Ghostwalk','mobility',13,6,0,160,'Glide through enemy bodies, leaving a spectral wake. Crossed enemies are Haunted and take stronger spirit hits.',{effectProfile:'ghostwalk',mobilityProfile:{distance:160}}),
  technique('gravecaller','spirit','spirit','gravecallerDeathEcho','Death Echo','summon',12,8,0,310,'Mark a living foe. If it dies within eight seconds, its temporary echo attacks former allies.',{effectProfile:'echo'}),
  technique('thornbinder','warding','warding','thornbinderBriarstride','Briarstride','mobility',14,7,5,145,'An erupting root line carries you forward. Short thorn growths remain at both ends.',{effectProfile:'briarstride',mobilityProfile:{distance:145}}),
  technique('thornbinder','warding','warding','thornbinderSeedReliquary','Seed Reliquary','swarm',16,7,7,250,'Throw a seed pod that splits into four short-lived biting growths. Each bite opens a Verdant Wound.',{effectProfile:'seed',animationFamily:'throw'}),
  technique('thornbinder','warding','warding','thornbinderThornstorm','Thornstorm','channel',6,7,7,290,'Hold a rooted stance to erupt thorn volleys along your aim and slow nearby enemies.',{channelProfile:channel('locked',7),effectProfile:'thornstorm'}),
  technique('thornbinder','warding','warding','thornbinderCorpsebloom','Corpsebloom','summon',14,8,0,285,'Plant a death seed in a foe. Its death grows a temporary carnivorous flower that bites nearby enemies.',{effectProfile:'bloom'}),
  technique('waverider','warding','hydromancy','waveriderMaelstrom','Maelstrom','channel',8,8,6,205,'Hold a broad, slow-moving whirlpool around you. Flow widens its reach; it pulls and Soaks enemies inside. Release or dodge to stop.',{channelProfile:channel('slowed',7),effectProfile:'maelstrom'}),
  technique('waverider','warding','hydromancy','waveriderUndertow','Undertow','control',15,7,4,300,'Lay a moving ground current for four seconds. It draws nearby foes toward its narrow path and applies Soaked.',{effectProfile:'undertow'}),
  technique('waverider','warding','hydromancy','waveriderPressureSpear','Pressure Spear','damage',13,3,17,520,'Drive a narrow, piercing jet through aligned enemies. Soaked targets take additional pressure damage.',{effectProfile:'pressure',canCharge:true,maxChargeTime:1.4,damageMultiplierByCharge:[1,1.25,1.55],radiusMultiplierByCharge:[1,1.08,1.18],chargeCostMultiplier:[1,1.15,1.3],noChargeUpgrade:true}),
  technique('waverider','warding','hydromancy','waveriderTideMirror','Tide Mirror','defence',16,10,0,100,'A six-second water curtain mitigates ranged pressure, then retaliates with a small water jet.',{effectProfile:'mirror'}),
  technique('lightbringer','spirit','lightbringer','lightbringerDawnstep','Dawnstep','mobility',13,7,4,170,'Surge along a clear radiant path. Crossed enemies receive Halo Brand; solid geometry stops the surge.',{effectProfile:'dawnstep',mobilityProfile:{distance:170}}),
  technique('lightbringer','spirit','lightbringer','lightbringerOrbitalHalo','Orbital Halo','area',18,10,6,105,'Radiant fragments orbit for six seconds and strike close foes. Activating Dawncarver consumes them for a wider beam.',{effectProfile:'halo'}),
  technique('lightbringer','spirit','lightbringer','lightbringerPillarOfRevelation','Pillar of Revelation','area',23,10,27,340,'Telegraph a location, then strike it with a towering shaft of radiance. Branded foes suffer stronger judgment.',{effectProfile:'pillar'}),
  technique('lightbringer','spirit','lightbringer','lightbringerOverexposure','Overexposure','control',12,8,0,360,'Curse a foe for eight seconds. Four radiant ability hits detonate accumulated stress.',{effectProfile:'overexposure'}),
  technique('eldritch','spirit','eldritch','eldritchCrimsonConduit','Crimson Conduit','channel',6,6,8,350,'Hold a slow red-black conduit. Sustained contact branches lightning to nearby foes; each second also costs one health.',{channelProfile:channel('slowed',6,{healthPerSecond:1}),effectProfile:'conduit'}),
  technique('eldritch','spirit','eldritch','eldritchFractureStep','Fracture Step','mobility',16,8,11,115,'Displace a short distance along passable ground. The abandoned tear ruptures after a delay.',{effectProfile:'fracture',mobilityProfile:{distance:115}}),
  technique('eldritch','spirit','eldritch','eldritchImpossibleAngle','Impossible Angle','area',19,9,9,270,'Connect two unstable rifts for five seconds. The angular line damages enemies crossing it.',{effectProfile:'angle'}),
  technique('eldritch','spirit','eldritch','eldritchStarlessOrbit','Starless Orbit','area',18,10,7,120,'Black fragments orbit for six seconds and fire into nearby threats. Positioning determines their reach.',{effectProfile:'orbit'})
];

export const CLASS_COMBAT_PALETTES = Object.freeze({
  oathkeeper:['#ead49a','#fff3cd','#786b55'], fellhunter:['#b59a73','#ddd7c5','#6f5844'],
  gravecaller:['#a7bddb','#e0e5ee','#5c537d'], thornbinder:['#79a35e','#d7a2a8','#385632'],
  waverider:['#66bdd2','#d5f1ec','#29697c'], lightbringer:['#e8d491','#fffbe0','#a58751'],
  eldritch:['#b34351','#ea8790','#271b31']
});

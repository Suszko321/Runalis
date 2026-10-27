const skill=(mode,cost,cd,range,ratio,desc,extra={})=>({mode,cost,cd,range,ratio,desc,...extra});
export const HELLSTALKER_SKILLS=Object.freeze({
 fellhunterPracticalStrike:skill('bolt',3,.8,500,.42,'Conjure a fast hellfire bolt. A damaging hit restores 6 Spirit, funding your larger conjurations. Spaced impacts build three Embers, making the short Infernal Brand tick harder.',{name:'Hellfire Bolt',maxHits:1}),
 fellhunterThrowingDaggers:skill('pierce',8,1.4,480,.52,'Hurl a black-cored cinder lance through three aligned enemies. A fast ignition tool for a ranged demonic caster.',{name:'Cinder Lance',maxHits:3}),
 fellhunterBearTrap:skill('trap',13,8,210,.65,'Inscribe a demonic seal. After arming, it erupts beneath approaching enemies, briefly binding lesser foes and igniting them.',{name:'Infernal Seal',radius:85,duration:8,secondary:'bind'}),
 fellhunterCaltrops:skill('field',14,9,230,.14,'Open a five-second ash fissure. Pulses slow and ignite enemies; their burn expires quickly once they escape the source.',{name:'Ashen Wake',radius:110,duration:5,secondary:'slow'}),
 fellhunterBombToss:skill('burst',18,9,260,.72,'After a brief ground warning, rupture the earth with brimstone. Three prepared Embers trigger Flashover and an additional nearby burst.',{name:'Brimstone Rupture',radius:115,flashover:true,delay:.35}),
 fellhunterGrapplingHook:skill('dash',12,6,185,.45,'Rush through passable ground on a demonic rift. Scorch crossed enemies and leave a short ash fissure at your departure.',{name:'Rift Rush',distance:185,radius:70,duration:3,secondary:'field'}),
 fellhunterFlamingArrowVolley:skill('pierce',20,10,520,.28,'Conjure five piercing hellfire bolts in a broad fan. One shared Ember cadence prevents simultaneous bolts from instantly filling the brand.',{name:'Infernal Barrage',maxHits:5,projectileSpeed:820,volley:5}),
 fellhunterSmokeBomb:skill('retreat',15,9,150,.35,'Fold backward into a veil of black cinders. A short slowing fissure ignites pursuers; walls stop the escape.',{name:'Cinder Veil',distance:150,radius:105,duration:3,secondary:'field'}),
 fellhunterMarkedShot:skill('bolt',13,5,580,.72,'Cast a focused orb of damnation. Three prepared Embers trigger Flashover; the reset brand still delivers its brief, violent burn.',{name:'Brand of Damnation',maxHits:1,flashover:true,projectileSpeed:860}),
 fellhunterKillZone:skill('field',27,17,260,.18,'Open a seven-second gate of cinders. Demonic fissures repeatedly ignite enemies inside. Once the source stops touching them, their fire burns out in 1.8 seconds.',{name:'Gate of Cinders',radius:165,duration:7}),
 fellhunterHuntersLine:skill('pierce',12,7,390,.55,'Lash a spectral hellchain through a line of foes. Pull lighter enemies inward and ignite them; bosses resist the pull.',{name:'Hellchain',secondary:'pull',maxHits:4}),
 fellhunterRicochetBlade:skill('chain',14,6,450,.58,'Release an orb of malice that leaps through three visible enemies. Each impact ignites a short, fierce brand; terrain blocks the links.',{name:'Malice Orb',maxHits:3}),
 fellhunterDeadfall:skill('trap',21,12,290,.85,'Suspend a hellstar over an armed seal. An approaching enemy calls the meteor down; prepared three-Ember victims suffer Flashover.',{name:'Falling Hellstar',radius:125,duration:8,flashover:true}),
 fellhunterExecutionWindow:skill('empower',12,12,0,0,'Manifest your demonic ascendance for six seconds. New brands are 20% hotter and weapon attacks retain their 12% empowered bonus. This is offensive power, without a ward.',{name:'Demonic Ascendance',radius:0,maxHits:0}),
 fellhunterVaultingShot:skill('retreat',14,7,165,.48,'Rift backward and cast a hellfire orb toward the threat from your departure point. A ranged escape cast that respects terrain.',{name:'Riftfire Reversal',distance:165,secondary:'shot',maxHits:1})
});
export const HELL_BALANCE=Object.freeze({cadence:.4,duration:1.8,tickInterval:.3,baseBurn:.23,perEmber:.09,paceDuration:1.25,exposure:1.10,exposureDuration:5});
export function hellstalkerDamageInvestment(a,b={}){
 const pct=a.id==='fellhunterMarkedShot'?b.markedShotDamagePct:a.id==='fellhunterFlamingArrowVolley'?b.volleyDamagePct:['fellhunterBearTrap','fellhunterDeadfall','fellhunterCaltrops','fellhunterKillZone'].includes(a.id)?b.trapDamagePct:0;
 return 1+Math.max(0,Number(pct)||0)/100;
}
export function applyHellstalkerTuning(a,base){
 const c=HELLSTALKER_SKILLS[a.id];if(!c)return;
 Object.assign(a,{hellSkill:true,name:c.name||a.name,hellDelay:c.delay||0,desc:c.desc+' Infernal Brand: 1.8s, ticking hard every 0.3s. Up to three Embers. Infernal casts: +10% damage taken for 5s. Hits grant brief Cinder Pace.',subclassMode:c.mode,subclassSecondary:c.secondary||'ignite',costType:'spirit',cost:c.cost,baseCost:undefined,cd:c.cd,rechargeTime:c.cd,
  range:c.range,damageMultiplier:c.ratio,subclassRadius:c.radius??75,maxHits:c.maxHits??8,duration:c.duration||4,flashover:!!c.flashover,hellVolley:c.volley||0,
  channelProfile:undefined,mobilityProfile:undefined,effectProfile:undefined,projectileSpeed:c.projectileSpeed||740,
  noUseCharges:false,noChargeUpgrade:base.noChargeUpgrade===true,isChargeUpgradeEligible:base.isChargeUpgradeEligible!==false,maxCharges:1,
  canCharge:['melee','bolt','pierce','burst'].includes(c.mode),maxChargeTime:['melee','bolt','pierce','burst'].includes(c.mode)?1:0,
  animationFamily:['dash','retreat'].includes(c.mode)?'mobility':'cast',
  role:['dash','retreat'].includes(c.mode)?'mobility':c.mode==='empower'?'support':c.mode});
 if(['dash','retreat'].includes(c.mode))a.mobilityProfile={distance:c.distance,backward:c.mode==='retreat'};
}


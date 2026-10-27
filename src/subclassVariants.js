import {getAbilityById} from './data.js';
import {LICH_FORMS,LICH_ABILITY_ID,BOUND_DEAD_FORMS,BOUND_DEAD_ABILITY_ID} from './lichSummonSystem.js';
import {getBalancedAbility} from './abilityCombatProfiles.js';
import {SUBCLASSES,CLASS_SUBCLASSES,normalizeSubclassClassId} from './subclassData.js';
import {getSelectedAbilityMorph} from './abilityMorphSystem.js';
import {gravecallerSkillLifesteal} from './gravecallerSustain.js';
import {applyCryomancerTuning} from './cryomancerSkills.js';
import {applySunkenTuning} from './sunkenSkills.js';
import {applyGardenGraveTuning,GARDEN_GRAVE_MORPHS} from './gardenGraveMorphs.js';
import {applyHellstalkerTuning,HELLSTALKER_SKILLS} from './hellstalkerSkills.js';
import {applyFellhunterTuning,FELLHUNTER_MORPHS} from './fellhunterSkills.js';
import {tuneOathBlades,OATH_BLADE_ID} from './oathbladeProfiles.js';
import {applyOathkeeperTuning,OATHKEEPER_MORPHS} from './oathkeeperMorphs.js';

// An explicit inventory: one row for EVERY participating class ability. Columns
// follow PLAN_FAMILIES, independently of mastery/display order. Each row uses its own canonical ability ID.
// The suffix is a deliberate secondary behavior, not another independent skill.
export const SUBCLASS_SKILL_PLANS=Object.freeze({
  oathkeeperVowchain:["chain","pierce"],
  oathkeeperLitanyOfIron:["auraChannel","auraChannel"],
  oathkeeperDebtOfBlood:["retaliation","empower"],
  oathkeeperMandate:["mark","mark"],
  oathkeeperHallowedBlades:["oathBlades","oathBlades"],
  fellhunterHuntersLine:["pierce:pull","pierce:pull"],
  fellhunterRicochetBlade:["chain:hunt","chain:ignite"],
  fellhunterDeadfall:["trap:hunt","trap:ignite"],
  fellhunterExecutionWindow:["empower:hunt","empower:ignite"],
  fellhunterVaultingShot:["retreat:shot","retreat:shot"],
  gravecallerMurmuringHost:["beam:soul","auraChannel:weaken"],
  gravecallerFuneralUrn:["spirits:soul","field:weaken"],
  gravecallerGhostwalk:["dash:soul","dash:ward"],
  gravecallerDeathEcho:["mark:soul","mark:weaken"],
  thornbinderBriarstride:["dash:misdirect","dash:ward"],
  thornbinderSeedReliquary:["spirits:misdirect","trap:root"],
  thornbinderThornstorm:["field:heal","field:roseWard"],
  thornbinderCorpsebloom:["mark:misdirect","field:roseWard"],
  waveriderMaelstrom:["original:depth","field:freeze"],
  waveriderUndertow:["original:depth","field:chill"],
  waveriderPressureSpear:["original:depth","pierce:shatter"],
  waveriderTideMirror:["original:ward","ward:chill"],
  lightbringerDawnstep:["dash:burn","dash:parry"],
  lightbringerOrbitalHalo:["field:burn","auraChannel:blade"],
  lightbringerPillarOfRevelation:["burst:burn","melee:blade"],
  lightbringerOverexposure:["mark:detonate","mark:combo"],
  oathkeeperOathStrike:["melee","melee"],
  oathkeeperBastionBash:["melee","burst"],
  oathkeeperDivineLeap:["dash","dash"],
  oathkeeperJudgmentSmite:["melee","burst"],
  oathkeeperConsecratedGround:["field","field"],
  oathkeeperBulwarkOfLight:["ward","ward"],
  oathkeeperLastRite:["heal","heal"],
  oathkeeperHeavenbreakerJudgment:["burst","burst"],
  fellhunterPracticalStrike:["melee:hunt","melee:ignite"],
  fellhunterThrowingDaggers:["pierce:hunt","pierce:ignite"],
  fellhunterBearTrap:["trap:bind","trap:bind"],
  fellhunterCaltrops:["field:slow","field:slow"],
  fellhunterBombToss:["burst:hunt","burst:ignite"],
  fellhunterGrapplingHook:["dash:hunt","dash:field"],
  fellhunterFlamingArrowVolley:["pierce:hunt","pierce:ignite"],
  fellhunterSmokeBomb:["retreat:field","retreat:field"],
  fellhunterMarkedShot:["bolt:hunt","bolt:ignite"],
  fellhunterKillZone:["field:slow","field:ignite"],
  graveSpark:["bolt:soul","melee:weaken"],
  summonLich:["summon:heal","summon:drain"],
  gravecallerSummonLich:["summon:heal","summon:drain"],
  bloodLance:["pierce:soul","dash:weaken"],
  soulSiphon:["field:heal","auraChannel:weaken"],
  thornbinderThornLash:["projectileChannel:misdirect","burst:root"],
  thornbinderBriarHook:["dash:misdirect","pierce:pull"],
  thornbinderBramblePatch:["trap:misdirect","field:root"],
  thornbinderRosebiteBurst:["burst:misdirect","melee:burst"],
  thornbinderLivingBriar:["spirits:misdirect","ward"],
  thornbinderRootPrison:["mark:misdirect","burst:root"],
  thornbinderSummonThornlings:["summon:misdirect","summon"],
  thornbinderSummonElderThornbeast:["summon:misdirect","summon"],
  hydromancerWaterTorrent:["original:depth","bolt"],
  hydromancerBubbleWard:["original:ward","ward:chill"],
  hydromancerMendingCurrent:["original:heal","heal:chill"],
  hydromancerTidalCut:["original:depth","pierce"],
  hydromancerRiptideStep:["original:depth","dash:field"],
  hydromancerDrowningPressure:["original:depth","field:freeze"],
  hydromancerWellspring:["original:heal","field:heal"],
  hydromancerDelugeCrown:["original:depth","burst:freeze"],
  lightbringerGleamBolt:["bolt:burn","melee"],
  lightbringerHaloBrand:["mark:detonate","melee:ward"],
  lightbringerRayOfRebuke:["beam:burn","pierce:blade"],
  lightbringerPrismGuard:["retaliation:burn","ward:parry"],
  lightbringerDawncarver:["beam:burn","melee:combo"],
  lightbringerSolarVerdict:["burst:detonate","dash:burst"],
  lightbringerHaloAegis:["auraChannel:burn","retaliation:parry"],
  lightbringerFirstSunrise:["empower:heat","dash:ward"],
});
const PLAN_FAMILIES=CLASS_SUBCLASSES;
export function getSubclassSkillPlan(id,family){
  if(OATHKEEPER_MORPHS[family]?.[id])return OATHKEEPER_MORPHS[family][id].mode;
  if(FELLHUNTER_MORPHS[family]?.[id]){const c=FELLHUNTER_MORPHS[family][id];return [c.mode,c.secondary||'hunt'].join(':');}
  if(family==='hellstalker'&&HELLSTALKER_SKILLS[id]){const c=HELLSTALKER_SKILLS[id];return [c.mode,c.secondary||'ignite'].join(':');}
  const authored=GARDEN_GRAVE_MORPHS[family]?.[id];if(authored)return [authored.mode,authored.secondary].filter(Boolean).join(':');
  if(family==='petalknight'&&['thornbinderSummonThornlings','thornbinderSummonElderThornbeast'].includes(id))return 'summon';
  const sub=SUBCLASSES[family];return SUBCLASS_SKILL_PLANS[id]?.[PLAN_FAMILIES[sub?.classId]?.indexOf(family)];
}

const modeCopy={
  bolt:'Fire an aimed single-target projectile',pierce:'Drive a narrow strike through aligned enemies',
  chain:'Strike an aimed foe and chain to nearby enemies',melee:'Sweep a short magical weapon arc',
  burst:'Release an aimed area burst',field:'Place a temporary ground zone',trap:'Place a delayed trap triggered by nearby enemies',
  mark:'Mark one aimed enemy for follow-up strikes',beam:'Hold an aimed channel; release or dodge to stop',
  projectileChannel:'Hold to send fast projectiles that gently curve toward enemies near your aim; release or dodge to stop',
  auraChannel:'Hold a moving aura; release or dodge to stop',dash:'Surge forward along passable ground',retreat:'Retreat while striking along your aim',
  ward:'Raise a temporary barrier around nearby allies',heal:'Mend nearby allies and pulse against enemies',
  ritual:'Perform a restorative rite with an offensive pulse',retaliation:'Raise a ward that stores a bounded reply against attackers',
  spirits:'Manifest short-lived magical spirits that seek enemies',summon:'Call persistent companions that fight beside you',empower:'Prime your next strikes for six seconds'
};
const secondaryCopy={chill:'Chill builds toward Freeze.',freeze:'Build Chill and freeze lesser foes; bosses are slowed.',shatter:'Strike Brittle enemies harder.',ward:'Grant a brief barrier.',chain:'Lightning jumps to nearby foes.',heal:'Heal nearby allies; hostile targets still take damage.',haste:'Grant brief haste to nearby allies.',drain:'Recover life from effective damage.',pressure:'Build crushing Pressure.',pull:'Draw lesser enemies into the effect.',detonate:'Detonate an existing affliction on the target.',sacrifice:'Spend 4% of current health safely to empower this miracle.',smite:'Prime radiant retaliation.',bind:'Briefly bind lesser foes.',blessing:'Bless nearby allies with healing and protection.',curse:'Apply accumulating decay.',soul:'Gather or consume Soul Fragments for spirit rites.',spread:'Spread existing Curse to nearby foes.',misdirect:'Weaken enemies and build Faerie Fire.',root:'Root lesser enemies; bosses are slowed.',burst:'End in a close area impact.',burn:'Inflict a capped damage-over-time burn.',parry:'A short hard-light parry protects against the next hit.',blade:'Condense light into a weapon-shaped strike.',combo:'Successive close strikes amplify the third hit.',beacon:'Create a capped Beacon that strengthens and protects nearby allies.',heat:'Build Heat for stronger solar burns.',prey:'Mark one prey and reveal its pursuit trail.',bleed:'Apply a bounded bleed.',seal:'Interrupt lesser casters; expose ordinary foes.',dispel:'Strip shields or apply Exposed when no shield remains.',brand:'Apply Infernal Brand; the third hit detonates it.',execute:'Deal more damage to wounded marked prey.',retaliation:'Return a bounded portion of incoming damage.'};
const channels=new Set(['beam','auraChannel','projectileChannel']);
secondaryCopy.weaken='Briefly weaken enemies hit.';
const support=new Set(['ward','heal','ritual','retaliation','empower']);
const cache=new Map();
export function resolveSubclassAbility(player,abilityOrId){
  const id=typeof abilityOrId==='string'?abilityOrId:abilityOrId?.id;
  return resolveAbilityMorph(player,abilityOrId,getSelectedAbilityMorph(player,id));
}
export function resolveAbilityMorph(player,abilityOrId,morphId){
  const original=typeof abilityOrId==='string'?getAbilityById(abilityOrId):abilityOrId;
  const sub=SUBCLASSES[morphId];
  if(!original)return original;
  if(!sub||normalizeSubclassClassId(original.classId)!==sub.classId||normalizeSubclassClassId(player?.classId)!==sub.classId)return original.subclassId?getAbilityById(original.id):original;
  if(original.subclassId===sub.id)return original;
  if(original.id===OATH_BLADE_ID)return tuneOathBlades({...original,subclassId:sub.id,subclassName:sub.name,baseName:original.name,colors:sub.colors},sub.id);
  const plan=SUBCLASS_SKILL_PLANS[original.id];if(!plan)return original;
  const key=`${original.id}:${sub.id}`;
  if(original===getAbilityById(original.id)&&cache.has(key))return cache.get(key);
  if(sub.id==='sunken'){
    const base=getBalancedAbility(original),ability={...base,subclassId:'sunken',subclassName:sub.name,baseName:base.name,
      sunkenBase:true,colors:sub.colors,element:'water',damageMultiplier:base.damage?(base.damageMultiplier||1)*sub.traits.damage:base.damageMultiplier,
      desc:base.desc};
    applySunkenTuning(ability);
    if(original===getAbilityById(original.id))cache.set(key,Object.freeze(ability));
    return ability;
  }
  const [mode,secondary='']=getSubclassSkillPlan(original.id,sub.id).split(':');
  // Cache canonical resolutions only; charged/mastered copies retain modifiers.
  const base=getBalancedAbility(original),isChannel=channels.has(mode),isMobility=['dash','retreat'].includes(mode);
  let reach=Math.max(80,Number(base.range||120));
  if(mode==='melee')reach=Math.min(110,Math.max(64,reach*.65));
  if(['bolt','pierce','chain','beam','mark'].includes(mode))reach=Math.max(210,reach);
  if(sub.id==='deathknight')reach=Math.min(reach,170);
  const radius=Math.min(155,Math.max(52,Number(base.range||100)*.52));
  const ticks=isChannel ? .26 : ['field','spirits'].includes(mode) ? .24 : 1;
  const costType=sub.id==='hellstalker'?'spirit':base.costType||'spirit';
  const cd=isChannel?0:Math.max(base.channelProfile?6:0.35,Number(base.cd||6));
  const canCharge=!isChannel&&!isMobility&&!['mark','spirits','empower','trap'].includes(mode)&&
    (base.canCharge===true||['burst','pierce','melee'].includes(mode));
  const charges=!isChannel&&isMobility&&['fae','bloodhound','dawnblade'].includes(sub.id)?2:1;
  const ability={...base,subclassId:sub.id,subclassName:sub.name,baseName:base.name,
    name:base.name,
    desc:`${modeCopy[mode]}. ${sub.name} · ${sub.traits.status}. ${secondaryCopy[secondary]||sub.mechanic} ${isChannel?'Each tick applies reduced damage; channel payments continue while held.':''}`,
    role:isChannel?'channel':isMobility?'mobility':support.has(mode)?'support':mode,
    costType,cost:isChannel?Math.ceil(Math.max(12,Number(base.cost||12))/4):Math.ceil(Number(base.cost||8)*(sub.id==='hellstalker'?1.15:1)),
    baseCost:undefined,cd,range:reach,damage:Math.max(0,Number(base.damage||0)),
    damageMultiplier:(base.damageMultiplier||.7)*sub.traits.damage*ticks,
    element:sub.traits.element,colors:sub.colors,subclassMode:mode,subclassSecondary:secondary,
    animationFamily:isChannel?'channel':isMobility?'mobility':mode==='melee'?'melee':['heal','ritual','spirits'].includes(mode)?'ritual':['ward','retaliation'].includes(mode)?'guard':'cast',
    subclassRadius:radius,maxHits:['bolt','mark'].includes(mode)||sub.id==='bloodhound'?1:8,
    duration:base.duration||(['field','spirits'].includes(mode)?4:3),
    // Existing ID remains the contribution/mastery/cooldown key.
    summonType:undefined,damageReduction:undefined,effectProfile:base.effectProfile,
    channelProfile:isChannel?{mode:'hold',duration:12,tickInterval:.4,movementMode:mode==='beam'?'slowed':'free',movementMultiplier:mode==='beam'?.35:.7,costPerSecond:Math.max(12,Number(base.cost||12)*1.2),turnRate:3}:undefined,
    mobilityProfile:isMobility?{distance:Math.min(200,Math.max(75,Number(base.mobilityProfile?.distance||base.range||130))),backward:mode==='retreat'}:undefined,
    canCharge,maxChargeTime:canCharge?(base.maxChargeTime||.95):0,
    damageMultiplierByCharge:base.damageMultiplierByCharge||[1,1.18,1.4],radiusMultiplierByCharge:base.radiusMultiplierByCharge||[1,1.05,1.14],
    durationMultiplierByCharge:base.durationMultiplierByCharge||[1,1.15,1.3],chargeCostMultiplier:base.chargeCostMultiplier||[1,1.1,1.25],
    noUseCharges:isChannel,noChargeUpgrade:isChannel,isChargeUpgradeEligible:!isChannel,
    maxCharges:charges,maxChargeCap:3,rechargeTime:cd,subclassHealthCost:sub.id==='sinner'?.04:0};
  if(base.id===LICH_ABILITY_ID||base.id===BOUND_DEAD_ABILITY_ID){
    const bound=base.id===BOUND_DEAD_ABILITY_ID,form=(bound?BOUND_DEAD_FORMS:LICH_FORMS)[sub.id];
    Object.assign(ability,{name:`${bound?'Raise':'Summon'} ${form.name}`,desc:form.desc,role:'summon',
      summonType:base.summonType,cost:base.cost,cd:base.cd,range:base.range,
      maxCharges:1,noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false,
      canCharge:false,maxChargeTime:0,duration:undefined,channelProfile:undefined,
      mobilityProfile:undefined,effectProfile:undefined,animationFamily:'ritual'});
  }
  if(base.id==='soulSiphon'&&sub.id==='acolyte'){
    Object.assign(ability,{
      desc:'Cast a six-second soul-fire circle that slows enemies and refreshes a five-second Soul Burn. Casting heals you and nearby allies for 3% maximum health before bonuses; Soul Fragments increase this, up to 8%. Pay Spirit once; 12-second cooldown.',
      soulSiphonField:true,subclassRadius:210,range:210,duration:6,soulBurnDuration:5,
      cost:18,costType:'spirit',cd:12,rechargeTime:12,maxHits:128,
      damageMultiplier:base.damageMultiplier*sub.traits.damage,
      channelProfile:undefined,effectProfile:undefined,canCharge:false,maxChargeTime:0,
      noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false,maxCharges:1
    });
  }
  if(base.id==='gravecallerMurmuringHost'&&sub.id==='acolyte'){
    Object.assign(ability,{
      desc:'Hold to unleash a long-range procession of spirits through every enemy in its path. A spectral shield reduces incoming damage by 25% while channeling and fades shortly after release. Hits weaken enemies; kills gather Soul Fragments. Release or dodge to stop.',
      spectralHost:true,hostWardReduction:.25,beamWidth:28,damageMultiplier:ability.damageMultiplier*3,
      cost:2,range:620,maxHits:Infinity,
      channelProfile:{...ability.channelProfile,costPerSecond:9}
    });
  }
  if(base.id==='gravecallerFuneralUrn'&&sub.id==='acolyte'){
    Object.assign(ability,{
      spectralUrn:true,role:'damage',animationFamily:'cast',subclassMode:'spirits',
      desc:'Throw a spectral urn a medium distance along your aim. It shatters into three ghosts that seek nearby visible enemies, each striking up to four times before fading after four seconds. Throw more urns to overlap their spirits. Ghost attacks briefly weaken enemies; this skill does not heal you.',
      cost:9,costType:'spirit',cd:.85,rechargeTime:.85,range:240,damageMultiplier:.9,
      duration:4,urnFlightTime:.36,spiritSeekRange:250,spiritSpeed:290,spiritHitRatio:.26,spiritInterval:.65,spiritStrikes:4,
      maxHits:1,maxCharges:1,canCharge:false,maxChargeTime:0,
      channelProfile:undefined,effectProfile:undefined,mobilityProfile:undefined,
      noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false
    });
  }
  if(base.id==='thornbinderThornLash'&&sub.id==='fae'){
    const host=getAbilityById('gravecallerMurmuringHost');
    Object.assign(ability,{
      desc:'Hold to send fast faerie butterflies toward enemies near your aim. They gently curve toward a visible target. Hits weaken enemies; three Faerie Fire hits briefly bind lesser foes. Less damage than Murmuring Host, with slightly higher Spirit upkeep. Release or dodge to stop.',
      costType:'spirit',cost:host.cost,range:host.range,
      damage:host.damage,damageMultiplier:host.damageMultiplier*.7,maxHits:1,
      projectileSpeed:620,projectileLockAngle:Math.PI/5,projectileTurnRate:4.8,
      channelProfile:{...host.channelProfile,movementMultiplier:.35,costPerSecond:19},
      effectProfile:undefined
    });
  }
  if(mode==='summon'&&sub.id==='fae'){
    const elder=base.id==='thornbinderSummonElderThornbeast';
    Object.assign(ability,{
      desc:`Call ${elder?'one durable Fae Elder Thornbeast with a slowing presence and a powerful bite that heals itself':'three Fae Thornlings that follow you, fight nearby enemies and slow them'}. Hits apply Faerie Fire: enemies deal less damage, and three hits briefly bind lesser foes. Nearby companions quietly heal you over time. Use again to dismiss ${elder?'it':'the group'}.`,
      role:'summon',summonType:base.summonType,faeSummon:true,animationFamily:'ritual',
      damage:base.damage,damageMultiplier:base.damageMultiplier,cost:base.cost,cd:base.cd,
      range:base.range,canCharge:base.canCharge,maxChargeTime:base.maxChargeTime,
      maxCharges:1,noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false,
      duration:undefined,channelProfile:undefined,mobilityProfile:undefined,effectProfile:undefined
    });
  }
  if(base.id==='thornbinderThornstorm'&&sub.id==='fae'){
    Object.assign(ability,{
      desc:'Plant an eight-second circle of Fae flowers at your feet. You and allies recover health while standing inside; enemies take repeated Faerie Fire damage, weakening them and briefly binding lesser foes after three hits. Flowers emerge from the ground and sink away when the field ends.',
      faeFlowerField:true,role:'support',subclassRadius:180,range:180,duration:8,
      cost:24,costType:'spirit',cd:12,rechargeTime:12,maxHits:128,
      damageMultiplier:base.damageMultiplier*sub.traits.damage*.35,
      channelProfile:undefined,effectProfile:undefined,canCharge:false,maxChargeTime:0,
      noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false,maxCharges:1
    });
  }
  applyGardenGraveTuning(ability,base);
  applyOathkeeperTuning(ability);
  delete ability.fellToolkit;
  if(sub.id==='hellstalker')applyHellstalkerTuning(ability,base);
  if(sub.id==='bloodhound')applyFellhunterTuning(ability,base);
  if(normalizeSubclassClassId(base.classId)==='gravecaller'&&!ability.summonType){
    const rate=gravecallerSkillLifesteal(ability);
    if(rate&&!ability.gardenGraveMorph)ability.desc=ability.desc.replace('Recover life from effective damage.','').trim()+' Direct hits steal life from damage actually dealt; secondary effects do not heal.';
  }
  if(sub.id==='cryomancer')applyCryomancerTuning(ability,base);
  if(original===getAbilityById(original.id))cache.set(key,Object.freeze(ability));
  return ability;
}
export function describeSubclassMechanics(ability){
  if(!ability?.subclassId)return '';
  return `${ability.subclassName} · ${ability.element} · ${ability.maxHits===1?'Single target':'Area / multiple targets'} · ${ability.channelProfile?'Hold to channel':ability.canCharge?'Hold to charge':'Instant'} · ${ability.channelProfile?'No use charges':`${ability.maxCharges} base use charge${ability.maxCharges===1?'':'s'}`}`;
}

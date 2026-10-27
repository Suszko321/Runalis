// Authored close-combat forms. Original, Fae and Acolyte remain separate.
const cast=(mode,cost,cd,range,ratio,desc,extra={})=>({mode,cost,cd,range,ratio,desc,...extra});
export const GARDEN_GRAVE_MORPHS=Object.freeze({
 deathknight:{
  graveSpark:cast('melee',7,.75,88,1.12,'Cut nearby enemies with a spectral reaping blade. Three spaced close hits cause a Death Sentence strike. Direct hits retain Necrotic Bolt’s lifesteal.',{secondary:'weaken',radius:60}),
  bloodLance:cast('dash',16,6.5,150,1.2,'Charge along passable ground behind a spectral cleaver, striking enemies in your path. Its direct attack retains lifesteal.',{secondary:'weaken',distance:150,radius:65}),
  soulSiphon:cast('auraChannel',3,0,110,.21,'Hold a close circle of grasping bone and death magic. It weakens enemies and retains the existing capped Soul Siphon lifesteal; release or dodge to stop.',{secondary:'weaken',radius:110,costPerSecond:11}),
  gravecallerMurmuringHost:cast('auraChannel',3,0,105,.24,'Hold a storm of spectral cleavers around you. It weakens nearby enemies, builds Death Sentence and grants a small iron ward while held. Existing lifesteal remains capped.',{secondary:'weaken',radius:105,costPerSecond:12,boneWard:.12}),
  gravecallerFuneralUrn:cast('field',19,9,100,.27,'Plant a bone standard nearby. Its deathly ground weakens enemies and builds Death Sentence through repeated pressure.',{secondary:'weaken',radius:110,duration:5}),
  gravecallerGhostwalk:cast('dash',13,7,155,.72,'Advance in spectral armour, cutting enemies along the route and gaining a short bone ward.',{secondary:'ward',distance:155,boneWard:.2}),
  gravecallerDeathEcho:cast('mark',13,8,180,.7,'Sentence one nearby enemy. Three follow-up weapon strikes release a stronger necrotic strike; weakened foes remain dangerous, but deal less damage for a short time.',{secondary:'weaken',maxHits:1}),
 },
 petalknight:{
  thornbinderThornLash:cast('burst',9,2.2,100,1.1,'Erupt a giant crimson rose ahead of your aim, bursting into barbed roots and petals that strike every enemy in its circle. Hold to charge for up to 80% more burst damage and 35% more reach and radius. Enemies hit suffer a light thorn wound for 2.6 seconds; wounds refresh rather than stack. Close hits still grow Roseguard.',{secondary:'root',radius:86,roseEruption:true,thornWoundDuration:2.6,thornWoundRatio:.07,maxHits:Infinity,maxChargeTime:1.2,damageMultiplierByCharge:[1,1.35,1.8],radiusMultiplierByCharge:[1,1.18,1.35],durationMultiplierByCharge:[1,1,1],chargeCostMultiplier:[1,1.12,1.3]}),
  thornbinderBriarHook:cast('pierce',12,5.5,255,.95,'Cast a thorned rose vine through a narrow line. Pull lesser enemies toward you; heavy enemies resist displacement.',{secondary:'pull',maxHits:6}),
  thornbinderBramblePatch:cast('field',18,9,215,.23,'Plant a red rose thicket for six seconds. It damages and slows enemies, with brief roots after repeated pressure.',{secondary:'root',radius:125,duration:6}),
  thornbinderRosebiteBurst:cast('melee',18,7,96,1.5,'Drive a heavy rose-thorn cleave through close enemies, finishing with a smaller shower of thorn fragments.',{secondary:'burst',radius:75}),
  thornbinderLivingBriar:cast('ward',20,16,240,0,'Envelop yourself and nearby living summons in swirling crimson roses for six seconds. Heal immediately, then steadily regenerate health while taking less damage. Hold to charge for stronger healing and protection. Nearby attackers receive a small thorn return; existing stronger rose thorns take priority. Each recipient keeps the mantle while moving.',{radius:240,roseMantle:true,maxChargeTime:1.2,damageMultiplierByCharge:[1,1.25,1.5],radiusMultiplierByCharge:[1,1.08,1.15],durationMultiplierByCharge:[1,1,1],chargeCostMultiplier:[1,1.12,1.3]}),
  thornbinderRootPrison:cast('burst',20,10,175,.78,'Raise a ring of red roses and gripping thorns at your aim. It briefly roots lesser foes; bosses are slowed.',{secondary:'root',radius:110,rootPrison:true}),
  thornbinderBriarstride:cast('dash',13,7,155,.8,'Rush through a trail of red petals and barbed roots, striking along your route and briefly raising Roseguard.',{secondary:'ward',distance:155,roseWard:true}),
  thornbinderSeedReliquary:cast('trap',15,8,245,.78,'Set a closed red rose bud. After arming, an approaching enemy triggers a thorn eruption that briefly roots nearby lesser foes.',{secondary:'root',radius:90,duration:8}),
  thornbinderThornstorm:cast('field',26,18,175,.26,'Press once to surround yourself with a moving storm of red rose petals and hooked thorns for seven seconds. It damages every visible enemy inside, reduces incoming attack damage by 20%, and returns 5% of all your actual damage as health. Injured summons inside share 20% of that healing; you receive the rest. Healing shares a limit of 2% of your maximum health per second with 2% in reserve.',{secondary:'roseWard',radius:175,duration:7,petalStorm:true}),
  thornbinderCorpsebloom:cast('field',20,11,240,.28,'Grow a six-second crimson rose garden. Its barbed roots damage and hinder enemies; standing inside renews your thorn mantle.',{secondary:'roseWard',radius:140,duration:6,roseWard:true}),
 },
});
export function applyGardenGraveTuning(a,base){
 if(!GARDEN_GRAVE_MORPHS[a.subclassId])return;
 a.gardenGraveMorph=true;
 if(a.summonType){
  return;
 }
 const summons=['thornbinderSummonThornlings','thornbinderSummonElderThornbeast'];
 if(summons.includes(base.id)&&a.subclassId==='petalknight'){
  const elder=base.id===summons[1];Object.assign(a,{role:'summon',subclassMode:'summon',summonType:base.summonType,gardenSummon:true,
   cost:base.cost,cd:base.cd,rechargeTime:base.cd,range:base.range,damage:base.damage,damageMultiplier:base.damageMultiplier,
   animationFamily:'ritual',canCharge:base.canCharge,maxChargeTime:base.maxChargeTime,maxCharges:1,
   noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false,channelProfile:undefined,mobilityProfile:undefined,effectProfile:undefined,duration:undefined,
   desc:`Call ${elder?'one tusked Rose Siegebeast':'three Rose Sentinels'}. Crimson petal armour and hooked thorns form its living body. Melee attacks grow Roseguard; nearby attacks against the creature trigger capped thorn retaliation. ${elder?'Its powerful bite heals itself.':'The shield-and-cleaver pack fights in melee.'} Use again to dismiss this group.`});return;
 }
 const c=GARDEN_GRAVE_MORPHS[a.subclassId][base.id];if(!c)return;
 Object.assign(a,{...c,subclassMode:c.mode,subclassSecondary:c.secondary||'',costType:'spirit',cost:c.cost,baseCost:undefined,cd:c.cd,rechargeTime:c.cd,
  range:c.range,damageMultiplier:c.ratio,desc:c.desc,subclassRadius:c.radius||75,maxHits:c.maxHits??8,duration:c.duration||4,
  channelProfile:undefined,mobilityProfile:undefined,effectProfile:undefined,canCharge:['melee','pierce','burst'].includes(c.mode),
  noUseCharges:false,noChargeUpgrade:false,isChargeUpgradeEligible:true,maxCharges:1,
  animationFamily:c.mode==='melee'?'melee':['ward','retaliation'].includes(c.mode)?'guard':'cast'});
 if(c.mode==='beam'||c.mode==='auraChannel')Object.assign(a,{role:'channel',animationFamily:'channel',canCharge:false,maxChargeTime:0,noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false,
  channelProfile:{mode:'hold',duration:12,tickInterval:.4,movementMode:c.mode==='beam'?'slowed':'free',movementMultiplier:c.mode==='beam'?.38:.68,costPerSecond:c.costPerSecond,turnRate:3}});
 else if(c.mode==='dash'||c.mode==='retreat')Object.assign(a,{role:'mobility',animationFamily:'mobility',canCharge:false,maxChargeTime:0,mobilityProfile:{distance:c.distance||c.range,backward:c.mode==='retreat'}});
 else a.role=['ward','retaliation'].includes(c.mode)?'support':c.mode;
 if(!a.canCharge)a.maxChargeTime=0;
 if(c.petalStorm)Object.assign(a,{role:'damage',animationFamily:'cast',canCharge:false,maxChargeTime:0,noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false,maxHits:Infinity,duration:7});
 if(c.roseEruption)Object.assign(a,{noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false});
 if(c.roseMantle)Object.assign(a,{role:'support',canCharge:true,maxChargeTime:c.maxChargeTime,noUseCharges:true,noChargeUpgrade:true,isChargeUpgradeEligible:false,duration:6});
}

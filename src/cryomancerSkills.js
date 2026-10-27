// Author each original skill's frost form; retain canonical IDs and mastery.
export const CRYO_SKILLS=Object.freeze({
 hydromancerWaterTorrent:{mode:'bolt',cost:8,cd:1.35,range:360,ratio:.82,maxHits:1,
  desc:'Launch a fast ice shard at one enemy. Hits build Chill; three spaced hits make the target Brittle and briefly freeze weaker foes.'},
 hydromancerBubbleWard:{mode:'ward',cost:16,cd:8,range:125,radius:125,ratio:0,maxHits:0,ward:.24,wardDuration:4,
  desc:'Wrap yourself and nearby allies in crystal armor for four seconds, reducing incoming damage by 24% before bonuses. This protects allies without freezing nearby enemies for free.'},
 hydromancerMendingCurrent:{mode:'heal',cost:17,cd:7,range:145,radius:145,ratio:0,maxHits:0,heal:10,ward:.12,wardDuration:2,cleanse:true,
  desc:'Send restorative frost through you and nearby allies. Restore health, clear movement slows and accumulated elite frost, then grant a modest two-second ice ward. Does not cleanse poison or fire.'},
 hydromancerTidalCut:{mode:'pierce',secondary:'shatter',cost:14,cd:4.2,range:230,ratio:.9,maxHits:4,
  desc:'Drive a piercing ice blade through lined-up enemies. Against a Brittle target, consume Brittle for a stronger Shatter hit. Otherwise build Chill.'},
 hydromancerRiptideStep:{mode:'dash',secondary:'field',cost:13,cd:6,range:155,radius:52,ratio:.45,duration:2.4,
  desc:'Glide forward over passable ground and leave a short frost patch at your departure. Crossed enemies and foes standing in the patch build Chill; solid walls stop the glide.'},
 hydromancerDrowningPressure:{mode:'field',cost:19,cd:8,range:260,radius:100,ratio:.2,duration:4.8,interval:.8,
  desc:'Raise ice spires in an aimed circle for nearly five seconds. Repeated pulses build Chill toward a brief freeze and Brittle; entering the field is not an instant freeze.'},
 hydromancerWellspring:{mode:'field',secondary:'heal',cost:24,cd:12,range:0,radius:125,ratio:.12,damage:3,duration:5,interval:1,fieldHeal:3,fieldCleanse:true,
  desc:'Plant a five-second glacial sanctuary at your feet. Each second, allies inside recover health and shed movement slows and accumulated elite frost. Enemies take light frost damage and build Chill. Healing zones from this skill do not stack.'},
 hydromancerDelugeCrown:{mode:'burst',secondary:'shatter',cost:29,cd:16,range:170,radius:145,ratio:.95,maxHits:12,ward:.18,wardDuration:2.5,
  desc:'Erupt a crown of ice in an aimed area. Brittle enemies take a powerful Shatter hit; other enemies build Chill. Nearby allies gain a brief ice ward. Best after preparing targets with frost.'},
 waveriderMaelstrom:{mode:'field',cost:22,cd:9,range:290,radius:175,ratio:.22,duration:5.6,interval:.8,
  desc:'Place a broad, five-second blizzard in the aimed area. Snow and ice rake enemies inside, building Chill and Brittle. Pay Spirit once; the field does not follow you.'},
 waveriderUndertow:{mode:'field',cost:15,cd:7,range:260,radius:80,ratio:.16,duration:4,interval:.8,
  desc:'Lay an aimed patch of jagged frost for four seconds. Its light damage and repeated Chill slow approaching enemies and prepare them for Shatter.'},
 waveriderPressureSpear:{mode:'pierce',secondary:'shatter',cost:15,cd:3.5,range:530,ratio:.92,maxHits:6,
  desc:'Fire a long piercing icicle through lined-up enemies. Consume Brittle for 50% more damage before bonuses and a small shard burst. Charge it for a stronger prepared strike.'},
 waveriderTideMirror:{mode:'retaliation',cost:17,cd:10,range:110,radius:110,ratio:.3,maxHits:0,ward:.22,wardDuration:4,
  desc:'Raise a four-second frost mirror that reduces damage by 22% before bonuses. Attackers receive a bounded ice reply that builds Chill. Retaliation has a shared cooldown.'}
});
export const CRYO_BALANCE=Object.freeze({chillCadence:.45,chillExpiry:4,freeze:1.1,eliteFreeze:.6,recovery:4,brittleDuration:4,shatter:1.5,brittleDamage:1.1,shardBurst:.24});
const names={hydromancerWaterTorrent:'Frost Shard',hydromancerBubbleWard:'Crystal Aegis',hydromancerMendingCurrent:'Restorative Rime',hydromancerTidalCut:'Shattering Blade',hydromancerRiptideStep:'Glacial Glide',hydromancerDrowningPressure:'Icebound Spires',hydromancerWellspring:'Glacial Sanctuary',hydromancerDelugeCrown:'Crown of Winter',waveriderMaelstrom:'Whiteout',waveriderUndertow:'Permafrost',waveriderPressureSpear:'Glacial Lance',waveriderTideMirror:'Frost Mirror'};
export function applyCryomancerTuning(a,base){
 const spec=CRYO_SKILLS[a.id];if(!spec)return;
 Object.assign(a,{cryoSkill:true,name:names[a.id],desc:spec.desc,subclassMode:spec.mode,subclassSecondary:spec.secondary||'chill',
  role:['ward','heal','retaliation'].includes(spec.mode)?'support':spec.mode,
  cost:spec.cost,costType:'spirit',cd:spec.cd,rechargeTime:spec.cd,range:spec.range,
  subclassRadius:spec.radius||Math.max(50,Math.min(125,spec.range*.45)),
  damage:spec.damage??base.damage,damageMultiplier:(base.damageMultiplier||.7)*spec.ratio,
  maxHits:spec.maxHits??10,duration:spec.duration||4,cryoFieldInterval:spec.interval||.8,
  cryoWard:spec.ward,cryoWardDuration:spec.wardDuration,cryoHeal:spec.heal,cryoFieldHeal:spec.fieldHeal,cryoCleanse:!!spec.cleanse,cryoFieldCleanse:!!spec.fieldCleanse,
  channelProfile:undefined,effectProfile:undefined,noUseCharges:false,noChargeUpgrade:base.noChargeUpgrade===true,isChargeUpgradeEligible:base.isChargeUpgradeEligible!==false,
  maxCharges:1,maxChargeCap:base.maxChargeCap||3,projectileSpeed:spec.mode==='pierce'?850:640,
  animationFamily:spec.mode==='dash'?'mobility':['ward','retaliation'].includes(spec.mode)?'guard':spec.mode==='heal'?'ritual':'cast',
  mobilityProfile:spec.mode==='dash'?{distance:spec.range}:undefined,
  canCharge:['bolt','pierce','burst'].includes(spec.mode),maxChargeTime:['bolt','pierce','burst'].includes(spec.mode)?1.0:0});
}

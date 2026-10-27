const S=(mode,cost,cd,range,ratio,desc,extra={})=>({mode,cost,cd,range,ratio,desc,...extra});
export const FELLHUNTER_MORPHS=Object.freeze({
 bloodhound:{
  fellhunterPracticalStrike:S('bolt',4,.8,440,.48,'Fire a quick barbed handbow shot. A damaging hit restores 6 Stamina and adds one 10-second Bleed layer. Bleed ticks once per second and caps at eight independently expiring layers.',{name:'Barbed Shot',maxHits:1,ailment:'bleed'}),
  fellhunterThrowingDaggers:S('pierce',7,1.4,380,.45,'Throw venom-coated fangs through three foes. Adds one 14-second Poison stack; poison ticks once per second and caps at six independent layers.',{name:'Venom Fangs',maxHits:3,ailment:'poison'}),
  fellhunterBearTrap:S('trap',12,8,180,.8,'Set razor jaws that briefly bind lesser foes and add two Bleed layers. A prepared stack builder; bosses resist the bind.',{name:'Razorjaw Trap',radius:70,duration:10,secondary:'bind',maxHits:4,ailment:'bleed',layers:2}),
  fellhunterCaltrops:S('field',12,9,180,.12,'Lay a six-second patch of venomous spikes. Pulses slow enemies and build Poison; existing poison persists after enemies leave.',{name:"Adder's Trail",radius:100,duration:6,secondary:'slow',maxHits:6,ailment:'poison'}),
  fellhunterBombToss:S('burst',16,9,230,.62,'Burst a septic shrapnel flask across a pack, adding one Bleed and one Poison layer to each foe. Both ailments keep ticking independently.',{name:'Septic Shrapnel',radius:105,maxHits:8,ailment:'both'}),
  fellhunterGrapplingHook:S('dash',10,6,165,.5,'Pursue your quarry along passable ground. Crossed foes gain a Bleed layer; stop in striking distance rather than overshooting a close quarry.',{name:'Blood Trail Pursuit',distance:165,pursuit:true,ailment:'bleed'}),
  fellhunterFlamingArrowVolley:S('pierce',18,10,480,.28,'Fire five piercing razor bolts in a wide fan. Apply Bleed across a pack. Simultaneous bolts share a stack cadence rather than instantly filling the cap.',{name:'Razor Rain',volley:5,maxHits:5,ailment:'bleed'}),
  fellhunterSmokeBomb:S('retreat',13,8,140,.3,'Slip backward into a three-second miasma patch. Pursuers are slowed and poisoned; existing wounds continue while you reposition.',{name:'Miasma Veil',distance:140,radius:100,duration:3,secondary:'field',ailment:'poison'}),
  fellhunterMarkedShot:S('bolt',11,5,500,.7,'Mark one quarry with a hemorrhaging bolt and add two Bleed layers. Wounded quarry takes stronger focused follow-ups; your existing ailments are not consumed.',{name:'Red Quarry',maxHits:1,retarget:true,execute:true,ailment:'bleed',layers:2}),
  fellhunterKillZone:S('field',24,17,230,.14,'Prepare a six-second killing ground. Repeated pulses slow foes and build both Bleed and Poison. Use evasive shots to maintain pressure while the long wounds work.',{name:'Venomous Killing Ground',radius:140,duration:6,secondary:'slow',maxHits:8,ailment:'both'}),
  fellhunterHuntersLine:S('pierce',11,6,330,.5,'Cast a serrated tether through a line of enemies, adding Bleed. Pull lesser foes toward the line; bosses remain anchored.',{name:'Goreline',maxHits:4,secondary:'pull',ailment:'bleed'}),
  fellhunterRicochetBlade:S('chain',12,6,380,.55,'Throw a venom-coated chakram through three visible foes. Each gains Poison. Steel rebounds and terrain checks keep the chain readable.',{name:'Plaguewheel',maxHits:3,ailment:'poison'}),
  fellhunterDeadfall:S('trap',19,11,240,.85,'Arm a flensing snare. Its heavy jaws briefly bind approaching foes and add two Bleed layers without erasing earlier wounds.',{name:'Flensing Snare',radius:95,duration:10,maxHits:6,ailment:'bleed',layers:2}),
  fellhunterExecutionWindow:S('empower',11,12,0,0,'For six seconds, newly applied Bleed and Poison layers are 25% stronger. Existing wounds keep their own potency and expiry. Weapon attacks retain their 12% hunting bonus.',{name:'Patient Predator',radius:0,maxHits:0,support:true}),
  fellhunterVaultingShot:S('retreat',13,7,150,.45,'Backflip away and fire a venom bolt from your departure point. Apply Poison while escaping; terrain stops the retreat. Works with any weapon.',{name:'Venom Backstep',distance:150,secondary:'shot',maxHits:1,ailment:'poison'})
 },
});
export const FELLHUNTER_BASE_INFO=Object.freeze({
 fellhunterPracticalStrike:['melee','Strike nearby foes with your equipped melee weapon or a hunting knife. Exposed foes take stronger follow-ups.'],
 fellhunterThrowingDaggers:['throw','Throw steel knives along your aim. Exposed foes take stronger hits; no bow is needed.'],
 fellhunterBearTrap:['throw','Place iron jaws ahead of you. After arming, they catch one foe, briefly bind lesser enemies and apply Exposed.'],
 fellhunterCaltrops:['throw','Scatter spikes for seven seconds. Crossing foes are damaged, slowed and Exposed, setting up any weapon.'],
 fellhunterBombToss:['throw','Throw a bomb with a short fuse. It damages a group and Exposes them for melee, ranged or gadget follow-ups.'],
 fellhunterGrapplingHook:['mobility','Hook forward along your aim. Solid terrain stops the pull; a successful reposition prepares Tactical Advantage.'],
 fellhunterFlamingArrowVolley:['ranged','Fire a fan of burning bolts from your hunting handbow. It hits groups and burns them; works with melee weapons too.'],
 fellhunterSmokeBomb:['throw','Release smoke ahead of you. It slows, damages and Exposes nearby foes so you can escape or close in.'],
 fellhunterMarkedShot:['ranged','Fire a precise hunting handbow bolt that slows and Exposes one foe. Your next melee, ranged or gadget hit can exploit the opening.'],
 fellhunterKillZone:['throw','Prepare a compact hunting ground. Three blasts punish foes who remain inside; slow and Exposed help any weapon finish them.'],
 fellhunterHuntersLine:['throw','Tether and Expose a foe for four seconds. Separation drags light foes toward you, or pulls you toward a heavy anchor.'],
 fellhunterRicochetBlade:['throw','Throw a heavy blade that rebounds through three foes. Exposed enemies take stronger hits; walls stop the blade.'],
 fellhunterDeadfall:['throw','Place a mechanical deadfall. After arming, nearby foes trigger a crushing hit and stagger.'],
 fellhunterExecutionWindow:['cast','For six seconds, weapon kills on Exposed or wounded foes partly recharge your oldest gadget, up to three times. Melee kills count too.'],
 fellhunterVaultingShot:['mobility','Vault backward from your aim and fire a hunting handbow bolt toward the threat. Works with any weapon; walls stop the vault.']
});
export function applyFellhunterTuning(a,base){
 const c=FELLHUNTER_MORPHS[a.subclassId]?.[a.id];if(!c)return;
 Object.assign(a,{hunterMorph:true,name:c.name||a.name,desc:c.desc+' Bleed: up to 8 layers for 10s. Poison: up to 6 layers for 14s. Each type gains layers at most every 0.4s per foe; new hits never refresh older layers.',hunterAilment:c.ailment,hunterLayers:c.layers||1,subclassMode:c.mode,subclassSecondary:c.secondary||'hunt',costType:'stamina',cost:c.cost,cd:c.cd,rechargeTime:c.cd,
 range:c.range,damageMultiplier:c.ratio,subclassRadius:c.radius??65,maxHits:c.maxHits??5,duration:c.duration||5,hunterVolley:c.volley||0,hunterRetarget:!!c.retarget,hunterExecute:!!c.execute,hunterDispel:!!c.dispel,hunterSupport:!!c.support,hunterWard:c.ward||0,hunterWardDuration:c.wardDuration||3,hunterPursuit:!!c.pursuit,
 channelProfile:undefined,effectProfile:undefined,mobilityProfile:undefined,projectileSpeed:760,element:a.subclassId==='bloodhound'?'physical':'magic',
 canCharge:['melee','bolt','pierce','burst'].includes(c.mode),maxChargeTime:['melee','bolt','pierce','burst'].includes(c.mode)?1:0,noUseCharges:false,noChargeUpgrade:base.noChargeUpgrade===true,isChargeUpgradeEligible:base.isChargeUpgradeEligible!==false,maxCharges:1,
 animationFamily:c.mode==='melee'?'melee':['dash','retreat'].includes(c.mode)?'mobility':['bolt','pierce'].includes(c.mode)&&!/Daggers|HuntersLine/.test(a.id)?'ranged':c.mode==='empower'?'cast':'throw',role:['dash','retreat'].includes(c.mode)?'mobility':c.support?'support':c.mode});
 if(['dash','retreat'].includes(c.mode))a.mobilityProfile={distance:c.distance,backward:c.mode==='retreat'};
}

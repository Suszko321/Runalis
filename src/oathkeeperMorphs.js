// Authored jobs for the two Oathkeeper morph families. Canonical skill IDs
// remain the save, mastery, cooldown and contribution keys.
const skill=(name,mode,ratio,cost,cd,range,radius,desc,extra={})=>({name,mode,ratio,cost,cd,range,radius,desc,...extra});
export const OATHKEEPER_MORPHS=Object.freeze({
 holyknight:{
  oathkeeperOathStrike:skill("Vanguard's Blow",'melee',1.22,8,1.45,82,76,'Sweep your mace through up to three foes. Close hits and clean blocks build Resolve, at most once every 0.75 seconds. At three Resolve, Hammer of Conviction and Heavenfall spend it for stronger finishers.',{maxHits:3,builder:true}),
  oathkeeperBastionBash:skill('Shieldbreaker','melee',1.05,15,6.2,92,78,'Bash a broad line of foes, briefly staggering lesser enemies and weakening their outgoing damage. A close hit builds Resolve.',{builder:true,root:.45}),
  oathkeeperDivineLeap:skill("Crusader's Arrival",'dash',.8,20,9,180,90,'Leap along passable ground and slam the landing area. Gain 15% damage reduction for two seconds; landing among foes builds Resolve.',{builder:true,ward:.15,wardDuration:2}),
  oathkeeperJudgmentSmite:skill('Hammer of Conviction','melee',1.65,22,8,96,64,'Bring down a single heavy mace strike. Three Resolve are consumed for 25% more damage and a brief stagger. Your focused single-target finisher.',{maxHits:1,finisher:true}),
  oathkeeperConsecratedGround:skill("Brawler's Ring",'field',.18,24,14,0,115,'Consecrate the ground beneath you for six seconds. Foes take holy pulses; while you stand inside, gain 15% damage reduction and recover two Stamina per pulse.',{duration:6,tick:.8,ward:.15}),
  oathkeeperBulwarkOfLight:skill('Iron Halo','ward',.55,18,13,0,95,'Brace for four seconds with 28% damage reduction. Clean blocks build Resolve and return a short holy shockwave against nearby attackers, at most once per second.',{duration:4,ward:.28}),
  oathkeeperLastRite:skill('Second Wind','heal',0,28,22,0,0,'Recover 12% of maximum health plus 4% for each Resolve spent, up to 24%. Consumes your Resolve. A self-heal that rewards staying in the brawl.',{damage:0}),
  oathkeeperHeavenbreakerJudgment:skill('Heavenfall','burst',1.8,34,28,100,130,'After a half-second warning, crush an area with a radiant hammer. Three Resolve add a second shockwave for 35% damage. Walls block the impact.',{delay:.5,finisher:true,maxHits:12}),
  oathkeeperVowchain:skill('Chain of Challenge','chain',.55,14,7,240,60,'Hook one visible foe and drag lesser enemies closer. Against a boss or heavy enemy, advance toward the anchor instead. Movement respects terrain; a close contact builds Resolve.',{maxHits:1,builder:true}),
  oathkeeperLitanyOfIron:skill('Unbroken Advance','auraChannel',.18,3,0,90,90,'Hold a moving close-range holy aura. Gain 20% damage reduction while channeling and damage surrounding enemies every half-second. Costs 8 Stamina per second; release or dodge to stop.',{duration:8,tick:.5,ward:.2,upkeep:8}),
  oathkeeperDebtOfBlood:skill('Stand and Deliver','retaliation',.65,16,12,0,110,'Stand firm for four seconds with 18% damage reduction. Store suffered damage, capped at 75% of this skill’s power, then return it in one close shockwave. Successful retaliation builds Resolve.',{duration:4,ward:.18}),
  oathkeeperMandate:skill("Duelist's Edict",'mark',.6,10,9,240,65,'Challenge one visible foe for six seconds. Your third melee weapon contact delivers a holy judgment, briefly staggers lesser foes and restores 6% maximum health. One challenge at a time.',{maxHits:1,root:.6})
 },
 sinner:{
  oathkeeperOathStrike:skill('Gravecleaver','melee',.68,7,1.6,96,80,'Cleave up to four foes with a conjured grave-sword. Close direct hits build Penance and steal 12% of damage actually dealt, shared with other melee morphs and capped at 3% maximum health per second. Weaker focused damage than the Holyknight.',{maxHits:4,builder:true,drain:true}),
  oathkeeperBastionBash:skill('Graveward Reprisal','burst',.68,15,7,0,95,'Erupt three grave-swords around you, briefly binding lesser foes. Gain 20% damage reduction for three seconds. A close direct hit builds Penance and steals life.',{builder:true,drain:true,root:.5,ward:.2,wardDuration:3}),
  oathkeeperDivineLeap:skill('Wraithstep','dash',.65,18,9,180,85,'Rush along passable ground behind a spectral sword. Slash the landing area, briefly bind lesser foes and gain 15% damage reduction for two seconds.',{builder:true,drain:true,root:.4,ward:.15,wardDuration:2}),
  oathkeeperJudgmentSmite:skill('Impaling Sentence','burst',.78,20,9,210,100,'Sacrifice 2% current health to impale an aimed area after a short warning. Bind lesser foes. Spend three Penance, if available, to strike two additional foes with returning swords; echoes never hit the primary victim.',{healthCost:.02,delay:.35,spender:true,root:.65}),
  oathkeeperConsecratedGround:skill('Grave of Blades','field',.15,24,14,210,125,'Plant a six-second grave of rising swords. Enemies take necrotic pulses. While standing inside, gain 18% damage reduction; damaging pulses restore 0.8% maximum health, at most once per pulse.',{duration:6,tick:.8,ward:.18}),
  oathkeeperBulwarkOfLight:skill('Sepulchral Guard','ward',.45,21,14,0,240,'Conjure a tomb of swords for four seconds, reducing incoming damage by 30%. Taking a hit or cleanly blocking launches a retaliatory sword at the attacker. One reply per second, capped at five.',{duration:4,ward:.3}),
  oathkeeperLastRite:skill('Reclaim the Forsaken','heal',0,28,24,0,0,'Reclaim 14% maximum health. If you have at least three Penance, spend three to recover another 10%. This healing rite has no health sacrifice.',{damage:0}),
  oathkeeperHeavenbreakerJudgment:skill('Requiem of the Unburied','burst',1.22,34,28,240,145,'Sacrifice 2% current health and raise a ring of unholy swords after a 0.65-second warning. Spend three Penance for returning sword strikes against two additional foes. Wide area control, rather than execution damage.',{healthCost:.02,delay:.65,spender:true,root:.7,maxHits:12}),
  oathkeeperVowchain:skill('Funeral Lance','pierce',.58,15,7,310,40,'Send a long grave-sword through up to four aligned foes, slowing them briefly. A ranged tool for approaching or controlling a pack; no health cost.',{maxHits:4,slow:1.2}),
  oathkeeperLitanyOfIron:skill('Procession of Blades','auraChannel',.13,3,0,125,125,'Hold a moving ring of spectral swords. Cut nearby enemies every half-second and gain 15% damage reduction while held. Costs 10 Spirit per second; it does not build Penance or steal life. Release or dodge to stop.',{duration:8,tick:.5,ward:.15,upkeep:10}),
  oathkeeperDebtOfBlood:skill('Borrowed Blades','empower',.4,18,12,0,100,'Sacrifice 2% current health to borrow three sword echoes for six seconds and gain two Penance. Each of your next three melee weapon contacts cleaves up to three other nearby foes. Echoes cannot hit the struck target.',{healthCost:.02,duration:6}),
  oathkeeperMandate:skill('Mortal Covenant','mark',.55,12,10,240,85,'Bind one visible foe for six seconds. Your third melee weapon contact calls a death-sword, splashes nearby enemies and restores 6% maximum health. One covenant at a time.',{maxHits:1})
 }
});
export function applyOathkeeperTuning(a){
 const c=OATHKEEPER_MORPHS[a.subclassId]?.[a.id];if(!c)return a;
 const channel=c.mode==='auraChannel';
 Object.assign(a,{oathMorph:true,name:c.name,desc:c.desc,subclassMode:c.mode,subclassSecondary:'',
  element:a.subclassId==='sinner'?'necrotic':'holy',costType:a.subclassId==='holyknight'||c.builder||c.mode==='dash'?'stamina':'spirit',
  damage:c.damage??Math.max(8,a.damage||0),damageMultiplier:c.ratio,cost:c.cost,cd:c.cd,rechargeTime:c.cd,
  range:c.range,subclassRadius:c.radius,maxHits:c.maxHits||8,duration:c.duration||3,subclassHealthCost:c.healthCost||0,
  channelProfile:channel?{mode:'hold',duration:c.duration,tickInterval:c.tick,movementMode:'slowed',movementMultiplier:.65,costPerSecond:c.upkeep,turnRate:3}:undefined,
  mobilityProfile:c.mode==='dash'?{distance:c.range}:undefined,canCharge:false,maxChargeTime:0,
  animationFamily:channel?'channel':c.mode==='dash'?'mobility':c.mode==='melee'?'melee':['ward','retaliation'].includes(c.mode)?'guard':c.mode==='heal'?'ritual':'cast',
  role:channel?'channel':c.mode==='dash'?'mobility':['ward','heal','empower','retaliation'].includes(c.mode)?'support':'damage',
  noUseCharges:channel,noChargeUpgrade:channel,isChargeUpgradeEligible:!channel,maxCharges:1});
 return a;
}

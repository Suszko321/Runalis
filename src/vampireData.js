// Canonical bloodline content. Pure data so the existing registries can compose it.
const ability=(id,name,mode,hpCostPct,cd,damage,range,extra={})=>({id,name,vampire:true,bloodline:'vampire',skill:'spirit',tree:'vampire',unlockLevel:1,
  role:mode==='summon'?'summon':mode==='form'?'transformation':mode==='frenzy'?'buff':'damage',vampireMode:mode,costType:'health',cost:0,hpCostPct,cd,damage,damageMultiplier:1,range,
  canCharge:false,noUseCharges:true,noChargeUpgrade:true,maxCharges:1,animationFamily:mode==='summon'?'ritual':'cast',
  desc:`${name}. Costs ${hpCostPct}% maximum HP. `,...extra});
export const VAMPIRE_ABILITIES=[
 ability('crimsonFeast','Crimson Awakening','strike',3,5,18,90,{recovery:.20,desc:'Tear blood from one foe in a narrow frontal claw strike. Costs 3% maximum HP; recover 20% of actual eligible damage. 5s cooldown.'}),
 ability('sanguineLance','Sanguine Lance','beam',1,10,12,320,{recovery:.18,channelEndCooldown:true,channelProfile:{mode:'hold',duration:60,movementMode:'slowed',movementMultiplier:.4,tickInterval:.25,costPerSecond:0,healthPercentPerSecond:1,turnRate:5},desc:'Hold a single-target blood beam; turn while moving at 40% speed. Costs 1% maximum HP to start and 1% per second. Recover 18% of actual damage. 10s cooldown after release or interruption.'}),
 ability('crimsonTide','Crimson Tide','wave',8,15,35,180,{recovery:.12,recoveryCap:.10,desc:'Unleash a 360-degree blood wave, knocking lesser foes outward. Costs 8% maximum HP; recover 12% of actual damage, capped at 10% maximum HP per cast. 15s cooldown.'}),
 ability('bloodCommunion','Blood Communion','communion',5,18,27,180,{recovery:.20,recoveryCap:.08,desc:'Consume nearby bleeding wounds for a blood burst. Costs 5% maximum HP; recover 20% of actual damage, capped at 8% maximum HP. No valid bleeding target means no cost or cooldown.'}),
 ability('callBatBeast','Call Bat Beast','summon',10,40,12,180,{summonType:'vampireBat',duration:30,recovery:.05,desc:'Call one killable Bat Beast for 30s. Visually evolves at skill mastery 1, 5, 10, 20 and 50, from Fledgling to Ancient Royal. Costs 10% maximum HP; 40s recovery after the beast ends. Its attacks restore 5% of actual damage, capped at 1% maximum HP per second.'}),
 ability('nightwingStep','Nightwing Step','step',3,8,18,150,{recovery:.15,recoveryCap:.03,desc:'Dissolve into bats and dash along passable ground, striking foes along your actual path. Costs 3% maximum HP; recover 15% of actual damage, capped at 3% maximum HP. 8s cooldown.'}),
 ability('royalBatBeast','Royal Bat Beast','form',5,12,0,0,{desc:'Toggle an animated royal beast form. Costs 5% maximum HP, then 1% every 3s. Vampire damage +20%, drain ×1.15, movement +10%, melee reach +10%. Other ability damage −25% and outside healing −20%. Toggle off freely; 12s cooldown when ended.'}),
 ability('bloodFrenzy','Blood Frenzy','frenzy',7,20,0,0,{duration:6,desc:'Costs 7% maximum HP. For 6s gain 15% melee attack speed; melee hits on bleeding foes restore 2% of actual damage, capped at 1% maximum HP per second. 20s cooldown.'}),
 ability('crimsonExecution','Crimson Execution','execution',10,18,45,100,{recovery:.25,recoveryCap:.08,desc:'Wind up a committed single-target claw strike for 0.4s. Costs 10% maximum HP. Deal 50% more damage below 30% target HP; recover 25% of actual damage, capped at 8% maximum HP. 18s cooldown.'})
];
const active=(id,name,ability,requires,cost,branch)=>({id,tree:'vampire',name,role:`Active · ${branch}`,cost,requires,bonuses:{},unlocksAbility:ability,desc:VAMPIRE_ABILITIES.find(a=>a.id===ability).desc});
const passive=(id,name,key,desc,requires,branch,cost=1)=>({id,tree:'vampire',name,role:`Passive · ${branch}`,cost,requires,bonuses:{[key]:1},desc});
export const VAMPIRE_NODES=Object.fromEntries([
 active('vampire_root','Crimson Awakening','crimsonFeast',[],1,'Blood Core'),
 active('vampire_lance','Sanguine Lance','sanguineLance',['vampire_root'],1,'Blood Sorcery'),
 passive('vampire_bloodletting','Bloodletting','vampireBloodletting','Vampire damage +8% against bleeding targets.',['vampire_lance'],'Blood Sorcery'),
 active('vampire_tide','Crimson Tide','crimsonTide',['vampire_lance'],2,'Blood Sorcery'),
 passive('vampire_hemorrhage','Hemorrhage','vampireHemorrhage','Vampire direct hits extend bleed 0.5s, once per target per 3s; each layer has an absolute lifetime cap.',['vampire_tide'],'Blood Sorcery'),
 active('vampire_communion','Blood Communion','bloodCommunion',['vampire_tide'],2,'Blood Sorcery'),
 passive('vampire_chalice','Heart of the Chalice','vampireChalice','Vampire activation and beam HP costs ×0.90; Royal upkeep is unchanged.',['vampire_communion'],'Blood Sorcery'),
 active('vampire_bat','Call Bat Beast','callBatBeast',['vampire_root'],1,'Beast Dominion'),
 passive('vampire_winged_hunger','Winged Hunger','vampireWingedHunger','Bat attacks have 15% chance to bleed for 5s.',['vampire_bat'],'Beast Dominion'),
 active('vampire_step','Nightwing Step','nightwingStep',['vampire_bat'],1,'Beast Dominion'),
 passive('vampire_brood','Brood Sovereignty','vampireBrood','Bat maximum HP +15% and attack speed +10%, applied once.',['vampire_bat'],'Beast Dominion'),
 active('vampire_royal','Royal Bat Beast','royalBatBeast',['vampire_step','vampire_brood'],3,'Beast Dominion'),
 passive('vampire_elder_wings','Elder Wings','vampireElderWings','While royal: another +10% movement and +10% applicable Vampire range.',['vampire_royal'],'Beast Dominion'),
 passive('vampire_edge','Crimson Edge','vampireEdge','Every genuine melee weapon hit has 12% chance to bleed for 5s at 2% of actual hit damage per second. Refreshes one wound per owner; no ranged procs.',['vampire_root'],'Predatory Combat'),
 passive('vampire_instinct','Predator’s Instinct','vampireInstinct','Move 8% faster within 220 pixels of a bleeding foe; does not stack.',['vampire_edge'],'Predatory Combat'),
 active('vampire_frenzy','Blood Frenzy','bloodFrenzy',['vampire_edge'],2,'Predatory Combat'),
 passive('vampire_appetite','Savage Appetite','vampireAppetite','Killing a bleeding foe reduces Nightwing Step recovery by 2s, at most once per 5s.',['vampire_frenzy'],'Predatory Combat'),
 active('vampire_execution','Crimson Execution','crimsonExecution',['vampire_frenzy'],2,'Predatory Combat'),
 passive('vampire_lord','Lord of the Hunt','vampireLord','Reapplying Vampire bleed extends it 1s, within the layer’s absolute lifetime cap.',['vampire_execution'],'Predatory Combat')
].map(n=>[n.id,n]));
export const VAMPIRE_MORPHS={sanguineLance:['rupturingLance','crimsonTether'],crimsonTide:['tidalReversal','scarletTempest'],callBatBeast:['bloodstalker','dreadwing'],royalBatBeast:['sovereignBlood','elderPredator']};
export const VAMPIRE_MORPH_NAMES={rupturingLance:'Rupturing Lance',crimsonTether:'Crimson Tether',tidalReversal:'Tidal Reversal',scarletTempest:'Scarlet Tempest',bloodstalker:'Bloodstalker',dreadwing:'Dreadwing',sovereignBlood:'Sovereign of Blood',elderPredator:'Elder Predator'};
export const VAMPIRE_ICON_PATHS={
 sanguineLance:'M6 36L18 24L26 18L41 6M19 29L24 34M14 24L9 19M29 14L35 20M6 42L12 42M38 5L43 10',
 crimsonTide:'M6 24A18 12 0 1 0 42 24A18 12 0 1 0 6 24M12 24A12 6 0 1 1 36 24M24 3L24 12M24 36L24 45M3 24L11 24M37 24L45 24',
 bloodCommunion:'M24 6C14 20 12 26 24 32C36 26 34 20 24 6ZM24 32L24 43M5 12L15 24M43 12L33 24M5 38L16 32M43 38L32 32',
 callBatBeast:'M24 15L7 5L3 32L13 26L20 34L24 42L28 34L35 26L45 32L41 5ZM18 17L21 22M27 22L30 17M20 30L24 33L28 30',
 nightwingStep:'M3 31L15 23L20 9L27 16L44 5L37 29L29 25L24 39L19 29L9 37M3 42L11 39M34 39L43 33',
 royalBatBeast:'M8 5L18 10L24 3L30 10L40 5L37 22L30 27L33 43L24 37L15 43L18 27L11 22ZM17 16L21 19M27 19L31 16M21 27L24 30L27 27',
 bloodFrenzy:'M11 5L16 28L21 10L24 35L29 10L32 28L37 5M5 34Q24 48 43 34M13 34L18 40M35 34L30 40',
 crimsonExecution:'M10 4L21 23L18 28L38 44L26 25L31 20L16 7ZM37 5L43 12M5 35L11 43M33 13L42 6'
};
export function resolveVampireMorph(a,id){
 if(!VAMPIRE_MORPHS[a?.id]?.includes(id))return a;
 const result={...a,vampireMorph:id,name:VAMPIRE_MORPH_NAMES[id]};
 const text={rupturingLance:'Beam damage ×0.9; contacts apply a non-stacking bleed.',crimsonTether:'Beam damage ×0.85; move at 55% speed and slow the victim.',tidalReversal:'Pull lesser enemies inward instead of pushing outward.',scarletTempest:'Radius ×1.25, damage ×0.8 and recovery ×1.25 within the same cap.',bloodstalker:'Bat attack speed +20%, health −15%, bleeding chance +15%.',dreadwing:'Bat health +30%, damage −15%; hits briefly distract ordinary enemies.',sovereignBlood:'Royal blood spells ×1.1; claw/melee damage ×0.85.',elderPredator:'Royal claw/melee damage ×1.15; ranged blood spells ×0.85.'};
 result.desc=a.desc+' '+text[id];
 if(id==='crimsonTether')result.channelProfile={...a.channelProfile,movementMultiplier:.55};
 if(id==='rupturingLance'||id==='crimsonTether')result.damageMultiplier*=id==='rupturingLance'?.9:.85;
 if(id==='scarletTempest'){result.range*=1.25;result.damageMultiplier*=.8;result.recovery*=1.25;}
 return result;
}

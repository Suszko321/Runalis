// Authored Legendary finds. Owned copies retain the existing smith ascension path.
const passive=(id,name,type,values)=>({id,name,type,...values});
const definitions=[
 ['firstStarTestament','Testament of the First Star','grimoires',16,9,8,6,7,330,445,passive('firstStarEcho','Astral Echo','cooldownFlatDamage',{amount:32,cooldown:6})],
 ['crimsonConcord','The Crimson Concord','grimoires',17,10,6,5,9,310,470,passive('crimsonConcordHarvest','Crimson Concord','killRestore',{hp:16,spirit:12})],
 ['wintersUnwrittenLaw',"Winter’s Unwritten Law",'grimoires',15,8,9,7,6,360,410,passive('winterEdict','Winter Edict','rangedBonus',{bonusPct:14})],
 ['hollowSunCanticle','Canticle of the Hollow Sun','grimoires',18,10,7,6,10,300,500,passive('hollowSunSentence','Hollow Sentence','executeBonus',{thresholdPct:.3,bonusPct:32})],
 ['lastSunriseLion','Lion of the Last Sunrise','swords',17,11,3,0,0,0,0,passive('sunriseLionVow','Lion’s Vow','flatDamage',{amount:8})],
 ['veyreignsRedVerdict',"Veyreign’s Red Verdict",'swords',18,10,4,0,0,0,0,passive('redVerdict','Red Verdict','executeBonus',{thresholdPct:.25,bonusPct:45})],
 ['starlessKingsOath','Oath of the Starless King','swords',19,12,2,0,0,0,0,passive('starlessRequital','Starless Requital','cooldownFlatDamage',{amount:38,cooldown:7})],
 ['rimefall','Rimefall','swords',16,9,6,0,0,0,0,passive('rimefallResolve','Winter Resolve','killRestore',{hp:12,spirit:14})],
 ['astralCourtSpire','Spire of the Astral Court','staves',16,9,9,0,0,0,0,passive('astralCourtDecree','Court Decree','cooldownFlatDamage',{amount:34,cooldown:6})],
 ['briarheartSovereign','Briarheart Sovereign','staves',15,9,7,0,0,0,0,passive('briarheartRenewal','Briarheart Renewal','killRestore',{hp:18,spirit:10})],
 ['dyingSunCenser','Censer of the Dying Sun','staves',18,11,6,0,0,0,0,passive('dyingSunJudgement','Dying Sun Judgement','executeBonus',{thresholdPct:.3,bonusPct:34})],
 ['worldrootSceptre','Worldroot Sceptre','staves',16,8,8,0,0,0,0,passive('worldrootShelter','Worldroot Shelter','lowHpReduction',{thresholdPct:.35,reductionPct:16})],
 ['fallenCourtGravebell','Gravebell of the Fallen Court','maces',19,12,3,0,0,0,0,passive('fallenCourtToll','Final Toll','executeBonus',{thresholdPct:.25,bonusPct:40})],
 ['sunwardCoronation','Sunward Coronation','maces',17,10,4,0,0,0,0,passive('sunwardInvestiture','Sunward Investiture','damageReductionAndStamina',{reductionPct:8,stamina:3})],
 ['worldAnvilHeart','Heart of the World-Anvil','maces',20,13,2,0,0,0,0,passive('worldAnvilImpact','Anvil Impact','flatDamage',{amount:9})],
 ['stormJudgement','Judgement of the Storm','maces',18,11,5,0,0,0,0,passive('stormJudgementStrike','Storm Judgement','cooldownFlatDamage',{amount:40,cooldown:8})],
 ['moonstagsVigil',"Moonstag’s Vigil",'bows',16,10,4,0,0,0,0,passive('moonstagPatience','Moonstag Patience','rangedBonus',{bonusPct:18})],
 ['ashenPhoenixBow','Ashen Phoenix','bows',17,11,3,0,0,0,0,passive('phoenixRekindling','Phoenix Rekindling','killRestore',{hp:14,spirit:10})],
 ['lastHorizonBow','The Last Horizon','bows',18,12,2,0,0,0,0,passive('horizonLastLight','Last Light','executeBonus',{thresholdPct:.3,bonusPct:38})],
 ['eclipseSeraphBow','Eclipse Seraph','bows',16,9,6,0,0,0,0,passive('eclipseSeraphRefrain','Eclipse Refrain','cooldownFlatDamage',{amount:30,cooldown:5})]
];
const family={grimoires:{weaponType:'grimoire',skill:'grimoire',secondarySkill:'warding',primaryMultiplier:5.8,secondaryMultiplier:1.1},swords:{weaponType:'sword',skill:'blade',secondarySkill:'spirit',primaryMultiplier:6,secondaryMultiplier:1},staves:{weaponType:'staff',skill:'warding',secondarySkill:'spirit',primaryMultiplier:5.9,secondaryMultiplier:1.2},maces:{weaponType:'mace',skill:'blunt',secondarySkill:'warding',primaryMultiplier:6.1,secondaryMultiplier:.9},bows:{weaponType:'bow',skill:'archery',secondarySkill:'spirit',primaryMultiplier:6,secondaryMultiplier:.7}};
export const LEGENDARY_WEAPON_ITEMS={};
export const LEGENDARY_WEAPON_ART={};
export const LEGENDARY_WEAPON_FAMILIES={};
export const LEGENDARY_FOCUS_STYLES={};
for(const [index,[id,name,group,baseDamage,power,spirit,focusPower,staminaCost,range,projectileSpeed,legendaryPassive]]of definitions.entries()){
 const f=family[group],column=index%4,sheet='legendary-weapon-'+id;
 const effect=legendaryPassive.type==='flatDamage'?`Every hit deals ${legendaryPassive.amount} additional damage.`
  :legendaryPassive.type==='cooldownFlatDamage'?`Your next hit deals ${legendaryPassive.amount} additional damage, recharging every ${legendaryPassive.cooldown} seconds.`
  :legendaryPassive.type==='executeBonus'?`Hits against enemies at or below ${legendaryPassive.thresholdPct*100}% health deal ${legendaryPassive.bonusPct}% more damage.`
  :legendaryPassive.type==='rangedBonus'?`All ranged hits deal ${legendaryPassive.bonusPct}% more damage.`
  :legendaryPassive.type==='killRestore'?`Kills restore ${legendaryPassive.hp} HP and ${legendaryPassive.spirit} Spirit after awakening, subject to class healing rules.`
  :legendaryPassive.type==='lowHpReduction'?`At or below 35% health, incoming damage is reduced by 16%.`
  :'Incoming hits deal 8% less damage and restore 3 stamina.';
 legendaryPassive.desc=effect;
 LEGENDARY_WEAPON_ITEMS[id]={id,name,type:'weapon',slot:'weapon',rarity:'legendary',stack:false,...f,primarySkill:f.skill,baseDamage,power,spirit,value:600+column*35,
  ...(focusPower?{focusPower,...(group==='grimoires'?{spiritCost:staminaCost}:{staminaCost}),range,projectileSpeed}:{}),...(id==='starlessKingsOath'?{visualSilhouette:'greatsword'}:{}),
  endgameExclusive:true,allowedGearRarities:['legendary'],minCombatLevel:50,dropMinEnemyLevel:50,noRandomDrop:true,legendaryPassive,
  traits:['Legendary Armory',group==='grimoires'?'Bound Grimoire':group==='maces'?'Blunt Weapon':group==='staves'?'Warding Staff':group==='bows'?'Longbow':'Forged Blade'],
  desc:`${name}. ${legendaryPassive.name}: ${effect} Combat Level 50. Found at Legendary quality from level 50+ elites and bosses; owned copies may ascend at a blacksmith. Any class may wield it.`};
 (LEGENDARY_WEAPON_FAMILIES[group]??=[]).push(id);
 const grip=group==='grimoires'?[48,100]:group==='bows'?[32,64]:group==='staves'?[48,82]:[48,100];
 LEGENDARY_WEAPON_ART[id]={sheet,width:96,height:128,gripX:grip[0],gripY:grip[1],scale:group==='grimoires'?.34:group==='bows'?.65:group==='staves'?.72:group==='maces'?.58:.62,iconSheet:sheet+'-icon'};
 if(group==='grimoires')LEGENDARY_FOCUS_STYLES[id]={index:column,sheet:'legendary-focus-projectiles',columns:4,name:['Astral star spear','Ruby seal spear','Winter icicle','Hollow sun lance'][column],color:['#bc99ee','#d86272','#a5d9ef','#eac479'][column]};
}
